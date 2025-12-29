







import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../db';
import { authMiddleware, rateLimiter } from '../middleware';
import { 
    SHOP_CATALOG, 
    calculateLevelProgress, 
    getDailyReward, 
    checkDailyStreak, 
    getDailyShopSelection, 
    checkFirstWin,
    generateDailyQuests,
    generateSingleQuest,
    processMatchQuests,
    isQuestDoable,
    getTowerReward,
    CAMPAIGN_LEVELS_DATA
} from '../gameLogic';
import { Player, Quest, User, MatchRecord } from '../types';
import { socketService } from '../socketService';
import { notificationService } from '../services/notification';
import { findBestMove } from '../ai';
import { logger } from '../logger';
import { exclude, getQuestData, getPublicQuestData } from '../utils/routeHelpers';

const router = Router();

// ============================================================================
// AI & GAMEPLAY
// ============================================================================

router.post('/ai/move', async (req: any, res: any) => {
    const { board, settings, usedTaunts, player } = req.body;
    try {
        const result = findBestMove(board, settings, usedTaunts, player || Player.O);
        res.json(result);
    } catch (e) {
        logger.error("AI Move Error", e);
        res.status(500).json({ error: "AI processing failed." });
    }
});

router.post('/taunt', async (req: any, res: any) => {
    res.json({ text: "Is that the best you can do?" });
});

// ============================================================================
// PROGRESSION, SHOP & QUESTS
// ============================================================================

router.get('/me/progress', authMiddleware, async (req: any, res: any) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });
        if (!user) return res.status(404).json({ message: "User not found" });
        
        const qData = getQuestData(user);
        const dailyShop = getDailyShopSelection();

        // Check if quests need regeneration (New Day)
        const now = new Date();
        const lastGen = qData.lastGenerated ? new Date(qData.lastGenerated) : new Date(0);
        
        const dayLast = Math.floor(lastGen.getTime() / 86400000);
        const dayNow = Math.floor(now.getTime() / 86400000);
        const isSameDay = dayNow === dayLast;

        let needsSave = false;

        if (!isSameDay || !qData.quests || qData.quests.length === 0) {
            const newQuests = generateDailyQuests(user);
            qData.quests = newQuests;
            qData.lastGenerated = now.toISOString();
            qData.rerollsRemaining = 2; 
            needsSave = true;
        }

        if (needsSave) {
            await prisma.user.update({
                where: { id: user.id },
                data: { questData: qData }
            });
        }

        res.json({
            coins: user.coins,
            inventory: user.inventory,
            quests: qData.quests || [],
            campaignLevel: user.campaignLevel,
            campaignProgress: user.campaignProgress || {},
            rerollsRemaining: qData.rerollsRemaining !== undefined ? qData.rerollsRemaining : 2,
            dailyStreak: qData.dailyStreak || 0,
            lastDailyReward: qData.lastDailyReward,
            prestigeLevel: qData.prestigeLevel || 0,
            towerFloor: qData.towerFloor || 1, // Expose tower floor
            firstWinAvailable: checkFirstWin(qData.lastWinAt),
            dailyShop
        });
    } catch (e) {
        res.status(500).json({ message: "Error fetching progress" });
    }
});

router.post('/me/daily-reward', authMiddleware, rateLimiter(60000, 10) as any, async (req: any, res: any) => {
    try {
        const userId = req.user?.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: "User not found" });

        const qData = getQuestData(user);
        const { canClaim, newStreakAction } = checkDailyStreak(qData.lastDailyReward);

        if (!canClaim) return res.status(400).json({ message: "Already claimed today" });

        let currentStreak = parseInt(qData.dailyStreak || '0', 10);
        if (isNaN(currentStreak)) currentStreak = 0;

        let newStreak = 1;
        if (newStreakAction === 'increment') newStreak = currentStreak + 1;
        if (newStreakAction === 'reset') newStreak = 1;
        
        const reward = getDailyReward(newStreak);
        const claimTime = new Date().toISOString();
        
        const updatedQuestData = {
            ...qData,
            lastDailyReward: claimTime,
            dailyStreak: newStreak
        };

        await prisma.user.update({
            where: { id: userId },
            data: {
                coins: { increment: reward },
                questData: updatedQuestData
            }
        });

        res.json({ success: true, reward, streak: newStreak, lastDailyReward: claimTime });
    } catch (e) {
        console.error("Daily Reward Error:", e);
        res.status(500).json({ message: "Failed to claim reward" });
    }
});

router.post('/me/security-reward', authMiddleware, async (req: any, res: any) => {
    const { type } = req.body;
    const userId = req.user?.userId;

    if (!type || !['email', 'mfa', 'password'].includes(type)) {
        return res.status(400).json({ message: "Invalid reward type" });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: "User not found" });

        const qData = getQuestData(user);
        const rewards = qData.securityRewards || {};

        if (rewards[type]) {
            return res.status(400).json({ message: "Already claimed" });
        }

        // Verify eligibility
        let isEligible = false;
        let amount = 0;

        if (type === 'email') {
            isEligible = user.emailVerified;
            amount = 500;
        } else if (type === 'mfa') {
            isEligible = user.mfaEnabled;
            amount = 1000;
        } else if (type === 'password') {
            // Check if password change happened recently (within last hour for fresh claim)
            // or just ensure it exists if user is older
            isEligible = !!qData.lastPasswordChange;
            amount = 250;
        }

        if (!isEligible) {
            return res.status(403).json({ message: "Requirement not met" });
        }

        // Update
        rewards[type] = true;
        qData.securityRewards = rewards;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                coins: { increment: amount },
                questData: qData
            }
        });

        res.json({ success: true, newBalance: updatedUser.coins, reward: amount });
    } catch (e) {
        console.error("Security Reward Error:", e);
        res.status(500).json({ message: "Failed to claim reward" });
    }
});

router.post('/shop/buy', authMiddleware, async (req: any, res: any) => {
    const { itemId } = req.body;
    try {
        let item = SHOP_CATALOG.find(i => i.id === itemId);
        if (!item) return res.status(400).json({ message: "Item not found" });

        const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.inventory.includes(itemId) && item.type !== 'powerup') {
             return res.status(400).json({ message: "Item already owned" });
        }
        
        const dailyItems = getDailyShopSelection();
        let cost = item.cost;
        if (dailyItems.includes(itemId)) {
            cost = Math.floor(cost * 0.7); 
        }

        if (user.coins < cost) return res.status(400).json({ message: "Insufficient funds" });

        await prisma.user.update({
            where: { id: user.id },
            data: {
                coins: { decrement: cost },
                inventory: { push: itemId }
            }
        });
        res.json({ success: true, remainingCoins: user.coins - cost });
    } catch (e) {
        res.status(500).json({ message: "Purchase failed" });
    }
});

router.post('/shop/equip', authMiddleware, async (req: any, res: any) => {
    const { itemId, type } = req.body; 
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });
        if (!user) return res.status(404).json({ message: "User not found" });

        if (itemId !== 'frame-none' && itemId !== 'avatar-1' && itemId !== 'theme-default' && itemId !== 'skin-classic' && !user.inventory.includes(itemId)) {
            return res.status(403).json({ message: "Item not owned" });
        }

        const updates: any = {};
        if (type === 'avatar') updates.avatar = itemId;
        else if (type === 'theme') updates.equippedTheme = itemId;
        else if (type === 'skin') updates.equippedSkin = itemId;
        else if (type === 'frame') {
            const qData = getQuestData(user);
            updates.questData = { ...qData, equippedFrame: itemId };
        }

        await prisma.user.update({ where: { id: user.id }, data: updates });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ message: "Equip failed" });
    }
});

router.post('/me/welcome-bonus', authMiddleware, async (req: any, res: any) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const result = await prisma.$transaction(async (tx: any) => {
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user) throw new Error("User not found");

            const qData = getQuestData(user);
            if (qData.welcomeBonus !== 'available') throw new Error("Bonus unavailable");

            const updatedUser = await tx.user.update({
                where: { id: user.id },
                data: {
                    coins: { increment: 1000 },
                    questData: { ...qData, welcomeBonus: 'claimed' }
                }
            });
            return updatedUser.coins;
        });

        res.json({ success: true, coins: result });
    } catch (e: any) {
        if (e.message === "Bonus unavailable") return res.status(400).json({ message: "Bonus already claimed or unavailable" });
        res.status(500).json({ message: "Error claiming bonus" });
    }
});

router.post('/quests/progress', authMiddleware, async (req: any, res: any) => {
    const { type, amount } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });
        const qData = getQuestData(user);
        let updated = false;

        const newQuests = (qData.quests || []).map((q: Quest) => {
            if (!q.completed && q.type === type) {
                // Ensure number safety
                const currentVal = (typeof q.current === 'number' && !isNaN(q.current)) ? q.current : 0;
                q.current = Math.min(q.target, currentVal + (amount || 1));
                if (q.current >= q.target) q.completed = true;
                updated = true;
            }
            return q;
        });

        if (updated) {
            const newQuestData = JSON.parse(JSON.stringify(qData));
            newQuestData.quests = newQuests;

            await prisma.user.update({
                where: { id: user?.id },
                data: { questData: newQuestData }
            });
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ message: "Error updating quest" });
    }
});

router.post('/quests/claim', authMiddleware, async (req: any, res: any) => {
    const { questId } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });
        const qData = getQuestData(user);
        
        // Find index to remove
        const questIndex = qData.quests?.findIndex((q: Quest) => q.id === questId);
        if (questIndex === -1) return res.status(404).json({ message: "Quest not found" });
        
        const quest = qData.quests[questIndex];
        if (!quest.completed || quest.claimed) return res.status(400).json({ message: "Cannot claim" });

        // Calculate Reward with Multiplier
        const multiplier = quest.multiplier || 1;
        const totalReward = Math.floor(quest.reward * multiplier);

        // Rotation Logic:
        // 1. Remove the claimed quest
        // 2. Generate a new one to keep the list populated
        const activeQuests = qData.quests.filter((q: Quest) => q.id !== questId);
        
        // Exclude types present in active quests to prevent duplicates
        const excludeTypes = activeQuests.map((q: Quest) => q.type);
        const newQuest = generateSingleQuest(user, excludeTypes);
        
        const newQuestList = [...activeQuests, newQuest];

        // Deep clone & update
        const newQuestData = JSON.parse(JSON.stringify(qData));
        newQuestData.quests = newQuestList;

        await prisma.user.update({
            where: { id: user?.id },
            data: {
                coins: { increment: totalReward },
                questData: newQuestData
            }
        });
        
        res.json({ success: true, quests: newQuestList, reward: totalReward });
    } catch (e) {
        console.error("Claim error", e);
        res.status(500).json({ message: "Claim failed" });
    }
});

router.post('/quests/reroll', authMiddleware, async (req: any, res: any) => {
    const { questId } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });
        if (!user) return res.status(404).json({ message: "User not found" });

        const qData = getQuestData(user);
        if ((qData.rerollsRemaining || 0) <= 0) return res.status(400).json({ message: "No rerolls left" });

        // Ensure we don't duplicate existing types
        const excludeTypes = qData.quests.map((q: Quest) => q.type);
        
        // Generate new
        const newQuest = generateSingleQuest(user, excludeTypes);
        
        // Replace
        const newQuests = qData.quests.map((q: Quest) => q.id === questId ? newQuest : q);

        const newQuestData = {
            ...qData,
            quests: newQuests,
            rerollsRemaining: qData.rerollsRemaining - 1
        };

        await prisma.user.update({
            where: { id: user?.id },
            data: {
                questData: newQuestData
            }
        });
        res.json({ success: true, quests: newQuests, rerollsRemaining: newQuestData.rerollsRemaining });
    } catch (e) {
        res.status(500).json({ message: "Reroll failed" });
    }
});

router.post('/campaign/complete', authMiddleware, async (req: any, res: any) => {
    const { levelId, reward, moves, isHardMode } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });
        if (!user) return res.status(404).json({ message: "User not found" });

        // If hard mode, just give money, don't increment level (unless we track hard mode progression separately)
        if (isHardMode) {
             await prisma.user.update({
                where: { id: user.id },
                data: { coins: { increment: reward } }
            });
            return res.json({ success: true, coinsAdded: reward });
        }

        // We only allow progression if the completed level matches the current campaignLevel
        if (levelId === user.campaignLevel) {
            const levelData = CAMPAIGN_LEVELS_DATA.find(l => l.id === levelId);
            let unlockedItem = null;

            // Check for loot drop
            if (levelData?.unlocksItem) {
                // Add item to inventory if not already owned
                if (!user.inventory.includes(levelData.unlocksItem)) {
                    unlockedItem = levelData.unlocksItem;
                }
            }

            const updateData: any = {
                coins: { increment: reward },
                campaignLevel: levelId + 1,
                campaignProgress: {
                    ...(user.campaignProgress as object),
                    [levelId]: { stars: moves < 10 ? 3 : (moves < 15 ? 2 : 1) }
                }
            };

            if (unlockedItem) {
                updateData.inventory = { push: unlockedItem };
            }

            await prisma.user.update({
                where: { id: user.id },
                data: updateData
            });
            
            res.json({ success: true, newLevel: levelId + 1, stars: moves < 10 ? 3 : 1, unlockedItem });
        } else {
            // Already completed or invalid order, just return success without reward
            res.json({ success: true }); 
        }
    } catch (e) {
        res.status(500).json({ message: "Campaign update failed" });
    }
});

router.post('/tower/complete', authMiddleware, async (req: any, res: any) => {
    const { floor, reward } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });
        if (!user) return res.status(404).json({ message: "User not found" });

        const qData = getQuestData(user);
        const currentFloor = qData.towerFloor || 1;

        // Verify progression is linear
        if (floor !== currentFloor) {
            return res.status(400).json({ message: "Invalid floor progression" });
        }

        // Validate Reward (Basic check)
        const expectedReward = getTowerReward(floor);
        // Allow small margin or just use expected
        
        await prisma.user.update({
            where: { id: user.id },
            data: {
                coins: { increment: expectedReward },
                questData: { ...qData, towerFloor: currentFloor + 1 }
            }
        });

        res.json({ success: true, newFloor: currentFloor + 1, reward: expectedReward });
    } catch (e) {
        res.status(500).json({ message: "Tower update failed" });
    }
});

router.post('/me/prestige', authMiddleware, async (req: any, res: any) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });
        if ((user?.level || 0) < 100) return res.status(400).json({ message: "Must be level 100" });

        const qData = getQuestData(user);
        await prisma.user.update({
            where: { id: user?.id },
            data: {
                level: 1,
                xp: 0,
                questData: { ...qData, prestigeLevel: (qData.prestigeLevel || 0) + 1 }
            }
        });
        res.json({ success: true, prestigeLevel: (qData.prestigeLevel || 0) + 1 });
    } catch (e) {
        res.status(500).json({ message: "Prestige failed" });
    }
});

// ============================================================================
// SOCIAL, FRIENDS & CLANS
// ============================================================================

router.get('/leaderboard', async (req: any, res: any) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { elo: 'desc' },
            take: 50,
            select: { id: true, displayName: true, avatar: true, elo: true, coins: true, badges: true, clan: true, questData: true, customStatus: true }
        });
        // Sanitize questData to public fields
        const sanitized = users.map((u: any) => ({ ...u, questData: getPublicQuestData(u) }));
        res.json(sanitized);
    } catch (e) {
        res.status(500).json({ message: "Fetch leaderboard failed" });
    }
});

router.get('/friends', authMiddleware, async (req: any, res: any) => {
    try {
        const userId = req.user?.userId;
        const friends = await prisma.friendship.findMany({
            where: {
                OR: [
                    { senderId: userId, status: 'ACCEPTED' },
                    { receiverId: userId, status: 'ACCEPTED' }
                ]
            },
            include: {
                sender: { select: { id: true, displayName: true, avatar: true, elo: true, questData: true, customStatus: true } },
                receiver: { select: { id: true, displayName: true, avatar: true, elo: true, questData: true, customStatus: true } }
            }
        });

        const pending = await prisma.friendship.findMany({
            where: {
                OR: [
                    { senderId: userId, status: 'PENDING' },
                    { receiverId: userId, status: 'PENDING' }
                ]
            },
            include: {
                sender: { select: { id: true, displayName: true, avatar: true, questData: true } },
                receiver: { select: { id: true, displayName: true, avatar: true, questData: true } }
            }
        });

        res.json({ friends, pending });
    } catch (e) {
        res.status(500).json({ message: "Fetch friends failed" });
    }
});

router.post('/friends/request', authMiddleware, async (req: any, res: any) => {
    const { friendCode } = req.body;
    try {
        const userId = req.user?.userId;
        if (!friendCode) return res.status(400).json({ message: "Code required" });

        const target = await prisma.user.findUnique({ where: { friendCode } });
        if (!target) return res.status(404).json({ message: "User not found" });
        if (target.id === userId) return res.status(400).json({ message: "Cannot add yourself" });

        const existing = await prisma.friendship.findFirst({
            where: {
                OR: [
                    { senderId: userId, receiverId: target.id },
                    { senderId: target.id, receiverId: userId }
                ]
            }
        });

        if (existing) {
            if (existing.status === 'ACCEPTED') return res.status(400).json({ message: "Already friends" });
            if (existing.status === 'PENDING') return res.status(400).json({ message: "Request pending" });
        }

        const request = await prisma.friendship.create({
            data: { senderId: userId, receiverId: target.id, status: 'PENDING' },
            include: { sender: true }
        });

        // Notify target
        await notificationService.send(
            target.id,
            'friend_request',
            'New Friend Request',
            `${request.sender.displayName} wants to be friends!`,
            { 
                requestId: request.id, 
                sender: { id: request.sender.id, displayName: request.sender.displayName, avatar: request.sender.avatar } 
            }
        );

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ message: "Request failed" });
    }
});

router.post('/friends/respond', authMiddleware, async (req: any, res: any) => {
    const { requestId, action } = req.body;
    try {
        const userId = req.user?.userId;
        const friendship = await prisma.friendship.findUnique({ where: { id: requestId } });

        if (!friendship || friendship.receiverId !== userId) {
            return res.status(403).json({ message: "Invalid request" });
        }

        if (action === 'accept') {
            await prisma.friendship.update({
                where: { id: requestId },
                data: { status: 'ACCEPTED' }
            });
            // Notify sender
            await notificationService.send(
                friendship.senderId,
                'system',
                'Friend Request Accepted',
                `You are now friends!`,
                { senderId: userId }
            );
        } else {
            await prisma.friendship.delete({ where: { id: requestId } });
        }

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ message: "Response failed" });
    }
});

router.post('/friends/gift-by-user', authMiddleware, async (req: any, res: any) => {
    const { toUserId, amount } = req.body;
    try {
        const fromUserId = req.user?.userId;
        if (amount <= 0) return res.status(400).json({ message: "Invalid amount" });

        const fromUser = await prisma.user.findUnique({ where: { id: fromUserId } });
        if (!fromUser || fromUser.coins < amount) return res.status(400).json({ message: "Insufficient funds" });

        // Generate a pseudo gift ID for tracking
        const giftId = crypto.randomBytes(8).toString('hex');

        await prisma.user.update({
            where: { id: fromUserId },
            data: { coins: { decrement: amount } }
        });

        // We create a notification for the receiver that acts as the "Gift" object
        await notificationService.send(
            toUserId,
            'gift',
            'You received a gift!',
            `${fromUser.displayName} sent you ${amount} coins.`,
            { 
                amount, 
                senderName: fromUser.displayName,
                senderId: fromUserId, 
                giftId: giftId 
            }
        );

        // We also need to store this pending gift somewhere so it can be "accepted" securely.
        // For simplicity in this demo, we'll append to the receiver's questData.pendingGifts
        const receiver = await prisma.user.findUnique({ where: { id: toUserId } });
        const qData = getQuestData(receiver);
        const pendingGifts = qData.pendingGifts || [];
        pendingGifts.push({ id: giftId, amount, senderId: fromUserId });
        
        await prisma.user.update({
            where: { id: toUserId },
            data: { questData: { ...qData, pendingGifts } }
        });

        res.json({ success: true, newBalance: fromUser.coins - amount });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Gift failed" });
    }
});

router.post('/friends/gift/accept', authMiddleware, async (req: any, res: any) => {
    const { giftId } = req.body;
    try {
        const userId = req.user?.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const qData = getQuestData(user);
        
        const pendingGifts = qData.pendingGifts || [];
        const giftIndex = pendingGifts.findIndex((g: any) => g.id === giftId);

        if (giftIndex === -1) return res.status(404).json({ message: "Gift not found or already claimed" });

        const gift = pendingGifts[giftIndex];
        
        // Remove gift from pending
        const newPending = pendingGifts.filter((_: any, i: number) => i !== giftIndex);
        
        await prisma.user.update({
            where: { id: userId },
            data: { 
                coins: { increment: gift.amount },
                questData: { ...qData, pendingGifts: newPending }
            }
        });

        res.json({ success: true, coins: gift.amount });
    } catch (e) {
        res.status(500).json({ message: "Accept gift failed" });
    }
});

// -- Clan Routes --

router.post('/clans/create', authMiddleware, async (req: any, res: any) => {
    const { name, tag } = req.body;
    try {
        const userId = req.user?.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        
        if (user?.clanId) return res.status(400).json({ message: "Already in a clan" });
        if (user!.coins < 1000) return res.status(400).json({ message: "Insufficient funds (1000 required)" });

        const clan = await prisma.clan.create({
            data: {
                name,
                tag: tag.toUpperCase(),
                ownerId: userId,
                members: { connect: { id: userId } }
            }
        });

        await prisma.user.update({
            where: { id: userId },
            data: { coins: { decrement: 1000 } }
        });

        res.json(clan);
    } catch (e) {
        res.status(500).json({ message: "Clan creation failed" });
    }
});

router.post('/clans/join', authMiddleware, async (req: any, res: any) => {
    const { tag } = req.body;
    try {
        const userId = req.user?.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.clanId) return res.status(400).json({ message: "Already in a clan" });

        const clan = await prisma.clan.findUnique({ where: { tag: tag.toUpperCase() } });
        if (!clan) return res.status(404).json({ message: "Clan not found" });

        await prisma.user.update({
            where: { id: userId },
            data: { clanId: clan.id }
        });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ message: "Join failed" });
    }
});

router.get('/clans/:id', authMiddleware, async (req: any, res: any) => {
    try {
        const clan = await prisma.clan.findUnique({
            where: { id: req.params.id },
            include: { members: { select: { id: true, displayName: true, avatar: true, elo: true, questData: true, customStatus: true } } }
        });
        if (!clan) return res.status(404).json({ message: "Clan not found" });
        res.json(clan);
    } catch (e) {
        res.status(500).json({ message: "Fetch failed" });
    }
});

router.post('/clans/leave', authMiddleware, async (req: any, res: any) => {
    try {
        const userId = req.user?.userId;
        await prisma.user.update({
            where: { id: userId },
            data: { clanId: null }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ message: "Leave failed" });
    }
});

// -- Chat & Notifications --

router.get('/chats', authMiddleware, async (req: any, res: any) => {
    try {
        const userId = req.user?.userId;
        // Find conversations where user is a participant
        const conversations = await prisma.conversation.findMany({
            where: { participants: { some: { id: userId } } },
            include: { 
                participants: { 
                    where: { id: { not: userId } },
                    select: { id: true, displayName: true, avatar: true, questData: true, customStatus: true }
                },
                messages: {
                    orderBy: { timestamp: 'desc' },
                    take: 1
                }
            }
        });

        // Map to simpler format
        const result = await Promise.all(conversations.map(async (c: any) => {
            const partner = c.participants[0];
            const lastMsg = c.messages[0];
            
            // Calculate unread count
            const unreadCount = await prisma.chatMessage.count({
                where: {
                    conversationId: c.id,
                    senderId: { not: userId },
                    readBy: {
                        not: { path: [userId], isSet: true }
                    }
                }
            });

            return {
                id: c.id,
                partner: { ...partner, questData: getPublicQuestData(partner) },
                lastMessage: lastMsg,
                unreadCount
            };
        }));

        res.json(result);
    } catch (e) {
        logger.error("Fetch chats error", e);
        res.status(500).json({ message: "Fetch failed" });
    }
});

router.get('/chats/:partnerId/messages', authMiddleware, async (req: any, res: any) => {
    try {
        const userId = req.user?.userId;
        const partnerId = req.params.partnerId;
        const cursor = req.query.cursor;

        // Find conversation ID using pair key logic (a|b or b|a)
        const pairKey = [userId, partnerId].sort().join('|');
        const conversation = await prisma.conversation.findUnique({
            where: { pairKey }
        });

        if (!conversation) {
            return res.json({ messages: [], nextCursor: null });
        }

        const limit = 30;
        const messages = await prisma.chatMessage.findMany({
            where: { conversationId: conversation.id },
            take: limit + 1, // +1 to check for next page
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor as string } : undefined,
            orderBy: { timestamp: 'desc' },
            include: { sender: { select: { displayName: true, avatar: true, emailVerified: true, questData: true } } }
        });

        let nextCursor: string | null = null;
        if (messages.length > limit) {
            const nextItem = messages.pop();
            nextCursor = nextItem!.id;
        }

        const mapped = messages.map((m: any) => ({
            id: m.id,
            senderId: m.senderId,
            recipientId: m.senderId === userId ? partnerId : userId,
            text: m.text,
            timestamp: m.timestamp.getTime(),
            type: m.type,
            channel: 'dm',
            senderName: m.sender.displayName,
            senderAvatar: m.sender.avatar,
            senderFrame: m.sender.questData?.equippedFrame,
            senderVerified: m.sender.emailVerified,
            readBy: m.readBy,
            deleted: m.deleted,
            editedAt: m.editedAt ? m.editedAt.getTime() : undefined,
            reactions: m.reactions,
            replyTo: m.replyTo,
            inviteData: m.inviteData,
            giftData: m.giftData,
            replayData: m.replayData,
            stickerId: m.stickerId
        })).reverse(); // Return oldest first for chat UI append

        res.json({ messages: mapped, nextCursor });
    } catch (e) {
        logger.error("Fetch messages error", e);
        res.status(500).json({ message: "Fetch failed" });
    }
});

router.get('/notifications', authMiddleware, async (req: any, res: any) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user?.userId },
            orderBy: { timestamp: 'desc' },
            take: 50
        });
        
        const clientNotifs = notifications.map((n: any) => ({
            ...n,
            timestamp: n.timestamp.getTime(),
            data: n.data // Prisma handles JSON parsing
        }));
        
        res.json(clientNotifs);
    } catch (e) {
        res.status(500).json({ message: "Fetch failed" });
    }
});

router.post('/notifications/read', authMiddleware, async (req: any, res: any) => {
    const { ids } = req.body;
    try {
        await prisma.notification.updateMany({
            where: { 
                id: { in: ids },
                userId: req.user?.userId 
            },
            data: { read: true }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ message: "Update failed" });
    }
});

router.post('/notifications/read-all', authMiddleware, async (req: any, res: any) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user?.userId, read: false },
            data: { read: true }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ message: "Update failed" });
    }
});

router.delete('/notifications', authMiddleware, async (req: any, res: any) => {
    try {
        await prisma.notification.deleteMany({
            where: { userId: req.user?.userId }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ message: "Delete failed" });
    }
});

// ============================================================================
// MATCH HISTORY
// ============================================================================

router.get('/matches', authMiddleware, async (req: any, res: any) => {
    try {
        const matches = await prisma.match.findMany({
            where: { userId: req.user?.userId },
            orderBy: { date: 'desc' },
            include: { moves: true },
            take: 50
        });
        
        const clientMatches = matches.map((m: any) => ({ ...m, date: m.date.getTime() }));
        res.json(clientMatches);
    } catch (e) {
        res.status(500).json({ message: "Fetch history failed" });
    }
});

router.post('/matches', authMiddleware, async (req: any, res: any) => {
    const matchData = req.body;
    const userId = req.user?.userId!;

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if(!user) return res.status(404).json({message: "User not found"});

        const isWin = matchData.winner === matchData.playerRole;
        // Deep clone current questData to prevent reference issues
        let qData = JSON.parse(JSON.stringify(getQuestData(user)));
        
        let xpGain = 10 + (isWin ? 25 : 0);
        let coinGain = 0;
        let firstWinBonus = false;

        if (isWin && checkFirstWin(qData.lastWinAt)) {
            coinGain += 100;
            xpGain += 50;
            firstWinBonus = true;
            qData.lastWinAt = new Date().toISOString();
        }

        const { newLevel, newXp } = calculateLevelProgress(user.level, user.xp, xpGain);

        if (qData.quests) {
            const difficulty = matchData.difficulty || matchData.gameSettings?.difficulty;

            const questCalcData = {
                winner: matchData.winner,
                playerRole: matchData.playerRole,
                gameMode: matchData.gameMode,
                difficulty: difficulty, 
                moveCount: matchData.moves?.length || 0,
                powerupsUsed: matchData.powerupsUsed || {} 
            };
            
            logger.info("Processing Quests for user " + userId, { quests: qData.quests, matchData: questCalcData });

            const updatedQuests = processMatchQuests(qData.quests, questCalcData);
            qData.quests = updatedQuests;
            
            logger.info("Updated Quests result", { updatedQuests });
        }

        const movesToCreate = (matchData.moves || []).map((m: any, i: number) => ({
            player: m.player,
            index: m.index,
            moveNumber: typeof m.moveNumber === 'number' ? m.moveNumber : i + 1
        }));

        // Use Prisma Transaction to ensure atomicity
        const [updatedUser, savedMatch] = await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: {
                    coins: { increment: coinGain },
                    xp: newXp,
                    level: newLevel,
                    wins: { increment: isWin ? 1 : 0 },
                    losses: { increment: !isWin && matchData.winner !== 'draw' ? 1 : 0 },
                    draws: { increment: matchData.winner === 'draw' ? 1 : 0 },
                    questData: qData 
                }
            }),
            prisma.match.create({
                data: {
                    userId,
                    gameMode: matchData.gameMode,
                    winner: matchData.winner,
                    opponentName: matchData.opponentName,
                    gameSettings: matchData.gameSettings,
                    initialBoard: matchData.initialBoard,
                    playerRole: matchData.playerRole,
                    winReason: matchData.winReason,
                    moves: { create: movesToCreate }
                },
                include: { moves: true }
            })
        ]);

        res.json({ 
            ...savedMatch, 
            date: savedMatch.date.getTime(),
            xpReport: { total: xpGain, coinChange: coinGain, firstWinBonus },
            quests: qData.quests 
        });
    } catch (e) {
        logger.error("Save match error", e);
        res.status(500).json({ message: "Error saving match" });
    }
});

router.get('/matches/:id', authMiddleware, async (req: any, res: any) => {
    try {
        const match = await prisma.match.findUnique({
            where: { id: req.params.id },
            include: { moves: true }
        });
        
        if (!match) return res.status(404).json({ message: "Match not found" });
        if (match.userId !== req.user?.userId) return res.status(403).json({ message: "Access denied" });

        res.json({ ...match, date: match.date.getTime() });
    } catch (e) {
        res.status(500).json({ message: "Fetch failed" });
    }
});

router.delete('/matches', authMiddleware, async (req: any, res: any) => {
    try {
        await prisma.match.deleteMany({ where: { userId: req.user?.userId } });
        res.json({ success: true });
    } catch (e) {
        logger.error("Clear history error", e);
        res.status(500).json({ message: "Clear failed" });
    }
});

export default router;
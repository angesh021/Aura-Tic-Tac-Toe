

import { Router, Request, Response } from 'express';
import { prisma } from './db';
import { hashPassword, comparePassword, createToken } from './auth';
import { authMiddleware, rateLimiter, securityHeaders } from './middleware';
import { checkWinner, SHOP_CATALOG, CAMPAIGN_LEVELS_DATA, getXPForLevel, analyzeMatch } from './gameLogic';
import { GameVariant, Player, BoardState, Quest, PendingGift, XpReport, GameMode, Difficulty, Notification } from './types';
import { socketService } from './socketService';
import { notificationService } from './services/notification';

const router = Router();

// Apply Global Security Headers to all API routes
router.use(securityHeaders as any);

function exclude<User, Key extends keyof User>(user: User, keys: Key[]): Omit<User, Key> {
  return Object.fromEntries(
    Object.entries(user as Record<string, any>).filter(([key]) => !keys.includes(key as Key))
  ) as Omit<User, Key>;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// --- Auth Routes ---

const authRateLimit = rateLimiter(15 * 60 * 1000, 30);

router.post('/register', authRateLimit as any, async (req: Request, res: Response) => {
    try {
        let { email, password } = (req as any).body;

        if (typeof email !== 'string' || typeof password !== 'string') {
             return (res as any).status(400).json({ message: '🚫 Invalid input format.' });
        }
        email = email.trim().toLowerCase();
        
        if (!email || !password) {
            return (res as any).status(400).json({ message: '📧 Email and password are required.' });
        }

        if (!emailRegex.test(email)) {
            return (res as any).status(400).json({ message: '📧 Please enter a valid email address.' });
        }

        if (password.length < 6) {
            return (res as any).status(400).json({ message: '🔒 Password must be at least 6 characters.' });
        }
        
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return (res as any).status(409).json({ message: '🚫 Account already exists. Try logging in!' });
        }

        const passwordHash = await hashPassword(password);
        
        // Generate Friend Code
        const friendCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                displayName: email.split('@')[0],
                avatar: 'avatar-1',
                theme: 'dark',
                inventory: ['avatar-1', 'skin-classic', 'theme-default'],
                campaignLevel: 1,
                campaignProgress: {},
                coins: 0,
                // Initialize with welcome bonus available
                questData: { lastGenerated: '', quests: [], rerollsRemaining: 2, welcomeBonus: 'available', pendingGifts: [] },
                equippedTheme: 'theme-default',
                equippedSkin: 'skin-classic',
                friendCode,
                preferences: {}
            },
        });

        const userWithoutPassword = exclude(user, ['passwordHash']);

        (res as any).status(201).json({ user: userWithoutPassword });
    } catch (error: any) {
        console.error("Registration error:", error);
        (res as any).status(500).json({ message: "🤖 Something went wrong creating your account. Please try again." });
    }
});

router.post('/login', authRateLimit as any, async (req: Request, res: Response) => {
    try {
        let { email, password } = (req as any).body;
        if (typeof email !== 'string' || typeof password !== 'string') return (res as any).status(400).json({ message: '🚫 Invalid input.' });
        
        email = email.trim().toLowerCase();
        if (!email || !password) return (res as any).status(400).json({ message: '📧 Email and password required.' });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !(await comparePassword(password, user.passwordHash))) {
            return (res as any).status(401).json({ message: '🔑 Incorrect credentials. Please try again.' });
        }

        const token = createToken(user);
        const userWithoutPassword = exclude(user, ['passwordHash']);

        (res as any).status(200).json({ token, user: userWithoutPassword });
    } catch (error: any) {
        console.error("Login error:", error);
        (res as any).status(500).json({ message: "🤖 Server hiccup during login. Please try again." });
    }
});

// --- User & Profile ---

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const user = await prisma.user.findUnique({ 
            where: { id: userId },
            include: { clan: { include: { members: { select: { id: true, displayName: true, avatar: true, elo: true } } } } }
        });
        if (!user) return (res as any).status(404).json({ message: '🕵️‍♀️ User profile not found.' });
        
        // Ensure legacy users get a friend code if they don't have one
        if (!user.friendCode) {
             const code = Math.random().toString(36).substring(2, 8).toUpperCase();
             await prisma.user.update({ where: { id: user.id }, data: { friendCode: code }});
             user.friendCode = code;
        }

        const userWithoutPassword = exclude(user, ['passwordHash']);
        (res as any).status(200).json(userWithoutPassword);
    } catch (error) { 
        console.error("Profile fetch error:", error);
        (res as any).status(500).json({ message: "🤖 Could not load profile." }); 
    }
});

router.put('/me', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { displayName, avatar, theme, bio, customStatus, showcasedBadges, preferences } = (req as any).body;

        if (displayName && displayName.length > 20) return (res as any).status(400).json({ message: "⚠️ Display name too long (max 20)." });
        if (bio && bio.length > 200) return (res as any).status(400).json({ message: "⚠️ Bio too long (max 200)." });
        if (customStatus && customStatus.length > 50) return (res as any).status(400).json({ message: "⚠️ Status too long (max 50)." });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return (res as any).status(404).json({ message: 'User not found' });
        
        const data: any = {};
        if (displayName !== undefined) data.displayName = displayName;
        if (avatar !== undefined) data.avatar = avatar;
        if (theme !== undefined) data.theme = theme;
        if (bio !== undefined) data.bio = bio;
        if (customStatus !== undefined) data.customStatus = customStatus;
        if (preferences !== undefined) data.preferences = preferences;
        
        if (showcasedBadges !== undefined) {
            if (!Array.isArray(showcasedBadges) || showcasedBadges.length > 4) {
                 return (res as any).status(400).json({ message: "Invalid showcased badges." });
            }
            // Verify user owns the badges
            const userBadges = user.badges || [];
            if (!showcasedBadges.every(b => userBadges.includes(b))) {
                return (res as any).status(400).json({ message: "Cannot showcase a badge you don't own." });
            }
            data.showcasedBadges = showcasedBadges;
        }

        const updatedUser = await prisma.user.update({ where: { id: userId }, data });
        (res as any).status(200).json(exclude(updatedUser, ['passwordHash']));
    } catch (error) { 
        console.error("Profile update error:", error);
        (res as any).status(500).json({ message: "🤖 Failed to update profile." }); 
    }
});

router.delete('/me', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        await prisma.match.deleteMany({ where: { userId: userId } });
        await prisma.user.delete({ where: { id: userId } });
        (res as any).status(200).json({ message: '🗑️ Account deleted successfully.' });
    } catch (error) { 
        console.error("Account deletion error:", error);
        (res as any).status(500).json({ message: "🤖 Could not delete account. Try again later." }); 
    }
});

// --- Notifications (Production Ready) ---

router.get('/notifications', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const notifications = await prisma.notification.findMany({
            where: { userId: userId },
            orderBy: { timestamp: 'desc' },
            take: 50,
        });
        (res as any).status(200).json(notifications.map(n => ({...n, timestamp: n.timestamp.getTime() })));
    } catch (error) {
        console.error("Fetch notifications error", error);
        (res as any).status(500).json({ message: "Error fetching notifications" });
    }
});

router.post('/notifications/read', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { ids } = (req as any).body;
        if (!Array.isArray(ids)) {
            return (res as any).status(400).json({ message: "Invalid input, expected an array of IDs." });
        }
        await prisma.notification.updateMany({
            where: { id: { in: ids }, userId: userId },
            data: { read: true },
        });
        (res as any).status(200).json({ success: true });
    } catch (error) {
        console.error("Mark notifications as read error", error);
        (res as any).status(500).json({ message: "Error updating notifications" });
    }
});

router.post('/notifications/read-all', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        await prisma.notification.updateMany({
            where: { userId: userId, read: false },
            data: { read: true },
        });
        (res as any).status(200).json({ success: true });
    } catch (error) {
        console.error("Mark all notifications as read error", error);
        (res as any).status(500).json({ message: "Error updating notifications" });
    }
});

router.delete('/notifications', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        await prisma.notification.deleteMany({
            where: { userId: userId },
        });
        (res as any).status(200).json({ success: true });
    } catch (error) {
        (res as any).status(500).json({ message: "Error clearing notifications" });
    }
});


// --- Friends System ---

router.get('/friends', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const friendships = await prisma.friendship.findMany({
            where: {
                OR: [
                    { senderId: userId },
                    { receiverId: userId }
                ]
            },
            include: {
                sender: { select: { id: true, displayName: true, avatar: true, elo: true, clan: true } },
                receiver: { select: { id: true, displayName: true, avatar: true, elo: true, clan: true } }
            }
        });

        const friendsPromises = friendships
            .filter((f: any) => f.status === 'ACCEPTED')
            .map(async (f: any) => {
                const friendId = f.senderId === userId ? f.receiverId : f.senderId;
                const matches = await prisma.match.findMany({
                    where: {
                        userId: userId,
                        OR: [
                            { opponentName: f.senderId === userId ? f.receiver.displayName : f.sender.displayName }
                        ]
                    },
                    select: { winner: true, playerRole: true, date: true }
                });

                const wins = matches.filter(m => (m.playerRole === 'X' && m.winner === 'X') || (m.playerRole === 'O' && m.winner === 'O')).length;
                const draws = matches.filter(m => m.winner === 'draw').length;
                const losses = matches.length - wins - draws;
                
                return { 
                    ...f, 
                    rivalry: { wins, losses, draws, lastMatch: matches[0]?.date } 
                };
            });

        const friends = await Promise.all(friendsPromises);
        const pending = friendships.filter((f: any) => f.status === 'PENDING');

        (res as any).status(200).json({ friends, pending });
    } catch (error) { 
        console.error(error); 
        (res as any).status(500).json({ message: "🤖 Trouble loading friends list." }); 
    }
});

// Search User by Friend Code
router.get('/users/search', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { code } = (req as any).query;
        if (!code || typeof code !== 'string') return (res as any).status(400).json({ message: "⚠️ Friend code required" });

        const user = await prisma.user.findUnique({
            where: { friendCode: code.toUpperCase() },
            select: { 
                id: true, 
                displayName: true, 
                avatar: true, 
                elo: true, 
                friendCode: true,
                clan: true 
            }
        });

        if (!user) return (res as any).status(404).json({ message: "🕵️‍♀️ No user found with that code." });

        (res as any).json(user);
    } catch (e) {
        (res as any).status(500).json({ message: "🤖 Search failed." });
    }
});

router.post('/friends/request', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { friendCode } = (req as any).body;

        if (!friendCode) return (res as any).status(400).json({ message: "⚠️ Friend code required." });

        const sender = await prisma.user.findUnique({ where: { id: userId } });
        const targetUser = await prisma.user.findUnique({ where: { friendCode } });
        if (!targetUser) return (res as any).status(404).json({ message: "🕵️‍♀️ User not found." });
        
        if (targetUser.id === userId) return (res as any).status(400).json({ message: "🚫 You cannot add yourself!" });

        const existing = await prisma.friendship.findFirst({
            where: {
                OR: [
                    { senderId: userId, receiverId: targetUser.id },
                    { senderId: targetUser.id, receiverId: userId }
                ]
            }
        });

        if (existing) {
            if (existing.status === 'ACCEPTED') return (res as any).status(400).json({ message: "👥 You are already friends." });
            if (existing.senderId === userId) return (res as any).status(400).json({ message: "⏳ Request already sent." });
            return (res as any).status(400).json({ message: "📬 They already sent you a request! Check your inbox." });
        }

        const friendship = await prisma.friendship.create({
            data: {
                senderId: userId,
                receiverId: targetUser.id,
                status: 'PENDING'
            }
        });

        // Use Persistent Notification
        if (sender) {
            await notificationService.send(
                targetUser.id,
                'friend_request',
                'New Friend Request',
                `${sender.displayName} sent you a friend request.`,
                {
                    requestId: friendship.id,
                    sender: {
                        id: sender.id,
                        displayName: sender.displayName,
                        avatar: sender.avatar
                    }
                }
            );
        }

        const isOnline = socketService.isUserOnline(targetUser.id);
        const msg = isOnline ? "Request sent." : "Request sent (Player is offline).";

        (res as any).status(200).json({ message: msg });
    } catch (error) { 
        console.error(error);
        (res as any).status(500).json({ message: "🤖 Error sending request." }); 
    }
});

router.post('/friends/respond', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { requestId, action } = (req as any).body;

        const friendship = await prisma.friendship.findUnique({ where: { id: requestId } });
        if (!friendship) return (res as any).status(404).json({ message: "Request not found." });

        if (friendship.receiverId !== userId) return (res as any).status(403).json({ message: "🚫 Not authorized." });

        const responder = await prisma.user.findUnique({ where: { id: userId } });

        if (action === 'accept') {
            await prisma.friendship.update({
                where: { id: requestId },
                data: { status: 'ACCEPTED' }
            });
            // Persistent Notification for Sender
            await notificationService.send(
                friendship.senderId,
                'system',
                'Request Accepted',
                `${responder?.displayName} accepted your friend request!`
            );
        } else {
            await prisma.friendship.delete({ where: { id: requestId } });
            // Persistent Notification for Sender (optional for rejection, but good for feedback)
            await notificationService.send(
                friendship.senderId,
                'system',
                'Request Declined',
                `${responder?.displayName} declined your friend request.`
            );
        }

        (res as any).status(200).json({ success: true });
    } catch (error) { (res as any).status(500).json({ message: "🤖 Error processing response." }); }
});

router.delete('/friends/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const friendshipId = (req as any).params.id;

        const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
        if (!friendship) return (res as any).status(404).json({ message: "Friendship not found." });

        if (friendship.senderId !== userId && friendship.receiverId !== userId) {
            return (res as any).status(403).json({ message: "🚫 Not authorized." });
        }

        await prisma.friendship.delete({ where: { id: friendshipId } });
        (res as any).status(200).json({ success: true });
    } catch (error) { (res as any).status(500).json({ message: "🤖 Error removing friend." }); }
});

router.post('/friends/gift-by-user', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { toUserId, amount } = (req as any).body;

        if (!toUserId || !amount || typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
            return (res as any).status(400).json({ message: "⚠️ Invalid amount or recipient." });
        }

        const sender = await prisma.user.findUnique({ where: { id: userId } });
        if (!sender || sender.coins < amount) {
             return (res as any).status(400).json({ message: "💸 Insufficient funds for this gift." });
        }

        const friend = await prisma.user.findUnique({ where: { id: toUserId } });
        if (!friend) return (res as any).status(404).json({ message: "🕵️‍♀️ Friend not found." });

        const pendingGifts = (friend.questData as any)?.pendingGifts || [];
        const newGift: PendingGift = {
            id: `gift-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            senderId: userId,
            senderName: sender.displayName,
            amount: amount,
            timestamp: Date.now()
        };

        const newQuestData = { ...(friend.questData as any), pendingGifts: [...pendingGifts, newGift] };

        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { coins: { decrement: amount } }
            }),
            prisma.user.update({
                where: { id: toUserId },
                data: { questData: newQuestData }
            })
        ]);

        // Persistent Notification for Gift
        await notificationService.send(
            friend.id,
            'gift',
            'You Received a Gift!',
            `${sender.displayName} sent you ${amount} coins!`,
            { 
                giftId: newGift.id, 
                amount: amount, 
                senderName: sender.displayName,
                sender: { id: sender.id, displayName: sender.displayName, avatar: sender.avatar }
            }
        );

        // Also create a system chat message for history (via existing socketService logic, refactored to be safe)
        socketService.sendSystemInteraction(sender.id, sender.displayName, sender.avatar, friend.id, `🎁 Gifted ${amount} Aura Coins.`, { amount });

        (res as any).status(200).json({ success: true, newBalance: sender.coins - amount });
    } catch (error) { 
        console.error(error);
        (res as any).status(500).json({ message: "🤖 Failed to send gift." }); 
    }
});

router.post('/friends/gift', authMiddleware, async (req: Request, res: Response) => {
    // Legacy support wrapper
    // ... implement logic similar to gift-by-user or redirect
    return (res as any).status(400).json({ message: "Use gift-by-user endpoint." });
});

router.post('/friends/gift/accept', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { giftId } = (req as any).body;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return (res as any).status(404).json({ message: "User not found." });

        const questData = user.questData as any;
        const pendingGifts = questData?.pendingGifts || [];
        
        const giftIndex = pendingGifts.findIndex((g: PendingGift) => g.id === giftId);
        
        if (giftIndex === -1) {
            return (res as any).status(404).json({ message: "🚫 Gift not found or already accepted." });
        }

        const gift = pendingGifts[giftIndex];
        const newPendingGifts = pendingGifts.filter((g: PendingGift) => g.id !== giftId);

        await prisma.user.update({
            where: { id: userId },
            data: {
                coins: { increment: gift.amount },
                questData: { ...questData, pendingGifts: newPendingGifts }
            }
        });

        // Notify Sender that gift was accepted
        await notificationService.send(
            gift.senderId,
            'system',
            'Gift Accepted',
            `${user.displayName} accepted your gift of ${gift.amount} coins.`
        );

        (res as any).status(200).json({ success: true, coins: user.coins + gift.amount, message: `Accepted ${gift.amount} coins!` });
    } catch (error) { (res as any).status(500).json({ message: "🤖 Error accepting gift." }); }
});

router.get('/friends/recent', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        
        const matches = await prisma.match.findMany({
            where: { 
                userId: userId, 
                gameMode: 'ONLINE' 
            },
            orderBy: { date: 'desc' },
            take: 10,
            select: { opponentName: true, date: true }
        });

        const recentPlayers = [];
        const seen = new Set();

        for (const match of matches) {
            if (match.opponentName && !seen.has(match.opponentName)) {
                seen.add(match.opponentName);
                const user = await prisma.user.findFirst({
                    where: { displayName: match.opponentName },
                    select: { id: true, displayName: true, avatar: true, elo: true, friendCode: true }
                });
                
                if (user && user.id !== userId) {
                    recentPlayers.push(user);
                }
            }
        }

        (res as any).status(200).json(recentPlayers);
    } catch (e) { (res as any).status(500).json({ message: "🤖 Error fetching recent players" }); }
});

// --- NEW CHAT SUMMARY ENDPOINT ---
router.get('/chats', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        
        // 1. Get all conversations the user is part of
        const conversations = await prisma.conversation.findMany({
            where: {
                participants: { some: { id: userId } }
            },
            include: {
                participants: {
                    select: { id: true, displayName: true, avatar: true }
                },
                messages: {
                    orderBy: { timestamp: 'desc' },
                    take: 1, // Get the latest message for preview
                }
            }
        });

        // 2. Compute unread counts for each conversation
        const results = await Promise.all(conversations.map(async (conv) => {
            const partner = conv.participants.find(p => p.id !== userId);
            if (!partner) return null;

            const lastMessage = conv.messages[0];
            
            // Check unread messages in this conversation
            // We count messages where sender != me AND I haven't read them
            const unreadMessages = await prisma.chatMessage.findMany({
                where: {
                    conversationId: conv.id,
                    senderId: { not: userId }
                },
                select: { readBy: true },
                orderBy: { timestamp: 'desc' },
                take: 100 // Limit scan to recent 100 messages for performance
            });

            const unreadCount = unreadMessages.filter(m => {
                const readBy = (m.readBy as Record<string, number>) || {};
                return !readBy[userId];
            }).length;

            return {
                conversationId: conv.id,
                partner,
                lastMessage: lastMessage ? {
                    ...lastMessage,
                    timestamp: lastMessage.timestamp.getTime()
                } : null,
                unreadCount
            };
        }));

        // Filter nulls and sort by latest message
        const validResults = results.filter(r => r !== null).sort((a, b) => {
            const tA = a!.lastMessage?.timestamp || 0;
            const tB = b!.lastMessage?.timestamp || 0;
            return tB - tA;
        });

        (res as any).status(200).json(validResults);
    } catch (e) {
        console.error("Failed to fetch chat summaries", e);
        (res as any).status(500).json({ message: "Failed to load chats" });
    }
});

// --- NEW CHAT HISTORY ENDPOINT ---
router.get('/chats/:partnerId/messages', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { partnerId } = (req as any).params;
        const { cursor } = (req as any).query;
        const take = 50;

        const conversation = await prisma.conversation.findFirst({
            where: {
                participants: {
                    every: {
                        id: { in: [userId, partnerId] }
                    }
                }
            }
        });

        if (!conversation) {
            return (res as any).status(200).json({ messages: [], nextCursor: null });
        }
        
        const messages = await prisma.chatMessage.findMany({
            where: { conversationId: conversation.id },
            take: -take, // reverse order
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor as string } : undefined,
            orderBy: { timestamp: 'asc' },
            include: { sender: { select: { id: true, displayName: true, avatar: true }}}
        });
        
        const formattedMessages = messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp.getTime(),
            senderId: msg.sender.id,
            senderName: msg.sender.displayName,
            senderAvatar: msg.sender.avatar,
            readBy: msg.readBy as any,
            reactions: msg.reactions as any,
            replyTo: msg.replyTo as any,
            replayData: msg.replayData as any,
            giftData: msg.giftData as any,
        }));

        const lastMessage = messages[0];
        const nextCursor = lastMessage ? lastMessage.id : null;

        (res as any).status(200).json({
            messages: formattedMessages.reverse(), // Put back in chronological order for client
            nextCursor,
        });

    } catch (e) {
        console.error("Failed to fetch chat history", e);
        (res as any).status(500).json({ message: "Error fetching messages" });
    }
});

// --- CLAN ROUTES ---

router.post('/clans/create', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { name, tag } = (req as any).body;

        if (!name || !tag) return (res as any).status(400).json({ message: "⚠️ Name and tag required." });
        if (tag.length > 4) return (res as any).status(400).json({ message: "⚠️ Tag too long (max 4)." });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user.clanId) return (res as any).status(400).json({ message: "🚫 Already in a clan." });

        if (user.coins < 1000) return (res as any).status(400).json({ message: "💸 Need 1000 coins to create clan." });

        const clan = await prisma.clan.create({
            data: {
                name,
                tag,
                ownerId: userId,
                members: { connect: { id: userId } }
            }
        });

        await prisma.user.update({ where: { id: userId }, data: { coins: { decrement: 1000 } } });

        (res as any).status(201).json(clan);
    } catch (e: any) {
        if (e.code === 'P2002') return (res as any).status(409).json({ message: "🚫 Clan tag already taken." });
        (res as any).status(500).json({ message: "🤖 Clan creation failed." });
    }
});

router.post('/clans/join', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { tag } = (req as any).body;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user.clanId) return (res as any).status(400).json({ message: "🚫 Already in a clan." });

        const clan = await prisma.clan.findUnique({ where: { tag } });
        if (!clan) return (res as any).status(404).json({ message: "🕵️‍♀️ Clan not found." });

        await prisma.user.update({
            where: { id: userId },
            data: { clanId: clan.id }
        });

        (res as any).status(200).json({ success: true });
    } catch (e) { (res as any).status(500).json({ message: "🤖 Join failed." }); }
});

router.get('/clans/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const clan = await prisma.clan.findUnique({
            where: { id: (req as any).params.id },
            include: { members: { select: { id: true, displayName: true, avatar: true, elo: true } } }
        });
        if (!clan) return (res as any).status(404).json({ message: "Clan not found." });
        (res as any).status(200).json(clan);
    } catch (e) { (res as any).status(500).json({ message: "Error fetching clan." }); }
});

router.post('/clans/leave', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        
        if (!user.clanId) return (res as any).status(400).json({ message: "Not in a clan." });

        const clan = await prisma.clan.findUnique({ where: { id: user.clanId }, include: { members: true } });
        
        if (clan.ownerId === userId) {
            if (clan.members.length > 1) {
                const nextOwner = clan.members.find(m => m.id !== userId);
                await prisma.clan.update({ where: { id: clan.id }, data: { ownerId: nextOwner.id } });
            } else {
                await prisma.clan.delete({ where: { id: clan.id } });
            }
        }

        await prisma.user.update({ where: { id: userId }, data: { clanId: null } });
        (res as any).status(200).json({ success: true });
    } catch (e) { (res as any).status(500).json({ message: "Leave failed." }); }
});

// --- Match History ---

router.post('/matches', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { gameMode, winner, moves, gameSettings, initialBoard, opponentName, playerRole, winReason } = (req as any).body;

        if (gameMode === 'ONLINE') return (res as any).status(403).json({ message: "Cannot manually save online matches." });

        // --- Winner Verification ---
        // Re-run the game on the server to verify the outcome.
        const finalBoard = [...initialBoard];
        for (const move of moves) {
            if (finalBoard[move.index] === null) {
                finalBoard[move.index] = move.player;
            } else {
                return (res as any).status(400).json({ message: "Invalid move sequence provided." });
            }
        }

        const serverResult = checkWinner(finalBoard, gameSettings.boardSize, gameSettings.winLength);
        let serverWinner = serverResult.winner;

        if (gameSettings.variant === GameVariant.MISERE && serverWinner !== 'draw' && serverWinner !== null) {
            serverWinner = serverWinner === Player.X ? Player.O : Player.X;
        }

        if (serverWinner !== winner) {
            console.warn(`Client-server winner mismatch! Client: ${winner}, Server: ${serverWinner}, User: ${userId}`);
            return (res as any).status(400).json({ message: "Match result validation failed. Don't cheat!" });
        }
        // --- End Winner Verification ---

        const enrichedSettings = { ...gameSettings, winReason: winReason || 'standard' };

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return (res as any).status(404).json({ message: "User not found for XP update." });

        const report: XpReport = { base: 10, win: 0, elo: 0, efficiency: 0, flawless: 0, comeback: 0, difficulty: 0, gridSize: 0, winLength: 0, obstacles: 0, variant: 0, total: 0 };
        const isWin = (playerRole === Player.X && winner === 'X') || (playerRole === Player.O && winner === 'O');
        
        if (isWin) {
            report.win = 25;
            report.efficiency = Math.max(0, 10 - (moves.length - gameSettings.winLength));
            
            const analysis = analyzeMatch(initialBoard, moves, playerRole as Player, gameSettings);
            if (analysis.isFlawless) report.flawless = 10;
            if (analysis.isComeback) report.comeback = 20;

            // Settings-based bonuses for winning
            report.gridSize = Math.max(0, (gameSettings.boardSize - 3) * 5);
            report.winLength = Math.max(0, (gameSettings.winLength - 3) * 5);
            if (gameSettings.obstacles) report.obstacles = 10;
            if (gameSettings.variant === GameVariant.MISERE) report.variant = 15;
            if (gameMode === GameMode.AI || gameMode === GameMode.CAMPAIGN) {
                switch (gameSettings.difficulty) {
                    case Difficulty.MEDIUM: report.difficulty = 5; break;
                    case Difficulty.HARD: report.difficulty = 10; break;
                    case Difficulty.BOSS: report.difficulty = 25; break;
                    default: report.difficulty = 0;
                }
            }
        }
        report.total = Object.values(report).reduce((a, b) => a + b, 0);
        
        // --- XP & Level Up Logic ---
        let newXp = (user.xp || 0) + report.total;
        let newLevel = user.level || 1;
        let coinBonus = 0;
        let xpForNextLevel = getXPForLevel(newLevel);
        
        while (newXp >= xpForNextLevel) {
            newLevel++;
            newXp -= xpForNextLevel;
            coinBonus += 50;
            xpForNextLevel = getXPForLevel(newLevel);
        }

        const isDraw = winner === 'draw';
        await prisma.user.update({
            where: { id: userId },
            data: {
                wins: { increment: isWin ? 1 : 0 },
                losses: { increment: (!isWin && !isDraw) ? 1 : 0 },
                draws: { increment: isDraw ? 1 : 0 },
                xp: newXp,
                level: newLevel,
                coins: { increment: coinBonus },
            }
        });

        const match = await prisma.match.create({
            data: {
                userId, gameMode, winner, 
                gameSettings: enrichedSettings,
                initialBoard, opponentName, playerRole,
                moves: { create: moves.map((m: any, i: number) => ({ player: m.player, index: m.index, moveNumber: i })) }
            }
        });
        
        (res as any).status(201).json({ ...match, xpReport: report });

    } catch (error) { 
        console.error("Match save error", error);
        (res as any).status(500).json({ message: "🤖 Error saving match." }); 
    }
});

router.get('/matches', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const matches = await prisma.match.findMany({
            where: { userId }, orderBy: { date: 'desc' }, include: { moves: { orderBy: { moveNumber: 'asc' } } }, take: 50
        });
        (res as any).status(200).json(matches);
    } catch (error) { (res as any).status(500).json({ message: "🤖 Error fetching matches." }); }
});

router.get('/matches/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const matchId = (req as any).params.id;
        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: { moves: { orderBy: { moveNumber: 'asc' } } }
        });

        if (!match) {
            return (res as any).status(404).json({ message: "Match not found." });
        }
        
        if (match.userId !== userId) {
            const friendship = await prisma.friendship.findFirst({
                where: {
                    status: 'ACCEPTED',
                    OR: [
                        { senderId: userId, receiverId: match.userId },
                        { senderId: match.userId, receiverId: userId },
                    ]
                }
            });
            if (!friendship) {
                 return (res as any).status(403).json({ message: "Access denied. You can only view your own replays or replays shared by friends." });
            }
        }

        (res as any).status(200).json(match);
    } catch (error) {
        (res as any).status(500).json({ message: "🤖 Error fetching match details." });
    }
});

router.delete('/matches', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        await prisma.match.deleteMany({ where: { userId } });
        (res as any).status(200).json({ message: '🗑️ History cleared.' });
    } catch (error) { (res as any).status(500).json({ message: "🤖 Error clearing history." }); }
});

// --- Progress, Shop & Quests ---

const QUEST_TEMPLATES = [
    { id: 'win_3', desc: "Win 3 Games", type: 'win', target: 3, reward: 50 },
    { id: 'play_5', desc: "Play 5 Matches", type: 'play', target: 5, reward: 40 },
    { id: 'wall_5', desc: "Place 5 Walls", type: 'wall', target: 5, reward: 30 },
    { id: 'destroy_3', desc: "Destroy 3 Pieces", type: 'destroy', target: 3, reward: 30 },
    { id: 'double_3', desc: "Use Double Strike 3x", type: 'double', target: 3, reward: 45 },
    { id: 'convert_2', desc: "Convert 2 Pieces", type: 'convert', target: 2, reward: 60 },
    { id: 'win_5', desc: "Win 5 Games", type: 'win', target: 5, reward: 100 },
    { id: 'play_10', desc: "Play 10 Matches", type: 'play', target: 10, reward: 80 },
    { id: 'destroy_5', desc: "Destroy 5 Pieces", type: 'destroy', target: 5, reward: 60 },
    { id: 'wall_10', desc: "Place 10 Walls", type: 'wall', target: 10, reward: 70 },
    { id: 'win_1', desc: "Win a Game", type: 'win', target: 1, reward: 20 },
    { id: 'play_3', desc: "Play 3 Matches", type: 'play', target: 3, reward: 25 },
    { id: 'double_1', desc: "Use Double Strike", type: 'double', target: 1, reward: 15 },
    { id: 'wall_3', desc: "Place 3 Walls", type: 'wall', target: 3, reward: 20 },
    { id: 'convert_1', desc: "Convert a Piece", type: 'convert', target: 1, reward: 30 },
    { id: 'destroy_1', desc: "Destroy a Piece", type: 'destroy', target: 1, reward: 15 },
    { id: 'win_10', desc: "Win 10 Games", type: 'win', target: 10, reward: 200 },
    { id: 'play_20', desc: "Play 20 Matches", type: 'play', target: 20, reward: 150 },
    { id: 'convert_5', desc: "Convert 5 Pieces", type: 'convert', target: 5, reward: 120 },
    { id: 'destroy_10', desc: "Destroy 10 Pieces", type: 'destroy', target: 10, reward: 100 }
];

const generateQuest = (excludeTemplateIds: string[]): Quest => {
    let available = QUEST_TEMPLATES.filter(t => !excludeTemplateIds.includes(t.id));
    if (available.length === 0) available = QUEST_TEMPLATES;
    const template = available[Math.floor(Math.random() * available.length)];
    return {
        id: `quest-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        description: template.desc,
        target: template.target,
        current: 0,
        reward: template.reward,
        completed: false,
        claimed: false,
        type: template.type as any,
        templateId: template.id
    };
};

const DAILY_REROLL_LIMIT = 2;

router.get('/me/progress', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return (res as any).status(404).json({ message: 'User not found.' });

        let questData = user.questData as any || { lastGenerated: '', quests: [], rerollsRemaining: DAILY_REROLL_LIMIT, pendingGifts: [] };
        const today = new Date().toISOString().split('T')[0];

        if (!questData.lastGenerated || questData.lastGenerated !== today) {
            const newQuests: Quest[] = [];
            for(let i=0; i<3; i++) {
                const currentIds = newQuests.map(q => q.templateId || '');
                newQuests.push(generateQuest(currentIds));
            }
            questData = { ...questData, lastGenerated: today, quests: newQuests, rerollsRemaining: DAILY_REROLL_LIMIT };
            await prisma.user.update({ where: { id: userId }, data: { questData } });
        }

        (res as any).status(200).json({
            coins: user.coins,
            inventory: user.inventory,
            campaignLevel: user.campaignLevel,
            campaignProgress: user.campaignProgress || {},
            quests: questData.quests,
            equippedTheme: user.equippedTheme,
            equippedSkin: user.equippedSkin,
            rerollsRemaining: questData.rerollsRemaining ?? DAILY_REROLL_LIMIT
        });
    } catch (error) { (res as any).status(500).json({ message: "🤖 Error fetching progress." }); }
});

router.post('/me/welcome-bonus', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return (res as any).status(404).json({ message: 'User not found.' });

        const questData = user.questData as any;
        
        if (questData?.welcomeBonus === 'available') {
            const bonusAmount = 500;
            const newQuestData = { ...questData, welcomeBonus: 'claimed' };
            
            await prisma.user.update({
                where: { id: userId },
                data: {
                    coins: { increment: bonusAmount },
                    questData: newQuestData
                }
            });
            
            (res as any).status(200).json({ success: true, coins: user.coins + bonusAmount });
        } else {
            (res as any).status(400).json({ message: "🎁 Welcome bonus already claimed." });
        }
    } catch (error) { (res as any).status(500).json({ message: "🤖 Error claiming bonus." }); }
});

router.post('/shop/buy', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { itemId } = (req as any).body; 
        
        if (!itemId) return (res as any).status(400).json({ message: "⚠️ Invalid item ID." });

        const itemDef = SHOP_CATALOG.find(i => i.id === itemId);
        if (!itemDef) return (res as any).status(400).json({ message: "⚠️ Item does not exist." });

        const cost = itemDef.cost;

        await prisma.$transaction(async (tx: any) => {
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user) throw new Error("User not found.");

            if (user.inventory.includes(itemId)) {
                throw new Error("✅ Item already owned.");
            }

            if (user.coins < cost) {
                throw new Error("💸 Insufficient funds.");
            }

            await tx.user.update({
                where: { id: userId },
                data: { 
                    coins: { decrement: cost }, 
                    inventory: { push: itemId } 
                }
            });
        });
        
        (res as any).status(200).json({ success: true });
    } catch (error: any) { 
        console.error("Shop buy error", error.message);
        if (error.message.includes("Item already owned") || error.message.includes("Insufficient funds")) {
            return (res as any).status(400).json({ message: error.message });
        }
        (res as any).status(500).json({ message: "🤖 Transaction failed." }); 
    }
});

router.post('/shop/equip', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { itemId, type } = (req as any).body;
        
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return (res as any).status(404).json({ message: 'User not found.' });
        
        if (!user.inventory.includes(itemId) && itemId !== 'avatar-1' && itemId !== 'skin-classic' && itemId !== 'theme-default') {
             return (res as any).status(403).json({ message: "🚫 You do not own this item." });
        }

        const updateData: any = {};
        if (type === 'avatar') updateData.avatar = itemId;
        else if (type === 'theme') updateData.equippedTheme = itemId;
        else if (type === 'skin') updateData.equippedSkin = itemId;

        await prisma.user.update({ where: { id: userId }, data: updateData });
        (res as any).status(200).json({ success: true });
    } catch (error) { (res as any).status(500).json({ message: "🤖 Equip failed." }); }
});

router.post('/campaign/complete', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { levelId, moves } = (req as any).body;

        // Server-side validation of reward
        const levelData = CAMPAIGN_LEVELS_DATA.find(l => l.id === levelId);
        if (!levelData) {
            return (res as any).status(404).json({ message: "Invalid campaign level." });
        }
        const reward = levelData.rewardCoins;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return (res as any).status(404).json({ message: 'User not found.' });

        const stars = moves < 10 ? 3 : (moves < 20 ? 2 : 1);
        
        const currentProgress = (user.campaignProgress as any) || {};
        const levelKey = String(levelId);
        const previousStars = currentProgress[levelKey]?.stars || 0;
        
        const newStars = Math.max(previousStars, stars);
        
        const newProgress = {
            ...currentProgress,
            [levelKey]: { stars: newStars }
        };

        const isFirstClear = levelId >= user.campaignLevel;
        
        let newLevel = user.campaignLevel;
        if (levelId === user.campaignLevel) {
            newLevel = user.campaignLevel + 1;
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                campaignLevel: newLevel,
                campaignProgress: newProgress,
                coins: isFirstClear ? { increment: reward } : undefined
            }
        });

        (res as any).status(200).json({ success: true, stars: newStars, newLevel });
    } catch (error) { (res as any).status(500).json({ message: "Error updating campaign." }); }
});

router.post('/quests/progress', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { type } = (req as any).body;
        const amount = 1; // Always increment by 1 to prevent client-side abuse

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return (res as any).status(404).json({ message: 'User not found.' });

        let questData = user.questData as any;
        if (!questData?.quests) return (res as any).status(200).json({ success: true });

        let updated = false;
        const newQuests = questData.quests.map((q: Quest) => {
            if (!q.completed && q.type === type) {
                const newCurrent = Math.min(q.target, q.current + amount);
                if (newCurrent !== q.current) {
                    updated = true;
                    return { ...q, current: newCurrent, completed: newCurrent >= q.target };
                }
            }
            return q;
        });

        if (updated) {
            await prisma.user.update({ where: { id: userId }, data: { questData: { ...questData, quests: newQuests } } });
        }
        (res as any).status(200).json({ success: true, quests: newQuests });
    } catch (error) { (res as any).status(500).json({ message: "Error updating quest." }); }
});

router.post('/quests/claim', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { questId } = (req as any).body;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return (res as any).status(404).json({ message: 'User not found.' });

        let questData = user.questData as any;
        let reward = 0;
        
        const activeQuests = questData.quests as Quest[];
        const questIndex = activeQuests.findIndex(q => q.id === questId);

        if (questIndex > -1 && activeQuests[questIndex].completed && !activeQuests[questIndex].claimed) {
            reward = activeQuests[questIndex].reward;
            const otherTemplateIds = activeQuests.filter(q => q.id !== questId).map(q => q.templateId || '');
            const newQuest = generateQuest(otherTemplateIds);
            activeQuests[questIndex] = newQuest;

            await prisma.user.update({
                where: { id: userId },
                data: { 
                    coins: { increment: reward }, 
                    questData: { ...questData, quests: activeQuests } 
                }
            });
            
            (res as any).status(200).json({ success: true, coins: user.coins + reward, quests: activeQuests });
        } else {
            (res as any).status(400).json({ message: "🚫 Quest not claimable." });
        }
    } catch (error) { (res as any).status(500).json({ message: "🤖 Error claiming quest." }); }
});

router.post('/quests/reroll', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { questId } = (req as any).body;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return (res as any).status(404).json({ message: 'User not found.' });

        let questData = user.questData as any;
        const quests = questData.quests as Quest[];
        const questIndex = quests.findIndex(q => q.id === questId);
        
        if (questIndex === -1) return (res as any).status(404).json({ message: "Quest not found" });
        if (quests[questIndex].completed) return (res as any).status(400).json({ message: "🚫 Cannot reroll completed quest" });

        const currentRerolls = questData.rerollsRemaining ?? 0;
        if (currentRerolls <= 0) {
            return (res as any).status(403).json({ message: "🚫 No rerolls remaining today." });
        }

        const currentTemplateIds = quests.map(q => q.templateId).filter((id): id is string => !!id);
        const newQuest = generateQuest(currentTemplateIds);

        quests[questIndex] = newQuest;
        questData.rerollsRemaining = currentRerolls - 1;

        await prisma.user.update({
            where: { id: userId },
            data: { questData: { ...questData, quests } }
        });

        (res as any).status(200).json({ success: true, quests, rerollsRemaining: questData.rerollsRemaining });
    } catch (error) { (res as any).status(500).json({ message: "🤖 Reroll failed." }); }
});

router.get('/leaderboard', async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { elo: 'desc' },
            take: 50,
            select: { id: true, displayName: true, avatar: true, elo: true, badges: true }
        });
        (res as any).status(200).json(users);
    } catch (error) { (res as any).status(500).json({ message: "🤖 Error fetching leaderboard." }); }
});

export default router;

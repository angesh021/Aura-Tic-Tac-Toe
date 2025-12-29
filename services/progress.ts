







import { UserProgress, GameVariant, Difficulty, ShopItem, CampaignLevel, User, Quest } from '../types';
import { getToken } from './auth';
import { API_URL } from '../utils/config';

const DEFAULT_PROGRESS: UserProgress = {
    coins: 0,
    inventory: ['avatar-1', 'skin-classic', 'theme-default', 'frame-none'],
    campaignLevel: 1,
    campaignProgress: {},
    quests: [],
    lastQuestGeneration: '',
    rerollsRemaining: 2,
    dailyStreak: 0,
    lastDailyReward: '',
    towerFloor: 1
};

export const BIOME_THEMES: Record<string, { colors: string[], bgGradient: string }> = {
    'neon': { 
        colors: ['#22d3ee', '#c084fc', '#0f172a'], 
        bgGradient: 'linear-gradient(135deg, #0f172a 0%, #312e81 100%)'
    },
    'forest': {
        colors: ['#4ade80', '#facc15', '#022c22'], 
        bgGradient: 'linear-gradient(135deg, #022c22 0%, #14532d 100%)'
    },
    'void': {
        colors: ['#f87171', '#e2e8f0', '#000000'], // Red / White / Black
        bgGradient: 'linear-gradient(135deg, #000000 0%, #450a0a 100%)'
    },
    'ascension': {
        colors: ['#fcd34d', '#ffffff', '#fffbeb'], // Gold / White
        bgGradient: 'linear-gradient(135deg, #78350f 0%, #fbbf24 100%)'
    },
    'tower': {
        colors: ['#818cf8', '#f472b6', '#1e1b4b'],
        bgGradient: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)'
    }
};

export const CAMPAIGN_LEVELS: CampaignLevel[] = [
    { id: 1, name: "The Apprentice", description: "Defeat the rookie AI.", bossName: "Strategist Bot", bossAvatar: 'avatar-1', rewardCoins: 50, settings: { boardSize: 3, winLength: 3, obstacles: false, variant: GameVariant.CLASSIC, difficulty: Difficulty.EASY }, isUnlocked: true, isCompleted: false, stars: 0, biome: 'neon' },
    { id: 2, name: "Grid Locked", description: "Navigate through obstacles.", bossName: "Blockade Bot", bossAvatar: 'avatar-3', rewardCoins: 100, settings: { boardSize: 4, winLength: 3, obstacles: true, variant: GameVariant.CLASSIC, difficulty: Difficulty.MEDIUM }, isUnlocked: false, isCompleted: false, stars: 0, biome: 'neon' },
    { id: 3, name: "Misère Master", description: "Inverted rules. Force the AI to win.", bossName: "Trickster Bot", bossAvatar: 'avatar-5', rewardCoins: 150, settings: { boardSize: 3, winLength: 3, obstacles: false, variant: GameVariant.MISERE, difficulty: Difficulty.MEDIUM }, isUnlocked: false, isCompleted: false, stars: 0, biome: 'neon' },
    { id: 4, name: "Mega Board", description: "Larger board, deeper strategy.", bossName: "Visionary Bot", bossAvatar: 'avatar-4', rewardCoins: 250, settings: { boardSize: 5, winLength: 4, obstacles: false, variant: GameVariant.CLASSIC, difficulty: Difficulty.HARD }, isUnlocked: false, isCompleted: false, stars: 0, biome: 'forest' },
    { id: 5, name: "The Grandmaster", description: "The ultimate challenge.", bossName: "Aura Prime", bossAvatar: 'avatar-8', rewardCoins: 500, settings: { boardSize: 3, winLength: 3, obstacles: false, variant: GameVariant.CLASSIC, difficulty: Difficulty.BOSS }, isUnlocked: false, isCompleted: false, stars: 0, biome: 'forest', unlocksItem: 'avatar-3' },
    { id: 6, name: "Speed Demon", description: "Think fast! Blitz rules apply.", bossName: "Turbo Bot", bossAvatar: 'avatar-2', rewardCoins: 300, settings: { boardSize: 4, winLength: 4, obstacles: false, variant: GameVariant.CLASSIC, difficulty: Difficulty.HARD, blitzMode: true, blitzDuration: 60 }, isUnlocked: false, isCompleted: false, stars: 0, biome: 'forest' },
    { id: 7, name: "The Fortress", description: "Heavy obstacles. Watch your step.", bossName: "Gargoyle", bossAvatar: 'avatar-3', rewardCoins: 350, settings: { boardSize: 5, winLength: 4, obstacles: true, variant: GameVariant.CLASSIC, difficulty: Difficulty.HARD }, isUnlocked: false, isCompleted: false, stars: 0, biome: 'void' },
    { id: 8, name: "Chaos Theory", description: "Misère mode with obstacles.", bossName: "Entropy", bossAvatar: 'avatar-5', rewardCoins: 400, settings: { boardSize: 4, winLength: 3, obstacles: true, variant: GameVariant.MISERE, difficulty: Difficulty.HARD }, isUnlocked: false, isCompleted: false, stars: 0, biome: 'void' },
    { id: 9, name: "Titan", description: "Massive scale warfare.", bossName: "Colossus", bossAvatar: 'avatar-6', rewardCoins: 450, settings: { boardSize: 6, winLength: 5, obstacles: false, variant: GameVariant.CLASSIC, difficulty: Difficulty.BOSS }, isUnlocked: false, isCompleted: false, stars: 0, biome: 'void' },
    { id: 10, name: "The Creator", description: "Perfection is required.", bossName: "Zero", bossAvatar: 'avatar-8', rewardCoins: 1000, settings: { boardSize: 4, winLength: 4, obstacles: false, variant: GameVariant.CLASSIC, difficulty: Difficulty.BOSS }, isUnlocked: false, isCompleted: false, stars: 0, biome: 'ascension', unlocksItem: 'frame-gold' },
];

export const generateTowerLevel = (floor: number): CampaignLevel => {
    // Deterministic procedural generation
    const seed = floor * 12345;
    const random = (offset = 0) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
    };

    // Progression:
    // Board size: Starts 3, increases every 5 levels, max 8.
    const boardSize = Math.min(8, 3 + Math.floor((floor - 1) / 5));
    // Difficulty: Cycle through Medium -> Hard -> Boss every 5 levels
    // Every 5th level is a "Boss Floor"
    const isBossFloor = floor % 5 === 0;
    const difficulty = isBossFloor ? Difficulty.BOSS : (floor % 2 === 0 ? Difficulty.HARD : Difficulty.MEDIUM);
    
    // Win Length: Scale with board size, max 5
    const winLength = Math.min(5, boardSize);
    
    // Obstacles: More frequent on higher floors
    const hasObstacles = floor > 3 && random(1) > 0.4;
    
    // Variant: 20% chance of Misere mode on non-boss floors
    const isMisere = !isBossFloor && random(2) > 0.8;

    const bossAvatars = ['avatar-1', 'avatar-2', 'avatar-3', 'avatar-4', 'avatar-5', 'avatar-6', 'avatar-7', 'avatar-8', 'avatar-9', 'avatar-10'];
    const bossAvatar = isBossFloor ? bossAvatars[Math.floor(random(3) * bossAvatars.length)] : 'avatar-3';
    
    const names = ["Sentry", "Guardian", "Warden", "Sentinel", "Keeper", "Watcher", "Protector", "Defender"];
    const bossName = isBossFloor ? `Floor ${floor} Guardian` : `${names[floor % names.length]} mk.${floor}`;

    return {
        id: 1000 + floor, // Arbitrary offset to distinguish from campaign
        name: `Tower Floor ${floor}`,
        description: isBossFloor ? "Boss Floor detected. Extreme caution advised." : `Survive Floor ${floor} to ascend.`,
        bossName: bossName,
        bossAvatar: bossAvatar,
        rewardCoins: floor * 20, // Linear scaling reward
        settings: {
            boardSize,
            winLength,
            obstacles: hasObstacles,
            variant: isMisere ? GameVariant.MISERE : GameVariant.CLASSIC,
            difficulty
        },
        isUnlocked: true,
        isCompleted: false,
        stars: 0,
        biome: 'tower' // Default biome for tower
    };
};

export const SHOP_ITEMS: ShopItem[] = [
    { id: 'powerup-destroy', name: 'Destroyer', type: 'powerup', cost: 500, assetId: 'powerup-destroy', owned: false, description: "Destroy an opponent's piece. Use once per game to open up new lines of attack." },
    { id: 'powerup-wall', name: 'Fortify', type: 'powerup', cost: 500, assetId: 'powerup-wall', owned: false, description: "Place an indestructible wall on any empty square. Perfect for blocking winning moves." },
    { id: 'powerup-double', name: 'Double Strike', type: 'powerup', cost: 750, assetId: 'powerup-double', owned: false, description: "Play two moves in a single turn. Overwhelm your opponent with speed." },
    { id: 'powerup-convert', name: 'Conversion', type: 'powerup', cost: 1000, assetId: 'powerup-convert', owned: false, description: "Convert an opponent's piece into your own. Turn their strength into your weakness." },
    { id: 'avatar-2', name: 'The Maverick', type: 'avatar', cost: 100, assetId: 'avatar-2', owned: false },
    { id: 'avatar-3', name: 'The Guardian', type: 'avatar', cost: 200, assetId: 'avatar-3', owned: false },
    { id: 'avatar-4', name: 'The Visionary', type: 'avatar', cost: 300, assetId: 'avatar-4', owned: false },
    { id: 'avatar-5', name: 'The Catalyst', type: 'avatar', cost: 400, assetId: 'avatar-5', owned: false },
    { id: 'avatar-6', name: 'The Cyber', type: 'avatar', cost: 500, assetId: 'avatar-6', owned: false },
    { id: 'avatar-7', name: 'The Zen', type: 'avatar', cost: 600, assetId: 'avatar-7', owned: false },
    { id: 'avatar-8', name: 'The Enigma', type: 'avatar', cost: 1000, assetId: 'avatar-8', owned: false },
    { id: 'avatar-9', name: 'The Ghost', type: 'avatar', cost: 750, assetId: 'avatar-9', owned: false },
    { id: 'avatar-10', name: 'The King', type: 'avatar', cost: 1200, assetId: 'avatar-10', owned: false },
    { id: 'frame-neon', name: 'Neon Cyber', type: 'frame', cost: 500, assetId: 'frame-neon', owned: false, description: "A high-tech border pulsating with cyan and pink energy. Unlock at Level 5.", unlockLevel: 5 },
    { id: 'frame-gold', name: 'Golden Glory', type: 'frame', cost: 1000, assetId: 'frame-gold', owned: false, description: "Pure shimmering gold for the elite. Unlock at Level 10.", unlockLevel: 10 },
    { id: 'frame-rocket', name: 'To The Moon', type: 'frame', cost: 1500, assetId: 'frame-rocket', owned: false, description: "Blast off with this orbiting rocket frame. Unlock at Level 15.", unlockLevel: 15 },
    { id: 'frame-fire', name: 'Inferno', type: 'frame', cost: 2000, assetId: 'frame-fire', owned: false, description: "A raging fire that never extinguishes. Unlock at Level 20.", unlockLevel: 20 },
    { id: 'frame-vibes', name: 'Good Vibes', type: 'frame', cost: 2500, assetId: 'frame-vibes', owned: false, description: "Positive energy only. Unlock at Level 25.", unlockLevel: 25 },
    { id: 'frame-glitch', name: 'System Failure', type: 'frame', cost: 3000, assetId: 'frame-glitch', owned: false, description: "A corrupted, glitching reality field. Unlock at Level 30.", unlockLevel: 30 },
    { id: 'frame-status', name: 'The Legend', type: 'frame', cost: 4000, assetId: 'frame-status', owned: false, description: "Let everyone know who they are dealing with. Unlock at Level 40.", unlockLevel: 40 },
    { id: 'frame-cosmic', name: 'Cosmic Void', type: 'frame', cost: 5000, assetId: 'frame-cosmic', owned: false, description: "Contains the depth of the universe. Unlock at Level 50.", unlockLevel: 50 },
    { id: 'frame-godlike', name: 'Radiance', type: 'frame', cost: 10000, assetId: 'frame-godlike', owned: false, description: "Blinding holy light. Unlock at Level 100.", unlockLevel: 100 },
    { id: 'theme-neon', name: 'Neon Nights', type: 'theme', cost: 150, assetId: 'theme-neon', owned: false, colors: ['#00f0ff', '#ff00aa', '#0f172a'], bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' },
    { id: 'theme-forest', name: 'Emerald Woods', type: 'theme', cost: 150, assetId: 'theme-forest', owned: false, colors: ['#4ade80', '#fcd34d', '#022c22'], bgGradient: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)' },
    { id: 'theme-sunset', name: 'Solar Flare', type: 'theme', cost: 200, assetId: 'theme-sunset', owned: false, colors: ['#facc15', '#f43f5e', '#451a03'], bgGradient: 'linear-gradient(135deg, #451a03 0%, #7c2d12 100%)' },
    { id: 'theme-ocean', name: 'Deep Blue', type: 'theme', cost: 200, assetId: 'theme-ocean', owned: false, colors: ['#38bdf8', '#818cf8', '#0c4a6e'], bgGradient: 'linear-gradient(135deg, #082f49 0%, #0c4a6e 100%)' },
    { id: 'theme-midnight', name: 'Midnight Run', type: 'theme', cost: 250, assetId: 'theme-midnight', owned: false, colors: ['#c084fc', '#f472b6', '#2e1065'], bgGradient: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)' },
    { id: 'theme-gold', name: 'Midas Touch', type: 'theme', cost: 500, assetId: 'theme-gold', owned: false, colors: ['#fcd34d', '#fbbf24', '#27272a'], bgGradient: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)' },
    { id: 'skin-geo', name: 'Geometric', type: 'skin', cost: 250, assetId: 'skin-geo', owned: false, description: "Minimalist filled shapes for clear visibility." },
    { id: 'skin-emoji', name: 'Elements', type: 'skin', cost: 300, assetId: 'skin-emoji', owned: false, description: "Fire vs Ice. Elemental battle." },
    { id: 'skin-neon', name: 'Neon Tubes', type: 'skin', cost: 400, assetId: 'skin-neon', owned: false, description: "Glowing neon lines that pop." },
    { id: 'skin-golden', name: 'Golden', type: 'skin', cost: 99999, assetId: 'skin-golden', owned: false, description: "A mark of true dedication. Unlocked via Mastery Challenges." },
    { id: 'skin-grandmaster', name: 'Grandmaster', type: 'skin', cost: 99999, assetId: 'skin-grandmaster', owned: false, description: "The ultimate status symbol. Unlocked via Mastery Challenges." },
];

class ProgressService {
    private _cache: UserProgress = DEFAULT_PROGRESS;

    private getHeaders() {
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` };
    }

    async init(): Promise<void> {
        if (!getToken()) return;
        try {
            const res = await fetch(`${API_URL}/me/progress`, { headers: this.getHeaders() });
            if (res.ok) {
                const data = await res.json();
                this._cache = { ...this._cache, ...data };
                this.notifyUpdate();
            }
        } catch (e) { console.error(e); }
    }

    private notifyUpdate() {
        window.dispatchEvent(new Event('aura_progress_update'));
    }

    getProgress(): UserProgress { return { ...this._cache }; }
    getCoins(): number { return this._cache.coins; }
    
    setCoins(amount: number) {
        this._cache.coins = amount;
        this.notifyUpdate();
    }
    
    hasClaimableQuests(): boolean {
        return this._cache.quests.some(q => q.completed && !q.claimed);
    }

    hasDailyRewardAvailable(): boolean {
        if (!this._cache.lastDailyReward) return true;
        const lastDate = new Date(this._cache.lastDailyReward);
        const now = new Date();
        
        // Invalid date check
        if (isNaN(lastDate.getTime())) return true;

        // Use integer math for robust day comparison (must match server logic)
        const dayLast = Math.floor(lastDate.getTime() / 86400000);
        const dayNow = Math.floor(now.getTime() / 86400000);

        return dayNow > dayLast;
    }

    isItemOwned(itemId: string): boolean { 
        // Defaults
        if (itemId === 'avatar-1' || itemId === 'theme-default' || itemId === 'skin-classic' || itemId === 'frame-none') return true;
        return this._cache.inventory.includes(itemId); 
    }

    async purchaseItem(itemId: string): Promise<boolean> {
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item || item.cost === undefined) return false;
        
        // Double check local cache to prevent unnecessary calls
        // Allow re-purchase of powerups (consumables), but block persistent items
        if (item.type !== 'powerup' && this._cache.inventory.includes(itemId)) return false;
        
        // Calculate effective cost (Daily Deal logic)
        let cost = item.cost;
        if (this._cache.dailyShop?.includes(itemId)) {
            cost = Math.floor(cost * 0.7);
        }

        if (this._cache.coins < cost) return false;

        // Optimistic UI Update
        const prevCoins = this._cache.coins;
        this._cache.coins -= cost;
        this._cache.inventory.push(itemId);
        this.notifyUpdate();

        try {
            // Secure Request: Send ONLY item ID. Server determines cost.
            const res = await fetch(`${API_URL}/shop/buy`, {
                method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ itemId })
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Purchase failed");
            }
            return true;
        } catch (e: any) {
            console.error("Purchase failed, rolling back:", e);
            
            // Rollback on error
            this._cache.coins = prevCoins;
            
            // Remove the item we just added (optimistic rollback)
            // Use lastIndexOf to ensure we only remove one instance (important for powerups)
            const indexToRemove = this._cache.inventory.lastIndexOf(itemId);
            if (indexToRemove !== -1) {
                this._cache.inventory.splice(indexToRemove, 1);
            }
            
            this.notifyUpdate();
            
            // Only throw specific errors to be handled by UI, others fail silently after rollback
            if (e.message.includes('Insufficient funds') || e.message.includes('already owned')) {
                 // re-throw to let UI handle message
                 throw e;
            }

            return false;
        }
    }

    async equipItem(itemId: string, type: 'avatar' | 'theme' | 'skin' | 'powerup' | 'frame'): Promise<boolean> {
        // Powerups don't need equipping in this model (they are just unlocked)
        if (type === 'powerup') return true;

        try {
            const res = await fetch(`${API_URL}/shop/equip`, {
                method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ itemId, type })
            });
            return res.ok;
        } catch (e) { return false; }
    }

    async completeLevel(level: CampaignLevel, moveCount: number = 0) {
        // Handle Tower Floor Completion
        if (level.id > 1000) {
            const floor = level.id - 1000;
            // Optimistic Update
            if (floor === (this._cache.towerFloor || 1)) {
                this._cache.coins += level.rewardCoins;
                this._cache.towerFloor = floor + 1;
                this.notifyUpdate();
            }
            
            if (!getToken()) return;
            try {
                await fetch(`${API_URL}/tower/complete`, {
                    method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ floor: floor, reward: level.rewardCoins })
                });
            } catch (e) { console.error(e); }
            return;
        }

        // Standard Campaign Logic
        if (level.id === this._cache.campaignLevel) {
            this._cache.coins += (level.isHardMode ? level.rewardCoins * 2 : level.rewardCoins); 
            // Optimistic loot drop if new completion
            if (level.unlocksItem && !this._cache.inventory.includes(level.unlocksItem)) {
                this._cache.inventory.push(level.unlocksItem);
            }
            this.notifyUpdate();
        }

        if (!getToken()) return;

        try {
            const res = await fetch(`${API_URL}/campaign/complete`, {
                method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ levelId: level.id, reward: level.rewardCoins, moves: moveCount, isHardMode: level.isHardMode })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.newLevel) this._cache.campaignLevel = data.newLevel;
                if (data.stars) {
                    this._cache.campaignProgress[level.id] = { stars: data.stars };
                }
                if (data.unlockedItem) {
                    if (!this._cache.inventory.includes(data.unlockedItem)) {
                        this._cache.inventory.push(data.unlockedItem);
                    }
                }
                this.notifyUpdate();
            }
        } catch (e) { console.error(e); }
    }

    // Sync quests from external source (e.g. Server response from saveMatch)
    syncQuests(serverQuests: Quest[]) {
        if (!serverQuests || !Array.isArray(serverQuests)) return;
        
        const newlyCompleted: Quest[] = [];

        // Identify quests that were just completed on the server
        serverQuests.forEach(sq => {
            const localQ = this._cache.quests.find(lq => lq.id === sq.id);
            if (sq.completed && (!localQ || !localQ.completed) && !sq.claimed) {
                newlyCompleted.push(sq);
            }
        });

        // Replace local state with server state to ensure total sync
        this._cache = { ...this._cache, quests: serverQuests };
        this.notifyUpdate();
        
        // Dispatch events for notifications
        newlyCompleted.forEach(quest => {
            window.dispatchEvent(new CustomEvent('aura_quest_completed', { detail: quest }));
        });
    }

    async updateQuestProgress(type: string, amount: number = 1, localOnly: boolean = false) {
        let updated = false;
        const newlyCompleted: Quest[] = [];

        // Create new array with updated objects (Immutable Update)
        const newQuests = this._cache.quests.map(q => {
            if (!q.completed && q.type === type) {
                const currentVal = typeof q.current === 'number' ? q.current : 0;
                const targetVal = typeof q.target === 'number' ? q.target : 1;
                
                const newCurrent = Math.min(targetVal, currentVal + amount);
                const isCompleted = newCurrent >= targetVal;
                
                if (newCurrent !== currentVal || isCompleted !== q.completed) {
                    updated = true;
                    const updatedQuest = { ...q, current: newCurrent, completed: isCompleted };
                    
                    if (isCompleted && !q.completed) {
                        newlyCompleted.push(updatedQuest);
                    }
                    return updatedQuest;
                }
            }
            return q;
        });
        
        if (updated) {
            this._cache = { ...this._cache, quests: newQuests };
            this.notifyUpdate();
            newlyCompleted.forEach(quest => {
                window.dispatchEvent(new CustomEvent('aura_quest_completed', { detail: quest }));
            });

            // If localOnly is true, we skip the API call. 
            if (!localOnly && getToken()) {
                fetch(`${API_URL}/quests/progress`, {
                    method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ type, amount })
                }).catch(console.error);
            }
        }
    }

    async claimQuest(questId: string): Promise<boolean> {
        // Find quest first
        const questIndex = this._cache.quests.findIndex(q => q.id === questId);
        if (questIndex === -1) return false;
        
        const quest = this._cache.quests[questIndex];
        if (!quest.completed || quest.claimed) return false;
        
        // Optimistic update
        // We set to claimed temporarily, but the server will replace it
        // The coin update is optimistic. The quest list will be replaced on success.
        const multiplier = quest.multiplier || 1;
        const totalReward = Math.floor(quest.reward * multiplier);
        
        const updatedQuests = [...this._cache.quests];
        updatedQuests[questIndex] = { ...quest, claimed: true };
        
        this._cache = { ...this._cache, quests: updatedQuests, coins: this._cache.coins + totalReward };
        this.notifyUpdate();
        
        try {
            const res = await fetch(`${API_URL}/quests/claim`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ questId }) });
            if (res.ok) {
                const data = await res.json();
                if (data.quests) {
                    // Update whole quest list from server response (handles rotation)
                    this._cache = { ...this._cache, quests: data.quests };
                    this.notifyUpdate();
                }
                return true;
            }
            return false;
        } catch (e) { return false; }
    }

    async rerollQuest(questId: string): Promise<boolean> {
        try {
            const res = await fetch(`${API_URL}/quests/reroll`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ questId }) });
            if (res.ok) {
                const data = await res.json();
                const updates: Partial<UserProgress> = { quests: data.quests };
                if (data.rerollsRemaining !== undefined) {
                    updates.rerollsRemaining = data.rerollsRemaining;
                }
                this._cache = { ...this._cache, ...updates };
                this.notifyUpdate();
                return true;
            }
            return false;
        } catch (e) { return false; }
    }

    async claimWelcomeBonus(): Promise<boolean> {
        try {
            const res = await fetch(`${API_URL}/me/welcome-bonus`, { method: 'POST', headers: this.getHeaders() });
            if (res.ok) {
                const data = await res.json();
                if (data.coins !== undefined) {
                    this._cache = { ...this._cache, coins: data.coins };
                    this.notifyUpdate();
                }
                return true;
            }
            return false;
        } catch (e) {
            console.error("Failed to claim welcome bonus", e);
            return false;
        }
    }

    async claimDailyReward(): Promise<{ success: boolean, reward: number, streak: number }> {
        try {
            const res = await fetch(`${API_URL}/me/daily-reward`, { method: 'POST', headers: this.getHeaders() });
            const data = await res.json();
            
            if (res.ok && data.success) {
                this._cache = { 
                    ...this._cache, 
                    coins: this._cache.coins + data.reward,
                    dailyStreak: data.streak,
                    lastDailyReward: data.lastDailyReward 
                };
                this.notifyUpdate();
                return { success: true, reward: data.reward, streak: data.streak };
            }
            console.error("Failed to claim daily reward", data);
            return { success: false, reward: 0, streak: 0 };
        } catch (e) {
            console.error("Error claiming daily reward", e);
            return { success: false, reward: 0, streak: 0 };
        }
    }

    async prestige(): Promise<boolean> {
        try {
            const res = await fetch(`${API_URL}/me/prestige`, { method: 'POST', headers: this.getHeaders() });
            const data = await res.json();
            if (res.ok && data.success) {
                this._cache = { ...this._cache, prestigeLevel: data.prestigeLevel };
                this.notifyUpdate();
                return true;
            }
            return false;
        } catch (e) { return false; }
    }

    async claimSecurityReward(type: 'email' | 'mfa' | 'password'): Promise<{ success: boolean, reward: number }> {
        try {
            const res = await fetch(`${API_URL}/me/security-reward`, { 
                method: 'POST', 
                headers: this.getHeaders(),
                body: JSON.stringify({ type })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                this._cache.coins = data.newBalance;
                this.notifyUpdate();
                return { success: true, reward: data.reward };
            }
            return { success: false, reward: 0 };
        } catch(e) {
            return { success: false, reward: 0 };
        }
    }
}

export const progressService = new ProgressService();
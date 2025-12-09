
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
    lastDailyReward: ''
};

export const CAMPAIGN_LEVELS: CampaignLevel[] = [
    { id: 1, name: "The Apprentice", description: "Defeat the rookie AI.", bossName: "Strategist Bot", bossAvatar: 'avatar-1', rewardCoins: 50, settings: { boardSize: 3, winLength: 3, obstacles: false, variant: GameVariant.CLASSIC, difficulty: Difficulty.EASY }, isUnlocked: true, isCompleted: false, stars: 0 },
    { id: 2, name: "Grid Locked", description: "Navigate through obstacles.", bossName: "Blockade Bot", bossAvatar: 'avatar-3', rewardCoins: 100, settings: { boardSize: 4, winLength: 3, obstacles: true, variant: GameVariant.CLASSIC, difficulty: Difficulty.MEDIUM }, isUnlocked: false, isCompleted: false, stars: 0 },
    { id: 3, name: "Misère Master", description: "Inverted rules. Force the AI to win.", bossName: "Trickster Bot", bossAvatar: 'avatar-5', rewardCoins: 150, settings: { boardSize: 3, winLength: 3, obstacles: false, variant: GameVariant.MISERE, difficulty: Difficulty.MEDIUM }, isUnlocked: false, isCompleted: false, stars: 0 },
    { id: 4, name: "Mega Board", description: "Larger board, deeper strategy.", bossName: "Visionary Bot", bossAvatar: 'avatar-4', rewardCoins: 250, settings: { boardSize: 5, winLength: 4, obstacles: false, variant: GameVariant.CLASSIC, difficulty: Difficulty.HARD }, isUnlocked: false, isCompleted: false, stars: 0 },
    { id: 5, name: "The Grandmaster", description: "The ultimate challenge.", bossName: "Aura Prime", bossAvatar: 'avatar-8', rewardCoins: 500, settings: { boardSize: 3, winLength: 3, obstacles: false, variant: GameVariant.CLASSIC, difficulty: Difficulty.BOSS }, isUnlocked: false, isCompleted: false, stars: 0 },
    // New Levels
    { id: 6, name: "Speed Demon", description: "Think fast! Blitz rules apply.", bossName: "Turbo Bot", bossAvatar: 'avatar-2', rewardCoins: 300, settings: { boardSize: 4, winLength: 4, obstacles: false, variant: GameVariant.CLASSIC, difficulty: Difficulty.HARD, blitzMode: true, blitzDuration: 60 }, isUnlocked: false, isCompleted: false, stars: 0 },
    { id: 7, name: "The Fortress", description: "Heavy obstacles. Watch your step.", bossName: "Gargoyle", bossAvatar: 'avatar-3', rewardCoins: 350, settings: { boardSize: 5, winLength: 4, obstacles: true, variant: GameVariant.CLASSIC, difficulty: Difficulty.HARD }, isUnlocked: false, isCompleted: false, stars: 0 },
    { id: 8, name: "Chaos Theory", description: "Misère mode with obstacles.", bossName: "Entropy", bossAvatar: 'avatar-5', rewardCoins: 400, settings: { boardSize: 4, winLength: 3, obstacles: true, variant: GameVariant.MISERE, difficulty: Difficulty.HARD }, isUnlocked: false, isCompleted: false, stars: 0 },
    { id: 9, name: "Titan", description: "Massive scale warfare.", bossName: "Colossus", bossAvatar: 'avatar-6', rewardCoins: 450, settings: { boardSize: 6, winLength: 5, obstacles: false, variant: GameVariant.CLASSIC, difficulty: Difficulty.BOSS }, isUnlocked: false, isCompleted: false, stars: 0 },
    { id: 10, name: "The Creator", description: "Perfection is required.", bossName: "Zero", bossAvatar: 'avatar-8', rewardCoins: 1000, settings: { boardSize: 4, winLength: 4, obstacles: false, variant: GameVariant.CLASSIC, difficulty: Difficulty.BOSS }, isUnlocked: false, isCompleted: false, stars: 0 },
];

export const SHOP_ITEMS: ShopItem[] = [
    // Power Ups (Unlockables)
    { 
        id: 'powerup-destroy', name: 'Destroyer', type: 'powerup', cost: 500, assetId: 'powerup-destroy', owned: false,
        description: "Destroy an opponent's piece. Use once per game to open up new lines of attack." 
    },
    { 
        id: 'powerup-wall', name: 'Fortify', type: 'powerup', cost: 500, assetId: 'powerup-wall', owned: false,
        description: "Place an indestructible wall on any empty square. Perfect for blocking winning moves." 
    },
    { 
        id: 'powerup-double', name: 'Double Strike', type: 'powerup', cost: 750, assetId: 'powerup-double', owned: false,
        description: "Play two moves in a single turn. Overwhelm your opponent with speed." 
    },
    { 
        id: 'powerup-convert', name: 'Conversion', type: 'powerup', cost: 1000, assetId: 'powerup-convert', owned: false,
        description: "Convert an opponent's piece into your own. Turn their strength into your weakness." 
    },

    // Avatars
    { id: 'avatar-2', name: 'The Maverick', type: 'avatar', cost: 100, assetId: 'avatar-2', owned: false },
    { id: 'avatar-3', name: 'The Guardian', type: 'avatar', cost: 200, assetId: 'avatar-3', owned: false },
    { id: 'avatar-4', name: 'The Visionary', type: 'avatar', cost: 300, assetId: 'avatar-4', owned: false },
    { id: 'avatar-5', name: 'The Catalyst', type: 'avatar', cost: 400, assetId: 'avatar-5', owned: false },
    { id: 'avatar-6', name: 'The Cyber', type: 'avatar', cost: 500, assetId: 'avatar-6', owned: false },
    { id: 'avatar-7', name: 'The Zen', type: 'avatar', cost: 600, assetId: 'avatar-7', owned: false },
    { id: 'avatar-8', name: 'The Enigma', type: 'avatar', cost: 1000, assetId: 'avatar-8', owned: false },
    { id: 'avatar-9', name: 'The Ghost', type: 'avatar', cost: 750, assetId: 'avatar-9', owned: false },
    { id: 'avatar-10', name: 'The King', type: 'avatar', cost: 1200, assetId: 'avatar-10', owned: false },
    
    // Frames
    { id: 'frame-neon', name: 'Neon Cyber', type: 'frame', cost: 500, assetId: 'frame-neon', owned: false, description: "A high-tech border pulsating with cyan and pink energy. Unlock at Level 5.", unlockLevel: 5 },
    { id: 'frame-gold', name: 'Golden Glory', type: 'frame', cost: 1000, assetId: 'frame-gold', owned: false, description: "Pure shimmering gold for the elite. Unlock at Level 10.", unlockLevel: 10 },
    { id: 'frame-rocket', name: 'To The Moon', type: 'frame', cost: 1500, assetId: 'frame-rocket', owned: false, description: "Blast off with this orbiting rocket frame. Unlock at Level 15.", unlockLevel: 15 },
    { id: 'frame-fire', name: 'Inferno', type: 'frame', cost: 2000, assetId: 'frame-fire', owned: false, description: "A raging fire that never extinguishes. Unlock at Level 20.", unlockLevel: 20 },
    { id: 'frame-vibes', name: 'Good Vibes', type: 'frame', cost: 2500, assetId: 'frame-vibes', owned: false, description: "Positive energy only. Unlock at Level 25.", unlockLevel: 25 },
    { id: 'frame-glitch', name: 'System Failure', type: 'frame', cost: 3000, assetId: 'frame-glitch', owned: false, description: "A corrupted, glitching reality field. Unlock at Level 30.", unlockLevel: 30 },
    { id: 'frame-status', name: 'The Legend', type: 'frame', cost: 4000, assetId: 'frame-status', owned: false, description: "Let everyone know who they are dealing with. Unlock at Level 40.", unlockLevel: 40 },
    { id: 'frame-cosmic', name: 'Cosmic Void', type: 'frame', cost: 5000, assetId: 'frame-cosmic', owned: false, description: "Contains the depth of the universe. Unlock at Level 50.", unlockLevel: 50 },
    { id: 'frame-godlike', name: 'Radiance', type: 'frame', cost: 10000, assetId: 'frame-godlike', owned: false, description: "Blinding holy light. Unlock at Level 100.", unlockLevel: 100 },

    // Themes
    { 
        id: 'theme-neon', name: 'Neon Nights', type: 'theme', cost: 150, assetId: 'theme-neon', owned: false, 
        description: "Cyberpunk aesthetics with high contrast neon lights.", 
        colors: ['#00f0ff', '#ff00aa', '#0f172a'], 
        bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' 
    },
    { 
        id: 'theme-forest', name: 'Emerald Woods', type: 'theme', cost: 150, assetId: 'theme-forest', owned: false, 
        description: "Calming nature tones and deep greens.", 
        colors: ['#4ade80', '#fcd34d', '#022c22'], 
        bgGradient: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)'
    },
    { 
        id: 'theme-sunset', name: 'Solar Flare', type: 'theme', cost: 200, assetId: 'theme-sunset', owned: false, 
        description: "Warm, energetic gradients inspired by sunset.", 
        colors: ['#facc15', '#f43f5e', '#451a03'], 
        bgGradient: 'linear-gradient(135deg, #451a03 0%, #7c2d12 100%)'
    },
    { 
        id: 'theme-ocean', name: 'Deep Blue', type: 'theme', cost: 200, assetId: 'theme-ocean', owned: false, 
        description: "Cool, focused blue tones from the abyss.", 
        colors: ['#38bdf8', '#818cf8', '#0c4a6e'], 
        bgGradient: 'linear-gradient(135deg, #082f49 0%, #0c4a6e 100%)'
    },
    { 
        id: 'theme-midnight', name: 'Midnight Run', type: 'theme', cost: 250, assetId: 'theme-midnight', owned: false, 
        description: "Deep purple vaporwave vibes.", 
        colors: ['#c084fc', '#f472b6', '#2e1065'], 
        bgGradient: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)'
    },
    { 
        id: 'theme-gold', name: 'Midas Touch', type: 'theme', cost: 500, assetId: 'theme-gold', owned: false, 
        description: "Luxurious gold for the elite.", 
        colors: ['#fcd34d', '#fbbf24', '#27272a'], 
        bgGradient: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)'
    },

    // Skins
    { id: 'skin-geo', name: 'Geometric', type: 'skin', cost: 250, assetId: 'skin-geo', owned: false, description: "Minimalist filled shapes for clear visibility." },
    { id: 'skin-emoji', name: 'Elements', type: 'skin', cost: 300, assetId: 'skin-emoji', owned: false, description: "Fire vs Ice. Elemental battle." },
    { id: 'skin-neon', name: 'Neon Tubes', type: 'skin', cost: 400, assetId: 'skin-neon', owned: false, description: "Glowing neon lines that pop." },
    // Prestige Skins (Unpurchasable)
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
        const last = new Date(this._cache.lastDailyReward);
        last.setHours(0,0,0,0);
        const today = new Date();
        today.setHours(0,0,0,0);
        return last.getTime() < today.getTime();
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
        if (this._cache.inventory.includes(itemId)) return false;
        if (this._cache.coins < item.cost) return false;

        // Optimistic UI Update
        const prevCoins = this._cache.coins;
        this._cache.coins -= item.cost;
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
            
            // Only throw specific errors to be handled by UI, others fail silently after rollback
            if (e.message.includes('Insufficient funds') || e.message.includes('already owned')) {
                 // re-throw to let UI handle message
                 this._cache.coins = prevCoins;
                 this._cache.inventory = this._cache.inventory.filter(id => id !== itemId);
                 this.notifyUpdate();
                 throw e;
            }

            // Rollback on unknown error
            this._cache.coins = prevCoins;
            this._cache.inventory = this._cache.inventory.filter(id => id !== itemId);
            this.notifyUpdate();
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

    // ... (completeLevel, updateQuestProgress, claimQuest, rerollQuest, claimWelcomeBonus, claimDailyReward, prestige methods remain unchanged)
    async completeLevel(level: CampaignLevel, moveCount: number = 0) {
        this._cache.coins += level.rewardCoins; 
        this.notifyUpdate();

        if (!getToken()) return;

        try {
            const res = await fetch(`${API_URL}/campaign/complete`, {
                method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ levelId: level.id, reward: level.rewardCoins, moves: moveCount })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.newLevel) this._cache.campaignLevel = data.newLevel;
                if (data.stars) {
                    this._cache.campaignProgress[level.id] = { stars: data.stars };
                }
                this.notifyUpdate();
            }
        } catch (e) { console.error(e); }
    }

    async updateQuestProgress(type: string, amount: number = 1) {
        let updated = false;
        const newlyCompleted: string[] = [];

        this._cache.quests.forEach(q => {
            if (!q.completed && q.type === type) {
                const wasCompleted = q.completed;
                q.current = Math.min(q.target, q.current + amount);
                const isCompleted = q.current >= q.target;
                
                if (isCompleted && !wasCompleted) {
                    q.completed = true;
                    newlyCompleted.push(q.description);
                }
                updated = true;
            }
        });
        
        if (updated) {
            this.notifyUpdate();
            newlyCompleted.forEach(desc => {
                window.dispatchEvent(new CustomEvent('aura_quest_completed', { detail: { description: desc } }));
            });

            if (getToken()) {
                fetch(`${API_URL}/quests/progress`, {
                    method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ type, amount })
                }).catch(console.error);
            }
        }
    }

    async claimQuest(questId: string): Promise<boolean> {
        const quest = this._cache.quests.find(q => q.id === questId);
        if (!quest || !quest.completed || quest.claimed) return false;
        
        quest.claimed = true;
        const multiplier = quest.multiplier || 1;
        const totalReward = Math.floor(quest.reward * multiplier);
        this._cache.coins += totalReward;
        this.notifyUpdate();
        
        try {
            const res = await fetch(`${API_URL}/quests/claim`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ questId }) });
            if (res.ok) {
                const data = await res.json();
                if (data.quests) {
                    this._cache.quests = data.quests;
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
                this._cache.quests = data.quests;
                if (data.rerollsRemaining !== undefined) {
                    this._cache.rerollsRemaining = data.rerollsRemaining;
                }
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
                    this._cache.coins = data.coins;
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
                this._cache.coins += data.reward;
                this._cache.dailyStreak = data.streak;
                this._cache.lastDailyReward = new Date().toISOString();
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
                this._cache.prestigeLevel = data.prestigeLevel;
                this.notifyUpdate();
                return true;
            }
            return false;
        } catch (e) { return false; }
    }
}

export const progressService = new ProgressService();






import { BoardState, Player, WinningLine, GameSettings, Badge, User, Move, MatchRecord, ShopItem, Quest, GameMode, Difficulty } from './types';

// ... (Existing checkWinner, findWinningMove, countThreats, getXPForLevel, calculateLevelProgress, analyzeMatch, calculateElo, calculateDrawElo functions remain unchanged)
export const checkWinner = (
  board: BoardState,
  boardSize: number,
  winLength: number
): { winner: Player | 'draw' | null; line: WinningLine | null } => {
  const directions = [
    { r: 0, c: 1 }, // Horizontal
    { r: 1, c: 0 }, // Vertical
    { r: 1, c: 1 }, // Diagonal down-right
    { r: 1, c: -1 }, // Diagonal down-left
  ];

  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      const index = r * boardSize + c;
      const player = board[index];
      
      if (!player || player === 'OBSTACLE') continue;

      for (const dir of directions) {
        const line: number[] = [];
        let win = true;
        for (let i = 0; i < winLength; i++) {
          const newR = r + i * dir.r;
          const newC = c + i * dir.c;
          const newIndex = newR * boardSize + newC;

          if (
            newR < 0 || newR >= boardSize ||
            newC < 0 || newC >= boardSize ||
            board[newIndex] !== player
          ) {
            win = false;
            break;
          }
          line.push(newIndex);
        }
        if (win) {
          return { winner: player as Player, line };
        }
      }
    }
  }

  if (board.every(square => square !== null)) {
    return { winner: 'draw', line: null };
  }

  return { winner: null, line: null };
};

export const findWinningMove = (
  board: BoardState,
  player: Player,
  settings: { boardSize: number; winLength: number }
): number | null => {
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      const tempBoard = [...board];
      tempBoard[i] = player;
      const winnerInfo = checkWinner(tempBoard, settings.boardSize, settings.winLength);
      if (winnerInfo.winner === player) {
        return i;
      }
    }
  }
  return null;
};

// Counts how many immediate winning moves (threats) a player has on the board.
// A "fork" or "trap" is created when this count is 2 or more.
export const countThreats = (board: BoardState, player: Player, settings: { boardSize: number; winLength: number }): number => {
  let threats = 0;
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      const tempBoard = [...board];
      tempBoard[i] = player;
      if (findWinningMove(tempBoard, player, settings) !== null) {
        threats++;
      }
    }
  }
  return threats;
};

export const getXPForLevel = (level: number): number => 100 + (level - 1) * 50;

export const calculateLevelProgress = (currentLevel: number, currentXp: number, xpGained: number) => {
    let level = currentLevel;
    let xp = currentXp + xpGained;
    let req = getXPForLevel(level);

    while (xp >= req) {
        xp -= req;
        level++;
        req = getXPForLevel(level);
    }

    return { newLevel: level, newXp: xp };
};

export function analyzeMatch(
    initialBoard: BoardState, 
    moves: Move[], 
    winner: Player, 
    settings: GameSettings
): { isFlawless: boolean, isComeback: boolean } {
    const loser = winner === Player.X ? Player.O : Player.X;
    let isFlawless = true;
    let isComeback = false;

    let currentBoard = [...initialBoard];

    for (const move of moves) {
        // Check for comeback: did the loser have a winning move right before the winner played?
        if (move.player === winner) {
            if (findWinningMove(currentBoard, loser, settings) !== null) {
                isComeback = true;
            }
        }

        currentBoard[move.index] = move.player;

        // Check for flawless: did the loser ever create a threat?
        // This checks the board state AFTER the loser's move.
        if (move.player === loser) {
            if (findWinningMove(currentBoard, loser, settings) !== null) {
                isFlawless = false;
            }
        }
        if (isComeback) break; // No need to check further if it's a comeback
    }
    
    // A comeback win cannot be a flawless victory by definition
    if(isComeback) {
      isFlawless = false;
    }
    
    return { isFlawless, isComeback };
}


// --- ELO Logic ---
const K_FACTOR = 32;

export const calculateElo = (winnerElo: number, loserElo: number): { winnerNew: number, loserNew: number } => {
    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

    const winnerNew = Math.round(winnerElo + K_FACTOR * (1 - expectedWinner));
    const loserNew = Math.round(loserElo + K_FACTOR * (0 - expectedLoser));

    return { winnerNew, loserNew };
}

export const calculateDrawElo = (p1Elo: number, p2Elo: number): { p1New: number, p2New: number } => {
    const expectedP1 = 1 / (1 + Math.pow(10, (p2Elo - p1Elo) / 400));
    const expectedP2 = 1 / (1 + Math.pow(10, (p1Elo - p2Elo) / 400));

    const p1New = Math.round(p1Elo + K_FACTOR * (0.5 - expectedP1));
    const p2New = Math.round(p2Elo + K_FACTOR * (0.5 - expectedP2));

    return { p1New, p2New };
}

// --- Badge Logic ---
export const AVAILABLE_BADGES: Badge[] = [
    { id: 'rookie', name: 'Rookie', description: 'Completed your first match.', icon: '🐣' },
    { id: 'first_win', name: 'First Blood', description: 'Won your first online match.', icon: '🩸' },
    { id: 'night_owl', name: 'Night Owl', description: 'Won a match after midnight (12AM - 4AM).', icon: '🦉' },
    { id: 'sniper', name: 'Sniper', description: 'Won in 5 moves or less.', icon: '🎯' },
    { id: 'veteran', name: 'Veteran', description: 'Played 10 online matches.', icon: '🎖️' },
    { id: 'peacekeeper', name: 'Peacekeeper', description: 'Achieved 3 draws.', icon: '🕊️' },
    { id: 'marathon', name: 'Marathon', description: 'Won a game that lasted over 20 moves.', icon: '🏃' },
    { id: 'grandmaster', name: 'Grandmaster', description: 'Reached 1200 ELO.', icon: '👑' },
];

export const checkBadges = (user: User, matchData: { winner: boolean, moveCount: number }): string[] => {
    const newBadges: string[] = [];
    const currentBadges = user.badges || [];
    // Approximate total matches including current one
    const totalMatches = user.wins + user.losses + user.draws + 1; 
    const currentHour = new Date().getHours();

    // Helper
    const grant = (id: string) => {
        if (!currentBadges.includes(id)) newBadges.push(id);
    }

    if (totalMatches >= 1) grant('rookie');

    if (matchData.winner) {
        if (user.wins === 0) grant('first_win'); 
        if (matchData.moveCount <= 5) grant('sniper');
        if (matchData.moveCount >= 20) grant('marathon');
        // Night Owl: Win between 00:00 and 04:00 local server time
        if (currentHour >= 0 && currentHour < 4) grant('night_owl');
    }

    if (totalMatches >= 10) grant('veteran');
    
    // Check draws (Note: user.draws is from DB before this match update usually, so we might be off by one if we don't pass isDraw)
    // Assuming this runs after or during update, let's rely on the cumulative count
    if (user.draws >= 3) grant('peacekeeper');
    
    if (user.elo >= 1200) grant('grandmaster');

    return newBadges;
}

// --- Mastery Challenges ---
export const MASTERY_CHALLENGES = [
  { 
      id: 'win_streak_10', 
      name: 'Untouchable', 
      description: 'Achieve a 10-game win streak.', 
      icon: '🔥', 
      unlock: (user: User) => (user.winStreak || 0) >= 10, 
      rewardItemId: 'skin-golden' 
  },
  { 
      id: 'reach_grandmaster', 
      name: 'True Grandmaster', 
      description: 'Reach the Grandmaster rank (2400+ ELO).', 
      icon: '👑', 
      unlock: (user: User) => user.elo >= 2400, 
      rewardItemId: 'skin-grandmaster' 
  },
];

// --- Server-Side Shop Authority ---
export const SHOP_CATALOG: ShopItem[] = [
    // Power Ups
    { id: 'powerup-destroy', name: 'Destroyer', type: 'powerup', cost: 500, assetId: 'powerup-destroy', owned: false },
    { id: 'powerup-wall', name: 'Fortify', type: 'powerup', cost: 500, assetId: 'powerup-wall', owned: false },
    { id: 'powerup-double', name: 'Double Strike', type: 'powerup', cost: 750, assetId: 'powerup-double', owned: false },
    { id: 'powerup-convert', name: 'Conversion', type: 'powerup', cost: 1000, assetId: 'powerup-convert', owned: false },
    
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
    { id: 'frame-neon', name: 'Neon Cyber', type: 'frame', cost: 500, assetId: 'frame-neon', owned: false, unlockLevel: 5 },
    { id: 'frame-gold', name: 'Golden Glory', type: 'frame', cost: 1000, assetId: 'frame-gold', owned: false, unlockLevel: 10 },
    { id: 'frame-rocket', name: 'To The Moon', type: 'frame', cost: 1500, assetId: 'frame-rocket', owned: false, unlockLevel: 15 },
    { id: 'frame-fire', name: 'Inferno', type: 'frame', cost: 2000, assetId: 'frame-fire', owned: false, unlockLevel: 20 },
    { id: 'frame-vibes', name: 'Good Vibes', type: 'frame', cost: 2500, assetId: 'frame-vibes', owned: false, unlockLevel: 25 },
    { id: 'frame-glitch', name: 'System Failure', type: 'frame', cost: 3000, assetId: 'frame-glitch', owned: false, unlockLevel: 30 },
    { id: 'frame-status', name: 'The Legend', type: 'frame', cost: 4000, assetId: 'frame-status', owned: false, unlockLevel: 40 },
    { id: 'frame-cosmic', name: 'Cosmic Void', type: 'frame', cost: 5000, assetId: 'frame-cosmic', owned: false, unlockLevel: 50 },
    { id: 'frame-godlike', name: 'Radiance', type: 'frame', cost: 10000, assetId: 'frame-godlike', owned: false, unlockLevel: 100 },

    // Themes
    { id: 'theme-neon', name: 'Neon Nights', type: 'theme', cost: 150, assetId: 'theme-neon', owned: false },
    { id: 'theme-forest', name: 'Emerald Woods', type: 'theme', cost: 150, assetId: 'theme-forest', owned: false },
    { id: 'theme-sunset', name: 'Solar Flare', type: 'theme', cost: 200, assetId: 'theme-sunset', owned: false },
    { id: 'theme-ocean', name: 'Deep Blue', type: 'theme', cost: 200, assetId: 'theme-ocean', owned: false },
    { id: 'theme-midnight', name: 'Midnight Run', type: 'theme', cost: 250, assetId: 'theme-midnight', owned: false },
    { id: 'theme-gold', name: 'Midas Touch', type: 'theme', cost: 500, assetId: 'theme-gold', owned: false },
    
    // Skins
    { id: 'skin-geo', name: 'Geometric', type: 'skin', cost: 250, assetId: 'skin-geo', owned: false },
    { id: 'skin-emoji', name: 'Elements', type: 'skin', cost: 300, assetId: 'skin-emoji', owned: false },
    { id: 'skin-neon', name: 'Neon Tubes', type: 'skin', cost: 400, assetId: 'skin-neon', owned: false },
];

export const getDailyShopSelection = (): string[] => {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    
    const random = (seed: number) => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    const candidates = SHOP_CATALOG.filter(i => i.cost > 0 && i.type !== 'powerup');
    const selection: string[] = [];
    
    for (let i = 0; i < 4; i++) { 
        if (candidates.length === 0) break;
        const idx = Math.floor(random(seed + i) * candidates.length);
        selection.push(candidates[idx].id);
        candidates.splice(idx, 1); 
    }
    
    return selection;
};

// --- Server-Side Campaign Authority ---
export const CAMPAIGN_LEVELS_DATA = [
    { id: 1, rewardCoins: 50 },
    { id: 2, rewardCoins: 100 },
    { id: 3, rewardCoins: 150 },
    { id: 4, rewardCoins: 250 },
    { id: 5, rewardCoins: 500, unlocksItem: 'avatar-3' },
    { id: 6, rewardCoins: 300 },
    { id: 7, rewardCoins: 350 },
    { id: 8, rewardCoins: 400 },
    { id: 9, rewardCoins: 450 },
    { id: 10, rewardCoins: 1000, unlocksItem: 'frame-gold' },
];

// --- Daily Rewards ---
export const getDailyReward = (streak: number) => {
    const rewards = [50, 100, 150, 200, 250, 300, 1000];
    const index = (streak - 1) % 7; 
    return rewards[index];
};

export const checkDailyStreak = (lastClaimIso: string | undefined): { canClaim: boolean, newStreakAction: 'reset' | 'increment' | 'keep' } => {
    if (!lastClaimIso) return { canClaim: true, newStreakAction: 'reset' };

    const lastDate = new Date(lastClaimIso);
    const now = new Date();

    if (isNaN(lastDate.getTime())) return { canClaim: true, newStreakAction: 'reset' };

    const dayLast = Math.floor(lastDate.getTime() / 86400000);
    const dayNow = Math.floor(now.getTime() / 86400000);
    
    const diff = dayNow - dayLast;

    if (diff === 0) return { canClaim: false, newStreakAction: 'keep' };
    if (diff === 1) return { canClaim: true, newStreakAction: 'increment' };

    return { canClaim: true, newStreakAction: 'reset' };
};

export const checkFirstWin = (lastWinAt: string | undefined): boolean => {
    if (!lastWinAt) return true;
    const last = new Date(lastWinAt);
    const today = new Date();
    return last.getDate() !== today.getDate() || last.getMonth() !== today.getMonth() || last.getFullYear() !== today.getFullYear();
};

// --- Quest Logic ---

const QUEST_TEMPLATES = [
    { type: 'play', description: 'Play 3 Matches', target: 3, reward: 50 },
    { type: 'win', description: 'Win a Match', target: 1, reward: 100 },
    { type: 'draw', description: 'Finish a game in a Draw', target: 1, reward: 150 },
    { type: 'play_online', description: 'Play an Online Match', target: 1, reward: 75 },
    { type: 'win_medium', description: 'Defeat Medium AI', target: 1, reward: 100 },
    { type: 'win_hard', description: 'Defeat Hard AI', target: 1, reward: 200 },
    { type: 'speedster', description: 'Win in under 15 moves', target: 1, reward: 150 },
    { type: 'marathon', description: 'Play a match with >20 moves', target: 1, reward: 100 },
    { type: 'destroy', description: 'Use Destroyer Power-up', target: 1, reward: 150, requiredItem: 'powerup-destroy' },
    { type: 'wall', description: 'Place a Wall', target: 1, reward: 150, requiredItem: 'powerup-wall' },
    { type: 'double', description: 'Use Double Strike', target: 1, reward: 200, requiredItem: 'powerup-double' },
    { type: 'convert', description: 'Use Conversion', target: 1, reward: 250, requiredItem: 'powerup-convert' },
    { type: 'powerup_generic', description: 'Use any Power-up', target: 1, reward: 50 }, 
];

const getStreakMultiplier = (streak: number): number => {
    if (streak <= 0) return 1;
    if (streak % 7 === 0) return 3;
    const chance = Math.min(0.5, 0.05 + (streak * 0.02));
    return Math.random() < chance ? 2 : 1;
};

// Validate if a quest is doable for a user (checks ownership/funds)
export const isQuestDoable = (user: { inventory: string[], coins: number }, template: typeof QUEST_TEMPLATES[0]): boolean => {
    if (!template.requiredItem) return true;
    if (user.inventory.includes(template.requiredItem)) return true;
    
    // Check if user can afford it
    const shopItem = SHOP_CATALOG.find(i => i.id === template.requiredItem);
    if (shopItem && user.coins >= shopItem.cost) return true;
    
    return false;
};

export const generateDailyQuests = (user: { inventory: string[], coins: number, questData?: any }): Quest[] => {
    const streak = user.questData?.dailyStreak || 0;
    
    // Filter templates
    const validTemplates = QUEST_TEMPLATES.filter(t => isQuestDoable(user, t));

    // Shuffle
    const shuffled = validTemplates.sort(() => 0.5 - Math.random());
    
    // Select 3 Unique
    const selected = [];
    const usedTypes = new Set<string>();
    
    for (const t of shuffled) {
        if (!usedTypes.has(t.type)) {
            selected.push(t);
            usedTypes.add(t.type);
        }
        if (selected.length >= 3) break;
    }

    return selected.map(t => ({
        id: Math.random().toString(36).substr(2, 9),
        type: t.type,
        description: t.description,
        current: 0,
        target: t.target,
        reward: t.reward,
        completed: false,
        claimed: false,
        multiplier: getStreakMultiplier(streak)
    }));
};

export const generateSingleQuest = (user: { inventory: string[], coins: number, questData?: any }, excludeTypes: string[] = []): Quest => {
    const streak = user.questData?.dailyStreak || 0;
    
    // Filter: Must be doable AND not in excluded types (uniqueness check)
    const availableTemplates = QUEST_TEMPLATES.filter(t => {
        if (excludeTypes.includes(t.type)) return false;
        return isQuestDoable(user, t);
    });
    
    // Fallback if we somehow run out of unique/doable quests (unlikely with 13 templates and 3 slots)
    // If empty, relax the exclude check but keep doable check
    const pool = availableTemplates.length > 0 
        ? availableTemplates 
        : QUEST_TEMPLATES.filter(t => isQuestDoable(user, t));
        
    const template = pool[Math.floor(Math.random() * pool.length)] || QUEST_TEMPLATES[0]; // Hard fallback
    
    return {
        id: Math.random().toString(36).substr(2, 9),
        type: template.type,
        description: template.description,
        current: 0,
        target: template.target,
        reward: template.reward,
        completed: false,
        claimed: false,
        multiplier: getStreakMultiplier(streak)
    };
}

export const processMatchQuests = (quests: Quest[], matchData: { 
    winner: Player | 'draw', 
    playerRole: Player, 
    gameMode: GameMode,
    difficulty?: Difficulty,
    moveCount?: number,
    powerupsUsed?: { [key: string]: number }
}): Quest[] => {
    return quests.map(q => {
        if (q.completed) return q; // Already done

        let progress = 0;
        
        const winner = matchData.winner;
        const role = matchData.playerRole;
        const isWin = winner === role;
        const isDraw = winner === 'draw';
        const used = matchData.powerupsUsed || {};

        // Helper for case-insensitive mode/difficulty checks
        const checkMode = (mode: GameMode) => {
            return matchData.gameMode === mode || (typeof matchData.gameMode === 'string' && (matchData.gameMode as string).toUpperCase() === mode.toString().toUpperCase());
        };
        
        const checkDifficulty = (diff: Difficulty) => {
            if (!matchData.difficulty) return false;
            return matchData.difficulty === diff || (typeof matchData.difficulty === 'string' && (matchData.difficulty as string).toLowerCase() === diff.toString().toLowerCase());
        };

        switch (q.type) {
            case 'play':
                progress = 1;
                break;
            case 'play_online':
                if (checkMode(GameMode.ONLINE)) progress = 1; 
                break;
            case 'win':
                if (isWin) progress = 1;
                break;
            case 'draw':
                if (isDraw) progress = 1;
                break;
            case 'win_medium':
                if (isWin && checkMode(GameMode.AI) && checkDifficulty(Difficulty.MEDIUM)) progress = 1;
                break;
            case 'win_hard':
                if (isWin && checkMode(GameMode.AI) && checkDifficulty(Difficulty.HARD)) progress = 1;
                break;
            case 'speedster':
                if (isWin && (matchData.moveCount || 0) < 15) progress = 1;
                break;
            case 'marathon':
                if ((matchData.moveCount || 0) > 20) progress = 1;
                break;
            case 'destroy':
                progress = used['destroy'] || 0;
                break;
            case 'wall':
                progress = used['wall'] || 0;
                break;
            case 'double':
                progress = used['double'] || 0;
                break;
            case 'convert':
                progress = used['convert'] || 0;
                break;
            case 'powerup_generic':
                progress = (used['destroy'] || 0) + (used['wall'] || 0) + (used['double'] || 0) + (used['convert'] || 0) + (used['undo'] || 0) + (used['hint'] || 0);
                break;
        }

        if (progress > 0) {
            const currentVal = typeof q.current === 'number' && !isNaN(q.current) ? q.current : 0;
            const targetVal = typeof q.target === 'number' && !isNaN(q.target) ? q.target : 1;
            
            const newCurrent = Math.min(targetVal, currentVal + progress);
            const completed = newCurrent >= targetVal;
            
            return {
                ...q,
                current: newCurrent,
                completed: completed
            };
        }
        return q;
    });
};

// --- Tower Validation Logic ---
export const getTowerReward = (floor: number) => floor * 20;
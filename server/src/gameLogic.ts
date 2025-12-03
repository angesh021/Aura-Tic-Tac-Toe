import { BoardState, Player, WinningLine, GameSettings, Badge, User, Move, MatchRecord } from './types';

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
// This prevents malicious clients from sending { cost: 0 }
export const SHOP_CATALOG = [
    // Power Ups
    { id: 'powerup-destroy', cost: 500 },
    { id: 'powerup-wall', cost: 500 },
    { id: 'powerup-double', cost: 750 },
    { id: 'powerup-convert', cost: 1000 },
    
    // Avatars
    { id: 'avatar-2', cost: 100 },
    { id: 'avatar-3', cost: 200 },
    { id: 'avatar-4', cost: 300 },
    { id: 'avatar-5', cost: 400 },
    { id: 'avatar-6', cost: 500 },
    { id: 'avatar-7', cost: 600 },
    { id: 'avatar-8', cost: 1000 },
    { id: 'avatar-9', cost: 750 },
    { id: 'avatar-10', cost: 1200 },
    
    // Themes
    { id: 'theme-neon', cost: 150 },
    { id: 'theme-forest', cost: 150 },
    { id: 'theme-sunset', cost: 200 },
    { id: 'theme-ocean', cost: 200 },
    { id: 'theme-midnight', cost: 250 },
    { id: 'theme-gold', cost: 500 },
    
    // Skins
    { id: 'skin-geo', cost: 250 },
    { id: 'skin-emoji', cost: 300 },
    { id: 'skin-neon', cost: 400 },
];

// --- Server-Side Campaign Authority ---
export const CAMPAIGN_LEVELS_DATA = [
    { id: 1, rewardCoins: 50 },
    { id: 2, rewardCoins: 100 },
    { id: 3, rewardCoins: 150 },
    { id: 4, rewardCoins: 250 },
    { id: 5, rewardCoins: 500 },
    { id: 6, rewardCoins: 300 },
    { id: 7, rewardCoins: 350 },
    { id: 8, rewardCoins: 400 },
    { id: 9, rewardCoins: 450 },
    { id: 10, rewardCoins: 1000 },
];

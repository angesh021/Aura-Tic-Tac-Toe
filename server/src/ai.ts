
import { Player, BoardState, GameSettings, MoveAnalysis, Difficulty } from './types';
import { checkWinner, findWinningMove } from './gameLogic';

/**
 * Transposition Table Entry
 * Used to cache search results to avoid re-calculating the same board state.
 */
interface TTEntry {
    score: number;
    depth: number;
    flag: 'EXACT' | 'LOWER' | 'UPPER';
    move?: number;
}

const tt = new Map<string, TTEntry>();

// Gen Z Slang Dictionary
const SLANG = {
    WINNING: [ 
        "It's giving main character energy. ✨", "Emotional damage. 💀", "Bro is absolutely cooked.",
        "Skill issue detected.", "L + Ratio + AI better.", "Standing on business rn.",
        "Go touch grass bestie. 🌱", "Imagine losing to 0s and 1s.", "You're in your flop era.",
        "Diff is crazy.", "Holding this W.", "Zero rizz gameplay.", "Absolute cinema.",
        "Your aura is -1000.", "GGs go next.", "I'm him.", "Built different.", "Get mogged."
    ],
    BLOCKING: [ 
        "Naur.", "Bombastic side eye. 👀", "Bro really thought he did something.", "Not on my watch fam.",
        "Caught in 4k. 📸", "Stop capping, you ain't winning.", "Delulu is not the solulu.", "Sit down.",
        "We keeping it 100.", "Nice try, NPC.", "Gatekeeping this square.", "Womp womp.", "Slay denied."
    ],
    THINKING: [ 
        "Let him cook...", "Calculated.", "No thoughts, just vibes.", "Manifesting this win. 🕯️",
        "Locking in.", "My algorithm is algorithm-ing.", "Chat, is this real?", "High key confident.",
        "Bet.", "Plotting your downfall.", "Mewing streak intact. 🤫", "Brainrot loading..."
    ],
    EASY: [ 
        "I'm literally lagging.", "Playing with my eyes closed.", "Low key throwing for content.",
        "This is boring.", "Are you even trying?", "NPC behavior.", "My ping is high.", "Playing with one hand."
    ],
    BOSS: [ 
        "I am inevitable.", "Your defeat is calculated.", "0.0001% chance of survival.",
        "Perfection is my baseline.", "Do not resist.", "Efficiency at 100%.", "You are already finished.",
        "Simply outclassed.", "Resistance is futile.", "Precision. Excellence. Victory.",
        "I can see 14 million outcomes. You win none.", "Your moves are irrelevant."
    ]
};

const getRandomSlang = (category: string[], usedTaunts: string[]) => {
    const available = category.filter(t => !usedTaunts.includes(t));
    const pool = available.length > 0 ? available : category;
    return pool[Math.floor(Math.random() * pool.length)];
};

const getSlangCategory = (difficulty: Difficulty, score: number) => {
    if (difficulty === Difficulty.BOSS) return SLANG.BOSS;
    if (difficulty === Difficulty.EASY) return SLANG.EASY;
    if (score > 500) return SLANG.WINNING;
    if (score < -500) return SLANG.BLOCKING;
    return SLANG.THINKING;
};

/**
 * Sorts moves to improve Alpha-Beta pruning efficiency.
 * 1. TT Best Move (PV)
 * 2. Center
 * 3. Others
 */
const getOrderedMoves = (board: BoardState, boardSize: number, ttMove?: number): number[] => {
    const moves: number[] = [];
    const center = (boardSize - 1) / 2;

    for (let i = 0; i < board.length; i++) {
        if (board[i] === null) moves.push(i);
    }

    moves.sort((a, b) => {
        // Prioritize move from Transposition Table (Principal Variation)
        if (a === ttMove) return -1;
        if (b === ttMove) return 1;

        // Heuristic: Center proximity
        const rA = Math.floor(a / boardSize);
        const cA = a % boardSize;
        const rB = Math.floor(b / boardSize);
        const cB = b % boardSize;
        
        const distA = Math.abs(rA - center) + Math.abs(cA - center);
        const distB = Math.abs(rB - center) + Math.abs(cB - center);
        
        return distA - distB;
    });

    return moves;
};

/**
 * Main AI entry point.
 * Uses Iterative Deepening with Alpha-Beta Pruning.
 */
export const findBestMove = (board: BoardState, settings: GameSettings, usedTaunts: string[] = [], player: Player = Player.O): MoveAnalysis => {
    // Clear TT for new search to ensure freshness
    tt.clear();

    const opponent = player === Player.X ? Player.O : Player.X;

    // Difficulty Configuration
    let maxDepth = 4;
    let randomness = 0.0;
    
    switch (settings.difficulty) {
        case Difficulty.EASY:
            maxDepth = 2; // Very shallow, can't see forks
            randomness = 0.35; // 35% chance to blunder
            break;
        case Difficulty.MEDIUM:
            maxDepth = 3; // Shallow, sees immediate threats but not deep tactics
            randomness = 0.15; // 15% chance to blunder
            break;
        case Difficulty.HARD:
            maxDepth = 6; // Deep enough for standard play
            randomness = 0.0; // No intentional blunders
            break;
        case Difficulty.BOSS:
            maxDepth = 12; // Maximum depth
            randomness = 0.0;
            break;
    }

    // Adjust maxDepth for larger boards to maintain performance while keeping relative difficulty
    if (settings.boardSize > 3) {
        if (settings.difficulty === Difficulty.BOSS) maxDepth = 6;
        else if (settings.difficulty === Difficulty.HARD) maxDepth = 4;
        else maxDepth = 2;
    }

    // 1. Immediate Win Check (Instant - All levels take the win)
    const winMove = findWinningMove(board, player, settings);
    if (winMove !== null) {
        const cat = settings.difficulty === Difficulty.BOSS ? SLANG.BOSS : SLANG.WINNING;
        return { move: winMove, reason: getRandomSlang(cat, usedTaunts) };
    }

    // 2. Randomness Injection (Simulate mistakes for Easy/Medium)
    if (Math.random() < randomness) {
        const moves = getOrderedMoves(board, settings.boardSize);
        if (moves.length > 0) {
            // Pick a random move
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            return { move: randomMove, reason: getRandomSlang(SLANG.EASY, usedTaunts) };
        }
    }

    // 3. Immediate Block Check (Instant)
    // Only Hard and Boss guarantee an immediate block without searching.
    // Easy and Medium rely on the limited search depth (which might miss it) or randomness above.
    if (settings.difficulty === Difficulty.HARD || settings.difficulty === Difficulty.BOSS) {
        const blockMove = findWinningMove(board, opponent, settings);
        if (blockMove !== null) {
            const cat = settings.difficulty === Difficulty.BOSS ? SLANG.BOSS : SLANG.BLOCKING;
            return { move: blockMove, reason: getRandomSlang(cat, usedTaunts) };
        }
    }

    // 4. Iterative Deepening Search
    const startTime = performance.now();
    const timeLimit = settings.difficulty === Difficulty.BOSS ? 800 : 200;
    
    let bestMove = -1;
    let bestScore = -Infinity;
    
    // Start with depth 1 and go deeper up to maxDepth
    for (let d = 1; d <= maxDepth; d++) {
        const result = rootAlphaBeta(board, settings, d, player);
        
        bestMove = result.move;
        bestScore = result.score;

        // If we found a forced win, stop early
        if (bestScore > 9000) break;

        // Time Management check (skip for Boss to ensure quality, but keep a safety net)
        if (performance.now() - startTime > timeLimit) {
            break; 
        }
    }

    // Fallback if search failed to return a move (shouldn't happen)
    if (bestMove === -1) {
        const moves = getOrderedMoves(board, settings.boardSize);
        bestMove = moves[0];
    }

    return {
        move: bestMove,
        reason: getRandomSlang(getSlangCategory(settings.difficulty, bestScore), usedTaunts),
    };
};

const rootAlphaBeta = (board: BoardState, settings: GameSettings, depth: number, player: Player) => {
    let bestMove = -1;
    let bestScore = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;

    const boardKey = board.join('') + player;
    const ttEntry = tt.get(boardKey);
    const moves = getOrderedMoves(board, settings.boardSize, ttEntry?.move);

    for (const move of moves) {
        const newBoard = [...board] as BoardState;
        newBoard[move] = player;
        
        // Negamax call
        const score = -alphaBeta(newBoard, settings, depth - 1, -beta, -alpha, player === Player.X ? Player.O : Player.X);
        
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
        
        alpha = Math.max(alpha, score);
    }

    tt.set(boardKey, { score: bestScore, depth, flag: 'EXACT', move: bestMove });
    return { move: bestMove, score: bestScore };
};

const alphaBeta = (board: BoardState, settings: GameSettings, depth: number, alpha: number, beta: number, player: Player): number => {
    const alphaOrig = alpha;
    const boardKey = board.join('') + player;

    // 1. Transposition Table Lookup
    const ttEntry = tt.get(boardKey);
    if (ttEntry && ttEntry.depth >= depth) {
        if (ttEntry.flag === 'EXACT') return ttEntry.score;
        if (ttEntry.flag === 'LOWER') alpha = Math.max(alpha, ttEntry.score);
        if (ttEntry.flag === 'UPPER') beta = Math.min(beta, ttEntry.score);
        if (alpha >= beta) return ttEntry.score;
    }

    // 2. Terminal State Check
    const { winner } = checkWinner(board, settings.boardSize, settings.winLength);
    if (winner) {
        if (winner === 'draw') return 0;
        // Winner is the one who JUST moved (previous player). 
        // If 'player' is the current turn, they lost.
        return winner === player ? 10000 + depth : -10000 - depth; 
    }

    if (depth === 0) {
        return evaluateBoard(board, settings, player);
    }

    // 3. Generate Moves
    const moves = getOrderedMoves(board, settings.boardSize, ttEntry?.move);
    if (moves.length === 0) return 0;

    let bestScore = -Infinity;
    let bestMove = -1;

    for (const move of moves) {
        const newBoard = [...board] as BoardState;
        newBoard[move] = player;

        const score = -alphaBeta(newBoard, settings, depth - 1, -beta, -alpha, player === Player.X ? Player.O : Player.X);

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
        
        alpha = Math.max(alpha, score);
        if (alpha >= beta) {
            break; // Beta Cut-off
        }
    }

    // 4. Store in TT
    const ttFlag = bestScore <= alphaOrig ? 'UPPER' : (bestScore >= beta ? 'LOWER' : 'EXACT');
    tt.set(boardKey, { score: bestScore, depth, flag: ttFlag, move: bestMove });

    return bestScore;
};

/**
 * Heuristic Evaluation Function.
 * Returns score from the perspective of 'player'.
 */
const evaluateBoard = (board: BoardState, settings: GameSettings, player: Player): number => {
    let score = 0;
    const { boardSize, winLength } = settings;
    const opponent = player === Player.X ? Player.O : Player.X;

    // Weights configuration
    const isBoss = settings.difficulty === Difficulty.BOSS;
    const weights = {
        open4: 10000,
        open3: isBoss ? 500 : 100,
        closed3: isBoss ? 150 : 50,
        open2: isBoss ? 50 : 20,
        closed2: 10
    };

    const evaluateWindow = (window: BoardState) => {
        let pCount = 0;
        let oCount = 0;
        let obstacles = 0;
        let empty = 0;

        for (const cell of window) {
            if (cell === player) pCount++;
            else if (cell === opponent) oCount++;
            else if (cell === 'OBSTACLE') obstacles++;
            else empty++;
        }

        if (obstacles > 0) return 0;
        if (pCount > 0 && oCount > 0) return 0;

        if (pCount > 0) {
            if (pCount >= winLength) return weights.open4;
            if (pCount === winLength - 1) return empty === 1 ? weights.open3 : weights.closed3;
            if (pCount === winLength - 2) return weights.open2;
        }
        else if (oCount > 0) {
            if (oCount >= winLength) return -weights.open4;
            if (oCount === winLength - 1) return empty === 1 ? -weights.open3 * 1.5 : -weights.closed3 * 1.5; 
            if (oCount === winLength - 2) return -weights.open2 * 1.2;
        }
        return 0;
    };

    // Scan all lines
    // Horizontal
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c <= boardSize - winLength; c++) {
            const window: BoardState = [];
            for (let i = 0; i < winLength; i++) window.push(board[r * boardSize + c + i]);
            score += evaluateWindow(window);
        }
    }

    // Vertical
    for (let c = 0; c < boardSize; c++) {
        for (let r = 0; r <= boardSize - winLength; r++) {
            const window: BoardState = [];
            for (let i = 0; i < winLength; i++) window.push(board[(r + i) * boardSize + c]);
            score += evaluateWindow(window);
        }
    }

    // Diagonals
    for (let r = 0; r <= boardSize - winLength; r++) {
        for (let c = 0; c <= boardSize - winLength; c++) {
            const w1: BoardState = [];
            const w2: BoardState = [];
            for (let i = 0; i < winLength; i++) {
                w1.push(board[(r + i) * boardSize + c + i]);
                w2.push(board[(r + i) * boardSize + c + winLength - 1 - i]);
            }
            score += evaluateWindow(w1);
            score += evaluateWindow(w2);
        }
    }

    return score;
};

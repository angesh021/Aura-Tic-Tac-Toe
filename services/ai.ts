
import { BoardState, GameSettings, MoveAnalysis, Player } from '../types';
import { API_URL } from '../utils/config';

/**
 * Calculates the best move for the AI using the server-side logic.
 * This function is now asynchronous and makes a network request.
 *
 * @param board The current state of the game board.
 * @param settings The game settings (difficulty, size, etc.).
 * @param usedTaunts A list of taunts already used in this session to avoid repetition.
 * @param player The AI player (usually 'O').
 * @returns A promise that resolves to the best move index and a reason/taunt.
 */
export const findBestMove = async (
    board: BoardState, 
    settings: GameSettings, 
    usedTaunts: string[] = [], 
    player: Player = Player.O
): Promise<MoveAnalysis> => {
    try {
        const response = await fetch(`${API_URL}/ai/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ board, settings, usedTaunts, player })
        });

        if (!response.ok) {
            throw new Error('AI service failed');
        }

        return await response.json();
    } catch (error) {
        console.error("AI Calculation Error:", error);
        // Fail-safe: If server is unreachable, find the first available empty spot
        // to prevent the game from freezing.
        const emptyIndex = board.findIndex(c => c === null);
        return {
            move: emptyIndex,
            reason: "My brain is offline... playing random."
        };
    }
};

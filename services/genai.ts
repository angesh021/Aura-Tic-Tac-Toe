
import { BoardState, Difficulty } from "../types";
import { API_URL } from '../utils/config';

export const getAuraTaunt = async (
  board: BoardState,
  lastMoveIndex: number,
  isAiMove: boolean,
  difficulty: Difficulty
): Promise<string> => {
  try {
    const response = await fetch(`${API_URL}/taunt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board, lastMoveIndex, isAiMove, difficulty })
    });

    if (!response.ok) {
        return "";
    }

    const data = await response.json();
    return data.text || "";
  } catch (e) {
    console.error("Taunt generation error:", e);
    return "";
  }
};

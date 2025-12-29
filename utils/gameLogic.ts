
import { BoardState, Player, WinningLine } from '../types';

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
      const player = board[r * boardSize + c];
      if (!player || player === 'OBSTACLE') continue;

      for (const dir of directions) {
        const line: number[] = [];
        let win = true;
        for (let i = 0; i < winLength; i++) {
          const newR = r + i * dir.r;
          const newC = c + i * dir.c;
          const index = newR * boardSize + newC;

          if (
            newR < 0 || newR >= boardSize ||
            newC < 0 || newC >= boardSize ||
            board[index] !== player
          ) {
            win = false;
            break;
          }
          line.push(index);
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

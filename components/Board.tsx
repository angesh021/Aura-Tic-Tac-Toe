
import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { BoardState, WinningLine } from '../types';
import Square from './Square';
import { AppContext } from '../contexts/AppContext';

interface BoardProps {
  squares: BoardState;
  boardSize: number;
  onSquareClick: (index: number) => void;
  winningLine: WinningLine | null;
  disabled: boolean;
  hintedSquare: number | null;
  skin?: string;
  isSummary?: boolean;
}

const Board: React.FC<BoardProps> = ({ squares, boardSize, onSquareClick, winningLine, disabled, hintedSquare, skin, isSummary = false }) => {
  const context = useContext(AppContext);
  const gridStyle = { gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` };

  return (
    <div className={`relative bg-white/60 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-lg border border-white/40 dark:border-white/10 transition-colors duration-300 ${isSummary ? 'p-2' : 'p-3'}`}>
        <div className="relative grid" style={gridStyle}>
            {squares.map((value, index) => (
                <div key={index} className="relative">
                    <Square
                        value={value}
                        onClick={() => !disabled && onSquareClick(index)}
                        isWinner={winningLine?.includes(index) ?? false}
                        isHinted={index === hintedSquare}
                        boardSize={boardSize}
                        skin={skin}
                        cursor={disabled ? 'not-allowed' : 'pointer'}
                        isSummary={isSummary}
                    />
                    {!isSummary && context?.preferences.showCoordinates && (
                        <span className="absolute top-2 left-3 text-[10px] font-mono text-gray-500 pointer-events-none opacity-60">
                            {String.fromCharCode(65 + (index % boardSize))}{Math.floor(index / boardSize) + 1}
                        </span>
                    )}
                </div>
            ))}
            {winningLine && <WinningLineIndicator line={winningLine} boardSize={boardSize} />}
        </div>
    </div>
  );
};

const WinningLineIndicator: React.FC<{ line: number[]; boardSize: number }> = ({ line, boardSize }) => {
    if (!line || line.length < 2) return null;
    const sorted = [...line].sort((a, b) => a - b);
    const start = sorted[0];
    const end = sorted[sorted.length - 1];
    const r1 = Math.floor(start / boardSize), c1 = start % boardSize;
    const r2 = Math.floor(end / boardSize), c2 = end % boardSize;
    const step = 100 / boardSize;
    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible filter drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
            {/* Outer Glow Line */}
            <motion.line
                x1={`${(c1 + 0.5) * step}%`} y1={`${(r1 + 0.5) * step}%`}
                x2={`${(c2 + 0.5) * step}%`} y2={`${(r2 + 0.5) * step}%`}
                initial={{ pathLength: 0, opacity: 0 }} 
                animate={{ pathLength: 1, opacity: 0.5 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                stroke="#22d3ee" 
                strokeWidth="16" 
                strokeLinecap="round"
            />
            {/* Inner Core Line */}
            <motion.line
                x1={`${(c1 + 0.5) * step}%`} y1={`${(r1 + 0.5) * step}%`}
                x2={`${(c2 + 0.5) * step}%`} y2={`${(r2 + 0.5) * step}%`}
                initial={{ pathLength: 0, opacity: 0 }} 
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                stroke="white" 
                strokeWidth="6" 
                strokeLinecap="round"
            />
        </svg>
    );
}

export default Board;

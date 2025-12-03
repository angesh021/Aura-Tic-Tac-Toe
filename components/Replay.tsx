
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MatchRecord, BoardState, Player, GameMode } from '../types';
import Board from './Board';
import { HomeIcon, PlayIcon, PauseIcon, NextIcon, PrevIcon, RestartIcon, ArrowLeftIcon } from './Icons';

interface ReplayProps {
    match: MatchRecord;
    onBack: () => void;
    onHome: () => void;
}

const Replay: React.FC<ReplayProps> = ({ match, onBack, onHome }) => {
    const { gameSettings, initialBoard } = match;
    const boardSize = gameSettings?.boardSize || 3;
    
    // Auto-start playback
    const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
    const [board, setBoard] = useState<BoardState>(initialBoard || Array(boardSize * boardSize).fill(null));
    const [isPlaying, setIsPlaying] = useState(true);

    useEffect(() => {
        const baseBoard = initialBoard ? [...initialBoard] : Array(boardSize * boardSize).fill(null);
        if (currentMoveIndex >= 0) {
            for (let i = 0; i <= currentMoveIndex; i++) {
                const move = match.moves[i];
                if (move) {
                    baseBoard[move.index] = move.player;
                }
            }
        }
        setBoard(baseBoard);
    }, [currentMoveIndex, match, initialBoard, boardSize]);
    
    useEffect(() => {
        let timer: number;
        if (isPlaying && currentMoveIndex < match.moves.length - 1) {
            timer = window.setTimeout(() => {
                setCurrentMoveIndex(i => i + 1);
            }, 1000); 
        } else if (currentMoveIndex >= match.moves.length - 1) {
            setIsPlaying(false);
        }
        return () => clearTimeout(timer);
    }, [isPlaying, currentMoveIndex, match.moves.length]);

    const handlePlayPause = () => {
        if (currentMoveIndex >= match.moves.length - 1) {
            // Restart if at the end
            setCurrentMoveIndex(-1);
            setIsPlaying(true);
        } else {
            setIsPlaying(!isPlaying);
        }
    };
    
    const handleNext = () => {
        setIsPlaying(false);
        if (currentMoveIndex < match.moves.length - 1) {
            setCurrentMoveIndex(i => i + 1);
        }
    };

    const handlePrev = () => {
        setIsPlaying(false);
        if (currentMoveIndex > -1) {
            setCurrentMoveIndex(i => i - 1);
        }
    };
    
    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsPlaying(false);
        setCurrentMoveIndex(parseInt(e.target.value, 10) -1);
    }
    
    const statusText = useMemo(() => {
        if (currentMoveIndex === -1) return "Replay starting...";
        
        if(currentMoveIndex === match.moves.length - 1) {
            if (match.winner === 'draw') return "Game ended in a Draw";
            return `Winner: ${match.winner === Player.X ? 'Player X' : 'Player O'}`;
        }
        
        const lastMove = match.moves[currentMoveIndex];
        const nextPlayer = lastMove ? (lastMove.player === Player.X ? Player.O : Player.X) : Player.X;
        return `Player ${nextPlayer}'s turn...`;

    }, [currentMoveIndex, match]);

    const getOpponentName = () => {
        if (match.opponentName) return match.opponentName;
        if (match.gameMode === GameMode.AI) return "Aura (AI)";
        return "Opponent";
    };

    return (
        <motion.div
            className="flex flex-col items-center p-4 md:p-8 w-full max-w-2xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="w-full flex justify-between items-center mb-4 relative z-30">
                <motion.button onClick={onBack} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors" aria-label="Back to List" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                     <ArrowLeftIcon className="w-6 h-6" />
                </motion.button>
                
                <h1 className="text-xl font-bold">Replay vs {getOpponentName()}</h1>
                
                <motion.button onClick={onHome} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors" aria-label="Go Home" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <HomeIcon className="w-6 h-6" />
                </motion.button>
            </div>

            <div className="w-full p-4 mb-4 text-center bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg shadow-lg border border-white/10">
                <h2 className="text-2xl font-bold">{statusText}</h2>
                <p className="text-sm text-gray-400">{new Date(match.date).toLocaleString()}</p>
            </div>
            
            <Board 
                boardSize={boardSize} 
                squares={board} 
                onSquareClick={() => {}} 
                winningLine={null} 
                disabled={true} 
                hintedSquare={null}
            />

            <div className="w-full mt-6 p-4 bg-white/10 dark:bg-black/20 rounded-lg">
                <div className="flex items-center justify-center gap-6">
                     <motion.button whileTap={{scale:0.9}} onClick={handlePrev} disabled={currentMoveIndex < 0} className="disabled:opacity-30 p-2 text-white"><PrevIcon className="w-8 h-8" /></motion.button>
                     
                     <motion.button whileTap={{scale:0.9}} onClick={handlePlayPause} className="p-4 bg-cyan-500 rounded-full shadow-lg shadow-cyan-500/40 hover:bg-cyan-400 transition-colors">
                        {isPlaying ? <PauseIcon className="w-8 h-8 text-white"/> : (currentMoveIndex >= match.moves.length - 1 ? <RestartIcon className="w-8 h-8 text-white"/> : <PlayIcon className="w-8 h-8 text-white"/>)}
                     </motion.button>
                     
                     <motion.button whileTap={{scale:0.9}} onClick={handleNext} disabled={currentMoveIndex >= match.moves.length - 1} className="disabled:opacity-30 p-2 text-white"><NextIcon className="w-8 h-8" /></motion.button>
                </div>
                
                <div className="flex items-center gap-3 mt-6">
                    <span className="text-xs font-mono w-8 text-center">{currentMoveIndex + 1}</span>
                    <div className="relative w-full h-2 bg-gray-600/50 rounded-lg overflow-hidden">
                        <motion.div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentMoveIndex + 1) / match.moves.length) * 100}%` }}
                            transition={{ ease: "linear", duration: isPlaying ? 1 : 0.2 }}
                        />
                        <input
                            type="range"
                            min="0"
                            max={match.moves.length}
                            value={currentMoveIndex + 1}
                            onChange={handleSliderChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>
                    <span className="text-xs font-mono w-8 text-center">{match.moves.length}</span>
                </div>
            </div>
        </motion.div>
    );
};

export default Replay;


import React from 'react';
import { motion } from 'framer-motion';
import { GameSettings, PowerUp } from '../../types';
import { PauseIcon, CoinIcon, PotOfGoldIcon } from '../Icons';
import { formatTime } from './utils';

interface GameStatusProps {
    isPaused: boolean;
    pauseReason?: 'double_down' | 'disconnect';
    isOnline: boolean;
    gameSettings: GameSettings;
    currentPlayerName: string;
    activePowerUp: PowerUp | null;
    pot?: number;
    turnTimer: number;
    turnDuration: number;
}

const GameStatus: React.FC<GameStatusProps> = ({ 
    isPaused, pauseReason, isOnline, gameSettings, currentPlayerName, activePowerUp, pot, turnTimer, turnDuration 
}) => {
    if (isPaused) {
        const isDoubleDown = pauseReason === 'double_down';
        
        return (
            <div className={`px-6 py-3 rounded-xl backdrop-blur-md border shadow-sm text-center animate-pulse relative
                ${isDoubleDown ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-red-500/20 border-red-500/30'}
            `}>
                <h2 className={`text-sm md:text-xl font-bold tracking-tight flex items-center gap-2 justify-center
                    ${isDoubleDown ? 'text-yellow-400' : 'text-red-400'}
                `}>
                    {isDoubleDown ? <CoinIcon className="w-5 h-5" /> : <PauseIcon className="w-5 h-5" />}
                    {isDoubleDown ? "DOUBLE DOWN" : "GAME PAUSED"}
                </h2>
                <div className={`text-xs font-mono mt-1 ${isDoubleDown ? 'text-yellow-200/80' : 'text-red-200/80'}`}>
                    {isDoubleDown ? "Waiting for response..." : "Opponent Disconnected..."}
                </div>
            </div>
        );
    }

    let statusText = gameSettings.blitzMode ? "Blitz Mode" : `${currentPlayerName}'s Turn`;
    if (activePowerUp === 'destroy') statusText = "Select Target!";
    else if (activePowerUp === 'wall') statusText = "Place Wall!";
    else if (activePowerUp === 'double') statusText = "Double Strike Ready!";
    else if (activePowerUp === 'convert') statusText = "Select Piece to Convert!";

    return (
        <div className={`relative px-6 py-2 rounded-xl backdrop-blur-md border shadow-sm text-center transition-all duration-300 flex flex-col items-center gap-1 min-h-[56px] justify-center
            ${activePowerUp ? 'bg-red-500/20 border-red-500/30' : 'bg-white/70 dark:bg-black/40 border-white/20 dark:border-white/10'}
        `}>
            <h2 className={`text-sm md:text-lg font-bold tracking-tight whitespace-nowrap ${activePowerUp ? 'text-red-500 animate-pulse' : 'text-gray-800 dark:text-gray-200'}`}>
                {statusText}
            </h2>
            
            {!isOnline || (isOnline && !gameSettings.blitzMode) ? (
                <div className="flex items-center gap-2 justify-center w-full">
                    <div className="h-1.5 w-24 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden relative">
                        <motion.div 
                            className={`h-full rounded-full ${turnTimer < 5 ? 'bg-red-500' : 'bg-cyan-500 dark:bg-cyan-400'}`}
                            initial={false}
                            animate={{ width: `${(turnTimer / turnDuration) * 100}%` }}
                            transition={{ duration: turnTimer === turnDuration ? 0.3 : 1, ease: "linear" }}
                        />
                    </div>
                    <span className={`text-[10px] font-mono font-bold w-6 text-left ${turnTimer < 10 ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
                        {formatTime(turnTimer)}
                    </span>
                </div>
            ) : null}
        </div>
    );
};

export default GameStatus;

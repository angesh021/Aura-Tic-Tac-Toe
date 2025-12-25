
import React from 'react';
import { motion } from 'framer-motion';
import { GameMode, GameSettings, GameVariant, Player, Difficulty } from '../types';
import { GridIcon, TrophyIcon, ClockIcon, SkullIcon, LightningIcon, ObstacleIcon, PlayIcon, CloseIcon, InfoIcon } from './Icons';

interface PreGameSummaryProps {
    mode: GameMode;
    settings: GameSettings;
    playerNames: { [key in Player]?: string };
    onStart: () => void;
    onCancel: () => void;
}

const PreGameSummary: React.FC<PreGameSummaryProps> = ({ mode, settings, playerNames, onStart, onCancel }) => {
    
    const getRules = () => {
        const rules = [];
        
        // Win Condition
        if (settings.variant === GameVariant.MISERE) {
            rules.push({
                icon: <SkullIcon className="w-5 h-5 text-pink-500" />,
                text: `Avoid getting ${settings.winLength} in a row. If you complete a line, you LOSE.`,
                highlight: true
            });
        } else {
            rules.push({
                icon: <TrophyIcon className="w-5 h-5 text-yellow-500" />,
                text: `Connect ${settings.winLength} symbols in a row (Horizontal, Vertical, or Diagonal) to WIN.`
            });
        }

        // Timer Rules
        if (settings.blitzMode) {
            rules.push({
                icon: <ClockIcon className="w-5 h-5 text-red-500" />,
                text: `Blitz Mode: Each player has a total bank of ${settings.blitzDuration || 180} seconds. If your time runs out, you forfeit.`,
                highlight: true
            });
        } else if (mode === GameMode.ONLINE) {
            rules.push({
                icon: <ClockIcon className="w-5 h-5 text-blue-400" />,
                text: "Standard Timer: You have 30 seconds per turn. Don't keep them waiting!",
            });
        } else {
             rules.push({
                icon: <ClockIcon className="w-5 h-5 text-blue-400" />,
                text: "Turn Timer: 30 seconds per move.",
            });
        }

        // Obstacles
        if (settings.obstacles) {
            rules.push({
                icon: <ObstacleIcon className="w-5 h-5 text-orange-500" />,
                text: "Obstacles are active! Some squares are blocked and cannot be used.",
            });
        }

        // AI specific
        if (mode === GameMode.AI) {
            rules.push({
                icon: <LightningIcon className="w-5 h-5 text-purple-500" />,
                text: `AI Difficulty: ${settings.difficulty}. ${getDifficultyTip(settings.difficulty)}`
            });
        }

        return rules;
    };

    const getDifficultyTip = (diff: Difficulty) => {
        switch(diff) {
            case Difficulty.EASY: return "Don't worry, it makes mistakes.";
            case Difficulty.MEDIUM: return "Stay sharp!";
            case Difficulty.HARD: return "It will punish bad moves.";
            case Difficulty.BOSS: return "Good luck. You'll need it.";
        }
    };

    return (
        <motion.div 
            className="w-full max-w-2xl p-8 bg-white/20 dark:bg-black/30 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
        >
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold tracking-tighter mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                    Match Overview
                </h1>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Review settings before starting</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Config Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-gray-700 dark:text-white flex items-center gap-2 uppercase text-sm tracking-wider">
                        <GridIcon className="w-4 h-4" /> Configuration
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Mode</span>
                            <span className="font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">{mode === GameMode.AI ? 'Solo vs AI' : 'Local PvP'}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Grid</span>
                            <span className="font-mono font-bold">{settings.boardSize} x {settings.boardSize}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Win Condition</span>
                            <span className="font-mono font-bold">{settings.winLength} in a row</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Players</span>
                            <span className="text-right">
                                <div className="text-brand-x font-bold">{playerNames[Player.X] || 'Player X'}</div>
                                <div className="text-brand-o font-bold">{playerNames[Player.O] || (mode === GameMode.AI ? 'Aura (AI)' : 'Player O')}</div>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Housekeeping Rules */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-gray-700 dark:text-white flex items-center gap-2 uppercase text-sm tracking-wider">
                        <InfoIcon className="w-4 h-4" /> Housekeeping Rules
                    </h3>
                    <div className="space-y-3">
                        {getRules().map((rule, idx) => (
                            <div key={idx} className={`flex gap-3 text-sm leading-relaxed ${rule.highlight ? 'bg-red-500/10 p-2 rounded-lg -mx-2 border border-red-500/20' : ''}`}>
                                <div className="shrink-0 mt-0.5">{rule.icon}</div>
                                <span className={`dark:text-gray-300 ${rule.highlight ? 'font-bold text-red-400' : ''}`}>{rule.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-col-reverse md:flex-row gap-4 pt-4 border-t border-white/10">
                <button 
                    onClick={onCancel}
                    className="flex-1 py-4 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                    <CloseIcon className="w-5 h-5" /> Cancel
                </button>
                <button 
                    onClick={onStart}
                    className="flex-[2] py-4 rounded-xl font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg hover:shadow-green-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    <PlayIcon className="w-5 h-5" /> Start Game
                </button>
            </div>
        </motion.div>
    );
};

export default PreGameSummary;

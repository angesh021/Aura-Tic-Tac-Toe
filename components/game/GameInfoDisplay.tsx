
import React from 'react';
import { motion } from 'framer-motion';
import { GameMode, CampaignLevel, GameSettings, GameVariant } from '../../types';
import { MapIcon, TrophyIcon, SkullIcon, ClockIcon, LightningIcon, ObstacleIcon, PotOfGoldIcon, CoinIcon } from '../Icons';

interface GameInfoDisplayProps {
    gameMode: GameMode;
    settings: GameSettings;
    campaignLevel?: CampaignLevel;
    pot?: number;
    className?: string;
}

const GameInfoDisplay: React.FC<GameInfoDisplayProps> = ({ gameMode, settings, campaignLevel, pot, className }) => {
    
    // Default layout classes if none provided
    const containerClasses = className !== undefined 
        ? className 
        : "mb-2 z-30 pointer-events-none max-w-md w-full px-4 hidden md:block";

    // Campaign Specific Display
    if (gameMode === GameMode.CAMPAIGN && campaignLevel) {
        return (
            <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={containerClasses}
            >
                <div className="flex items-center gap-2 md:gap-3 bg-gray-900/60 border border-orange-500/30 px-3 py-1.5 md:px-4 md:py-2 rounded-xl backdrop-blur-md shadow-xl mx-auto w-fit">
                    <div className="shrink-0 bg-gradient-to-br from-orange-500 to-red-600 p-1 md:p-1.5 rounded-lg md:rounded-xl shadow-inner">
                        <MapIcon className="w-3 h-3 md:w-4 md:h-4 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-[8px] md:text-[10px] font-black text-orange-400 uppercase tracking-widest">LEVEL {campaignLevel.id}</span>
                            <span className="text-xs md:text-sm font-bold text-white">{campaignLevel.name}</span>
                        </div>
                        <div className="text-[9px] md:text-[10px] text-gray-300 font-medium leading-tight mt-0.5 truncate max-w-[200px]">
                            {campaignLevel.description}
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Standard / Online / Local Display
    const isMisere = settings.variant === GameVariant.MISERE;
    const isBlitz = settings.blitzMode;
    const winLen = settings.winLength;
    
    let modeLabel = "MATCH";
    let modeColor = "text-gray-400";
    
    if (gameMode === GameMode.ONLINE) {
        modeLabel = isBlitz ? "ONLINE BLITZ" : "ONLINE RANKED";
        modeColor = isBlitz ? "text-red-400" : "text-cyan-400";
    } else if (gameMode === GameMode.LOCAL) {
        modeLabel = "LOCAL DUEL";
        modeColor = "text-purple-400";
    } else if (gameMode === GameMode.AI) {
        modeLabel = `VS AI (${settings.difficulty.toUpperCase()})`;
        modeColor = "text-indigo-400";
    }

    const objectiveText = isMisere 
        ? <span>Avoid <span className="text-pink-400 font-bold">{winLen}</span> in a row!</span>
        : <span>Connect <span className="text-yellow-400 font-bold">{winLen}</span> to Win!</span>;

    const objectiveIcon = isMisere 
        ? <SkullIcon className="w-3.5 h-3.5 text-pink-400" />
        : <TrophyIcon className="w-3.5 h-3.5 text-yellow-400" />;

    return (
        <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={containerClasses}
        >
            <div className="flex flex-col justify-center bg-gray-900/80 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md shadow-xl mx-auto w-fit min-w-[200px] h-full min-h-[56px]">
                {/* Row 1: Mode Label + Pot (if online) */}
                <div className="flex items-center justify-between gap-4 mb-1 border-b border-white/5 pb-1">
                    <div className={`text-[9px] font-black uppercase tracking-[0.2em] ${modeColor}`}>
                        {modeLabel}
                    </div>
                    
                    {pot !== undefined && pot > 0 && (
                        <div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded-full border border-yellow-500/20 shadow-inner">
                            <span className="text-yellow-400 font-black text-xs tabular-nums">{pot}</span>
                            <PotOfGoldIcon className="w-3.5 h-3.5" />
                        </div>
                    )}
                </div>
                
                {/* Row 2: Objective + Modifiers */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        {objectiveIcon}
                        <span className="text-xs font-bold text-white tracking-wide">{objectiveText}</span>
                    </div>

                    <div className="flex flex-wrap justify-end gap-1">
                        {settings.obstacles && (
                            <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[8px] font-bold text-gray-300" title="Obstacles">
                                <ObstacleIcon className="w-2.5 h-2.5" />
                            </div>
                        )}
                        {settings.powerUps && (
                            <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[8px] font-bold text-gray-300" title="Power-Ups">
                                <LightningIcon className="w-2.5 h-2.5" />
                            </div>
                        )}
                        {settings.blitzMode && (
                            <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold text-red-300" title="Blitz">
                                <ClockIcon className="w-2.5 h-2.5" />
                            </div>
                        )}
                        {isMisere && (
                            <div className="flex items-center gap-1 bg-pink-500/10 border border-pink-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold text-pink-300" title="Misère">
                                <SkullIcon className="w-2.5 h-2.5" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default GameInfoDisplay;

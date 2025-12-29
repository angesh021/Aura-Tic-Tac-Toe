


import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CAMPAIGN_LEVELS, progressService, generateTowerLevel } from '../services/progress';
import { CampaignLevel, Difficulty } from '../types';
import { LockIcon, SwordIcon, TrophyIcon, HomeIcon, StarIcon, PlayIcon, SkullIcon, LightningIcon, TowerIcon, CoinIcon } from './Icons'; // Assuming TowerIcon added or use generic
import { UserAvatar } from './Avatars';
import Modal from './Modal';

interface CampaignMapProps {
    onSelectLevel: (level: CampaignLevel) => void;
    onBack: () => void;
}

const CampaignMap: React.FC<CampaignMapProps> = ({ onSelectLevel, onBack }) => {
    const [progress, setProgress] = useState(progressService.getProgress());
    const [selectedLevel, setSelectedLevel] = useState<CampaignLevel | null>(null);
    const [isHardMode, setIsHardMode] = useState(false);
    const [showTowerModal, setShowTowerModal] = useState(false);

    useEffect(() => {
        setProgress(progressService.getProgress());
    }, []);

    const handleLevelClick = (level: CampaignLevel) => {
        const isUnlocked = level.id <= progress.campaignLevel;
        if (isUnlocked) {
            // Apply Hard Mode modifiers if active
            if (isHardMode) {
                setSelectedLevel({
                    ...level,
                    isHardMode: true,
                    rewardCoins: level.rewardCoins * 2,
                    settings: { ...level.settings, difficulty: Difficulty.BOSS }
                });
            } else {
                setSelectedLevel(level);
            }
        }
    };

    const handleTowerClick = () => {
        const currentFloor = progress.towerFloor || 1;
        const level = generateTowerLevel(currentFloor);
        setSelectedLevel(level);
    };

    const getStarCount = (levelId: number) => {
        return progress.campaignProgress?.[levelId]?.stars || 0;
    };

    const campaignCompleted = progress.campaignLevel > 10;

    return (
        <>
        <motion.div 
            className="w-full max-w-4xl p-4 md:p-8 bg-white/10 dark:bg-black/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 h-full flex flex-col relative overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-8 relative z-10 shrink-0 gap-4">
                <div>
                    <h1 className={`text-2xl md:text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r ${isHardMode ? 'from-red-500 to-purple-600' : 'from-orange-400 to-red-600'}`}>
                        {isHardMode ? 'New Game+' : 'Campaign'}
                    </h1>
                    <p className="text-gray-400 text-xs md:text-sm font-bold uppercase tracking-widest">{isHardMode ? 'Hard Mode Active' : 'World Map'}</p>
                </div>
                
                <div className="flex gap-3">
                    {campaignCompleted && (
                        <button 
                            onClick={() => setIsHardMode(!isHardMode)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${isHardMode ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}
                        >
                            {isHardMode ? 'Normal Mode' : 'Hard Mode'}
                        </button>
                    )}
                    <button onClick={onBack} className="p-2 md:p-3 rounded-full bg-white/10 hover:bg-white/20">
                        <HomeIcon className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 px-2 md:px-4 pb-20">
                {/* Central Path Line */}
                <div className={`absolute left-4 md:left-1/2 top-10 bottom-10 w-1 ${isHardMode ? 'bg-red-500/20' : 'bg-white/10'} md:-translate-x-1/2 rounded-full pointer-events-none`} />

                {/* Infinite Tower Entry - Only visible if campaign done */}
                {campaignCompleted && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-center mb-12"
                    >
                        <button 
                            onClick={handleTowerClick}
                            className="relative group w-full md:max-w-md"
                        >
                            <div className="absolute inset-0 bg-purple-500/20 rounded-3xl blur-xl group-hover:bg-purple-500/30 transition-all"></div>
                            <div className="relative bg-gradient-to-br from-indigo-900 to-purple-900 border border-purple-500/50 p-6 rounded-3xl flex items-center gap-6 shadow-2xl overflow-hidden group-hover:scale-[1.02] transition-transform">
                                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                    <LightningIcon className="w-32 h-32" />
                                </div>
                                
                                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center border border-purple-500/30 shadow-lg shrink-0">
                                    {/* Using LightningIcon as placeholder for Tower */}
                                    <LightningIcon className="w-8 h-8 text-purple-300" />
                                </div>
                                
                                <div className="text-left">
                                    <div className="text-purple-300 font-bold text-xs uppercase tracking-widest mb-1">Endgame Content</div>
                                    <h3 className="text-2xl font-black text-white mb-1">The Infinite Tower</h3>
                                    <p className="text-gray-400 text-xs">Floor {progress.towerFloor || 1} • Procedural Levels</p>
                                </div>
                            </div>
                        </button>
                    </motion.div>
                )}

                <div className="space-y-8 md:space-y-16 py-4 md:py-8">
                    {CAMPAIGN_LEVELS.map((level, index) => {
                        // In Hard Mode, all levels are unlocked if campaign is completed (which is condition for Hard Mode)
                        const isUnlocked = isHardMode ? true : level.id <= progress.campaignLevel;
                        const stars = getStarCount(level.id);
                        const alignLeft = index % 2 === 0;

                        return (
                            <motion.div 
                                key={level.id}
                                initial={{ opacity: 0, x: 0, y: 20 }}
                                animate={{ opacity: 1, x: 0, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`flex md:items-center ${alignLeft ? 'md:justify-start' : 'md:justify-end'} relative pl-12 md:pl-0`}
                            >
                                <div 
                                    className={`
                                        w-full md:max-w-[45%] p-4 md:p-5 rounded-2xl border relative transition-all duration-300 group
                                        ${isUnlocked 
                                            ? (isHardMode 
                                                ? 'bg-red-900/20 border-red-500/30 hover:bg-red-900/30 cursor-pointer hover:-translate-y-1 shadow-lg'
                                                : 'bg-white/10 border-white/10 hover:bg-white/15 cursor-pointer hover:-translate-y-1 shadow-lg') 
                                            : 'bg-black/20 border-white/5 opacity-50 grayscale cursor-not-allowed'
                                        }
                                    `}
                                    onClick={() => handleLevelClick(level)}
                                >
                                    {/* Star Display - Only show in normal mode or track separate hard mode stars later */}
                                    {!isHardMode && isUnlocked && stars > 0 && (
                                        <div className="absolute -top-2 right-2 md:-top-3 md:right-4 flex gap-1 bg-black/50 px-1.5 py-0.5 md:px-2 md:py-1 rounded-full border border-white/10 backdrop-blur-md">
                                            {[1,2,3].map(s => (
                                                <StarIcon key={s} className={`w-3 h-3 md:w-4 md:h-4 ${s <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                                            ))}
                                        </div>
                                    )}
                                    
                                    {isHardMode && (
                                        <div className="absolute -top-2 right-2 bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded-full shadow-lg border border-red-400">
                                            BOSS
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full border-2 ${isUnlocked ? (isHardMode ? 'border-red-500' : 'border-orange-400') : 'border-gray-600'} overflow-hidden bg-black/40 shrink-0`}>
                                            <UserAvatar avatarId={level.bossAvatar} className="w-full h-full" />
                                        </div>
                                        
                                        <div className="min-w-0">
                                            <div className={`text-[10px] md:text-xs font-bold uppercase tracking-wider mb-0.5 md:mb-1 ${isHardMode ? 'text-red-400' : 'text-orange-400'}`}>Level {level.id}</div>
                                            <h3 className={`text-base md:text-lg font-bold leading-tight truncate ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                                                {level.name}
                                            </h3>
                                            {isUnlocked && (
                                                <div className="flex items-center gap-2 mt-1 md:mt-2 text-xs text-gray-400">
                                                    <SwordIcon className="w-3 h-3" /> <span className="truncate">{level.bossName}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Node Dot */}
                                <div className={`absolute top-1/2 left-4 md:left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 md:w-6 md:h-6 rounded-full border-2 md:border-4 border-gray-900 z-20 flex items-center justify-center
                                    ${stars > 0 ? 'bg-green-500' : isUnlocked ? (isHardMode ? 'bg-red-500' : 'bg-orange-500') : 'bg-gray-700'}
                                `}>
                                    {!isUnlocked && <LockIcon className="w-2 h-2 md:w-3 md:h-3 text-black" />}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </motion.div>

        {/* Level Start Modal */}
        <AnimatePresence>
            {selectedLevel && (
                <Modal onClose={() => setSelectedLevel(null)}>
                    <div className="text-center">
                        <div className={`w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 rounded-full border-4 ${selectedLevel.id > 1000 ? 'border-purple-500/50' : 'border-orange-500/30'} overflow-hidden shadow-xl`}>
                            <UserAvatar avatarId={selectedLevel.bossAvatar} className="w-full h-full" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white mb-1">{selectedLevel.name}</h2>
                        <p className={`font-bold text-xs md:text-sm uppercase mb-4 ${selectedLevel.id > 1000 ? 'text-purple-400' : 'text-orange-400'}`}>VS {selectedLevel.bossName}</p>
                        
                        <p className="text-gray-300 mb-6 leading-relaxed text-sm md:text-base">{selectedLevel.description}</p>

                        <div className="grid grid-cols-2 gap-2 md:gap-3 mb-6 md:mb-8">
                            <div className="bg-white/5 p-2 md:p-3 rounded-xl border border-white/5">
                                <div className="text-[10px] md:text-xs text-gray-500 uppercase font-bold">Grid</div>
                                <div className="text-base md:text-lg font-mono font-bold text-white">{selectedLevel.settings.boardSize}x{selectedLevel.settings.boardSize}</div>
                            </div>
                            <div className="bg-white/5 p-2 md:p-3 rounded-xl border border-white/5">
                                <div className="text-[10px] md:text-xs text-gray-500 uppercase font-bold">Target</div>
                                <div className="text-base md:text-lg font-mono font-bold text-white">{selectedLevel.settings.winLength}</div>
                            </div>
                            <div className="bg-white/5 p-2 md:p-3 rounded-xl border border-white/5">
                                <div className="text-[10px] md:text-xs text-gray-500 uppercase font-bold">Difficulty</div>
                                <div className={`text-base md:text-lg font-bold ${selectedLevel.settings.difficulty === 'Boss' ? 'text-red-500' : 'text-yellow-400'}`}>{selectedLevel.settings.difficulty}</div>
                            </div>
                            <div className="bg-white/5 p-2 md:p-3 rounded-xl border border-white/5">
                                <div className="text-[10px] md:text-xs text-gray-500 uppercase font-bold">Reward</div>
                                <div className="text-base md:text-lg font-bold text-yellow-400 flex justify-center items-center gap-1">
                                    {selectedLevel.rewardCoins} <CoinIcon className="w-3 h-3 md:w-4 md:h-4"/>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setSelectedLevel(null)} className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:bg-white/10 text-sm md:text-base">Cancel</button>
                            <button 
                                onClick={() => { onSelectLevel(selectedLevel); setSelectedLevel(null); }}
                                className={`flex-[2] py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 text-sm md:text-base
                                    ${selectedLevel.id > 1000 
                                        ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20'
                                        : (selectedLevel.isHardMode 
                                            ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20' 
                                            : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20')
                                    }
                                `}
                            >
                                <SwordIcon className="w-4 h-4 md:w-5 md:h-5" /> 
                                {selectedLevel.id > 1000 ? 'Ascend' : (selectedLevel.isHardMode ? 'Fight Boss' : 'Battle')}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </AnimatePresence>
        </>
    );
};

export default CampaignMap;


import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CAMPAIGN_LEVELS, progressService } from '../services/progress';
import { CampaignLevel } from '../types';
import { LockIcon, SwordIcon, TrophyIcon, HomeIcon, StarIcon, PlayIcon } from './Icons';
import { UserAvatar } from './Avatars';
import Modal from './Modal';

interface CampaignMapProps {
    onSelectLevel: (level: CampaignLevel) => void;
    onBack: () => void;
}

const CampaignMap: React.FC<CampaignMapProps> = ({ onSelectLevel, onBack }) => {
    const [progress, setProgress] = useState(progressService.getProgress());
    const [selectedLevel, setSelectedLevel] = useState<CampaignLevel | null>(null);

    useEffect(() => {
        setProgress(progressService.getProgress());
    }, []);

    const handleLevelClick = (level: CampaignLevel) => {
        const isUnlocked = level.id <= progress.campaignLevel;
        if (isUnlocked) setSelectedLevel(level);
    };

    const getStarCount = (levelId: number) => {
        return progress.campaignProgress?.[levelId]?.stars || 0;
    };

    return (
        <>
        <motion.div 
            className="w-full max-w-4xl p-4 md:p-8 bg-white/10 dark:bg-black/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 h-full flex flex-col relative overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="flex justify-between items-center mb-4 md:mb-8 relative z-10 shrink-0">
                <div>
                    <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">
                        Campaign
                    </h1>
                    <p className="text-gray-400 text-xs md:text-sm font-bold uppercase tracking-widest">World Map</p>
                </div>
                <button onClick={onBack} className="p-2 md:p-3 rounded-full bg-white/10 hover:bg-white/20">
                    <HomeIcon className="w-5 h-5 md:w-6 md:h-6" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 px-2 md:px-4 pb-20">
                {/* Central Path Line */}
                <div className="absolute left-4 md:left-1/2 top-10 bottom-10 w-1 bg-white/10 md:-translate-x-1/2 rounded-full pointer-events-none" />

                <div className="space-y-8 md:space-y-16 py-4 md:py-8">
                    {CAMPAIGN_LEVELS.map((level, index) => {
                        const isUnlocked = level.id <= progress.campaignLevel;
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
                                            ? 'bg-white/10 border-white/10 hover:bg-white/15 cursor-pointer hover:-translate-y-1 shadow-lg' 
                                            : 'bg-black/20 border-white/5 opacity-50 grayscale cursor-not-allowed'
                                        }
                                    `}
                                    onClick={() => handleLevelClick(level)}
                                >
                                    {/* Star Display */}
                                    {isUnlocked && stars > 0 && (
                                        <div className="absolute -top-2 right-2 md:-top-3 md:right-4 flex gap-1 bg-black/50 px-1.5 py-0.5 md:px-2 md:py-1 rounded-full border border-white/10 backdrop-blur-md">
                                            {[1,2,3].map(s => (
                                                <StarIcon key={s} className={`w-3 h-3 md:w-4 md:h-4 ${s <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full border-2 ${isUnlocked ? 'border-orange-400' : 'border-gray-600'} overflow-hidden bg-black/40 shrink-0`}>
                                            <UserAvatar avatarId={level.bossAvatar} className="w-full h-full" />
                                        </div>
                                        
                                        <div className="min-w-0">
                                            <div className="text-[10px] md:text-xs font-bold text-orange-400 uppercase tracking-wider mb-0.5 md:mb-1">Level {level.id}</div>
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
                                
                                {/* Node Dot - Left aligned on mobile, Center on desktop */}
                                <div className={`absolute top-1/2 left-4 md:left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 md:w-6 md:h-6 rounded-full border-2 md:border-4 border-gray-900 z-20 flex items-center justify-center
                                    ${stars > 0 ? 'bg-green-500' : isUnlocked ? 'bg-orange-500' : 'bg-gray-700'}
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
                        <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 rounded-full border-4 border-orange-500/30 overflow-hidden shadow-xl">
                            <UserAvatar avatarId={selectedLevel.bossAvatar} className="w-full h-full" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white mb-1">{selectedLevel.name}</h2>
                        <p className="text-orange-400 font-bold text-xs md:text-sm uppercase mb-4">VS {selectedLevel.bossName}</p>
                        
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
                                    {selectedLevel.rewardCoins} <TrophyIcon className="w-3 h-3 md:w-4 md:h-4"/>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setSelectedLevel(null)} className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:bg-white/10 text-sm md:text-base">Cancel</button>
                            <button 
                                onClick={() => { onSelectLevel(selectedLevel); setSelectedLevel(null); }}
                                className="flex-[2] py-3 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 text-sm md:text-base"
                            >
                                <PlayIcon className="w-4 h-4 md:w-5 md:h-5" /> Battle
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

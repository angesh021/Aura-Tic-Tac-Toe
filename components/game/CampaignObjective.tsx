
import React from 'react';
import { motion } from 'framer-motion';
import { GameMode, CampaignLevel } from '../../types';
import { MapIcon } from '../Icons';

interface CampaignObjectiveProps {
    gameMode: GameMode;
    campaignLevel?: CampaignLevel;
}

const CampaignObjective: React.FC<CampaignObjectiveProps> = ({ gameMode, campaignLevel }) => {
    if (gameMode !== GameMode.CAMPAIGN || !campaignLevel) return null;
    return (
        <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2 z-30 pointer-events-none max-w-sm w-full px-4 md:px-0"
        >
            <div className="flex items-center gap-3 bg-gray-900/60 border border-orange-500/30 px-4 py-2 rounded-xl backdrop-blur-md shadow-lg mx-auto w-fit">
                <div className="shrink-0 bg-gradient-to-br from-orange-500 to-red-600 p-1.5 rounded-lg shadow-inner">
                    <MapIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">LVL {campaignLevel.id}</span>
                        <span className="text-xs font-bold text-white">{campaignLevel.name}</span>
                    </div>
                    <div className="text-[10px] text-gray-300 font-medium leading-tight">
                        {campaignLevel.description}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default CampaignObjective;

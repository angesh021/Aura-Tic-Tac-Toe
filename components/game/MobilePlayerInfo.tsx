
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, PlayerSeat } from '../../types';
import { UserAvatar } from '../Avatars';

interface MobilePlayerInfoProps {
    player: Player;
    isActive: boolean;
    seat?: PlayerSeat;
    fallbackName: string;
    avatarId: string;
    frameId?: string;
    blitzTime?: string;
    label: string;
    currentEmote?: string;
}

const MobilePlayerInfo: React.FC<MobilePlayerInfoProps> = ({ 
    player, isActive, seat, fallbackName, avatarId, frameId, blitzTime, label, currentEmote 
}) => {
    let statusText = "PLAYING";
    if (label === "YOU") statusText = "YOUR TURN";
    else if (label === "AURA AI" || label === "BOSS") statusText = "THINKING...";

    return (
        <div className={`flex items-center gap-2 relative transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-60 grayscale'}`}>
            {isActive && (
                 <div className="absolute -top-5 left-0 w-full flex justify-center z-20">
                     <div className={`text-[8px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wider shadow-sm animate-pulse whitespace-nowrap ${player === Player.X ? 'bg-cyan-500 text-black' : 'bg-pink-500 text-white'}`}>
                        {statusText}
                     </div>
                 </div>
            )}
            <div className="relative">
                <div className={`relative w-8 h-8 rounded-full border ${player === Player.X ? 'border-cyan-500' : 'border-pink-500'} overflow-hidden bg-black/20`}>
                    <UserAvatar avatarId={avatarId} frameId={frameId} className="w-full h-full" />
                </div>
                <AnimatePresence>
                    {currentEmote && (
                        <motion.div 
                            initial={{ opacity: 0, y: 0, scale: 0.5 }}
                            animate={{ opacity: 1, y: 30, scale: 2 }} 
                            exit={{ opacity: 0, y: 40, scale: 1.5 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="absolute top-full left-1/2 -translate-x-1/2 text-4xl z-50 pointer-events-none drop-shadow-md"
                        >
                            {currentEmote}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <div className="flex flex-col">
                <span className={`text-xs font-bold max-w-[80px] truncate ${player === Player.X ? 'text-cyan-400' : 'text-pink-400'}`}>
                    {seat?.user.displayName || fallbackName}
                </span>
                {blitzTime && <span className="text-[10px] font-mono text-white">{blitzTime}</span>}
            </div>
        </div>
    );
};

export default MobilePlayerInfo;

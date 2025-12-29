
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, PlayerSeat } from '../../types';
import { UserAvatar } from '../Avatars';
import { XIcon, OIcon, GiftIcon } from '../Icons';
import { getRank } from '../../utils/badgeData';

interface PlayerInfoPanelProps {
    seat?: PlayerSeat;
    fallbackName: string;
    role: Player;
    isActive: boolean;
    label: string;
    avatarId: string;
    frameId?: string;
    elo?: number;
    currentEmote?: string;
    onGift?: () => void;
}

const PlayerInfoPanel: React.FC<PlayerInfoPanelProps> = ({ 
    seat, fallbackName, role, isActive, label, avatarId, frameId, elo, currentEmote, onGift 
}) => {
    const isConnected = seat ? seat.connected : true;
    const rank = elo !== undefined ? getRank(elo) : null;
    const customStatus = seat?.user?.customStatus;
    
    let statusText = "PLAYING";
    if (label === "YOU") statusText = "YOUR TURN";
    else if (label === "AURA AI" || label === "BOSS") statusText = "THINKING...";
    
    return (
        <div className={`relative p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center w-32 md:w-40 mt-8
            ${isActive 
                ? (role === Player.X ? 'bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]' : 'bg-pink-500/10 border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.15)]')
                : 'bg-white/5 border-white/5 opacity-80 grayscale-[0.5]'
            }
        `}>
            {isActive && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 animate-bounce w-max">
                    <div className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-lg border flex items-center justify-center gap-1
                        ${role === Player.X ? 'bg-cyan-500 text-gray-900 border-cyan-400' : 'bg-pink-500 text-white border-pink-400'}
                    `}>
                        {statusText}
                    </div>
                    <div className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] mx-auto -mt-[1px]
                        ${role === Player.X ? 'border-t-cyan-500' : 'border-t-pink-500'}
                    `}></div>
                </div>
            )}

            <div className={`absolute -top-3 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border
                ${role === Player.X ? 'bg-cyan-900 text-cyan-400 border-cyan-900' : 'bg-pink-900 text-pink-400 border-pink-900'}
            `}>
                {label}
            </div>

            <div className="relative mb-3 group">
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full p-1 border-2 ${role === Player.X ? 'border-cyan-500' : 'border-pink-500'} overflow-hidden`}>
                    <UserAvatar avatarId={avatarId} frameId={frameId} className="w-full h-full rounded-full" />
                </div>
                {!isConnected && (
                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <span className="text-[10px] font-bold text-red-500 uppercase">Offline</span>
                    </div>
                )}
                
                {onGift && (
                    <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer backdrop-blur-sm" onClick={onGift}>
                        <GiftIcon className="w-6 h-6 text-yellow-400 drop-shadow-md" />
                    </div>
                )}

                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center text-xs shadow-md">
                    {role === Player.X ? <XIcon className="w-3 h-3 text-cyan-400" /> : <OIcon className="w-3 h-3 text-pink-400" />}
                </div>
                
                <AnimatePresence>
                    {currentEmote && (
                        <motion.div 
                            initial={{ opacity: 0, y: 0, scale: 0.5 }}
                            animate={{ opacity: 1, y: -60, scale: 2 }}
                            exit={{ opacity: 0, y: -80, scale: 1.5 }}
                            transition={{ duration: 2, ease: "easeOut" }}
                            className="absolute top-0 left-1/2 -translate-x-1/2 text-5xl pointer-events-none z-50 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"
                        >
                            {currentEmote}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="text-center w-full">
                <div className="font-bold text-sm md:text-base truncate w-full px-1">{seat?.user.displayName || fallbackName}</div>
                {customStatus && (
                    <div className="text-[10px] text-gray-400 italic truncate max-w-full px-1 mb-1">"{customStatus}"</div>
                )}
                {rank ? (
                    <div className="flex flex-col items-center mt-0.5">
                        <div className={`text-[10px] font-bold ${rank.color} flex items-center gap-1`}>
                            <span>{rank.icon}</span>
                            <span>{rank.name}</span>
                        </div>
                        <div className="text-[9px] font-mono text-gray-500">ELO {elo}</div>
                    </div>
                ) : (
                    elo !== undefined && <div className="text-[10px] font-mono text-gray-500">ELO {elo}</div>
                )}
            </div>
        </div>
    );
};

export default PlayerInfoPanel;


import React, { useEffect, useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { Player, Room } from '../types';
import { UserAvatar } from './Avatars';
import { CoinIcon, CheckIcon, CopyIcon, LinkIcon, PotOfGoldIcon } from './Icons';
import { useToast } from '../contexts/ToastContext';
import CoinTransferAnimation from './CoinTransferAnimation';
import { progressService } from '../services/progress';
import { AppContext } from '../contexts/AppContext';

interface WagerConfirmationProps {
    room: Room;
    currentUserId: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const PlayerCard: React.FC<{
    playerSeat?: Room['players'][0],
    role: Player,
    isConfirmed?: boolean,
    isCurrentUser: boolean,
    onConfirm?: () => void
}> = ({ playerSeat, role, isConfirmed, isCurrentUser, onConfirm }) => {
    const isReady = !!playerSeat;
    const color = role === Player.X ? 'cyan' : 'pink';

    return (
        <div className={`relative flex-1 bg-gradient-to-b from-${color}-900/40 to-transparent p-6 rounded-3xl border-2 border-${color}-500/50 shadow-2xl shadow-${color}-500/10`}>
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-${color}-400 blur-md`}></div>

            <div className="flex flex-col items-center">
                <div className="relative mb-4">
                    <div className={`w-24 h-24 rounded-full border-4 border-${color}-500 bg-black/40 p-1 shadow-lg`}>
                        {isReady && <UserAvatar avatarId={playerSeat.user.avatar} className="w-full h-full rounded-full" />}
                    </div>
                    {isConfirmed && (
                        <motion.div 
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-green-500 border-2 border-slate-900 flex items-center justify-center"
                        >
                            <CheckIcon className="w-5 h-5 text-white" />
                        </motion.div>
                    )}
                </div>
                <h3 className="text-lg font-bold text-white truncate max-w-[150px]">{isReady ? playerSeat.user.displayName : 'Waiting...'}</h3>
                <p className={`text-xs font-bold text-${color}-400`}>{isReady ? `ELO ${playerSeat.user.elo}` : '...'}</p>
                
                {isCurrentUser && isReady && (
                    <motion.button
                        onClick={onConfirm}
                        disabled={isConfirmed}
                        whileHover={{ scale: isConfirmed ? 1 : 1.05 }}
                        whileTap={{ scale: isConfirmed ? 1 : 0.95 }}
                        className={`mt-6 w-full py-3 rounded-xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-2
                            ${isConfirmed 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default' 
                                : `bg-${color}-600 hover:bg-${color}-500 text-white border border-transparent shadow-lg shadow-${color}-500/20`
                            }
                        `}
                    >
                        {isConfirmed ? 'Locked In' : 'Lock In'}
                    </motion.button>
                )}
            </div>
        </div>
    );
};

const WagerConfirmation: React.FC<WagerConfirmationProps> = ({ room, currentUserId, onConfirm, onCancel }) => {
    const playerX = room.players.find(p => p.role === Player.X);
    const playerO = room.players.find(p => p.role === Player.O);
    const mySeat = room.players.find(p => p.user.id === currentUserId);
    const myRole = mySeat?.role;
    const toast = useToast();
    const app = useContext(AppContext);
    
    const [showCoinAnim, setShowCoinAnim] = useState(false);
    const [hasAnimated, setHasAnimated] = useState(false);

    const isConfirmed = myRole && room.wagerConfirmed?.[myRole];
    const bothConfirmed = room.wagerConfirmed?.[Player.X] && room.wagerConfirmed?.[Player.O];

    useEffect(() => {
        if (isConfirmed && !hasAnimated) {
            setShowCoinAnim(true);
            setHasAnimated(true);
        }
    }, [isConfirmed, hasAnimated]);

    const handleAnimComplete = () => {
        setShowCoinAnim(false);
        // Explicitly fetch latest progress to ensure balance is correct after animation
        // This acts as a backup in case the socket event was missed or overwritten
        progressService.init();
    };

    const copyRoomCode = () => {
        navigator.clipboard.writeText(room.id);
        toast.success("Room Code copied!");
    };

    const copyInviteLink = () => {
        const url = `${window.location.origin}?room=${room.id}`;
        navigator.clipboard.writeText(url);
        toast.success("Invite link copied!");
    };
    
    // Pot Display: Trust the server room.pot which now updates incrementally
    // Fallback logic kept just in case of race condition or lag
    const currentPot = room.pot > 0 ? room.pot : (
        (room.wagerConfirmed?.['X'] ? room.anteAmount || 0 : 0) +
        (room.wagerConfirmed?.['O'] ? room.anteAmount || 0 : 0)
    );
    
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl mx-auto p-6"
        >
            {showCoinAnim && room.anteAmount && (
                <CoinTransferAnimation 
                    amount={room.anteAmount} 
                    startId="header-coin-balance"
                    endId="wager-pot-display"
                    onComplete={handleAnimComplete} 
                />
            )}

            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-2 rounded-full mb-4">
                    <span className="text-gray-400 font-bold text-sm tracking-widest">CODE: <span className="text-white font-mono">{room.id}</span></span>
                    <div className="h-4 w-px bg-white/20"></div>
                    <div className="flex gap-2">
                        <button onClick={copyRoomCode} className="text-gray-400 hover:text-white transition-colors" title="Copy Code"><CopyIcon className="w-4 h-4"/></button>
                        <button onClick={copyInviteLink} className="text-gray-400 hover:text-cyan-400 transition-colors" title="Copy Link"><LinkIcon className="w-4 h-4"/></button>
                    </div>
                </div>

                <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500">
                    WAGER MATCH
                </h1>
                <p className="text-gray-400 font-medium">Both players must lock in to begin.</p>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mt-8">
                <PlayerCard 
                    playerSeat={playerX}
                    role={Player.X}
                    isConfirmed={room.wagerConfirmed?.['X']}
                    isCurrentUser={mySeat?.role === Player.X}
                    onConfirm={onConfirm}
                />
                
                <div id="wager-pot-display" className="flex flex-col items-center justify-center text-center shrink-0">
                    <motion.div 
                        key={currentPot}
                        initial={{ scale: 1 }}
                        animate={{ scale: [1, 1.1, 1] }}
                        className="mb-2 relative"
                    >
                        <PotOfGoldIcon className="w-24 h-24 drop-shadow-2xl" />
                        <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full -z-10 animate-pulse"></div>
                    </motion.div>
                    <motion.div 
                        key={`pot-${currentPot}`}
                        initial={{ opacity: 0.5, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl font-black text-yellow-300 drop-shadow-md"
                    >
                        {currentPot}
                    </motion.div>
                    <div className="text-xs font-bold text-yellow-500 uppercase tracking-widest mt-1">Total Pot</div>
                </div>

                <PlayerCard 
                    playerSeat={playerO}
                    role={Player.O}
                    isConfirmed={room.wagerConfirmed?.['O']}
                    isCurrentUser={mySeat?.role === Player.O}
                    onConfirm={onConfirm}
                />
            </div>

            <div className="mt-8 text-center min-h-[50px]">
                {bothConfirmed ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-6 py-2 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 font-bold uppercase tracking-wider animate-pulse"
                    >
                        <CheckIcon className="w-5 h-5" /> Match Locked! Starting...
                    </motion.div>
                ) : (
                    <button 
                        onClick={onCancel}
                        className="px-6 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg text-sm font-bold transition-colors"
                    >
                        Cancel Match
                    </button>
                )}
            </div>

        </motion.div>
    );
};

export default WagerConfirmation;

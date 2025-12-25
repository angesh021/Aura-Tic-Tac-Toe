
import React from 'react';
import { motion } from 'framer-motion';
import { GameSettings, PlayerSeat, Player } from '../../types';
import { CopyIcon, LinkIcon, EyeIcon, ClockIcon, XIcon, OIcon, CheckIcon } from '../Icons';
import { useToast } from '../../contexts/ToastContext';

interface WaitingRoomProps {
    roomId: string;
    settings: GameSettings;
    players: PlayerSeat[];
    hostId: string;
    currentUserId: string;
    onStart: () => void;
    onCancel: () => void;
    isSpectator: boolean;
}

const WaitingRoom: React.FC<WaitingRoomProps> = ({ roomId, settings, players, hostId, currentUserId, onStart, onCancel, isSpectator }) => {
    const isHost = hostId === currentUserId;
    const activePlayers = players.filter(p => p.role !== 'spectator');
    const spectatorCount = players.filter(p => p.role === 'spectator').length;
    const readyToStart = activePlayers.length === 2;
    const toast = useToast();

    const copyToClipboard = (text: string, message: string) => {
        navigator.clipboard.writeText(text);
        toast.success(message);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg mx-auto p-8 bg-[#0f172a]/95 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
        >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"></div>

            <div className="mb-8 w-full">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-[0.25em] mb-4">Room Code</div>
                
                <motion.div 
                    onClick={() => copyToClipboard(roomId, "Room Code copied!")}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative group cursor-pointer mb-6"
                >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                    <div className="relative flex items-center justify-between bg-[#1e293b] border border-white/10 p-4 sm:p-5 rounded-xl hover:bg-[#253045] transition-colors">
                        <div className="flex-1 text-center pl-8">
                            <span className="text-5xl sm:text-6xl font-mono font-black text-white tracking-[0.15em] drop-shadow-sm">
                                {roomId}
                            </span>
                        </div>
                        <div className="p-3 bg-white/5 rounded-lg text-gray-400 group-hover:text-white group-hover:bg-white/10 transition-all border border-white/5 shrink-0">
                            <CopyIcon className="w-6 h-6" />
                        </div>
                    </div>
                </motion.div>

                <div className={`grid gap-3 w-full mb-6 ${!isSpectator ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {!isSpectator && (
                        <button 
                            onClick={() => copyToClipboard(`${window.location.origin}?room=${roomId}`, "Player Invite Link Copied!")}
                            className="flex items-center justify-center gap-2 p-3.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] group"
                        >
                            <LinkIcon className="w-5 h-5 group-hover:text-cyan-200" />
                            <span className="font-bold text-sm">Copy Player Link</span>
                        </button>
                    )}

                    <button 
                        onClick={() => copyToClipboard(`${window.location.origin}?spectate=${roomId}`, "Spectator Link Copied!")}
                        className={`flex items-center justify-center gap-2 p-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] group ${
                            isSpectator 
                            ? 'bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 text-yellow-300' 
                            : 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white'
                        }`}
                    >
                        <EyeIcon className="w-5 h-5 group-hover:text-white" />
                        <span className="font-bold text-sm">Copy Spectate Link</span>
                    </button>
                </div>

                <div className="flex gap-2 justify-center flex-wrap">
                    <span className="px-3 py-1 rounded-full bg-white/5 text-xs font-medium text-gray-400 border border-white/5">{settings.boardSize}x{settings.boardSize}</span>
                    <span className="px-3 py-1 rounded-full bg-white/5 text-xs font-medium text-gray-400 border border-white/5">Match {settings.winLength}</span>
                    {settings.blitzMode && <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold flex items-center gap-1"><ClockIcon className="w-3 h-3"/> Blitz</span>}
                </div>
                
                {spectatorCount > 0 && (
                    <div className="flex justify-center mt-3">
                        <div className="flex items-center gap-2 text-gray-400 text-xs font-medium bg-black/20 px-3 py-1 rounded-full border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
                            <EyeIcon className="w-3 h-3" />
                            <span>{spectatorCount} Watching</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="w-full space-y-3 mb-8">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                            <XIcon className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div className="text-left">
                            <div className="text-xs font-bold text-cyan-500 uppercase tracking-wider mb-0.5">Player 1</div>
                            <div className="font-bold text-white text-lg">{activePlayers.find(p => p.role === Player.X)?.user.displayName || 'Waiting...'}</div>
                        </div>
                    </div>
                    {activePlayers.find(p => p.role === Player.X) && <CheckIcon className="w-6 h-6 text-green-500" />}
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center border border-pink-500/30">
                            <OIcon className="w-6 h-6 text-pink-400" />
                        </div>
                        <div className="text-left">
                            <div className="text-xs font-bold text-pink-500 uppercase tracking-wider mb-0.5">Player 2</div>
                            <div className="font-bold text-white text-lg">{activePlayers.find(p => p.role === Player.O)?.user.displayName || 'Waiting...'}</div>
                        </div>
                    </div>
                    {activePlayers.find(p => p.role === Player.O) ? <CheckIcon className="w-6 h-6 text-green-500" /> : <div className="animate-pulse text-xs text-gray-500 font-medium">Scanning...</div>}
                </div>
            </div>

            {isSpectator && (
                <div className="mb-6 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm font-medium">
                    You are spectating this match.
                </div>
            )}

            <div className="flex gap-4 w-full">
                <button 
                    onClick={onCancel}
                    className="flex-1 py-4 rounded-2xl font-bold text-gray-400 hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                >
                    Leave
                </button>
                {isHost && (
                    <button 
                        onClick={onStart}
                        disabled={!readyToStart}
                        className={`flex-1 py-4 rounded-2xl font-bold text-white transition-all shadow-lg
                            ${readyToStart 
                                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/20' 
                                : 'bg-gray-800 cursor-not-allowed opacity-50 border border-white/5'
                            }
                        `}
                    >
                        {readyToStart ? 'Start Game' : 'Waiting...'}
                    </button>
                )}
                {!isHost && !isSpectator && (
                    <div className="flex-1 py-4 rounded-2xl font-bold text-white bg-gray-800 cursor-default opacity-80 flex items-center justify-center gap-3 border border-white/5">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Waiting for Host
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default WaitingRoom;

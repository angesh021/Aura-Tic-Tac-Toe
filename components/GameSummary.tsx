


import React, { useContext, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { createPortal } from 'react-dom';
import { BoardState, Player, WinningLine, CampaignLevel, Difficulty, PlayerRole, MatchRecord, Friendship, XpReport, GameSettings } from '../types';
import Board from './Board';
import { HomeIcon, RestartIcon, NextIcon, CrownIcon, XIcon, OIcon, MessageIcon, StarIcon, TrophyIcon, CoinIcon, GridIcon, LightningIcon, SkullIcon, ShieldIcon, CheckIcon, ClockIcon, ObstacleIcon, LinkIcon, ImageIcon, GiftIcon } from './Icons';
import { UserAvatar } from './Avatars';
import { AppContext } from '../contexts/AppContext';
import { getBadge, getRank } from '../utils/badgeData';
import Tooltip from './Tooltip';
import { friendsService } from '../services/friends';
import Modal from './Modal';
import { onlineService } from '../services/online';
import { useToast } from '../contexts/ToastContext';
import CoinTransferAnimation from './CoinTransferAnimation';
import { CAMPAIGN_LEVELS, SHOP_ITEMS } from '../services/progress';

interface GameSummaryProps {
  winner: Player | 'draw';
  board: BoardState;
  boardSize: number;
  winningLine: WinningLine | null;
  playerXName: string;
  playerOName: string;
  playerXAvatar?: string;
  playerOAvatar?: string;
  playerXFrame?: string;
  playerOFrame?: string;
  playerXElo?: number;
  playerOElo?: number;
  playerXBadges?: string[];
  playerOBadges?: string[];
  playerXLevel?: number;
  playerOLevel?: number;
  moveCount?: number;
  savedMatch: MatchRecord | null;
  onPlayAgain: () => void;
  onDeclineRematch?: () => void;
  onHome: () => void;
  isOnline: boolean;
  isSpectator: boolean;
  rematchStatus?: 'none' | 'requested' | 'opponent_requested';
  userRole?: PlayerRole | null; 
  nextLevel?: CampaignLevel | null;
  onNextLevel?: (level: CampaignLevel) => void;
  winReason?: 'standard' | 'forfeit' | 'timeout' | 'disconnect';
  difficulty?: Difficulty;
  xpReport?: { [key in Player]?: XpReport };
  pot?: number;
  ante?: number;
  campaignLevel?: CampaignLevel;
  gameSettings?: GameSettings;
}

// --- Share Replay Modal ---
const ShareReplayModal: React.FC<{
    onClose: () => void;
    onShare: (friendId: string, friendName: string) => void;
}> = ({ onClose, onShare }) => {
    const [friends, setFriends] = useState<Friendship[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        friendsService.getFriends()
            .then(data => setFriends(data.friends))
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <Modal onClose={onClose} className="max-w-sm">
            <div className="p-2">
                <h3 className="text-xl font-bold text-white mb-4">Share Replay with...</h3>
                <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2">
                    {isLoading && <p className="text-gray-400">Loading friends...</p>}
                    {!isLoading && friends.length === 0 && <p className="text-gray-400">No friends to share with.</p>}
                    {friends.map(friendship => {
                        const friend = friendship.sender?.displayName ? friendship.sender : friendship.receiver;
                        if (!friend) return null;
                        return (
                            <button
                                key={friend.id}
                                onClick={() => onShare(friend.id, friend.displayName)}
                                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-black/20">
                                    <UserAvatar avatarId={friend.avatar} frameId={friend.questData?.equippedFrame} className="w-full h-full" />
                                </div>
                                <span className="font-bold text-white">{friend.displayName}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </Modal>
    );
};

// Prominent Pot Display Component
const PotResult: React.FC<{ pot: number, myRole?: Player, winner?: Player | 'draw', ante?: number }> = ({ pot, myRole, winner, ante }) => {
    if (!pot || pot <= 0) return null;

    let displayAmount = pot;
    let label = "Total Pot";
    let colorClass = "text-yellow-400";
    let prefix = "";
    let subText = "";

    if (myRole && ante) {
        if (winner === 'draw') {
            displayAmount = Math.floor(pot / 2);
            label = "Money Back";
            colorClass = "text-gray-300";
            prefix = "+";
        } else if (winner === myRole) {
            displayAmount = pot; // Show full pot won
            label = "You Won";
            colorClass = "text-yellow-400";
            prefix = "+";
        } else {
            displayAmount = pot; // Show pot lost
            label = "Pot Lost";
            colorClass = "text-red-500 opacity-80";
            prefix = "";
            subText = `(-${ante} Coins)`;
        }
    }

    return (
        <motion.div
            initial={{ scale: 0, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
            className="z-30 flex flex-col items-center justify-center py-2 px-6 bg-black/40 backdrop-blur-md rounded-xl border border-yellow-500/20 shadow-xl mb-2"
        >
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{label}</div>
            <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 }}
                className={`text-2xl font-black font-mono ${colorClass} drop-shadow-md flex items-center justify-center gap-1`}
            >
                {prefix}{displayAmount} <CoinIcon className="w-5 h-5"/>
            </motion.div>
            {subText && <div className="text-[9px] font-mono text-red-400/60 font-bold mt-0.5">{subText}</div>}
        </motion.div>
    );
};

// Campaign Progress Display
const CampaignProgressDisplay: React.FC<{ currentLevelId: number, isWin: boolean, reward?: number }> = ({ currentLevelId, isWin, reward }) => {
    const totalLevels = CAMPAIGN_LEVELS.length;
    const completedCount = isWin ? currentLevelId : currentLevelId - 1;
    const percentage = Math.min(100, (completedCount / totalLevels) * 100);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="w-full bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-3 flex-1 min-w-[200px] h-full"
        >
            <div className="flex justify-between items-center text-xs mb-2 border-b border-white/10 pb-1">
                <span className="font-bold text-gray-300 uppercase flex items-center gap-1">
                    <TrophyIcon className="w-3 h-3 text-orange-400"/> Campaign
                </span>
                <span className="font-black text-orange-400 font-mono">
                    {completedCount}/{totalLevels}
                </span>
            </div>

            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden border border-white/10 relative mb-2">
                <motion.div 
                    className="h-full bg-gradient-to-r from-orange-600 to-yellow-500"
                    initial={{ width: `${((currentLevelId - 1) / totalLevels) * 100}%` }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 1 }}
                />
            </div>
            
            {isWin && reward && reward > 0 && (
                <div className="flex items-center justify-center gap-1 text-xs font-bold text-yellow-400 bg-yellow-500/10 py-1 rounded border border-yellow-500/20">
                    <span>Level Reward:</span>
                    <span>+{reward}</span>
                    <CoinIcon className="w-3 h-3"/>
                </div>
            )}
        </motion.div>
    );
};

// Loot Card Component
const LootDropCard: React.FC<{ itemId: string }> = ({ itemId }) => {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return null;

    return (
        <motion.div 
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 1.5 }}
            className="w-full bg-gradient-to-br from-indigo-900/80 to-purple-900/80 backdrop-blur-md border border-purple-500/30 rounded-xl p-3 flex-1 min-w-[200px] h-full relative overflow-hidden group"
        >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-200%] group-hover:animate-[shimmer_2s_infinite]" />
            <div className="flex justify-between items-center text-xs mb-2 border-b border-white/10 pb-1 relative z-10">
                <span className="font-bold text-purple-300 uppercase flex items-center gap-1">
                    <GiftIcon className="w-3 h-3"/> Boss Loot
                </span>
                <span className="text-[9px] font-black text-white bg-purple-500 px-1.5 py-0.5 rounded">NEW</span>
            </div>
            
            <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden">
                    <UserAvatar avatarId={item.assetId} className="w-full h-full" />
                </div>
                <div className="min-w-0">
                    <div className="text-xs text-purple-200 font-medium">Unlocked:</div>
                    <div className="text-sm font-bold text-white truncate">{item.name}</div>
                </div>
            </div>
        </motion.div>
    );
};

// Detailed Online Stats Report
const OnlinePostGameStats: React.FC<{ 
    xpReport: { [key in Player]?: XpReport }, 
    playerXName: string, 
    playerOName: string,
    playerXAvatar: string,
    playerOAvatar: string,
    userRole: PlayerRole | null | undefined,
    winner: Player | 'draw'
}> = ({ xpReport, playerXName, playerOName, playerXAvatar, playerOAvatar, userRole, winner }) => {
    
    const renderRow = (role: Player, name: string, avatar: string, report?: XpReport) => {
        if (!report) return null;
        
        const isMe = userRole === role;
        const isWinner = winner === role;
        const isDraw = winner === 'draw';
        const eloChange = report.elo || 0;
        const coinChange = report.coinChange || 0;
        const xpTotal = report.total || 0;

        return (
            <div className={`flex items-center justify-between p-2 rounded-lg border mb-1.5 ${isMe ? 'bg-white/10 border-white/20' : 'bg-black/20 border-white/5'}`}>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-white/20">
                            <UserAvatar avatarId={avatar} className="w-full h-full" />
                        </div>
                        {isWinner && <div className="absolute -top-1 -right-1 text-yellow-400"><CrownIcon className="w-3 h-3 fill-current"/></div>}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold truncate max-w-[80px] ${isMe ? 'text-white' : 'text-gray-400'}`}>{name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px]">
                            <span className={isWinner ? 'text-green-400' : (isDraw ? 'text-gray-400' : 'text-red-400')}>
                                {isWinner ? 'VICTORY' : (isDraw ? 'DRAW' : 'DEFEAT')}
                            </span>
                            {eloChange !== 0 && (
                                <span className="text-gray-500 font-mono">
                                    ({eloChange > 0 ? '+' : ''}{eloChange})
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] text-purple-300 font-bold uppercase">XP</span>
                        <span className="text-xs font-black text-white">+{xpTotal}</span>
                    </div>
                    <div className="flex flex-col items-end min-w-[40px]">
                        <span className="text-[9px] text-yellow-500 font-bold uppercase">Coins</span>
                        <div className={`flex items-center gap-0.5 font-black text-xs ${coinChange > 0 ? 'text-green-400' : (coinChange < 0 ? 'text-red-400' : 'text-gray-400')}`}>
                            {coinChange > 0 ? '+' : ''}{coinChange}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-3 flex-1 min-w-[280px] h-full"
        >
            <div className="flex items-center gap-2 mb-2 pb-1 border-b border-white/10">
                <StarIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Match Report</span>
            </div>
            
            {renderRow(Player.X, playerXName, playerXAvatar, xpReport[Player.X])}
            {renderRow(Player.O, playerOName, playerOAvatar, xpReport[Player.O])}
        </motion.div>
    );
};

const MatchDetailsCard: React.FC<{ settings?: GameSettings, gameModeLabel: string }> = ({ settings, gameModeLabel }) => {
    if (!settings) return null;

    const modifiers = [];
    if (settings.obstacles) modifiers.push({ label: 'Obstacles', icon: <ObstacleIcon className="w-3 h-3"/> });
    if (settings.powerUps) modifiers.push({ label: 'Power-Ups', icon: <LightningIcon className="w-3 h-3"/> });
    if (settings.variant === 'Misere') modifiers.push({ label: 'Misère', icon: <SkullIcon className="w-3 h-3"/> });
    if (settings.blitzMode) modifiers.push({ label: 'Blitz', icon: <ClockIcon className="w-3 h-3"/> });

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="w-full bg-white/5 dark:bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-3 flex flex-col gap-2 flex-1 min-w-[200px] h-full"
        >
            <div className="flex items-center gap-2 border-b border-white/10 pb-1 mb-1">
                <GridIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Settings</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                    <span className="text-[9px] text-gray-500 uppercase font-bold block">Mode</span>
                    <span className="text-white font-medium text-[10px] truncate">{gameModeLabel}</span>
                </div>
                <div>
                    <span className="text-[9px] text-gray-500 uppercase font-bold block">Grid</span>
                    <span className="text-white font-medium text-[10px]">{settings.boardSize}x{settings.boardSize} <span className="text-gray-500 text-[9px]">({settings.winLength})</span></span>
                </div>
                <div>
                    <span className="text-[9px] text-gray-500 uppercase font-bold block">First</span>
                    <span className="text-white font-medium text-[10px]">
                        {settings.startingPlayer === 'random' ? 'Random' : (settings.startingPlayer ? `Player ${settings.startingPlayer}` : 'Player X')}
                    </span>
                </div>
                <div>
                    <span className="text-[9px] text-gray-500 uppercase font-bold block">Mods</span>
                    {modifiers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                            {modifiers.slice(0, 2).map(m => (
                                <span key={m.label} className="inline-flex items-center gap-0.5 px-1 rounded bg-white/10 border border-white/5 text-[9px] font-bold text-gray-300">
                                    {m.icon} {m.label}
                                </span>
                            ))}
                            {modifiers.length > 2 && <span className="text-[9px] text-gray-500">+{modifiers.length - 2}</span>}
                        </div>
                    ) : (
                        <span className="text-gray-500 italic text-[10px]">None</span>
                    )}
                </div>
            </div>
        </motion.div>
    );
};


// --- Animations ---

const CelebrationBurst: React.FC<{ amount: number }> = ({ amount }) => {
    if (typeof document === 'undefined') return null;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    return createPortal(
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            {/* Center Burst */}
            <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 2] }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/20 rounded-full blur-[80px]"
            />
            
            {/* Flying Coins */}
            {Array.from({ length: 30 }).map((_, i) => {
                 const angle = Math.random() * 360; 
                 const velocity = 200 + Math.random() * 300;
                 return (
                    <motion.div
                        key={`c-${i}`}
                        initial={{ x: cx, y: cy, scale: 0, rotate: 0 }}
                        animate={{ 
                            x: cx + Math.cos(angle * (Math.PI / 180)) * velocity,
                            y: cy + Math.sin(angle * (Math.PI / 180)) * velocity + (Math.random() * 100), 
                            opacity: [1, 1, 0],
                            scale: [0, 1, 0.5],
                            rotate: Math.random() * 720
                        }}
                        transition={{ 
                            duration: 1.5, 
                            ease: "easeOut",
                            delay: Math.random() * 0.1
                        }}
                        className="absolute text-yellow-400 z-50"
                    >
                        <CoinIcon className="w-8 h-8 drop-shadow-md" />
                    </motion.div>
                 );
            })}
            
            {/* Big Text */}
            <motion.div
                style={{ left: '50%', top: '40%' }}
                className="absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 z-50"
                initial={{ opacity: 0, scale: 0.2, y: 0 }}
                animate={{ 
                    opacity: [0, 1, 1, 0], 
                    scale: [0.5, 1.2, 1], 
                    y: -50 
                }}
                transition={{ duration: 2.5, ease: "circOut" }}
            >
                <div className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">
                    <CoinIcon className="w-24 h-24" />
                </div>
                <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 to-yellow-500 drop-shadow-sm font-sans mt-2">
                    +{amount}
                </span>
            </motion.div>
        </div>,
        document.body
    );
};

const Confetti = () => {
    const particles = Array.from({ length: 60 });
    const colors = ['#22d3ee', '#e879f9', '#fbbf24', '#34d399', '#f87171', '#ffffff'];
    return (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            {particles.map((_, i) => (
                <motion.div
                    key={i}
                    style={{
                        position: 'absolute',
                        top: '-20px',
                        left: `${Math.random() * 100}%`,
                        width: `${Math.random() * 8 + 4}px`,
                        height: `${Math.random() * 8 + 4}px`,
                        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
                        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                    }}
                    initial={{ y: 0, rotate: 0, opacity: 1 }}
                    animate={{ 
                        y: '110vh', 
                        rotate: Math.random() * 720 - 360,
                        opacity: [1, 1, 0],
                        x: Math.random() * 100 - 50
                    }}
                    transition={{ 
                        duration: Math.random() * 2 + 2.5, 
                        delay: Math.random() * 1.5, 
                        ease: "linear", 
                        repeat: Infinity 
                    }}
                />
            ))}
        </div>
    );
};

const Rain = () => {
    const drops = Array.from({ length: 80 });
    return (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            {drops.map((_, i) => (
                <motion.div
                    key={i}
                    style={{
                        position: 'absolute',
                        top: '-20px',
                        left: `${Math.random() * 100}%`,
                        width: '1px',
                        height: `${Math.random() * 30 + 10}px`,
                        backgroundColor: 'rgba(100, 149, 237, 0.4)',
                    }}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: '110vh', opacity: [0, 0.6, 0] }}
                    transition={{ 
                        duration: Math.random() * 0.8 + 0.5, 
                        delay: Math.random() * 2, 
                        ease: "linear", 
                        repeat: Infinity 
                    }}
                />
            ))}
        </div>
    );
};

const Fog = () => {
    return (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            <motion.div
                className="absolute w-[150%] h-[150%] bg-gradient-to-r from-transparent via-gray-500/10 to-transparent blur-3xl"
                animate={{ x: ['-20%', '0%', '-20%'] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
        </div>
    );
}

const PlayerResultCard: React.FC<{ 
    name: string, avatar: string, frame?: string, isWinner: boolean, isDraw: boolean, role: Player, 
    elo?: number, badges?: string[], xpTotal?: number, compact?: boolean, level?: number
}> = ({ 
    name, avatar, frame, isWinner, isDraw, role, elo, badges, xpTotal, compact, level
}) => {
    const colorClass = role === Player.X ? 'text-cyan-400 border-cyan-500' : 'text-pink-400 border-pink-500';
    const bgClass = role === Player.X ? 'bg-cyan-500/10' : 'bg-pink-500/10';
    const glowClass = isWinner ? (role === Player.X ? 'shadow-[0_0_30px_rgba(34,211,238,0.2)]' : 'shadow-[0_0_30px_rgba(236,72,153,0.2)]') : '';
    
    const rank = elo !== undefined ? getRank(elo) : null;

    return (
        <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: isWinner ? 1.05 : 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 12, delay: 0.2 }}
            className={`
                relative flex flex-col items-center p-3 rounded-2xl border-2 
                ${isWinner ? `${colorClass} ${bgClass} ${glowClass} z-10` : 'border-white/10 bg-gray-900/60 opacity-80 grayscale-[0.3]'} 
                transition-all duration-500 backdrop-blur-xl shrink-0
                ${compact ? 'w-[140px]' : 'w-[160px] md:w-[200px]'}
            `}
        >
            {isWinner && (
                <motion.div 
                    initial={{ y: -30, opacity: 0, rotate: -20 }}
                    animate={{ y: -25, opacity: 1, rotate: 0 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="absolute -top-3 z-30 filter drop-shadow-lg"
                >
                    <CrownIcon className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 fill-yellow-400" fill={true} />
                </motion.div>
            )}

            <div className={`relative mb-2 ${compact ? 'w-16 h-16' : 'w-20 h-20 md:w-24 md:h-24'}`}>
                <div className={`w-full h-full rounded-full p-1 border-2 ${isWinner ? 'border-yellow-400' : 'border-gray-600'} bg-black shadow-2xl overflow-hidden`}>
                    <UserAvatar avatarId={avatar} frameId={frame} className="w-full h-full rounded-full" />
                </div>
                
                {level !== undefined && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-900 border border-white/20 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full z-30 shadow-md whitespace-nowrap tracking-wider">
                        LVL {level}
                    </div>
                )}

                <div className={`absolute top-0 right-0 rounded-full bg-gray-900 border-2 border-white/10 flex items-center justify-center shadow-lg z-20 ${compact ? 'w-5 h-5' : 'w-6 h-6'}`}>
                    {role === Player.X ? <XIcon className="w-full h-full p-1 text-cyan-400" /> : <OIcon className="w-full h-full p-1 text-pink-400" />}
                </div>
            </div>

            <h3 className={`font-bold text-white truncate max-w-full mb-0.5 text-center ${compact ? 'text-xs' : 'text-xs md:text-sm'}`}>{name}</h3>
            
            <div className="flex flex-col items-center justify-start w-full mt-1">
                {rank ? (
                    <div className="flex flex-col items-center gap-0.5">
                        <div className={`flex items-center gap-1 font-bold ${rank.color} text-[10px] uppercase tracking-wide`}>
                            <span>{rank.icon}</span>
                            <span>{rank.name}</span>
                        </div>
                        <div className="text-[9px] font-mono text-cyan-200/70 font-bold bg-black/20 px-1.5 py-0.5 rounded-full border border-white/5">
                            {elo}
                        </div>
                    </div>
                ) : elo !== undefined ? (
                    <div className="text-[9px] font-mono text-cyan-200/70 font-bold bg-black/20 px-1.5 py-0.5 rounded-full border border-white/5">
                        {elo}
                    </div>
                ) : null}
            </div>
            
            {badges && badges.length > 0 && (
                <div className="flex justify-center gap-1 mt-2 flex-wrap max-w-full px-1">
                    {badges.slice(0, 3).map(b => {
                        const badgeDef = getBadge(b);
                        if (!badgeDef) return null;
                        return (
                            <Tooltip key={b} text={badgeDef.name}>
                                <span className="text-sm filter drop-shadow-sm cursor-help hover:scale-110 transition-transform block">{badgeDef.icon}</span>
                            </Tooltip>
                        );
                    })}
                    {badges.length > 3 && <span className="text-[8px] text-gray-400 font-bold self-center">+{badges.length - 3}</span>}
                </div>
            )}
        </motion.div>
    );
};

const GameSummary: React.FC<GameSummaryProps> = ({
  winner,
  board,
  boardSize,
  winningLine,
  playerXName,
  playerOName,
  playerXAvatar = 'avatar-1',
  playerOAvatar = 'avatar-2',
  playerXFrame,
  playerOFrame,
  playerXElo,
  playerOElo,
  playerXBadges,
  playerOBadges,
  playerXLevel,
  playerOLevel,
  moveCount,
  savedMatch,
  onPlayAgain,
  onDeclineRematch,
  onHome,
  isOnline,
  isSpectator,
  rematchStatus,
  userRole,
  nextLevel,
  onNextLevel,
  winReason,
  difficulty,
  xpReport,
  pot,
  ante,
  campaignLevel,
  gameSettings
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const toast = useToast();
  const app = useContext(AppContext);
  const [showCoinAnim, setShowCoinAnim] = useState(false);

  // Clear session storage for room to prevent accidental rejoin prompts
  useEffect(() => {
      localStorage.removeItem('aura_last_room');
  }, []);

  // Determine XP Report for current user (Local/AI) or both (Online)
  const myXpReport = userRole && xpReport 
      ? xpReport[userRole as Player]
      : (savedMatch?.xpReport);

  const coinGain = myXpReport?.coinChange || 0;
  const isCoinWin = coinGain > 0 || (pot !== undefined && pot > 0 && winner === userRole);

  useEffect(() => {
      if (isCoinWin) {
          setShowCoinAnim(true);
          // Auto-refresh coins in background
          app?.refreshCoins();
      }
  }, [isCoinWin]);

  const isDraw = winner === 'draw';
  let isWin = false;

  if (userRole === 'spectator') {
    isWin = false; 
  } else if (userRole) {
    isWin = winner === userRole;
  } else {
    isWin = winner === Player.X;
  }

  let title = "Match Over";
  let bgClass = "bg-gray-900"; // Fallback
  let subTitle = "";

  if (isSpectator) {
    bgClass = "bg-gradient-to-br from-slate-900 via-gray-900 to-black"; // Neutral dark premium
    if (isDraw) {
        title = "DRAW";
        subTitle = "Game ended in a stalemate";
    } else {
        const winnerName = winner === 'X' ? playerXName : playerOName;
        title = "MATCH OVER";
        subTitle = `Winner: ${winnerName}`;
    }
  } else {
    if (isDraw) {
        title = "DRAW";
        bgClass = "bg-gradient-to-br from-gray-800 to-slate-900";
    } else if (isWin) {
        title = "VICTORY";
        bgClass = "bg-gradient-to-br from-cyan-900 to-blue-900";
    } else {
        title = "DEFEAT";
        bgClass = "bg-gradient-to-br from-red-900 to-slate-900";
    }
  }

  const getWinReasonText = () => {
    switch(winReason) {
        case 'forfeit': return 'by Forfeit';
        case 'timeout': return 'on Time';
        case 'disconnect': return 'by Disconnect';
        default: return '';
    }
  }

  const handleShare = (friendId: string, friendName: string) => {
    if (savedMatch) {
      onlineService.sendDirectMessage(friendId, '', undefined, {
        matchId: savedMatch.id,
        winner: savedMatch.winner,
        opponentName: savedMatch.opponentName || 'Opponent',
        userRole: savedMatch.playerRole || Player.X
      });
      toast.success(`Replay sent to ${friendName}!`);
    }
    setShowShareModal(false);
  };
  
  let gameModeLabel = "Local PvP";
  if (isOnline) gameModeLabel = "Online PvP";
  else if (campaignLevel) gameModeLabel = `Campaign - Level ${campaignLevel.id}`;
  else if (difficulty) gameModeLabel = `Solo vs AI (${difficulty})`;

  return (
    <div className={`fixed inset-0 z-[60] flex flex-col ${bgClass}`}>
      {/* Dynamic Background */}
      <div className="absolute inset-0 opacity-40 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none"></div>
      
      {showCoinAnim && coinGain > 0 && <CelebrationBurst amount={coinGain} />}

      {/* Full Screen Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {!isSpectator && isWin && !isDraw ? <Confetti /> : (!isSpectator && !isWin && !isDraw ? <Rain /> : (isDraw && <Fog />))}
      </div>

      {/* Main Container - Added padding-top to prevent header overlap, and extra padding bottom to move up from footer */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 pt-20 md:pt-24 pb-32 md:pb-40 relative z-10 w-full overflow-hidden md:overflow-visible">
            
            {/* Header Section */}
            <motion.div 
                initial={{ y: -50, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                className="text-center shrink-0 z-20 mb-4 md:mb-6"
            >
                <h1 className={`text-4xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text
                    ${isDraw ? 'bg-gradient-to-r from-gray-300 to-gray-500' : (
                        isSpectator 
                            ? 'bg-gradient-to-r from-white via-gray-200 to-gray-400' 
                            : (isWin ? 'bg-gradient-to-r from-cyan-300 to-blue-500' : 'bg-gradient-to-r from-red-400 to-pink-600')
                    )}
                    drop-shadow-2xl uppercase break-words leading-tight
                `}>
                    {title}
                </h1>
                <div className="flex flex-col items-center gap-1 mt-1">
                    {isSpectator && <span className="text-[10px] md:text-xs font-bold bg-white/10 px-3 py-1 rounded-full uppercase tracking-widest text-white/80 border border-white/5">{subTitle}</span>}
                    <p className="text-white/60 text-xs md:text-sm font-bold uppercase tracking-[0.2em]">{getWinReasonText()}</p>
                </div>
            </motion.div>

            {/* Middle Content - Row on desktop to prevent scrolling */}
            <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-4 md:gap-8 w-full max-w-6xl">
                
                {/* Player X (Desktop) */}
                <div className="hidden md:block mt-8">
                    <PlayerResultCard name={playerXName} avatar={playerXAvatar} frame={playerXFrame} isWinner={winner === 'X'} isDraw={isDraw} role={Player.X} elo={playerXElo} badges={playerXBadges} level={playerXLevel} xpTotal={xpReport?.[Player.X]?.total} compact={false} />
                </div>

                {/* Center Column */}
                <div className="flex flex-col items-center gap-4 w-full md:w-auto relative z-10 shrink-0">
                     
                     {/* Pot Result */}
                     {!isSpectator && pot !== undefined && pot > 0 && (
                        <PotResult pot={pot} myRole={userRole as Player} winner={winner} ante={ante} />
                     )}
                     
                     {/* Board Container - Scaled Down */}
                     <div className="transform scale-[0.6] md:scale-[0.8] transition-transform origin-center drop-shadow-2xl -my-4 md:-my-8">
                        <Board boardSize={boardSize} squares={board} onSquareClick={() => {}} winningLine={winningLine} disabled={true} hintedSquare={null} isSummary={true} />
                     </div>

                     {/* Stats & Progress - Horizontal on Desktop */}
                     <div className="w-full max-w-3xl flex flex-col md:flex-row items-stretch justify-center gap-4 mt-2">
                        <div className="flex-1 min-w-0 flex flex-col gap-2">
                            {campaignLevel ? (
                                <>
                                    <CampaignProgressDisplay 
                                        currentLevelId={campaignLevel.id} 
                                        isWin={isWin} 
                                        reward={campaignLevel.rewardCoins} 
                                    />
                                    {isWin && campaignLevel.unlocksItem && (
                                        <LootDropCard itemId={campaignLevel.unlocksItem} />
                                    )}
                                </>
                            ) : (
                                <MatchDetailsCard settings={gameSettings} gameModeLabel={gameModeLabel} />
                            )}
                        </div>

                        {/* Online Full Report Table - Side by Side with Settings */}
                        {isOnline && !isSpectator && (
                            <div className="flex-1 min-w-0 flex flex-col">
                                {xpReport ? (
                                    <OnlinePostGameStats 
                                        xpReport={xpReport} 
                                        playerXName={playerXName}
                                        playerOName={playerOName}
                                        playerXAvatar={playerXAvatar}
                                        playerOAvatar={playerOAvatar}
                                        userRole={userRole}
                                        winner={winner}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-black/30 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-3 animate-pulse min-h-[100px]">
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin"></div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Finalizing Match...</span>
                                    </div>
                                )}
                            </div>
                        )}
                     </div>
                </div>

                {/* Player O (Desktop) */}
                <div className="hidden md:block mt-8">
                    <PlayerResultCard name={playerOName} avatar={playerOAvatar} frame={playerOFrame} isWinner={winner === 'O'} isDraw={isDraw} role={Player.O} elo={playerOElo} badges={playerOBadges} level={playerOLevel} xpTotal={xpReport?.[Player.O]?.total} compact={false} />
                </div>

                {/* Mobile: Players Row (Below Board) */}
                <div className="md:hidden flex justify-center gap-3 w-full px-2 overflow-x-auto no-scrollbar">
                    <PlayerResultCard name={playerXName} avatar={playerXAvatar} frame={playerXFrame} isWinner={winner === 'X'} isDraw={isDraw} role={Player.X} elo={playerXElo} badges={playerXBadges} level={playerXLevel} xpTotal={xpReport?.[Player.X]?.total} compact={true} />
                    <PlayerResultCard name={playerOName} avatar={playerOAvatar} frame={playerOFrame} isWinner={winner === 'O'} isDraw={isDraw} role={Player.O} elo={playerOElo} badges={playerOBadges} level={playerOLevel} xpTotal={xpReport?.[Player.O]?.total} compact={true} />
                </div>
            </div>
      </div>

      {/* Fixed Footer Actions */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-0 left-0 right-0 p-4 md:p-6 flex justify-center bg-gradient-to-t from-black/95 via-black/80 to-transparent z-50 pointer-events-none"
      >
        <div className="w-full max-w-md flex flex-row gap-3 pointer-events-auto">
            {isSpectator ? (
                <button onClick={onHome} className="w-full py-3 px-6 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-2 backdrop-blur-sm border border-white/10 transition-all text-sm">
                    <HomeIcon className="w-5 h-5" /> Back to Menu
                </button>
            ) : (
                <>
                    <button onClick={onHome} className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl backdrop-blur-sm border border-white/10 flex items-center justify-center transition-all hover:-translate-y-1">
                        <HomeIcon className="w-5 h-5" />
                    </button>
                    
                    {isOnline ? (
                        rematchStatus === 'opponent_requested' ? (
                            <div className="flex-[2] flex gap-2">
                                <button onClick={onDeclineRematch} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl text-xs shadow-lg transition-transform hover:scale-105">Decline</button>
                                <button onClick={onPlayAgain} className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-2xl text-xs shadow-lg transition-transform hover:scale-105">Accept</button>
                            </div>
                        ) : (
                            <button onClick={onPlayAgain} disabled={rematchStatus === 'requested'} className="flex-[2] py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl shadow-xl hover:shadow-cyan-500/30 disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:-translate-y-1 text-sm">
                                <RestartIcon className="w-4 h-4" /> {rematchStatus === 'requested' ? 'Waiting...' : 'Rematch'}
                            </button>
                        )
                    ) : (
                        nextLevel && isWin ? (
                            <button onClick={() => onNextLevel?.(nextLevel)} className="flex-[2] py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-2xl shadow-xl hover:shadow-green-500/30 flex items-center justify-center gap-2 transition-all hover:-translate-y-1 text-sm">
                                <NextIcon className="w-4 h-4" /> Next Level
                            </button>
                        ) : (
                            <button onClick={onPlayAgain} className="flex-[2] py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl shadow-xl hover:shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all hover:-translate-y-1 text-sm">
                                <RestartIcon className="w-4 h-4" /> {campaignLevel ? 'Retry Level' : 'Play Again'}
                            </button>
                        )
                    )}

                    <button onClick={() => setShowShareModal(true)} disabled={!savedMatch} className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl backdrop-blur-sm border border-white/10 disabled:opacity-30 flex items-center justify-center transition-all hover:-translate-y-1">
                        <MessageIcon className="w-5 h-5" />
                    </button>
                </>
            )}
        </div>
      </motion.div>
      
      <AnimatePresence>
        {showShareModal && (
          <ShareReplayModal
            onClose={() => setShowShareModal(false)}
            onShare={handleShare}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameSummary;
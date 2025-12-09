
import React, { useContext, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { createPortal } from 'react-dom';
import { BoardState, Player, WinningLine, CampaignLevel, Difficulty, PlayerRole, MatchRecord, Friendship, XpReport } from '../types';
import Board from './Board';
import { HomeIcon, RestartIcon, NextIcon, CrownIcon, XIcon, OIcon, MessageIcon, StarIcon, TrophyIcon, CoinIcon, GridIcon, LightningIcon, SkullIcon, ShieldIcon, CheckIcon } from './Icons';
import { UserAvatar } from './Avatars';
import { AppContext } from '../contexts/AppContext';
import { getBadge, getRank } from '../utils/badgeData';
import Tooltip from './Tooltip';
import { friendsService } from '../services/friends';
import Modal from './Modal';
import { onlineService } from '../services/online';
import { useToast } from '../contexts/ToastContext';
import CoinTransferAnimation from './CoinTransferAnimation';
import { CAMPAIGN_LEVELS } from '../services/progress';

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

const AnimatedCounter: React.FC<{ to: number }> = ({ to }) => {
    const nodeRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const node = nodeRef.current;
        if (!node) return;

        const controls = animate(0, to, {
            duration: 1.5,
            ease: [0.22, 1, 0.36, 1],
            onUpdate(value) {
                node.textContent = Math.round(value).toString();
            }
        });

        return () => controls.stop();
    }, [to]);

    return <span ref={nodeRef} />;
}

// Prominent Pot Display Component
const PotResult: React.FC<{ pot: number, myRole?: Player, winner?: Player | 'draw', ante?: number }> = ({ pot, myRole, winner, ante }) => {
    if (!pot || pot <= 0) return null;

    let netChange = 0;
    let label = "Pot Total";
    let colorClass = "text-yellow-400";

    if (myRole && ante) {
        if (winner === 'draw') {
            netChange = 0; // Got ante back (half of pot)
            label = "Money Back";
            colorClass = "text-gray-300";
        } else if (winner === myRole) {
            netChange = pot - ante; // Profit
            label = "You Won";
            colorClass = "text-yellow-400";
        } else {
            netChange = -ante; // Loss
            label = "You Lost";
            colorClass = "text-red-500";
        }
    }

    return (
        <motion.div
            initial={{ scale: 0, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
            className="absolute top-0 right-0 z-30 flex flex-col items-center justify-center p-2 bg-black/40 backdrop-blur-md rounded-xl border border-yellow-500/20 shadow-xl"
        >
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{label}</div>
            <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 }}
                className={`text-lg font-black font-mono ${colorClass} drop-shadow-md flex items-center justify-center gap-1`}
            >
                {netChange > 0 ? '+' : ''}{netChange} <CoinIcon className="w-4 h-4"/>
            </motion.div>
        </motion.div>
    );
};

// Campaign Progress Display
const CampaignProgressDisplay: React.FC<{ currentLevelId: number, isWin: boolean }> = ({ currentLevelId, isWin }) => {
    const totalLevels = CAMPAIGN_LEVELS.length;
    // Calculate progress: If win, we essentially completed this level
    const completedCount = isWin ? currentLevelId : currentLevelId - 1;
    const percentage = Math.min(100, (completedCount / totalLevels) * 100);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="w-full bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-3 mt-2 max-w-xs mx-auto"
        >
            <div className="flex justify-between items-center text-xs mb-2 border-b border-white/10 pb-1">
                <span className="font-bold text-gray-300 uppercase flex items-center gap-1">
                    <TrophyIcon className="w-3 h-3 text-orange-400"/> Campaign
                </span>
                <span className="font-black text-orange-400 font-mono">
                    {completedCount}/{totalLevels}
                </span>
            </div>

            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden border border-white/10 relative">
                <motion.div 
                    className="h-full bg-gradient-to-r from-orange-600 to-yellow-500"
                    initial={{ width: `${((currentLevelId - 1) / totalLevels) * 100}%` }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 1 }}
                />
            </div>
        </motion.div>
    );
};

// Detailed XP Report
const XPDisplay: React.FC<{ report: XpReport }> = ({ report }) => {
    const coinChange = report.coinChange;
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="w-full bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-3 mt-2 max-w-[280px] mx-auto"
        >
            <div className="flex justify-between items-center text-xs mb-2 border-b border-white/10 pb-1">
                <span className="font-bold text-gray-300 uppercase flex items-center gap-1"><StarIcon className="w-3 h-3 text-purple-400"/> Match Report</span>
                <span className="font-black text-purple-300 font-mono">
                    +<AnimatedCounter to={report.total} /> XP
                </span>
            </div>

            {coinChange !== undefined && coinChange !== 0 && (
                 <div className="flex justify-between items-center text-xs pt-1">
                    <span className="font-bold text-gray-200 uppercase flex items-center gap-1">
                        <CoinIcon className={`w-3 h-3 ${coinChange < 0 ? "text-red-400" : "text-yellow-400"}`}/> 
                        {coinChange < 0 ? "Loss" : "Gain"}
                    </span>
                    <span className={`font-black font-mono ${coinChange < 0 ? "text-red-400" : "text-yellow-400"}`}>
                        {coinChange > 0 ? '+' : ''}{coinChange}
                    </span>
                </div>
            )}
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
    elo?: number, badges?: string[], xpTotal?: number, compact?: boolean
}> = ({ 
    name, avatar, frame, isWinner, isDraw, role, elo, badges, xpTotal, compact
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
            className={`relative flex flex-col items-center p-3 rounded-2xl border-2 ${isWinner ? `${colorClass} ${bgClass} ${glowClass} z-10` : 'border-white/10 bg-gray-900/60 opacity-80 grayscale-[0.3]'} transition-all duration-500 w-[140px] md:w-[200px] backdrop-blur-xl shrink-0`}
        >
            {isWinner && (
                <motion.div 
                    initial={{ y: -30, opacity: 0, rotate: -20 }}
                    animate={{ y: -25, opacity: 1, rotate: 0 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="absolute -top-4 z-30 filter drop-shadow-lg"
                >
                    <CrownIcon className="w-8 h-8 md:w-12 md:h-12 text-yellow-400 fill-yellow-400" fill={true} />
                </motion.div>
            )}

            <div className="relative w-12 h-12 md:w-20 md:h-20 mb-2">
                <div className={`w-full h-full rounded-full p-1 border-2 ${isWinner ? 'border-yellow-400' : 'border-gray-600'} bg-black shadow-2xl overflow-hidden`}>
                    <UserAvatar avatarId={avatar} frameId={frame} className="w-full h-full rounded-full" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 md:w-8 md:h-8 rounded-full bg-gray-900 border-2 border-white/10 flex items-center justify-center shadow-lg z-20">
                    {role === Player.X ? <XIcon className="w-3 h-3 md:w-5 md:h-5 text-cyan-400" /> : <OIcon className="w-3 h-3 md:w-5 md:h-5 text-pink-400" />}
                </div>
            </div>

            <h3 className="font-bold text-xs md:text-lg text-white truncate max-w-full mb-0.5 text-center">{name}</h3>
            
            <div className="flex flex-col items-center justify-start w-full">
                {rank ? (
                    <div className="flex flex-col items-center">
                        <div className={`flex items-center gap-1 text-[10px] md:text-sm font-bold ${rank.color}`}>
                            <span>{rank.icon}</span>
                            <span>{rank.name}</span>
                        </div>
                        <div className="text-[9px] md:text-[10px] font-mono text-gray-400 font-bold">ELO {elo}</div>
                    </div>
                ) : elo !== undefined ? (
                    <div className="text-[9px] md:text-[10px] font-mono text-gray-400 font-bold">ELO {elo}</div>
                ) : null}
            </div>
            
            {xpTotal !== undefined && xpTotal > 0 && (
                <div className="absolute -bottom-3 bg-purple-500 text-white font-bold text-[9px] px-2 py-0.5 rounded-full border-2 border-slate-900 shadow-lg whitespace-nowrap">
                    +{xpTotal} XP
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
  campaignLevel
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const toast = useToast();
  const app = useContext(AppContext);
  const [showCoinAnim, setShowCoinAnim] = useState(false);

  // Clear session storage for room to prevent accidental rejoin prompts
  useEffect(() => {
      localStorage.removeItem('aura_last_room');
  }, []);

  // Determine XP Report for current user
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
    if (isDraw) {
        title = "STALEMATE";
        bgClass = "bg-gradient-to-br from-gray-800 to-slate-900";
        subTitle = "Game ended in a draw";
    } else {
        const winnerName = winner === 'X' ? playerXName : playerOName;
        // Truncate name slightly if extremely long to fit "WINS"
        title = `${winnerName.length > 12 ? winnerName.substring(0, 12) + '...' : winnerName} WINS`;
        bgClass = winner === 'X' 
            ? "bg-gradient-to-br from-cyan-900/80 to-slate-950" 
            : "bg-gradient-to-br from-pink-900/80 to-slate-950";
        subTitle = `Spectating • ${winner === 'X' ? 'Player X' : 'Player O'} Victory`;
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
  
  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${bgClass} overflow-hidden`}>
      {/* Dynamic Background */}
      <div className="absolute inset-0 opacity-40 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none"></div>
      
      {showCoinAnim && coinGain > 0 && <CelebrationBurst amount={coinGain} />}

      {/* Full Screen Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {!isSpectator && isWin && !isDraw ? <Confetti /> : (!isSpectator && !isWin && !isDraw ? <Rain /> : (isDraw && <Fog />))}
      </div>

      {/* Main Container - Full Height Flex */}
      <motion.div
        className="relative w-full h-full flex flex-col items-center justify-between p-4 md:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
            {/* Header Section */}
            <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center shrink-0 z-20 mt-2">
                <h1 className={`text-4xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text
                    ${isDraw ? 'bg-gradient-to-r from-gray-300 to-gray-500' : (
                        isSpectator 
                            ? (winner === 'X' ? 'bg-gradient-to-r from-cyan-300 to-blue-400' : 'bg-gradient-to-r from-pink-300 to-rose-400')
                            : (isWin ? 'bg-gradient-to-r from-cyan-300 to-blue-500' : 'bg-gradient-to-r from-red-400 to-pink-600')
                    )}
                    drop-shadow-2xl uppercase break-words max-w-[90vw] leading-tight
                `}>
                    {title}
                </h1>
                <div className="flex flex-col items-center gap-1 mt-1">
                    {isSpectator && <span className="text-[10px] md:text-xs font-bold bg-white/10 px-3 py-1 rounded-full uppercase tracking-widest text-white/80 border border-white/5">{subTitle}</span>}
                    <p className="text-white/60 text-sm md:text-lg font-bold uppercase tracking-[0.2em]">{getWinReasonText()}</p>
                </div>
            </motion.div>

            {/* Middle Section (Players + Board) - Scale to fit */}
            <div className="flex-1 w-full flex flex-col md:flex-row items-center justify-center gap-4 md:gap-12 min-h-0 z-10 relative">
                
                {/* Player X - Mobile: Top, Desktop: Left */}
                <div className="order-2 md:order-1 shrink-0">
                    <PlayerResultCard name={playerXName} avatar={playerXAvatar} frame={playerXFrame} isWinner={winner === 'X'} isDraw={isDraw} role={Player.X} elo={playerXElo} badges={playerXBadges} xpTotal={xpReport?.[Player.X]?.total} compact={true} />
                </div>

                {/* Center (Board + Stats) */}
                <div className="order-1 md:order-2 flex flex-col items-center justify-center gap-2 shrink-0 h-full max-h-[45vh] md:max-h-[60vh] aspect-square relative w-full md:w-auto">
                     {!isSpectator && pot !== undefined && pot > 0 && (
                        <PotResult pot={pot} myRole={userRole as Player} winner={winner} ante={ante} />
                     )}
                     
                     {/* Board Container with scaling */}
                     <div className="origin-center scale-[0.6] sm:scale-75 md:scale-100 transition-transform duration-300 pointer-events-none drop-shadow-2xl">
                        <Board boardSize={boardSize} squares={board} onSquareClick={() => {}} winningLine={winningLine} disabled={true} hintedSquare={null} isSummary={true} />
                     </div>

                     {campaignLevel && (
                        <CampaignProgressDisplay currentLevelId={campaignLevel.id} isWin={isWin} />
                     )}

                     {myXpReport && (myXpReport.total > 0 || myXpReport.coinChange !== undefined) && !campaignLevel && (
                        <XPDisplay report={myXpReport} />
                     )}
                </div>

                {/* Player O - Mobile: Bottom, Desktop: Right */}
                <div className="order-3 shrink-0">
                    <PlayerResultCard name={playerOName} avatar={playerOAvatar} frame={playerOFrame} isWinner={winner === 'O'} isDraw={isDraw} role={Player.O} elo={playerOElo} badges={playerOBadges} xpTotal={xpReport?.[Player.O]?.total} compact={true} />
                </div>
            </div>

            {/* Footer Section - Action Buttons */}
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="w-full max-w-md flex flex-row gap-3 shrink-0 z-20 mb-2 md:mb-0"
            >
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
            </motion.div>

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

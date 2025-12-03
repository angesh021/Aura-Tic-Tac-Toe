
import React, { useContext, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { BoardState, Player, WinningLine, CampaignLevel, Difficulty, PlayerRole, MatchRecord, Friendship, XpReport } from '../types';
import Board from './Board';
import { HomeIcon, RestartIcon, NextIcon, CrownIcon, XIcon, OIcon, ChatBubbleIcon, StarIcon, TrophyIcon, CoinIcon } from './Icons';
import { UserAvatar } from './Avatars';
import { AppContext } from '../contexts/AppContext';
import { getBadge, getRank } from '../utils/badgeData';
import Tooltip from './Tooltip';
import { friendsService } from '../services/friends';
import Modal from './Modal';
import { onlineService } from '../services/online';
import { useToast } from '../contexts/ToastContext';
import CoinTransferAnimation from './CoinTransferAnimation';

interface GameSummaryProps {
  winner: Player | 'draw';
  board: BoardState;
  boardSize: number;
  winningLine: WinningLine | null;
  playerXName: string;
  playerOName: string;
  playerXAvatar?: string;
  playerOAvatar?: string;
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
                                    <UserAvatar avatarId={friend.avatar} className="w-full h-full" />
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
            initial={{ scale: 0, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
            className="flex flex-col items-center justify-center p-4 bg-gradient-to-b from-black/60 to-black/30 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl mb-6 min-w-[200px]"
        >
            <div className="relative">
                <motion.div 
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="text-6xl mb-2 drop-shadow-2xl filter"
                >
                    🏺
                </motion.div>
                <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black font-black text-xs px-2 py-1 rounded-full shadow-lg border border-white/20">
                    {pot}
                </div>
            </div>
            
            <div className="text-center mt-2">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</div>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1 }}
                    className={`text-3xl font-black font-mono ${colorClass} drop-shadow-md flex items-center justify-center gap-1`}
                >
                    {netChange > 0 ? '+' : ''}{netChange} <CoinIcon className="w-6 h-6"/>
                </motion.div>
            </div>
        </motion.div>
    );
};

const XPDisplay: React.FC<{ report: XpReport }> = ({ report }) => {
    const bonuses = [
        { label: 'Base XP', value: report.base, color: 'text-gray-300' },
        { label: 'Victory Bonus', value: report.win, color: 'text-green-400' },
        { label: 'ELO Difference', value: report.elo, color: 'text-cyan-400' },
        { label: 'Efficiency Bonus', value: report.efficiency, color: 'text-blue-400' },
        { label: 'Flawless Victory', value: report.flawless, color: 'text-yellow-400' },
        { label: 'Comeback King', value: report.comeback, color: 'text-orange-400' },
        { label: 'AI Difficulty', value: report.difficulty, color: 'text-red-400' },
        { label: 'Grid Size Bonus', value: report.gridSize, color: 'text-indigo-400' },
        { label: 'Win Length Bonus', value: report.winLength, color: 'text-indigo-400' },
        { label: 'Obstacle Bonus', value: report.obstacles, color: 'text-amber-400' },
        { label: 'Misère Mode Bonus', value: report.variant, color: 'text-pink-400' },
    ].filter(b => b.value !== 0);

    const coinChange = report.coinChange;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="w-full max-w-sm mx-auto bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-6"
        >
            <h3 className="text-center font-bold text-purple-400 uppercase tracking-widest mb-4 text-sm flex items-center justify-center gap-2">
                <StarIcon className="w-4 h-4" /> XP Report
            </h3>
            <div className="space-y-2 mb-4">
                {bonuses.map((bonus, i) => (
                    <motion.div 
                        key={bonus.label}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1 + i * 0.1 }}
                        className="flex justify-between items-center text-sm"
                    >
                        <span className="font-medium text-gray-400">{bonus.label}</span>
                        <span className={`font-bold font-mono ${bonus.color}`}>
                            {bonus.value > 0 ? '+' : ''}{bonus.value}
                        </span>
                    </motion.div>
                ))}
            </div>
            <div className="pt-4 border-t-2 border-dashed border-white/10 flex justify-between items-center text-lg">
                <span className="font-bold text-white">Total XP</span>
                <span className="font-black text-2xl text-purple-300 font-mono">
                    +<AnimatedCounter to={report.total} />
                </span>
            </div>

            {/* Redundant Coin Change display if PotResult is shown, but useful for non-wager games (Campaign) */}
            {coinChange !== undefined && coinChange !== 0 && (
                 <div className="pt-4 mt-4 border-t-2 border-dashed border-white/10 flex justify-between items-center text-lg">
                    <span className="font-bold text-white flex items-center gap-2"><CoinIcon className="w-5 h-5 text-yellow-400"/> Coin Change</span>
                    <span className={`font-black text-2xl font-mono ${coinChange > 0 ? 'text-yellow-400' : (coinChange < 0 ? 'text-red-400' : 'text-gray-400')}`}>
                        {coinChange > 0 ? '+' : ''}{coinChange}
                    </span>
                </div>
            )}
        </motion.div>
    );
};


// --- Animations ---

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
            {/* Fog animation simplified for performance */}
            <motion.div
                className="absolute w-[150%] h-[150%] bg-gradient-to-r from-transparent via-gray-500/10 to-transparent blur-3xl"
                animate={{ x: ['-20%', '0%', '-20%'] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
             <motion.div
                className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-gray-400/5 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
        </div>
    );
}

const PlayerResultCard: React.FC<{ 
    name: string, avatar: string, isWinner: boolean, isDraw: boolean, role: Player, 
    elo?: number, badges?: string[], xpTotal?: number
}> = ({ 
    name, avatar, isWinner, isDraw, role, elo, badges, xpTotal
}) => {
    const colorClass = role === Player.X ? 'text-cyan-400 border-cyan-500' : 'text-pink-400 border-pink-500';
    const bgClass = role === Player.X ? 'bg-cyan-500/10' : 'bg-pink-500/10';
    const glowClass = isWinner ? (role === Player.X ? 'shadow-[0_0_50px_rgba(34,211,238,0.3)]' : 'shadow-[0_0_50px_rgba(236,72,153,0.3)]') : '';
    
    const rank = elo !== undefined ? getRank(elo) : null;

    return (
        <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: isWinner ? 1.05 : 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 12, delay: 0.2 }}
            className={`relative flex flex-col items-center p-6 rounded-3xl border-2 ${isWinner ? `${colorClass} ${bgClass} ${glowClass} z-10` : 'border-white/10 bg-gray-900/60 opacity-80 grayscale-[0.3]'} transition-all duration-500 w-[240px] backdrop-blur-xl`}
        >
            {isWinner && (
                <motion.div 
                    initial={{ y: -40, opacity: 0, rotate: -20 }}
                    animate={{ y: -35, opacity: 1, rotate: 0 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="absolute -top-2 z-30 filter drop-shadow-lg"
                >
                    <div className="relative">
                        <CrownIcon className="w-12 h-12 text-yellow-400 fill-yellow-400" fill={true} />
                        <div className="absolute inset-0 bg-yellow-400 blur-lg opacity-50"></div>
                    </div>
                </motion.div>
            )}

            <div className="relative w-20 md:w-24 md:h-24 mb-2">
                <div className={`w-full h-full rounded-full p-1 border-2 ${isWinner ? 'border-yellow-400' : 'border-gray-600'} bg-black shadow-2xl overflow-hidden`}>
                    <UserAvatar avatarId={avatar} className="w-full h-full rounded-full" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gray-900 border-2 border-white/10 flex items-center justify-center shadow-lg z-20">
                    {role === Player.X ? (
                        <XIcon className="w-5 h-5 text-cyan-400 drop-shadow-md" />
                    ) : (
                        <OIcon className="w-5 h-5 text-pink-400 drop-shadow-md" />
                    )}
                </div>
            </div>

            <h3 className="font-bold text-lg md:text-xl text-white truncate max-w-[180px] mb-0.5 text-center">{name}</h3>
            
            <div className="flex flex-col items-center mb-4 min-h-[60px] justify-start w-full">
                {rank ? (
                    <div className="flex flex-col items-center">
                        <div className={`flex items-center gap-1.5 text-sm font-bold ${rank.color} drop-shadow-md`}>
                            <span className="text-xl">{rank.icon}</span>
                            <span>{rank.name}</span>
                        </div>
                        <div className="text-[10px] font-mono text-gray-400 font-bold mt-0.5">ELO {elo}</div>
                    </div>
                ) : elo !== undefined ? (
                    <div className="text-xs font-mono text-gray-400 font-bold">ELO {elo}</div>
                ) : null}

                {badges && badges.length > 0 && (
                    <div className="flex gap-2 mt-2 items-center justify-center flex-wrap">
                        {badges.slice(0, 3).map(badgeId => {
                            const def = getBadge(badgeId);
                            if (!def) return null;
                            return (
                                <Tooltip key={badgeId} text={def.name}>
                                    <span className="text-lg cursor-help hover:scale-125 transition-transform">{def.icon}</span>
                                </Tooltip>
                            );
                        })}
                    </div>
                )}
            </div>
            
            {xpTotal !== undefined && xpTotal > 0 && (
                <div className="absolute -bottom-4 bg-purple-500 text-white font-bold text-xs px-3 py-1 rounded-full border-2 border-slate-900 shadow-lg">
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
  ante
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const toast = useToast();
  const app = useContext(AppContext);
  const [showCoinAnim, setShowCoinAnim] = useState(false);

  // Clear session storage for room to prevent accidental rejoin prompts
  useEffect(() => {
      localStorage.removeItem('aura_last_room');
  }, []);

  // Determine XP Report for current user (handles Online & Local/AI)
  const myXpReport = userRole && xpReport 
      ? xpReport[userRole as Player]
      : (savedMatch?.xpReport);

  useEffect(() => {
      if (myXpReport && myXpReport.coinChange !== 0 && myXpReport.coinChange !== undefined) {
          setShowCoinAnim(true);
      }
  }, [myXpReport]);

  const handleAnimComplete = () => {
      setShowCoinAnim(false);
      app?.refreshCoins(); // Force update coin balance in header
  };

  const isDraw = winner === 'draw';
  let isWin = false;

  if (userRole === 'spectator') {
    isWin = false; // Spectators don't win or lose
  } else if (userRole) {
    isWin = winner === userRole;
  } else {
    // Fallback for local/AI games where userRole might not be set as prop, assume user is X
    isWin = winner === Player.X;
  }

  let title = "Match Over";
  if (!isSpectator) {
    if (isDraw) title = "DRAW";
    else if (isWin) title = "VICTORY";
    else title = "DEFEAT";
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
    <>
      {showCoinAnim && myXpReport && myXpReport.coinChange !== undefined && (
          <CoinTransferAnimation 
              amount={myXpReport.coinChange} 
              onComplete={handleAnimComplete} 
          />
      )}

      <motion.div
        className="relative w-full max-w-4xl p-4 md:p-8 flex flex-col items-center justify-center text-center overflow-hidden"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {!isSpectator && isWin && !isDraw && <Confetti />}
        {!isSpectator && !isWin && !isDraw && <Rain />}
        {isDraw && <Fog />}

        <motion.h1
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className={`relative z-10 text-5xl md:text-7xl font-black tracking-tighter mb-2 bg-clip-text text-transparent
            ${isDraw ? 'bg-gradient-to-r from-gray-300 to-gray-500' : (isWin ? 'bg-gradient-to-r from-yellow-300 to-amber-500' : 'bg-gradient-to-r from-red-400 to-red-600')}
          `}
        >
          {title}
        </motion.h1>
        <p className="text-sm text-gray-400 font-medium mb-8 relative z-10">{getWinReasonText()}</p>

        {/* Wager Result Display (If applicable) */}
        {!isSpectator && pot && pot > 0 && (
            <div className="relative z-10 mb-8">
                <PotResult pot={pot} myRole={userRole as Player} winner={winner} ante={ante} />
            </div>
        )}

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-8">
            <PlayerResultCard name={playerXName} avatar={playerXAvatar} isWinner={winner === 'X'} isDraw={isDraw} role={Player.X} elo={playerXElo} badges={playerXBadges} xpTotal={xpReport?.[Player.X]?.total} />
            
            <div className="my-4 md:my-0 flex flex-col items-center">
                <Board boardSize={boardSize} squares={board} onSquareClick={() => {}} winningLine={winningLine} disabled={true} hintedSquare={null} isSummary={true} />
                {savedMatch && (
                  <button onClick={() => app?.watchReplayById(savedMatch.id)} className="mt-4 text-xs text-cyan-400 hover:underline">View Replay</button>
                )}
            </div>

            <PlayerResultCard name={playerOName} avatar={playerOAvatar} isWinner={winner === 'O'} isDraw={isDraw} role={Player.O} elo={playerOElo} badges={playerOBadges} xpTotal={xpReport?.[Player.O]?.total} />
        </div>
        
        {myXpReport && (myXpReport.total > 0 || myXpReport.coinChange !== undefined) && <XPDisplay report={myXpReport} />}

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3 mt-8 w-full max-w-md"
        >
          {isSpectator ? (
            <button onClick={onHome} className="w-full sm:w-auto flex-1 py-3 px-6 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                <HomeIcon className="w-5 h-5" /> Back to Menu
            </button>
          ) : (
            <>
              <button onClick={onHome} className="w-full sm:w-auto order-3 sm:order-1 flex-1 py-3 px-6 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                <HomeIcon className="w-5 h-5" />
              </button>
              
              {isOnline ? (
                rematchStatus === 'opponent_requested' ? (
                  <div className="w-full sm:w-auto order-1 sm:order-2 flex-1 flex gap-2">
                    <button onClick={onDeclineRematch} className="flex-1 py-3 px-6 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg">Decline</button>
                    <button onClick={onPlayAgain} className="flex-1 py-3 px-6 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg">Accept</button>
                  </div>
                ) : (
                  <button onClick={onPlayAgain} disabled={rematchStatus === 'requested'} className="w-full sm:w-auto order-1 sm:order-2 flex-[2] py-3 px-6 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                    <RestartIcon className="w-5 h-5" /> {rematchStatus === 'requested' ? 'Waiting...' : 'Rematch'}
                  </button>
                )
              ) : (
                nextLevel ? (
                  <button onClick={() => onNextLevel?.(nextLevel)} className="w-full sm:w-auto order-1 sm:order-2 flex-[2] py-3 px-6 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                    <NextIcon className="w-5 h-5" /> Next Level
                  </button>
                ) : (
                  <button onClick={onPlayAgain} className="w-full sm:w-auto order-1 sm:order-2 flex-[2] py-3 px-6 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                    <RestartIcon className="w-5 h-5" /> Play Again
                  </button>
                )
              )}

              <button onClick={() => setShowShareModal(true)} disabled={!savedMatch} className="w-full sm:w-auto order-2 sm:order-3 flex-1 py-3 px-6 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                <ChatBubbleIcon className="w-5 h-5" />
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
    </>
  );
};

export default GameSummary;

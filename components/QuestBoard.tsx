
import React, { useEffect, useState, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { progressService } from '../services/progress';
import { AppContext } from '../contexts/AppContext';
import { 
    CheckCircleIcon, CloseIcon, RefreshIcon, CoinIcon, 
    SwordIcon, PlayIcon, BombIcon, ShieldIcon, DoubleIcon, ConvertIcon, 
    CheckIcon as CheckSmallIcon, UsersIcon, LightningIcon, FlameIcon, ClockIcon, StarIcon, TrophyIcon
} from './Icons';
import { useToast } from '../contexts/ToastContext';
import Tooltip from './Tooltip';
import { Quest } from '../types';
import CoinTransferAnimation from './CoinTransferAnimation';

interface QuestBoardProps {
    onClose: () => void;
}

const QUEST_CONFIG: Record<string, {
    icon: React.ReactNode;
    color: string; // For text/borders if needed
    gradient: string; // Main card gradient
    glow: string; // The orb glow background class
    label: string;
    instruction: string;
}> = {
    win: { 
        icon: <SwordIcon />, 
        color: 'purple', 
        gradient: 'from-purple-600 to-indigo-700', 
        glow: 'bg-purple-500/20', 
        label: 'Combat',
        instruction: 'Defeat your opponent in any game mode.'
    },
    play: { 
        icon: <PlayIcon />, 
        color: 'cyan', 
        gradient: 'from-cyan-500 to-blue-600', 
        glow: 'bg-cyan-500/20', 
        label: 'Dedication',
        instruction: 'Complete matches in any mode. Win or lose.'
    },
    destroy: { 
        icon: <BombIcon />, 
        color: 'red', 
        gradient: 'from-red-500 to-orange-600', 
        glow: 'bg-red-500/20', 
        label: 'Tactics',
        instruction: 'Use the "Destroyer" power-up to remove an enemy piece.'
    },
    wall: { 
        icon: <ShieldIcon />, 
        color: 'green', 
        gradient: 'from-emerald-500 to-green-600', 
        glow: 'bg-emerald-500/20', 
        label: 'Defense',
        instruction: 'Place a "Wall" power-up to block a path.'
    },
    double: { 
        icon: <DoubleIcon />, 
        color: 'yellow', 
        gradient: 'from-yellow-400 to-amber-600', 
        glow: 'bg-yellow-500/20', 
        label: 'Speed',
        instruction: 'Use "Double Strike" to make two moves at once.'
    },
    convert: { 
        icon: <ConvertIcon />, 
        color: 'indigo', 
        gradient: 'from-indigo-500 to-purple-600', 
        glow: 'bg-indigo-500/20', 
        label: 'Sorcery',
        instruction: 'Use "Conversion" to steal an opponent\'s piece.'
    },
    draw: { 
        icon: <CheckSmallIcon />, 
        color: 'gray', 
        gradient: 'from-slate-500 to-gray-600', 
        glow: 'bg-slate-500/20', 
        label: 'Diplomacy',
        instruction: 'Finish a game in a stalemate (Draw).'
    },
    play_online: { 
        icon: <UsersIcon />, 
        color: 'blue', 
        gradient: 'from-blue-500 to-cyan-600', 
        glow: 'bg-blue-500/20', 
        label: 'Social',
        instruction: 'Complete a match in the Online Arena.'
    },
    powerup_generic: { 
        icon: <LightningIcon />, 
        color: 'orange', 
        gradient: 'from-orange-500 to-red-500', 
        glow: 'bg-orange-500/20', 
        label: 'Utility',
        instruction: 'Use any power-up during a match.'
    },
    default: { 
        icon: <TrophyIcon />, 
        color: 'gray', 
        gradient: 'from-slate-600 to-slate-800', 
        glow: 'bg-slate-600/20', 
        label: 'Challenge',
        instruction: 'Complete the objective to earn rewards.'
    },
};

const AnimatedCounter = ({ value }: { value: number }) => {
    const ref = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        const controls = animate(parseInt(node.textContent?.replace(/,/g, '') || '0') || 0, value, {
            duration: 1.5,
            ease: "circOut",
            onUpdate(v) { node.textContent = Math.round(v).toLocaleString(); }
        });
        return () => controls.stop();
    }, [value]);
    return <span ref={ref}>{value.toLocaleString()}</span>;
};

// Particle explosion for rewards
const RewardBurst: React.FC<{ x: number; y: number; amount: number; isMultiplied?: boolean }> = ({ x, y, amount, isMultiplied }) => {
    if (typeof document === 'undefined') return null;

    const particles = Array.from({ length: 40 });
    const coins = Array.from({ length: 8 });

    return createPortal(
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            <motion.div 
                initial={{ opacity: 0.6, scale: 0 }}
                animate={{ opacity: 0, scale: 4 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`absolute rounded-full blur-2xl ${isMultiplied ? 'bg-yellow-400/30' : 'bg-white/30'}`}
                style={{ left: x - 50, top: y - 50, width: 100, height: 100 }}
            />
            {particles.map((_, i) => (
                <motion.div
                    key={`p-${i}`}
                    initial={{ x, y, scale: 0 }}
                    animate={{ 
                        x: x + (Math.random() - 0.5) * 500,
                        y: y + (Math.random() - 0.5) * 500,
                        opacity: [1, 1, 0],
                        scale: [0, 1.5, 0],
                        rotate: Math.random() * 360
                    }}
                    transition={{ duration: 0.6 + Math.random() * 0.6, ease: "easeOut" }}
                    className={`absolute ${Math.random() > 0.5 ? 'rounded-full' : 'rounded-sm'}`}
                    style={{ 
                        width: 4 + Math.random() * 6, 
                        height: 4 + Math.random() * 6, 
                        backgroundColor: ['#fbbf24', '#f59e0b', '#ffffff', '#fb923c'][Math.floor(Math.random() * 4)]
                    }}
                />
            ))}
            {coins.map((_, i) => (
                 <motion.div
                    key={`c-${i}`}
                    initial={{ x, y, scale: 0, rotate: 0 }}
                    animate={{ 
                        x: x + (Math.random() - 0.5) * 200,
                        y: y - 100 - Math.random() * 200,
                        opacity: [1, 1, 0], scale: [0, 1, 0.5], rotate: Math.random() * 720
                    }}
                    transition={{ duration: 1.5, ease: "circOut", delay: Math.random() * 0.1 }}
                    className="absolute text-yellow-300 z-50"
                 >
                    <CoinIcon className="w-6 h-6 drop-shadow-md" />
                 </motion.div>
            ))}
            <motion.div
                style={{ left: x, top: y }}
                className="absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 z-50"
                initial={{ opacity: 0, scale: 0.5, y: 0 }}
                animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.5, 1.2], y: -80 }}
                transition={{ duration: 2, ease: "easeOut" }}
            >
                <div className="flex items-center gap-2">
                    <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] font-sans">
                        +{amount}
                    </span>
                    <CoinIcon className="w-10 h-10 text-yellow-400 drop-shadow-lg" />
                </div>
                {isMultiplied && (
                    <span className="text-lg font-bold text-yellow-300 mt-1 uppercase tracking-widest drop-shadow-md">
                        Bonus!
                    </span>
                )}
            </motion.div>
        </div>,
        document.body
    );
};

const MultiplierBadge: React.FC<{ multiplier: number }> = ({ multiplier }) => {
    if (multiplier <= 1) return null;
    
    let label = `${multiplier}x`;
    let styleClass = "bg-blue-500 from-blue-500 to-cyan-500";
    if (multiplier >= 2) styleClass = "bg-yellow-500 from-yellow-500 to-orange-500"; // Rare
    if (multiplier >= 3) styleClass = "bg-purple-500 from-purple-500 to-pink-500"; // Legendary

    return (
        <div className={`px-2 py-1 rounded-lg bg-gradient-to-r ${styleClass} text-xs font-black text-white shadow-lg animate-pulse flex items-center gap-1`}>
            <StarIcon className="w-3 h-3 fill-white" />
            {label} BONUS
        </div>
    );
};

const QuestCard: React.FC<{
    quest: Quest;
    variant: 'main' | 'secondary';
    onClaim: (id: string) => Promise<void>;
    onReroll: (id: string) => Promise<void>;
    rerollsRemaining: number;
    isRerolling: boolean;
}> = ({ quest, variant, onClaim, onReroll, rerollsRemaining, isRerolling }) => {
    const [isClaiming, setIsClaiming] = useState(false);
    const [burstCoords, setBurstCoords] = useState<{x: number, y: number} | null>(null);
    const isMain = variant === 'main';
    
    const progressPercent = Math.min(100, (quest.current / quest.target) * 100);
    const config = QUEST_CONFIG[quest.type] || QUEST_CONFIG.default;
    
    const multiplier = quest.multiplier || 1;
    const actualReward = Math.floor(quest.reward * multiplier);
    const isRare = multiplier >= 1.5;

    const handleClaimClick = async (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setBurstCoords({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        setIsClaiming(true);
        await onClaim(quest.id);
        setTimeout(() => setBurstCoords(null), 2000);
    };

    const handleRerollClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onReroll(quest.id);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className={`
                relative rounded-[24px] shadow-xl group overflow-hidden transform-gpu
                ${isMain ? 'col-span-1 md:col-span-2 h-full min-h-[220px]' : 'col-span-1 h-full min-h-[220px]'}
                ${quest.completed && !quest.claimed ? 'shadow-yellow-500/20' : ''}
                bg-slate-900/80 backdrop-blur-xl
            `}
        >
            {/* Border Layer - pointer-events-none */}
            <div className={`absolute inset-0 rounded-[24px] border border-white/10 pointer-events-none z-30 ${isRare ? 'border-yellow-500/30' : ''} ${quest.completed && !quest.claimed ? 'ring-2 ring-yellow-400/50' : ''}`}></div>

            {/* Background Effects Container */}
            <div className="absolute inset-0 z-0">
                 {/* Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-20 group-hover:opacity-30 transition-opacity duration-500`} />
                
                {/* Holographic Shine */}
                {isRare && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-30 pointer-events-none group-hover:opacity-50 transition-opacity z-0" />
                )}
                
                {/* Glow */}
                <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl transition-opacity duration-500 opacity-60 group-hover:opacity-80 ${config.glow} z-0`} />
            </div>

            {burstCoords && <RewardBurst x={burstCoords.x} y={burstCoords.y} amount={actualReward} isMultiplied={multiplier > 1} />}

            <div className="relative z-10 p-5 flex flex-col h-full">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl bg-white/10 border border-white/10 text-white ${isMain ? 'scale-110 origin-left' : ''}`}>
                            {React.cloneElement(config.icon as React.ReactElement<{ className?: string }>, { className: isMain ? "w-5 h-5" : "w-4 h-4" })}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">{config.label}</span>
                    </div>
                    <MultiplierBadge multiplier={multiplier} />
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-start">
                    <h3 className={`font-bold text-white leading-tight mb-2 ${isMain ? 'text-2xl' : 'text-lg'}`}>
                        {quest.description}
                    </h3>
                    <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                        {config.instruction}
                    </p>
                    <div className="flex items-center gap-2 text-white/60 text-xs font-medium bg-black/20 self-start px-2 py-1 rounded-md border border-white/5">
                        <span>Progress:</span>
                        <span className="text-white font-bold">{quest.current} <span className="text-white/40">/</span> {quest.target}</span>
                    </div>
                </div>

                {/* Visualization */}
                <div className="my-4">
                    {isMain ? (
                        <div className="flex items-center gap-6">
                            <div className="flex-1">
                                <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                                    <motion.div
                                        className={`h-full bg-gradient-to-r ${config.gradient}`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPercent}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                    />
                                </div>
                                <div className="flex justify-between mt-2 items-end">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Reward</span>
                                        {multiplier > 1 && (
                                            <span className="text-[10px] text-yellow-500/80 font-mono bg-black/20 px-1.5 py-0.5 rounded border border-white/5">
                                                {quest.reward} × {multiplier}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 text-yellow-400 font-black text-2xl">
                                        <CoinIcon className="w-5 h-5" /> 
                                        <span className={multiplier > 1 ? "text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600" : ""}>
                                            {actualReward}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex justify-between items-end text-xs font-bold">
                                <div className="flex flex-col items-start">
                                     {multiplier > 1 && (
                                        <span className="text-[9px] text-yellow-500/70 font-mono mb-0.5">
                                            {quest.reward} × {multiplier}
                                        </span>
                                    )}
                                    <span className={`flex items-center gap-1 ${multiplier > 1 ? 'text-yellow-300' : 'text-yellow-400'}`}>
                                        <CoinIcon className="w-3 h-3" /> {actualReward}
                                    </span>
                                </div>
                                <span className="text-white/50">{Math.round(progressPercent)}%</span>
                            </div>
                            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <motion.div
                                    className={`h-full bg-gradient-to-r ${config.gradient}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercent}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="mt-auto pt-2 border-t border-white/5">
                    {quest.claimed ? (
                        <div className="w-full py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-bold text-xs flex items-center justify-center gap-2">
                            <CheckCircleIcon className="w-4 h-4" /> Claimed
                        </div>
                    ) : quest.completed ? (
                        <motion.button
                            id={`btn-claim-${quest.id}`}
                            onClick={handleClaimClick}
                            disabled={isClaiming}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="relative w-full py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold text-xs shadow-lg overflow-hidden group/btn"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {isClaiming ? <RefreshIcon className="w-4 h-4 animate-spin" /> : <CoinIcon className="w-4 h-4" />}
                                <span>Claim Reward</span>
                            </span>
                            <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />
                        </motion.button>
                    ) : (
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-gray-500">In Progress</span>
                            <Tooltip text={rerollsRemaining > 0 ? `Reroll (${rerollsRemaining} left)` : "No rerolls left"}>
                                <button
                                    onClick={handleRerollClick}
                                    disabled={rerollsRemaining <= 0 || isRerolling}
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-[10px] font-bold"
                                >
                                    <RefreshIcon className={`w-3 h-3 ${isRerolling ? 'animate-spin' : ''}`} /> Reroll
                                </button>
                            </Tooltip>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

const QuestBoard: React.FC<QuestBoardProps> = ({ onClose }) => {
    const [progress, setProgress] = useState(progressService.getProgress());
    const [isRerolling, setIsRerolling] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const [transferAnim, setTransferAnim] = useState<{ amount: number, startId: string } | null>(null);
    const toast = useToast();
    const app = useContext(AppContext);
    
    // Store last day to detect rollover
    const lastDayCheck = useRef(new Date().getDate());

    useEffect(() => {
        const handleUpdate = () => setProgress(progressService.getProgress());
        window.addEventListener('aura_progress_update', handleUpdate);
        setProgress(progressService.getProgress());
        return () => window.removeEventListener('aura_progress_update', handleUpdate);
    }, []);

    // Safety: Check for stuck "Claimed" quests that didn't rotate
    useEffect(() => {
        const hasStuckClaimedQuest = progress.quests.some(q => q.completed && q.claimed);
        
        if (hasStuckClaimedQuest) {
            // If a quest is marked claimed but hasn't been rotated out by the server response yet,
            // we set a timeout. If it's still there after 3 seconds (API lag or error), 
            // we force a fresh fetch to sync state.
            const safetyTimer = setTimeout(() => {
                console.log("Detecting stuck claimed quest, forcing refresh...");
                progressService.init(); 
            }, 3000);

            return () => clearTimeout(safetyTimer);
        }
    }, [progress.quests]);

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            
            // Check for day rollover
            if (now.getDate() !== lastDayCheck.current) {
                lastDayCheck.current = now.getDate();
                progressService.init(); // Triggers server fetch which resets daily quests if new day
            }

            const midnightLocal = new Date();
            midnightLocal.setDate(now.getDate() + 1);
            midnightLocal.setHours(0, 0, 0, 0);
            
            const diff = midnightLocal.getTime() - now.getTime();
            const totalSeconds = Math.floor(diff / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            setTimeLeft(`${hours}h ${minutes}m`);
        };

        updateTimer(); // Initial call
        const interval = setInterval(updateTimer, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    const handleClaim = async (questId: string) => {
        const quest = progress.quests.find(q => q.id === questId);
        if(quest) {
             const amt = Math.floor(quest.reward * (quest.multiplier || 1));
             setTransferAnim({ amount: amt, startId: `btn-claim-${questId}` });
        }
        await progressService.claimQuest(questId);
        app?.refreshCoins();
    };

    const handleReroll = async (questId: string) => {
        if (progress.rerollsRemaining <= 0) return;
        setIsRerolling(true);
        try {
            await progressService.rerollQuest(questId);
            toast.success("Quest rerolled!");
        } finally {
            setTimeout(() => setIsRerolling(false), 500); // Allow animation to finish
        }
    };

    const quests = progress.quests || [];
    // Sort logic: Completed > In Progress, then High Reward
    const sortedQuests = [...quests].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? -1 : 1;
        const rewardA = a.reward * (a.multiplier || 1);
        const rewardB = b.reward * (b.multiplier || 1);
        return rewardB - rewardA;
    });
    
    // Assign biggest quest as Hero
    const mainQuest = sortedQuests[0];
    const secondaryQuests = sortedQuests.slice(1);
    const streak = progress.dailyStreak || 0;

    if (typeof document === 'undefined') return null;

    return createPortal(
        <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div 
                className="w-full max-w-6xl bg-[#0f172a] rounded-[32px] border border-white/10 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden"
                initial={{ y: 50, scale: 0.9 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: 50, scale: 0.9 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
            >
                {/* Dashboard Header */}
                <div className="shrink-0 relative overflow-hidden bg-gradient-to-b from-indigo-900/40 to-slate-900/40 border-b border-white/5 p-6 md:px-8 md:py-6">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl shadow-lg border border-yellow-400/20">
                                    <TrophyIcon className="w-6 h-6 text-white" />
                                </div>
                                <h2 className="text-3xl font-black text-white tracking-tight">Daily Quests</h2>
                            </div>
                            <p className="text-gray-400 text-sm font-medium pl-1">Complete challenges to earn Aura Coins.</p>
                        </div>

                        {/* Stats Cluster + Close Button */}
                        <div className="flex items-center gap-3 self-end md:self-auto max-w-full">
                            {/* Scrollable Stats */}
                            <div className="flex gap-3 bg-black/40 p-2 rounded-2xl border border-white/10 shadow-inner overflow-x-auto no-scrollbar flex-1">
                                
                                {/* Coins Display */}
                                <div id="quest-board-coin-balance" className="flex flex-col items-center justify-center px-4 py-2 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 rounded-xl border border-yellow-500/20 min-w-[100px]">
                                    <div className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider mb-1">Balance</div>
                                    <div className="flex items-center gap-1.5 text-white font-black text-lg">
                                        <CoinIcon className="w-5 h-5 text-yellow-400" />
                                        <AnimatedCounter value={progress.coins} />
                                    </div>
                                </div>

                                {/* Streak */}
                                <div className="flex flex-col items-center justify-center px-4 py-2 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl border border-orange-500/20 min-w-[80px]">
                                    <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1">Streak</div>
                                    <div className="flex items-center gap-1.5 text-white font-black text-lg">
                                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                                            <FlameIcon className="w-5 h-5 text-orange-500 fill-orange-500" />
                                        </motion.div>
                                        {streak}
                                    </div>
                                </div>

                                {/* Rerolls */}
                                <div className="flex flex-col items-center justify-center px-4 py-2 bg-white/5 rounded-xl border border-white/5 min-w-[80px]">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Rerolls</div>
                                    <div className="flex items-center gap-1.5 text-white font-black text-lg">
                                        <RefreshIcon className="w-4 h-4 text-cyan-400" />
                                        {progress.rerollsRemaining}
                                    </div>
                                </div>

                                {/* Timer */}
                                <div className="flex flex-col items-center justify-center px-4 py-2 bg-white/5 rounded-xl border border-white/5 min-w-[80px]">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Resets In</div>
                                    <div className="flex items-center gap-1.5 text-white font-black text-lg font-mono">
                                        <ClockIcon className="w-4 h-4 text-purple-400" />
                                        {timeLeft}
                                    </div>
                                </div>
                            </div>

                            {/* Close Button */}
                            <button onClick={onClose} className="shrink-0 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors border border-white/10 shadow-lg group">
                                <CloseIcon className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quest Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 bg-slate-950/50">
                    <AnimatePresence mode="popLayout">
                        {quests.length === 0 ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-64 text-gray-500">
                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircleIcon className="w-10 h-10 opacity-30" />
                                </div>
                                <p className="text-lg font-bold text-gray-400">All Quests Completed!</p>
                                <p className="text-sm">Come back tomorrow for more.</p>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-fr pb-8">
                                {mainQuest && (
                                    <QuestCard 
                                        key={mainQuest.id}
                                        quest={mainQuest} 
                                        variant="main" 
                                        onClaim={handleClaim}
                                        onReroll={handleReroll}
                                        rerollsRemaining={progress.rerollsRemaining}
                                        isRerolling={isRerolling}
                                    />
                                )}
                                {secondaryQuests.map(quest => (
                                    <QuestCard
                                        key={quest.id}
                                        quest={quest}
                                        variant="secondary"
                                        onClaim={handleClaim}
                                        onReroll={handleReroll}
                                        rerollsRemaining={progress.rerollsRemaining}
                                        isRerolling={isRerolling}
                                    />
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {transferAnim && (
                <CoinTransferAnimation 
                    amount={transferAnim.amount} 
                    startId={transferAnim.startId} 
                    endId="quest-board-coin-balance" 
                    onComplete={() => setTransferAnim(null)} 
                />
            )}
        </motion.div>,
        document.body
    );
};

export default QuestBoard;

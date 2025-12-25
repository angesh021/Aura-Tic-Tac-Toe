
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import Modal from './Modal';
import { CoinIcon, CheckCircleIcon, FlameIcon, StarIcon, LockIcon, CloseIcon, ClockIcon } from './Icons';
import { progressService } from '../services/progress';
import { useSounds } from '../hooks/useSounds';
import { useToast } from '../contexts/ToastContext';
import CoinTransferAnimation from './CoinTransferAnimation';

interface DailyRewardModalProps {
    onClose: () => void;
}

const REWARDS = [50, 100, 150, 200, 250, 300, 1000];

// --- Animation Variants ---
const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1
        }
    }
};

const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0, scale: 0.8 },
    visible: { 
        y: 0, 
        opacity: 1, 
        scale: 1,
        transition: { type: "spring", stiffness: 300, damping: 20 }
    }
};

// --- Confetti Component ---
const MiniConfetti = () => {
    const particles = Array.from({ length: 40 });
    const colors = ['#fbbf24', '#f59e0b', '#34d399', '#60a5fa', '#f472b6'];
    
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[32px] z-50">
            {particles.map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
                        width: Math.random() * 6 + 4,
                        height: Math.random() * 6 + 4,
                        top: '60%',
                        left: '50%',
                    }}
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{
                        x: (Math.random() - 0.5) * 600,
                        y: (Math.random() - 1) * 600,
                        rotate: Math.random() * 720,
                        opacity: 0,
                        scale: Math.random() * 1 + 0.5,
                    }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                />
            ))}
        </div>
    );
};

const DailyRewardModal: React.FC<DailyRewardModalProps> = ({ onClose }) => {
    // Direct subscription to service state to ensure sync across the app
    const [progress, setProgress] = useState(progressService.getProgress());
    const [isClaiming, setIsClaiming] = useState(false);
    const [rewardAmount, setRewardAmount] = useState(0);
    const [timeLeft, setTimeLeft] = useState('');
    const [showTransferAnim, setShowTransferAnim] = useState(false);
    const [justClaimed, setJustClaimed] = useState(false);

    const playSound = useSounds();
    const toast = useToast();

    // Force sync with server on mount to ensure date calculations are accurate
    useEffect(() => {
        progressService.init();
    }, []);

    // Sync with global progress events
    useEffect(() => {
        const handleUpdate = () => setProgress(progressService.getProgress());
        window.addEventListener('aura_progress_update', handleUpdate);
        // Initial fetch to ensure we have latest data on mount
        setProgress(progressService.getProgress());
        return () => window.removeEventListener('aura_progress_update', handleUpdate);
    }, []);

    // Derive canClaimToday directly from the progress state to ensure immediate UI update
    const canClaimToday = useMemo(() => {
        if (!progress.lastDailyReward) return true;
        const lastDate = new Date(progress.lastDailyReward);
        if (isNaN(lastDate.getTime())) return true;
        
        const now = new Date();
        const dayLast = Math.floor(lastDate.getTime() / 86400000);
        const dayNow = Math.floor(now.getTime() / 86400000);
        
        return dayNow > dayLast;
    }, [progress.lastDailyReward]);
    
    // Detect broken streak locally to adjust UI display before server confirmation
    const isStreakBroken = useMemo(() => {
        if (!progress.lastDailyReward) return false; 
        const lastDate = new Date(progress.lastDailyReward);
        if (isNaN(lastDate.getTime())) return false;
        
        const now = new Date();
        const dayLast = Math.floor(lastDate.getTime() / 86400000);
        const dayNow = Math.floor(now.getTime() / 86400000);
        
        // If difference > 1 day, user missed a day. 
        // Note: If canClaimToday is true, we check if gap is > 1.
        // If canClaimToday is false (already claimed), gap is 0.
        return (dayNow - dayLast) > 1;
    }, [progress.lastDailyReward]);

    // If streak is broken, effective streak starts at 0 for visual calculation (next claim is Day 1)
    const currentStreak = progress.dailyStreak || 0;
    const effectiveStreak = isStreakBroken ? 0 : currentStreak;

    // Logic for which day is "active" or "next"
    // If canClaim: We are aiming for the NEXT streak level. (Streak 1 -> Target Day 2)
    // If !canClaim: We have completed the current level. (Streak 2 -> Show Day 2 as done)
    const activeIndex = canClaimToday 
        ? effectiveStreak % 7 
        : (effectiveStreak === 0 ? 0 : (effectiveStreak - 1) % 7);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const midnightLocal = new Date();
            midnightLocal.setDate(now.getDate() + 1);
            midnightLocal.setHours(0, 0, 0, 0);
            const diff = midnightLocal.getTime() - now.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            return `${hours}h ${minutes}m`;
        };
        setTimeLeft(calculateTimeLeft());
        const interval = setInterval(() => setTimeLeft(calculateTimeLeft()), 60000);
        return () => clearInterval(interval);
    }, []);

    const handleClaim = async () => {
        if (isClaiming || !canClaimToday) return;
        setIsClaiming(true);
        
        try {
            const result = await progressService.claimDailyReward();
            
            if (result.success) {
                setJustClaimed(true);
                setRewardAmount(result.reward);
                playSound('win');
                setShowTransferAnim(true);
                // progressService update will trigger useEffect above to update state
            } else {
                // If backend says no, wait for sync to prevent flicker
                await progressService.init();
                // If it was already claimed (e.g. race condition), let user know
                if (!progressService.hasDailyRewardAvailable()) {
                    toast.info("Reward already claimed for today.");
                } else {
                    toast.error("Could not claim reward. Please try again.");
                }
            }
        } catch (e) {
            console.error("Claim error:", e);
            toast.error("Network error.");
        } finally {
            setIsClaiming(false);
        }
    };

    const handleAnimComplete = () => {
        setShowTransferAnim(false);
        setTimeout(onClose, 1200); 
    };

    return (
        <Modal onClose={onClose} className="max-w-lg bg-[#0f172a] border border-white/10" noPadding>
            <div className="relative overflow-hidden p-6 md:p-8 rounded-[32px]">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/20 text-gray-400 hover:text-white transition-colors z-50 backdrop-blur-sm"
                >
                    <CloseIcon className="w-5 h-5" />
                </button>

                {/* Dynamic Background */}
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/60 via-slate-900/80 to-slate-950 pointer-events-none" />
                <motion.div 
                    className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none"
                    animate={{ rotate: 90 }}
                    transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
                />
                
                {justClaimed && <MiniConfetti />}

                {/* Header */}
                <div className="relative z-10 text-center mb-8 pt-4">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight drop-shadow-xl bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
                            Daily Bonus
                        </h2>
                        <p className="text-gray-400 text-sm font-medium">
                            {(!canClaimToday) ? "Come back tomorrow!" : "Claim your reward to keep the streak!"}
                        </p>
                    </motion.div>
                    
                    <motion.div 
                        className="mt-6 inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full shadow-lg backdrop-blur-sm"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.4, type: "spring" }}
                    >
                        <FlameIcon className="w-5 h-5 text-orange-500 animate-pulse" />
                        <span className="text-orange-100 font-bold text-sm tracking-wide uppercase">
                            {effectiveStreak} Day Streak
                        </span>
                    </motion.div>
                </div>

                {/* Grid */}
                <motion.div 
                    className="relative z-10 grid grid-cols-4 gap-3 mb-8"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {REWARDS.map((amount, idx) => {
                        const isBig = idx === 6; // Day 7 is Big
                        const isPast = idx < activeIndex;
                        const isToday = idx === activeIndex;
                        
                        // Calculated States
                        // Collected: Days before today, OR today if we can't claim anymore
                        const isCollected = isPast || (isToday && !canClaimToday);
                        // Active: Today IF we can still claim
                        const isActive = isToday && canClaimToday;
                        // Locked: Future days
                        const isLocked = !isCollected && !isActive;

                        // Specifically check for today's claimed status to show the badge
                        const showClaimedBadge = isToday && isCollected;

                        return (
                            <motion.div 
                                key={idx}
                                variants={itemVariants}
                                className={`
                                    relative rounded-2xl flex flex-col items-center justify-center p-3 border transition-all overflow-hidden group
                                    ${isBig ? 'col-span-2 row-span-1' : 'col-span-1 aspect-square'}
                                    ${isActive
                                        ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/60 shadow-[0_0_25px_rgba(234,179,8,0.2)] ring-1 ring-yellow-400/30' 
                                        : (isCollected 
                                            ? 'bg-green-500/10 border-green-500/30' 
                                            : 'bg-white/5 border-white/5 opacity-60')
                                    }
                                `}
                            >
                                {/* Active Day Shimmer (Only if claimable) */}
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-200%] animate-[shimmer_2s_infinite]" />
                                )}

                                {/* Claimed Badge Overlay */}
                                {showClaimedBadge && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.5 }} 
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="absolute inset-0 bg-green-500/20 z-20 flex items-center justify-center backdrop-blur-[1px] rounded-2xl"
                                    >
                                        <div className="bg-green-600 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg transform -rotate-12 border border-white/20 tracking-wider">
                                            CLAIMED
                                        </div>
                                    </motion.div>
                                )}

                                {/* Status Icon Overlay (Only show check if collected but NOT the main badge, to avoid clutter) */}
                                <div className="absolute top-2 right-2 z-20">
                                    {isCollected && !showClaimedBadge ? (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                                            <CheckCircleIcon className="w-4 h-4 text-green-400" />
                                        </motion.div>
                                    ) : isLocked ? (
                                        <LockIcon className="w-3 h-3 text-gray-600" />
                                    ) : null}
                                </div>
                                
                                <span className={`text-[10px] font-bold uppercase mb-1 tracking-wider ${isActive ? 'text-yellow-200' : 'text-gray-500'}`}>Day {idx + 1}</span>
                                
                                <div className={`relative z-10 flex ${isBig ? 'flex-row gap-3' : 'flex-col'} items-center`}>
                                    {isBig ? (
                                        <>
                                            <div className="relative shrink-0">
                                                <motion.div 
                                                    animate={{ rotate: 360, scale: [1, 1.1, 1] }} 
                                                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }} 
                                                    className="absolute inset-0 bg-yellow-500/30 blur-xl rounded-full" 
                                                />
                                                <CoinIcon className="w-10 h-10 text-yellow-300 drop-shadow-2xl" />
                                            </div>
                                            <span className="font-black text-2xl text-white tracking-tighter">{amount}</span>
                                        </>
                                    ) : (
                                        <>
                                            <CoinIcon className={`w-6 h-6 mb-1 ${isCollected ? 'text-green-300' : (isActive ? 'text-yellow-400' : 'text-gray-600')}`} />
                                            <span className={`font-black tracking-tight ${isActive ? 'text-white' : 'text-gray-400'}`}>
                                                {amount}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* Footer Action */}
                <div className="relative z-10 h-16 w-full">
                    <AnimatePresence mode="wait">
                        {canClaimToday && !justClaimed ? (
                            <motion.button
                                key="claim-btn"
                                id="daily-claim-btn"
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                whileHover={{ scale: 1.02, filter: "brightness(1.1)" }}
                                whileTap={{ scale: 0.97 }}
                                onClick={handleClaim}
                                disabled={isClaiming}
                                className={`w-full h-14 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-3 transition-all relative overflow-hidden
                                    ${isClaiming 
                                        ? 'bg-slate-700 text-gray-400 cursor-not-allowed' 
                                        : 'bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-600 text-white shadow-orange-500/20'
                                    }
                                `}
                            >
                                {isClaiming ? (
                                    <>
                                        <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                                        <span className="text-sm uppercase tracking-widest">Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="uppercase tracking-widest">Claim Reward</span>
                                        <StarIcon className="w-5 h-5 text-yellow-200 animate-[pulse_2s_infinite]" />
                                    </>
                                )}
                                {/* Button Shine */}
                                {!isClaiming && (
                                    <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none" />
                                )}
                            </motion.button>
                        ) : (
                            <motion.div
                                key="info-msg"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-3 text-gray-400 font-bold backdrop-blur-md"
                            >
                                <ClockIcon className="w-5 h-5 text-cyan-500" />
                                <span className="text-sm">Next reward in <span className="text-white font-mono ml-1">{timeLeft}</span></span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {showTransferAnim && (
                <CoinTransferAnimation 
                    amount={rewardAmount} 
                    startId="daily-claim-btn" 
                    endId="header-coin-balance" 
                    onComplete={handleAnimComplete} 
                />
            )}
        </Modal>
    );
};

export default DailyRewardModal;

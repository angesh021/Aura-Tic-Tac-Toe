
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import Modal from './Modal';
import { CoinIcon, CheckCircleIcon, FlameIcon, StarIcon, LockIcon, CloseIcon, ClockIcon } from './Icons';
import { progressService } from '../services/progress';
import { useSounds } from '../hooks/useSounds';
import { useToast } from '../contexts/ToastContext';
import CoinTransferAnimation from './CoinTransferAnimation';

interface DailyRewardModalProps {
    onClose: () => void;
    currentStreak: number;
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

const DailyRewardModal: React.FC<DailyRewardModalProps> = ({ onClose, currentStreak }) => {
    const [claimed, setClaimed] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [rewardAmount, setRewardAmount] = useState(0);
    const [displayStreak, setDisplayStreak] = useState(currentStreak);
    const [timeLeft, setTimeLeft] = useState('');
    const [showTransferAnim, setShowTransferAnim] = useState(false);
    
    // Check if we can claim immediately (local check)
    const canClaimToday = progressService.hasDailyRewardAvailable();
    const [viewOnly, setViewOnly] = useState(!canClaimToday);

    const playSound = useSounds();
    const toast = useToast();

    // Determine the index of the reward to claim today (0-6)
    // If viewOnly (already claimed), currentStreak includes today's claim, so today is currentStreak - 1 (index)
    // If not claimed, today is currentStreak (index)
    const activeIndex = viewOnly ? (currentStreak > 0 ? (currentStreak - 1) % 7 : 0) : currentStreak % 7;

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
        if (isClaiming || claimed || viewOnly) return;
        setIsClaiming(true);
        
        try {
            const result = await progressService.claimDailyReward();
            
            if (result.success) {
                setClaimed(true);
                setRewardAmount(result.reward);
                setDisplayStreak(result.streak);
                playSound('win');
                // Trigger transfer animation
                setShowTransferAnim(true);
            } else {
                toast.error("Already claimed today!");
                setViewOnly(true);
                setIsClaiming(false);
            }
        } catch (e) {
            console.error("Claim error:", e);
            toast.error("Could not claim reward.");
            setIsClaiming(false);
        }
    };

    const handleAnimComplete = () => {
        setShowTransferAnim(false);
        setTimeout(onClose, 800); // Close shortly after animation ends
    };

    return (
        <Modal onClose={onClose} className="max-w-lg bg-[#0f172a] border border-white/10" noPadding>
            <div className="relative overflow-hidden p-6 md:p-8 rounded-[32px]">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50"
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
                
                {claimed && <MiniConfetti />}

                {/* Header */}
                <div className="relative z-10 text-center mb-8 pt-4">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight drop-shadow-xl">Daily Bonus</h2>
                        <p className="text-gray-400 text-sm font-medium">
                            {viewOnly ? "Come back tomorrow for more!" : "Claim your reward to keep the streak!"}
                        </p>
                    </motion.div>
                    
                    <motion.div 
                        className="mt-6 inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full shadow-lg backdrop-blur-sm"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.4, type: "spring" }}
                    >
                        <FlameIcon className="w-5 h-5 text-orange-500 animate-pulse" />
                        <span className="text-orange-100 font-bold text-sm tracking-wide">
                            {displayStreak} Day Streak
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
                        const isBig = idx === 6; // Day 7
                        const isPast = idx < activeIndex;
                        const isToday = idx === activeIndex;
                        const isFuture = idx > activeIndex;
                        const isCollected = isPast || (isToday && (claimed || viewOnly));

                        return (
                            <motion.div 
                                key={idx}
                                variants={itemVariants}
                                className={`
                                    relative rounded-2xl flex flex-col items-center justify-center p-3 border transition-all overflow-hidden group
                                    ${isBig ? 'col-span-2 row-span-2' : 'col-span-1 aspect-square'}
                                    ${isToday
                                        ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/60 shadow-[0_0_25px_rgba(234,179,8,0.3)] ring-1 ring-yellow-400/30' 
                                        : (isCollected 
                                            ? 'bg-green-500/10 border-green-500/30' 
                                            : 'bg-white/5 border-white/5 opacity-60')
                                    }
                                `}
                            >
                                {/* Active Day Shimmer */}
                                {isToday && !claimed && !viewOnly && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-200%] animate-[shimmer_2s_infinite]" />
                                )}

                                {/* Status Icon Overlay */}
                                <div className="absolute top-2 right-2 z-20">
                                    {isCollected ? (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                                            <CheckCircleIcon className="w-4 h-4 text-green-400" />
                                        </motion.div>
                                    ) : isFuture ? (
                                        <LockIcon className="w-3 h-3 text-gray-600" />
                                    ) : null}
                                </div>
                                
                                <span className={`text-[10px] font-bold uppercase mb-1 tracking-wider ${isToday ? 'text-yellow-200' : 'text-gray-500'}`}>Day {idx + 1}</span>
                                
                                <div className="relative z-10 flex flex-col items-center">
                                    {isBig ? (
                                        <div className="relative">
                                            <motion.div 
                                                animate={{ rotate: 360, scale: [1, 1.1, 1] }} 
                                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }} 
                                                className="absolute inset-0 bg-yellow-500/30 blur-2xl rounded-full" 
                                            />
                                            <CoinIcon className="w-14 h-14 text-yellow-300 drop-shadow-2xl" />
                                        </div>
                                    ) : (
                                        <CoinIcon className={`w-7 h-7 ${isCollected ? 'text-green-300' : (isToday ? 'text-yellow-400' : 'text-gray-600')}`} />
                                    )}
                                    
                                    <span className={`font-black tracking-tight ${isBig ? 'text-3xl mt-2 text-white' : 'text-sm mt-1 text-gray-200'}`}>
                                        {amount}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* Footer Action */}
                <div className="relative z-10 h-16 w-full">
                    <AnimatePresence mode="wait">
                        {!claimed && !viewOnly ? (
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
                                        : 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-orange-500/20'
                                    }
                                `}
                            >
                                {isClaiming ? (
                                    <>
                                        <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                                        <span className="text-sm uppercase tracking-widest">Adding to Wallet...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="uppercase tracking-widest">Claim Reward</span>
                                        <StarIcon className="w-5 h-5 text-yellow-200 animate-[pulse_2s_infinite]" />
                                    </>
                                )}
                            </motion.button>
                        ) : (
                            <motion.div
                                key="info-msg"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-3 text-gray-300 font-bold"
                            >
                                <ClockIcon className="w-5 h-5 text-cyan-400" />
                                <span className="text-sm">Next reward in <span className="text-white font-mono">{timeLeft}</span></span>
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


import React, { useEffect, useState, useContext } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { progressService } from '../services/progress';
import { AppContext } from '../contexts/AppContext';
import { CheckCircleIcon, QuestIcon, CloseIcon, RefreshIcon, InfoIcon, CoinIcon } from './Icons';
import { useToast } from '../contexts/ToastContext';
import Tooltip from './Tooltip';

interface QuestBoardProps {
    onClose: () => void;
}

const RewardBurst: React.FC<{ x: number; y: number; amount: number }> = ({ x, y, amount }) => {
    if (typeof document === 'undefined') return null;

    const particles = Array.from({ length: 40 });
    const coins = Array.from({ length: 6 });

    return createPortal(
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            {/* Flash Effect */}
            <motion.div 
                initial={{ opacity: 0.8, scale: 0 }}
                animate={{ opacity: 0, scale: 3 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute rounded-full bg-white/50 blur-xl"
                style={{
                    left: x - 50,
                    top: y - 50,
                    width: 100,
                    height: 100,
                }}
            />

            {/* Confetti Particles */}
            {particles.map((_, i) => {
                const angle = Math.random() * 360;
                const velocity = 60 + Math.random() * 200;
                const size = 3 + Math.random() * 6;
                const color = ['#fbbf24', '#fcd34d', '#ffffff', '#22d3ee', '#f472b6'][Math.floor(Math.random() * 5)];
                const isCircle = Math.random() > 0.5;

                return (
                    <motion.div
                        key={`p-${i}`}
                        initial={{ x, y, scale: 0 }}
                        animate={{ 
                            x: x + Math.cos(angle * (Math.PI / 180)) * velocity,
                            y: y + Math.sin(angle * (Math.PI / 180)) * velocity + (Math.random() * 200), // Gravity
                            opacity: [1, 1, 0],
                            scale: [0, 1.2, 0],
                            rotate: Math.random() * 720
                        }}
                        transition={{ 
                            duration: 0.8 + Math.random() * 0.8, 
                            ease: [0.22, 1, 0.36, 1] 
                        }}
                        className={`absolute ${isCircle ? 'rounded-full' : 'rounded-sm'}`}
                        style={{ 
                            width: size, 
                            height: size, 
                            backgroundColor: color,
                            boxShadow: `0 0 ${size}px ${color}`
                        }}
                    />
                );
            })}

            {/* Flying Coins */}
            {coins.map((_, i) => {
                 // Spread coins mostly upwards
                 const angle = -90 + (Math.random() * 90 - 45); 
                 const velocity = 100 + Math.random() * 100;
                 
                 return (
                    <motion.div
                        key={`c-${i}`}
                        initial={{ x, y, scale: 0, rotate: 0 }}
                        animate={{ 
                            x: x + Math.cos(angle * (Math.PI / 180)) * velocity,
                            y: y + Math.sin(angle * (Math.PI / 180)) * velocity + 150, // Gravity
                            opacity: [1, 1, 0],
                            scale: [0, 1, 0],
                            rotate: Math.random() * 360
                        }}
                        transition={{ 
                            duration: 1.2, 
                            ease: "easeOut",
                            delay: Math.random() * 0.1
                        }}
                        className="absolute text-yellow-400 z-50"
                    >
                        <CoinIcon className="w-5 h-5 drop-shadow-md" />
                    </motion.div>
                 );
            })}
            
            {/* Big Floating Reward Text */}
            <motion.div
                style={{ left: x, top: y }}
                className="absolute flex items-center justify-center gap-1 -translate-x-1/2 -translate-y-1/2 z-50"
                initial={{ opacity: 0, scale: 0.2, y: 0 }}
                animate={{ 
                    opacity: [0, 1, 1, 0], 
                    scale: [0.5, 1.5, 1.2], 
                    y: -150 // Float upwards
                }}
                transition={{ duration: 1.5, ease: "easeOut" }}
            >
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-sm font-sans">
                    +{amount}
                </span>
                <CoinIcon className="w-8 h-8 text-yellow-400 drop-shadow-lg" />
            </motion.div>
        </div>,
        document.body
    );
};

const QuestClaimButton: React.FC<{ questId: string, reward: number, onClaim: (id: string) => Promise<void> }> = ({ questId, reward, onClaim }) => {
    const [isClaiming, setIsClaiming] = useState(false);
    const [claimed, setClaimed] = useState(false);
    const [burstCoords, setBurstCoords] = useState<{x: number, y: number} | null>(null);

    const handleClick = async (e: React.MouseEvent) => {
        // Capture coordinates relative to viewport for the portal
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        setBurstCoords({ x: centerX, y: centerY });
        setIsClaiming(true);
        
        await onClaim(questId);
        
        setClaimed(true);
        
        // Clear burst after animation duration to cleanup
        setTimeout(() => setBurstCoords(null), 2000);
    };

    return (
        <>
            {burstCoords && <RewardBurst x={burstCoords.x} y={burstCoords.y} amount={reward} />}
            
            <AnimatePresence mode="wait">
                {claimed ? (
                    <motion.span 
                        key="claimed"
                        initial={{ scale: 0, opacity: 0 }} 
                        animate={{ scale: 1, opacity: 1 }} 
                        className="text-xs font-bold text-green-400 uppercase flex items-center gap-1 bg-green-900/30 px-3 py-2 rounded-lg border border-green-500/30 shadow-inner"
                    >
                        <CheckCircleIcon className="w-4 h-4" /> Claimed
                    </motion.span>
                ) : (
                    <motion.button 
                        key="button"
                        onClick={handleClick}
                        disabled={isClaiming}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(234, 179, 8, 0.5)" }}
                        whileTap={{ scale: 0.95 }}
                        className="relative px-5 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black text-xs font-black rounded-xl shadow-lg z-10 overflow-hidden flex items-center gap-1 group border border-yellow-300/50"
                    >
                        <span className="relative z-10 flex items-center gap-1">
                            {isClaiming ? 'Processing...' : 'CLAIM'}
                            {!isClaiming && <CoinIcon className="w-4 h-4 group-hover:rotate-12 transition-transform" />}
                        </span>
                        
                        {/* Shimmer Effect */}
                        {!isClaiming && (
                            <motion.div 
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-12"
                                initial={{ x: '-100%' }}
                                animate={{ x: '200%' }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', repeatDelay: 0.5 }}
                            />
                        )}
                    </motion.button>
                )}
            </AnimatePresence>
        </>
    );
};

const QuestBoard: React.FC<QuestBoardProps> = ({ onClose }) => {
    const [progress, setProgress] = useState(progressService.getProgress());
    const app = useContext(AppContext);
    const toast = useToast();
    const [isRerolling, setIsRerolling] = useState(false);

    useEffect(() => {
        const handleUpdate = () => setProgress(progressService.getProgress());
        window.addEventListener('aura_progress_update', handleUpdate);
        return () => window.removeEventListener('aura_progress_update', handleUpdate);
    }, []);

    const handleClaim = async (questId: string) => {
        const success = await progressService.claimQuest(questId);
        if (success) {
            // Toast suppressed to let the burst animation be the primary feedback
            app?.refreshCoins();
        }
    };

    const handleReroll = async (questId: string) => {
        if (isRerolling || progress.rerollsRemaining <= 0) return;
        
        setIsRerolling(true);
        const success = await progressService.rerollQuest(questId);
        if (success) {
            toast.success("Quest rerolled!");
        } else {
            if (progress.rerollsRemaining <= 0) toast.error("No daily rerolls left.");
            else toast.error("Reroll failed.");
        }
        setIsRerolling(false);
    };

    const getQuestHelp = (type: string) => {
        switch (type) {
            case 'win': return "Defeat your opponent in any game mode.";
            case 'play': return "Complete matches. Wins, losses, and draws count.";
            case 'destroy': return "Use the 'Destroyer' Power-Up to remove a piece.";
            case 'wall': return "Use the 'Fortify' Power-Up to place a wall.";
            case 'double': return "Use the 'Double Strike' Power-Up to move twice.";
            case 'convert': return "Use the 'Conversion' Power-Up to steal a piece.";
            default: return "Complete the stated objective to earn rewards.";
        }
    };

    return (
        <motion.div 
            className="relative w-full max-w-md p-6 bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                        <QuestIcon className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Daily Quests</h2>
                        <p className="text-xs text-gray-400 font-medium">Complete tasks to earn Coins</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <div className="flex flex-col items-end justify-center mt-1">
                         <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${progress.rerollsRemaining > 0 ? 'text-cyan-400 bg-cyan-900/30 border-cyan-500/30' : 'text-gray-500 bg-white/5 border-white/5'}`}>
                            <RefreshIcon className="w-3 h-3" />
                            <span>{progress.rerollsRemaining}/2</span>
                         </div>
                         <span className="text-[9px] text-gray-500 mt-1 font-medium">Daily Rerolls</span>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"><CloseIcon className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                {progress.quests.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                            <RefreshIcon className="w-6 h-6 text-gray-600 animate-spin" />
                        </div>
                        <p className="text-gray-400 text-sm font-medium">Loading challenges...</p>
                    </div>
                ) : (
                    progress.quests.map((quest, i) => (
                        <motion.div 
                            key={quest.id}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`p-4 rounded-2xl border relative transition-all duration-300 group
                                ${quest.completed 
                                    ? (quest.claimed ? 'bg-black/20 border-white/5 opacity-60' : 'bg-gradient-to-r from-green-900/30 to-emerald-900/10 border-green-500/30 shadow-[0_4px_20px_-5px_rgba(16,185,129,0.2)]')
                                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                                }
                            `}
                        >
                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <h3 className={`font-bold text-sm truncate ${quest.completed && !quest.claimed ? 'text-green-300' : 'text-gray-200'}`}>
                                            {quest.description}
                                        </h3>
                                        <Tooltip text={getQuestHelp(quest.type)} position="top">
                                            <motion.button
                                                initial={{ opacity: 0.4 }}
                                                whileHover={{ scale: 1.2, opacity: 1, color: "#22d3ee" }}
                                                className="text-gray-500 transition-colors focus:outline-none flex items-center justify-center"
                                            >
                                                <InfoIcon className="w-3.5 h-3.5" />
                                            </motion.button>
                                        </Tooltip>
                                    </div>
                                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                        Reward: <span className="text-yellow-400 font-bold flex items-center gap-0.5">{quest.reward} <CoinIcon className="w-3 h-3"/></span>
                                    </p>
                                </div>
                                
                                <div className="flex items-center gap-2 shrink-0">
                                    {!quest.completed && (
                                        <button 
                                            onClick={() => handleReroll(quest.id)}
                                            disabled={isRerolling || progress.rerollsRemaining <= 0}
                                            className={`p-2 rounded-lg transition-colors ${
                                                progress.rerollsRemaining > 0 
                                                ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer hover:rotate-180 transition-transform duration-500' 
                                                : 'bg-transparent text-gray-700 cursor-not-allowed'
                                            }`}
                                            title={progress.rerollsRemaining > 0 ? "Reroll Quest" : "No rerolls left today"}
                                        >
                                            <RefreshIcon className={`w-4 h-4 ${isRerolling ? 'animate-spin' : ''}`} />
                                        </button>
                                    )}

                                    {quest.completed ? (
                                        <QuestClaimButton questId={quest.id} reward={quest.reward} onClaim={handleClaim} />
                                    ) : (
                                        <span className="text-[10px] font-mono font-bold text-gray-400 bg-black/40 px-2 py-1 rounded border border-white/10">
                                            {quest.current} / {quest.target}
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="h-1.5 bg-black/40 rounded-full overflow-hidden relative z-10 w-full">
                                <motion.div 
                                    className={`h-full ${quest.completed ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-purple-500'}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (quest.current / quest.target) * 100)}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                />
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </motion.div>
    );
};

export default QuestBoard;

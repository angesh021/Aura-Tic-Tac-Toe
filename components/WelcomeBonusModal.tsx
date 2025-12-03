import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from './Modal';
import { CoinIcon } from './Icons';

interface WelcomeBonusModalProps {
    onClaim: () => Promise<boolean>;
    onClose: () => void;
}

const Confetti = () => {
    const particles = Array.from({ length: 60 });
    const colors = ['#22d3ee', '#e879f9', '#fbbf24', '#34d399', '#f87171', '#ffffff'];
    return (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-2xl">
            {particles.map((_, i) => (
                <motion.div
                    key={i}
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: `${Math.random() * 8 + 4}px`,
                        height: `${Math.random() * 8 + 4}px`,
                        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
                        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                    animate={{ 
                        x: (Math.random() - 0.5) * 600,
                        y: (Math.random() - 0.5) * 600,
                        opacity: [1, 1, 0],
                        scale: [0, 1, 0.5],
                        rotate: Math.random() * 360
                    }}
                    transition={{ 
                        duration: Math.random() * 1.5 + 1, 
                        ease: "easeOut",
                    }}
                />
            ))}
        </div>
    );
};

const WelcomeBonusModal: React.FC<WelcomeBonusModalProps> = ({ onClaim, onClose }) => {
    const [isClaiming, setIsClaiming] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);

    const handleClaim = async () => {
        setIsClaiming(true);
        const success = await onClaim();
        if (success) {
            setShowCelebration(true);
            // Delay close to show animation
            setTimeout(() => {
                onClose();
            }, 2500);
        } else {
            setIsClaiming(false);
        }
    };

    return (
        <Modal onClose={() => {}} className="max-w-md overflow-hidden relative">
            <div className="text-center relative p-4 z-10">
                {/* Background Glow */}
                <motion.div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/20 rounded-full blur-[100px] -z-10"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity }}
                />

                {showCelebration && <Confetti />}

                <div className="mb-6">
                    <motion.div 
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ 
                            scale: showCelebration ? [1, 1.2, 1] : 1, 
                            rotate: showCelebration ? [0, 10, -10, 0] : 0 
                        }}
                        transition={{ type: "spring", bounce: 0.5 }}
                        className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(234,179,8,0.4)] border-4 border-yellow-300"
                    >
                        <CoinIcon className="w-16 h-16 text-yellow-950" />
                    </motion.div>
                    
                    <motion.h2 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-3xl font-black text-white mb-2 tracking-tight"
                    >
                        {showCelebration ? "Bonus Claimed!" : "Welcome to Aura!"}
                    </motion.h2>
                    
                    <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-gray-400 leading-relaxed"
                    >
                        {showCelebration 
                            ? "500 Coins added to your wallet." 
                            : "Kickstart your journey with a gift on us. Use these coins to unlock Power-Ups, Skins, and more!"}
                    </motion.p>
                </div>

                <AnimatePresence mode="wait">
                    {!showCelebration ? (
                        <motion.button
                            key="claim-btn"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ 
                                opacity: 1, 
                                y: 0,
                                scale: [1, 1.02, 1],
                                boxShadow: ["0px 10px 15px -3px rgba(234,179,8,0.2)", "0px 10px 25px -3px rgba(234,179,8,0.4)", "0px 10px 15px -3px rgba(234,179,8,0.2)"]
                            }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ 
                                opacity: { delay: 0.4 },
                                y: { delay: 0.4 },
                                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                                boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleClaim}
                            disabled={isClaiming}
                            className="relative w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 rounded-xl font-black text-white text-lg shadow-xl overflow-hidden flex items-center justify-center gap-2 group"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                {isClaiming ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Claim 500 Coins</span>
                                        <CoinIcon className="w-5 h-5 text-yellow-200 group-hover:rotate-12 transition-transform" />
                                    </>
                                )}
                            </span>
                            
                            {/* Shimmer Effect */}
                            {!isClaiming && (
                                <motion.div 
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"
                                    initial={{ x: '-100%' }}
                                    animate={{ x: '200%' }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear", repeatDelay: 0.5 }}
                                />
                            )}
                        </motion.button>
                    ) : (
                        <motion.div
                            key="success-msg"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full py-4 bg-green-500 rounded-xl font-black text-white text-lg shadow-xl shadow-green-500/20 flex items-center justify-center gap-2"
                        >
                            <span>Success!</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Modal>
    );
};

export default WelcomeBonusModal;
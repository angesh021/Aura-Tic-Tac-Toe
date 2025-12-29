
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from './Modal';
import { CoinIcon, StarIcon, CheckCircleIcon } from './Icons';
import { useSounds } from '../hooks/useSounds';

interface WelcomeBonusModalProps {
    onClaim: () => Promise<boolean>;
    onClose: () => void;
}

const Confetti = () => {
    const particles = Array.from({ length: 60 });
    const colors = ['#fcd34d', '#fbbf24', '#f59e0b', '#ffffff'];
    return (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[32px]">
            {particles.map((_, i) => (
                <motion.div
                    key={i}
                    style={{
                        position: 'absolute',
                        top: '40%',
                        left: '50%',
                        width: `${Math.random() * 6 + 3}px`,
                        height: `${Math.random() * 6 + 3}px`,
                        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
                        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                    animate={{ 
                        x: (Math.random() - 0.5) * 500,
                        y: (Math.random() - 0.5) * 500,
                        opacity: [1, 1, 0],
                        scale: [0, 1.5, 0],
                        rotate: Math.random() * 720
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
    const isClaimingRef = useRef(false); // Synchronous lock
    const playSound = useSounds();

    const handleClaim = async () => {
        if (isClaimingRef.current || showCelebration) return;
        
        isClaimingRef.current = true;
        setIsClaiming(true);
        
        const success = await onClaim();
        
        if (success) {
            playSound('win');
            setShowCelebration(true);
            setTimeout(() => {
                onClose();
            }, 3000);
        } else {
            setIsClaiming(false);
            isClaimingRef.current = false;
        }
    };

    return (
        <Modal onClose={() => {}} className="max-w-sm overflow-visible" noPadding>
            {/* Main Card Container */}
            <div className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-[32px] p-1 shadow-2xl border border-white/10 overflow-hidden">
                
                {/* Glossy Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-[32px] z-20"></div>

                <div className="relative bg-slate-900/50 rounded-[28px] p-6 text-center z-10 overflow-hidden min-h-[380px] flex flex-col items-center justify-center">
                    {/* Background Rays/Glow */}
                    <motion.div 
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-radial from-yellow-500/20 to-transparent opacity-50"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    />
                    
                    {showCelebration && <Confetti />}

                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center w-full">
                        
                        {/* 3D-ish Coin Graphic */}
                        <div className="relative mb-8 group cursor-pointer" onClick={handleClaim}>
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className="w-32 h-32 rounded-full bg-gradient-to-b from-yellow-300 to-yellow-600 shadow-[0_10px_40px_-10px_rgba(234,179,8,0.6)] flex items-center justify-center border-4 border-yellow-200 relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent rotate-45 transform translate-y-full animate-[shimmer_2s_infinite]"></div>
                                <CoinIcon className="w-16 h-16 text-yellow-900 drop-shadow-md" />
                            </motion.div>
                            
                            {/* Floating Stars */}
                            <motion.div 
                                animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5], rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                className="absolute -top-4 -right-6 text-yellow-300"
                            >
                                <StarIcon className="w-10 h-10 filter drop-shadow-lg" />
                            </motion.div>
                            <motion.div 
                                animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5], rotate: [0, -10, 10, 0] }}
                                transition={{ duration: 2.5, repeat: Infinity }}
                                className="absolute bottom-0 -left-6 text-yellow-300"
                            >
                                <StarIcon className="w-8 h-8 filter drop-shadow-lg" />
                            </motion.div>
                        </div>

                        <AnimatePresence mode="wait">
                            {!showCelebration ? (
                                <motion.div
                                    key="offer"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="w-full flex flex-col items-center"
                                >
                                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
                                        Welcome Gift
                                    </h2>
                                    <p className="text-gray-400 text-sm mb-8 leading-relaxed px-2 font-medium">
                                        Start your journey with a boost! <br/> Use coins to unlock Power-Ups & Skins.
                                    </p>

                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleClaim}
                                        disabled={isClaiming}
                                        className="relative w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-yellow-900 font-black text-lg rounded-2xl shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2 overflow-hidden group"
                                    >
                                        {isClaiming ? (
                                            <div className="w-6 h-6 border-4 border-yellow-900/30 border-t-yellow-900 rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <span>Claim 1000 Coins</span>
                                            </>
                                        )}
                                        {/* Shine Overlay */}
                                        <motion.div 
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"
                                            initial={{ x: '-100%' }}
                                            animate={{ x: '200%' }}
                                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear", repeatDelay: 0.5 }}
                                        />
                                    </motion.button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center gap-2 w-full"
                                >
                                    <div className="text-center">
                                        <motion.div 
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                            className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-sm mb-4"
                                        >
                                            +1000
                                        </motion.div>
                                        <div className="text-lg font-bold text-white uppercase tracking-widest flex items-center justify-center gap-2">
                                            <CheckCircleIcon className="w-6 h-6 text-green-400" /> Added to Wallet
                                        </div>
                                    </div>
                                    
                                    <div className="mt-8 w-full px-8">
                                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                            <motion.div 
                                                className="h-full bg-yellow-400 rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: "100%" }}
                                                transition={{ duration: 3, ease: "linear" }}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default WelcomeBonusModal;

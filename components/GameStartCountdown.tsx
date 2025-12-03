
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CoinIcon } from './Icons';
import { useSounds } from '../hooks/useSounds';

interface GameStartCountdownProps {
    onComplete: () => void;
    potAmount?: number;
}

const GameStartCountdown: React.FC<GameStartCountdownProps> = ({ onComplete, potAmount }) => {
    const [count, setCount] = useState(5);
    const playSound = useSounds();

    useEffect(() => {
        const timer = setInterval(() => {
            setCount(prev => {
                if (prev === 1) {
                    clearInterval(timer);
                    // Slight delay on 0/GO before completing to show the final state
                    setTimeout(onComplete, 800);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [onComplete]);

    useEffect(() => {
        if (count > 0) playSound('timerTick');
        else playSound('placeX'); // "GO" sound effect
    }, [count, playSound]);

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md"
        >
            {potAmount !== undefined && potAmount > 0 && (
                <motion.div 
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                    className="mb-12 flex flex-col items-center"
                >
                    <div className="text-yellow-500 font-bold text-sm tracking-[0.3em] uppercase mb-2">Total Pot Locked</div>
                    <div className="flex items-center gap-3 bg-yellow-500/10 px-8 py-4 rounded-2xl border border-yellow-500/30 shadow-[0_0_40px_rgba(234,179,8,0.2)]">
                        <CoinIcon className="w-8 h-8 text-yellow-400" />
                        <span className="text-5xl font-black text-yellow-300 tracking-tighter font-mono">{potAmount}</span>
                    </div>
                </motion.div>
            )}

            <div className="relative flex items-center justify-center w-64 h-64">
                <AnimatePresence mode="popLayout">
                    {count > 0 ? (
                        <motion.div
                            key={count}
                            initial={{ scale: 0.5, opacity: 0, filter: "blur(20px)" }}
                            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                            exit={{ scale: 1.5, opacity: 0, filter: "blur(10px)" }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="absolute text-[10rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 leading-none drop-shadow-2xl z-10"
                        >
                            {count}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="GO"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1.2, opacity: 1 }}
                            className="absolute text-[8rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 leading-none drop-shadow-[0_0_50px_rgba(34,211,238,0.8)] z-10"
                        >
                            GO!
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {/* Decorative Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none opacity-20">
                    <circle cx="50%" cy="50%" r="40%" fill="none" stroke="white" strokeWidth="2" />
                    <motion.circle 
                        cx="50%" cy="50%" r="40%" fill="none" stroke="#22d3ee" strokeWidth="4" 
                        initial={{ pathLength: 1 }}
                        animate={{ pathLength: 0 }}
                        transition={{ duration: 5, ease: "linear" }}
                        strokeLinecap="round"
                    />
                </svg>
            </div>
            
            <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-12 text-gray-400 font-medium tracking-widest uppercase text-sm"
            >
                Prepare for battle
            </motion.p>
        </motion.div>
    );
};

export default GameStartCountdown;

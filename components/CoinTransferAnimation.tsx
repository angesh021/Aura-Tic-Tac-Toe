
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { CoinIcon } from './Icons';

interface CoinTransferAnimationProps {
    amount: number;
    onComplete: () => void;
    startId?: string;
    endId?: string;
}

const CoinTransferAnimation: React.FC<CoinTransferAnimationProps> = ({ amount, onComplete, startId, endId }) => {
    const [coins, setCoins] = useState<{id: number, x: number, y: number, delay: number}[]>([]);
    const startRef = useRef<{x: number, y: number}>({x:0, y:0});
    const endRef = useRef<{x: number, y: number}>({x:0, y:0});

    useEffect(() => {
        // Default Target: Header Balance
        const headerEl = document.getElementById('header-coin-balance');
        
        // Resolve Start/End Elements
        let startEl: HTMLElement | null = null;
        let endEl: HTMLElement | null = null;

        if (startId) startEl = document.getElementById(startId);
        if (endId) endEl = document.getElementById(endId);

        // Center of screen fallback
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;

        const getCenter = (el: HTMLElement | null) => {
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        };

        const startPos = getCenter(startEl);
        const endPos = getCenter(endEl);
        const headerPos = getCenter(headerEl);

        if (startPos && endPos) {
            // Explicit path
            startRef.current = startPos;
            endRef.current = endPos;
        } else if (amount > 0) {
            // Gain: Center/Start -> Header/End
            startRef.current = startPos || { x: cx, y: cy };
            endRef.current = endPos || headerPos || { x: cx, y: 0 }; 
        } else {
            // Loss: Header/Start -> Center/End
            startRef.current = startPos || headerPos || { x: cx, y: 0 };
            endRef.current = endPos || { x: cx, y: cy };
        }

        // Generate particles
        // Use absolute amount for count logic
        const absAmount = Math.abs(amount);
        const count = Math.min(20, Math.max(5, absAmount / 10)); 
        
        const newCoins = Array.from({ length: count }).map((_, i) => ({
            id: i,
            x: 0, 
            y: 0,
            delay: i * 0.05
        }));
        
        setCoins(newCoins);

        const timer = setTimeout(onComplete, 1500 + (count * 50)); 
        return () => clearTimeout(timer);
    }, [amount, onComplete, startId, endId]);

    if (coins.length === 0) return null;

    // If amount is positive, display Gold. If negative, display Red.
    // However, if we are animating a wager (spend), we pass positive amount but explicit coords.
    // We can infer color intent: If explicit coords are set and amount is positive, it's gold moving.
    const isGain = amount > 0;
    const colorClass = isGain ? 'text-yellow-400' : 'text-red-400';

    return createPortal(
        <div className="fixed inset-0 pointer-events-none z-[9999]">
            {coins.map((c) => (
                <motion.div
                    key={c.id}
                    initial={{ 
                        x: startRef.current.x, 
                        y: startRef.current.y, 
                        scale: 0, 
                        opacity: 0 
                    }}
                    animate={{ 
                        x: endRef.current.x, 
                        y: endRef.current.y, 
                        scale: 1, 
                        opacity: [0, 1, 1, 0], 
                        rotate: Math.random() * 360
                    }}
                    transition={{
                        duration: 1.2,
                        delay: c.delay,
                        ease: "easeInOut"
                    }}
                    className={`absolute ${colorClass} drop-shadow-md`}
                >
                    <CoinIcon className="w-6 h-6" />
                </motion.div>
            ))}
            
            {/* Optional Floating Text at center if no explicit IDs provided (Game Summary style) */}
            {!startId && !endId && (
                 <motion.div
                    initial={{ 
                        x: window.innerWidth/2 - 50,
                        y: window.innerHeight/2, 
                        opacity: 0, 
                        scale: 0.5 
                    }}
                    animate={{ 
                        y: window.innerHeight/2 - 100, 
                        opacity: [0, 1, 1, 0], 
                        scale: 1.5 
                    }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className={`fixed z-[10000] font-black text-4xl ${isGain ? 'text-yellow-400' : 'text-red-500'} drop-shadow-xl flex items-center gap-2`}
                    style={{ left: 0, right: 0, margin: 'auto', width: 'fit-content' }}
                >
                    {amount > 0 ? '+' : ''}{amount} <CoinIcon className="w-8 h-8"/>
                </motion.div>
            )}
        </div>,
        document.body
    );
};

export default CoinTransferAnimation;

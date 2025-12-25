
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { onlineService } from '../services/online';
import { TrophyIcon, StarIcon, CoinIcon, CrownIcon } from './Icons';

interface Broadcast {
    id: string;
    message: string;
    type: 'jackpot' | 'rank_up' | 'drop';
}

const GlobalTicker: React.FC = () => {
    const [currentBroadcast, setCurrentBroadcast] = useState<Broadcast | null>(null);
    const [queue, setQueue] = useState<Broadcast[]>([]);

    useEffect(() => {
        const handleBroadcast = (data: { message: string, type: 'jackpot' | 'rank_up' | 'drop' }) => {
            const newItem: Broadcast = { id: Math.random().toString(), message: data.message, type: data.type };
            setQueue(prev => [...prev, newItem]);
        };

        onlineService.onGlobalBroadcast(handleBroadcast);
        return () => onlineService.offGlobalBroadcast(handleBroadcast);
    }, []);

    useEffect(() => {
        if (!currentBroadcast && queue.length > 0) {
            const next = queue[0];
            setCurrentBroadcast(next);
            setQueue(prev => prev.slice(1));

            // Auto dismiss after 5 seconds
            setTimeout(() => {
                setCurrentBroadcast(null);
            }, 5000);
        }
    }, [currentBroadcast, queue]);

    if (!currentBroadcast) return null;

    const getIcon = (type: string) => {
        switch(type) {
            case 'jackpot': return <CoinIcon className="w-4 h-4 text-yellow-900" />;
            case 'rank_up': return <CrownIcon className="w-4 h-4 text-purple-900" fill />;
            case 'drop': return <StarIcon className="w-4 h-4 text-pink-900" />;
            default: return <TrophyIcon className="w-4 h-4 text-gray-900" />;
        }
    };

    const getColor = (type: string) => {
        switch(type) {
            case 'jackpot': return 'bg-gradient-to-r from-yellow-400 to-amber-500 border-yellow-300';
            case 'rank_up': return 'bg-gradient-to-r from-purple-400 to-indigo-500 border-purple-300';
            case 'drop': return 'bg-gradient-to-r from-pink-400 to-rose-500 border-pink-300';
            default: return 'bg-gray-200 border-gray-300';
        }
    };

    return (
        <div className="fixed top-20 left-0 right-0 z-[80] flex justify-center pointer-events-none">
            <AnimatePresence>
                <motion.div
                    key={currentBroadcast.id}
                    initial={{ y: -50, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -20, opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={`
                        flex items-center gap-3 px-4 py-2 rounded-full shadow-2xl border-2
                        ${getColor(currentBroadcast.type)}
                    `}
                >
                    <div className="bg-white/30 p-1.5 rounded-full backdrop-blur-sm">
                        {getIcon(currentBroadcast.type)}
                    </div>
                    <span className="text-white font-bold text-xs md:text-sm uppercase tracking-wide drop-shadow-sm">
                        {currentBroadcast.message}
                    </span>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default GlobalTicker;

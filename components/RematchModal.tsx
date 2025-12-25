
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from './Modal';
import { PlayerRole } from '../types';
import { ClockIcon, RestartIcon, CloseIcon, CheckIcon } from './Icons';

interface RematchModalProps {
    offer: { from: PlayerRole, expiresAt: number };
    myRole: PlayerRole;
    onAccept: () => void;
    onDecline: () => void;
}

const RematchModal: React.FC<RematchModalProps> = ({ offer, myRole, onAccept, onDecline }) => {
    const [timeLeft, setTimeLeft] = useState(30);
    const isMyRequest = offer.from === myRole;

    useEffect(() => {
        const interval = setInterval(() => {
            const remaining = Math.ceil((offer.expiresAt - Date.now()) / 1000);
            setTimeLeft(Math.max(0, remaining));
            
            if (remaining <= 0) {
                // Timer expired - handled by server usually, but can trigger decline locally
                // Ideally we just wait for server to clear it, but we can force it
                if (!isMyRequest) onDecline();
                clearInterval(interval);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [offer.expiresAt, onDecline, isMyRequest]);

    return (
        <Modal onClose={() => {}} className="max-w-sm bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl" noPadding>
            <div className="p-6 text-center relative overflow-hidden">
                {/* Background Glow */}
                <div className={`absolute top-0 left-0 w-full h-1 ${isMyRequest ? 'bg-cyan-500' : 'bg-yellow-500'}`}></div>
                
                <div className="mb-6">
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center border-4 mb-4 ${isMyRequest ? 'border-cyan-500/20 bg-cyan-500/10' : 'border-yellow-500/20 bg-yellow-500/10 animate-pulse'}`}>
                        <RestartIcon className={`w-8 h-8 ${isMyRequest ? 'text-cyan-400' : 'text-yellow-400'}`} />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {isMyRequest ? "Waiting for Opponent..." : "Rematch Requested!"}
                    </h2>
                    
                    {!isMyRequest && (
                        <p className="text-gray-400 text-sm">
                            Your opponent wants to run it back.
                        </p>
                    )}
                </div>

                {/* Timer Bar */}
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-6 relative">
                    <motion.div 
                        className={`h-full ${timeLeft < 10 ? 'bg-red-500' : 'bg-green-500'}`}
                        initial={{ width: '100%' }}
                        animate={{ width: '0%' }}
                        transition={{ duration: 30, ease: 'linear' }}
                        key={offer.expiresAt} // Reset animation on new offer
                    />
                </div>
                <div className="text-xs font-mono text-gray-500 mb-6 flex items-center justify-center gap-2">
                    <ClockIcon className="w-3 h-3" /> Auto-decline in {timeLeft}s
                </div>

                {isMyRequest ? (
                    <button 
                        onClick={onDecline}
                        className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold transition-colors"
                    >
                        Cancel Request
                    </button>
                ) : (
                    <div className="flex gap-3">
                        <button 
                            onClick={onDecline}
                            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-red-400 font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            <CloseIcon className="w-4 h-4" /> Decline
                        </button>
                        <button 
                            onClick={onAccept}
                            className="flex-[1.5] py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold transition-colors shadow-lg flex items-center justify-center gap-2"
                        >
                            <CheckIcon className="w-4 h-4" /> Accept
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default RematchModal;

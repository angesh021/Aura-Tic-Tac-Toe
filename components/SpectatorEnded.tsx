
import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { AuthContext } from '../contexts/AuthContext';
import { LogoutIcon } from './Icons';

const SpectatorEnded: React.FC = () => {
    const auth = useContext(AuthContext);

    const handleExit = () => {
        auth?.logout();
        window.location.reload(); // Force full reset
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900 text-white p-4">
            <div className="bg-noise"></div>
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 text-center space-y-6 max-w-md p-8 glass-panel rounded-3xl border border-white/10 shadow-2xl"
            >
                <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                </div>
                
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-200 to-gray-400">
                        Stream Ended
                    </h1>
                    <p className="mt-3 text-gray-400 leading-relaxed">
                        The game session has ended or the connection was lost.
                    </p>
                </div>

                <div className="pt-6 border-t border-white/5 flex justify-center">
                    <button 
                        onClick={handleExit}
                        className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                    >
                        <LogoutIcon className="w-5 h-5" />
                        Exit to Login
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default SpectatorEnded;

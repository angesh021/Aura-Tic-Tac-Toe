
import React from 'react';
import Modal from './Modal';
import { motion } from 'framer-motion';
import { WifiIcon, CloseIcon, PlayIcon } from './Icons';

interface RejoinModalProps {
    onConfirm: () => void;
    onDecline: () => void;
}

const RejoinModal: React.FC<RejoinModalProps> = ({ onConfirm, onDecline }) => {
    return (
        <Modal onClose={() => {}} className="max-w-md">
            <div className="text-center space-y-6 relative">
                {/* Icon */}
                <div className="w-20 h-20 mx-auto bg-cyan-500/20 rounded-full flex items-center justify-center border-2 border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.3)] animate-pulse">
                    <WifiIcon className="w-10 h-10 text-cyan-400" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white">Connection Found</h2>
                    <p className="text-gray-400">
                        You were disconnected from an active match. <br/>
                        Would you like to rejoin?
                    </p>
                </div>

                <div className="flex gap-3 pt-2">
                    <motion.button 
                        onClick={onDecline}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all flex items-center justify-center gap-2"
                    >
                        <CloseIcon className="w-5 h-5" /> Abandon
                    </motion.button>
                    
                    <motion.button 
                        onClick={onConfirm}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="flex-[2] py-3 rounded-xl font-bold text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        <PlayIcon className="w-5 h-5" /> Rejoin Match
                    </motion.button>
                </div>
            </div>
        </Modal>
    );
};

export default RejoinModal;

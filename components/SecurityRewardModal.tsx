import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from './Modal';
import { ShieldCheckIcon, SmartphoneIcon, KeyIcon, CoinIcon, CheckCircleIcon } from './Icons';
import { useSounds } from '../hooks/useSounds';

interface SecurityRewardModalProps {
    type: 'email' | 'mfa' | 'password';
    reward: number;
    onClaim: () => void;
    onClose: () => void;
}

const SecurityRewardModal: React.FC<SecurityRewardModalProps> = ({ type, reward, onClaim, onClose }) => {
    const [isClaiming, setIsClaiming] = useState(false);
    const [claimed, setClaimed] = useState(false);
    const playSound = useSounds();

    const config = {
        email: {
            title: "Identity Verified",
            description: "Your email is confirmed. Account security increased!",
            icon: <ShieldCheckIcon className="w-12 h-12 text-green-400" />,
            color: "green"
        },
        mfa: {
            title: "2FA Enabled",
            description: "Maximum security activated. Your account is fortress-locked.",
            icon: <SmartphoneIcon className="w-12 h-12 text-purple-400" />,
            color: "purple"
        },
        password: {
            title: "Password Updated",
            description: "Fresh credentials keep your data safe.",
            icon: <KeyIcon className="w-12 h-12 text-blue-400" />,
            color: "blue"
        }
    };

    const currentConfig = config[type];

    const handleClaim = async () => {
        setIsClaiming(true);
        // Simulate slight delay for effect before callback
        await new Promise(resolve => setTimeout(resolve, 600));
        playSound('win');
        onClaim();
        setClaimed(true);
        setTimeout(onClose, 2000);
    };

    return (
        <Modal onClose={() => !claimed && onClose()} className="max-w-sm bg-slate-900 border border-white/10" noPadding>
            <div className="relative p-8 text-center overflow-hidden">
                {/* Background Glow */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-${currentConfig.color}-500/20 blur-[60px]`}></div>

                <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`w-24 h-24 mx-auto bg-${currentConfig.color}-500/10 rounded-full flex items-center justify-center border border-${currentConfig.color}-500/30 mb-6 relative z-10 shadow-[0_0_30px_rgba(0,0,0,0.3)]`}
                >
                    {currentConfig.icon}
                </motion.div>

                <h2 className="text-2xl font-black text-white mb-2 relative z-10">{currentConfig.title}</h2>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed relative z-10 px-2">{currentConfig.description}</p>

                <AnimatePresence mode="wait">
                    {!claimed ? (
                        <motion.button
                            key="claim-btn"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={handleClaim}
                            disabled={isClaiming}
                            className={`w-full py-4 rounded-xl font-black text-white shadow-lg flex items-center justify-center gap-2 relative z-10 transition-all
                                ${isClaiming ? 'bg-gray-700 cursor-wait' : `bg-gradient-to-r from-${currentConfig.color}-600 to-${currentConfig.color}-500 hover:scale-[1.02]`}
                            `}
                        >
                            {isClaiming ? 'Processing...' : (
                                <>
                                    <span>Claim Reward</span>
                                    <div className="bg-black/20 px-2 py-0.5 rounded text-xs font-mono flex items-center gap-1">
                                        +{reward} <CoinIcon className="w-3 h-3 text-yellow-300"/>
                                    </div>
                                </>
                            )}
                        </motion.button>
                    ) : (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center gap-2 text-green-400 font-bold"
                        >
                            <CheckCircleIcon className="w-8 h-8" />
                            <span>Coins Added!</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Modal>
    );
};

export default SecurityRewardModal;
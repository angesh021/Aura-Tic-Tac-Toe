
import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import Modal from './Modal';
import { CloseIcon, ArrowLeftIcon, CheckIcon, TrashIcon } from './Icons';

interface ConfirmationModalProps {
    title: string;
    description: string;
    confirmText?: string; // Kept for API compatibility, but unused in slider
    onConfirm: () => void;
    onClose: () => void;
}

const SlideToConfirm: React.FC<{ onConfirm: () => void; label: string }> = ({ onConfirm, label }) => {
    const [confirmed, setConfirmed] = useState(false);
    const x = useMotionValue(0);
    const xInput = [0, 240]; // approximate track width minus handle width
    const backgroundOpacity = useTransform(x, xInput, [0, 1]);
    const handleOpacity = useTransform(x, xInput, [1, 0]);

    const handleDragEnd = (_: any, info: PanInfo) => {
        if (info.offset.x > 200) {
            setConfirmed(true);
            onConfirm();
        } else {
            // Snap back happens automatically via layout/dragConstraints if not controlled, 
            // but framer-motion handles the spring back on release if constraints are set.
        }
    };

    return (
        <div className="relative w-full h-14 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden border border-gray-300 dark:border-white/5 select-none">
            {/* Success State */}
            <motion.div 
                style={{ opacity: backgroundOpacity }}
                className="absolute inset-0 bg-red-600 flex items-center justify-center text-white font-bold tracking-widest uppercase text-sm"
            >
                Confirmed
            </motion.div>

            {/* Instruction Text */}
            <motion.div 
                style={{ opacity: handleOpacity }}
                className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest pointer-events-none"
            >
                {label}
            </motion.div>

            {/* Draggable Handle */}
            <motion.div
                className="absolute top-1 left-1 w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing z-10 border border-gray-200 dark:border-white/10"
                drag="x"
                dragConstraints={{ left: 0, right: 245 }}
                dragElastic={0.1}
                dragMomentum={false}
                onDragEnd={handleDragEnd}
                style={{ x }}
            >
                {confirmed ? (
                    <CheckIcon className="w-6 h-6 text-green-500" />
                ) : (
                    <ArrowLeftIcon className="w-5 h-5 text-gray-400 rotate-180" />
                )}
            </motion.div>
        </div>
    );
};

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, description, onConfirm, onClose }) => {
    return (
        <Modal onClose={onClose} className="max-w-sm">
            <div className="text-center space-y-6 pt-2 pb-4">
                <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                    <TrashIcon className="w-8 h-8 text-red-500" />
                </div>
                
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed px-2">
                        {description}
                    </p>
                </div>

                <div className="pt-2 px-2">
                    <SlideToConfirm onConfirm={onConfirm} label="Slide to Confirm" />
                </div>

                <button 
                    onClick={onClose}
                    className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors uppercase tracking-widest"
                >
                    Cancel
                </button>
            </div>
        </Modal>
    );
};

export default ConfirmationModal;

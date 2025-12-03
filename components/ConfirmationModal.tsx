import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Modal from './Modal';

interface ConfirmationModalProps {
    title: string;
    description: string;
    confirmText: string;
    onConfirm: () => void;
    onClose: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, description, confirmText, onConfirm, onClose }) => {
    const [input, setInput] = useState('');
    const isConfirmed = input === confirmText;

    return (
        <Modal onClose={onClose}>
            <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-red-400">{title}</h2>
                <p className="text-gray-400">{description}</p>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full p-3 text-center uppercase bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder={`Type "${confirmText}"`}
                />
                <div className="flex justify-center gap-4">
                    <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={onClose}
                        className="px-6 py-2 font-semibold text-gray-800 dark:text-white bg-white/50 dark:bg-white/10 rounded-lg"
                    >
                        Cancel
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={onConfirm}
                        disabled={!isConfirmed}
                        className="px-6 py-2 font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirm
                    </motion.button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmationModal;

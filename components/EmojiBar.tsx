
import React from 'react';
import { motion } from 'framer-motion';

const GAME_EMOJIS = ['👋', '🤔', '😮', '😂', '😎', '😰', '😡', '🤝'];

interface EmojiBarProps {
    onEmojiSelect: (emoji: string) => void;
    disabled: boolean;
}

const EmojiBar: React.FC<EmojiBarProps> = ({ onEmojiSelect, disabled }) => {
    return (
        <div className="flex items-center justify-center gap-2 p-2 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl pointer-events-auto">
            {GAME_EMOJIS.map((emoji) => (
                <motion.button
                    key={emoji}
                    onClick={() => onEmojiSelect(emoji)}
                    disabled={disabled}
                    whileHover={{ scale: 1.2, translateY: -5 }}
                    whileTap={{ scale: 0.9 }}
                    className="text-2xl sm:text-3xl p-1 sm:p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:grayscale cursor-pointer"
                >
                    {emoji}
                </motion.button>
            ))}
        </div>
    );
};

export default EmojiBar;

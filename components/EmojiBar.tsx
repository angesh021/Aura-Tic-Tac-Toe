
import React from 'react';
import { motion } from 'framer-motion';

const GAME_EMOJIS = ['👋', '🤔', '😮', '😂', '😎', '😰', '😡', '🤝'];

interface EmojiBarProps {
    onEmojiSelect: (emoji: string) => void;
    disabled: boolean;
    className?: string;
    variant?: 'row' | 'grid';
}

const EmojiBar: React.FC<EmojiBarProps> = ({ onEmojiSelect, disabled, className = '', variant }) => {
    // Forced 4-column grid layout to display 8 emojis as 2 rows of 4
    // Increased gap to expand horizontally and prevent overlap
    const layoutClasses = 'grid grid-cols-4 gap-x-6 gap-y-4';

    return (
        <div className={`
            p-5 bg-black/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl pointer-events-auto 
            min-w-max
            ${className} 
            ${layoutClasses}
        `}>
            {GAME_EMOJIS.map((emoji) => (
                <motion.button
                    key={emoji}
                    onClick={() => onEmojiSelect(emoji)}
                    disabled={disabled}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 rounded-2xl hover:bg-white/10 transition-colors disabled:opacity-50 disabled:grayscale cursor-pointer flex items-center justify-center shrink-0 text-3xl select-none"
                >
                    {emoji}
                </motion.button>
            ))}
        </div>
    );
};

export default EmojiBar;

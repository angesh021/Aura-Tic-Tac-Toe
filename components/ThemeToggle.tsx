
import React from 'react';
import { motion } from 'framer-motion';
import { SunIcon, MoonIcon } from './Icons';

interface ThemeToggleProps {
    isDark: boolean;
    toggle: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDark, toggle }) => {
    return (
        <div 
            onClick={toggle}
            className={`relative w-20 h-10 rounded-full cursor-pointer flex items-center px-1 transition-colors duration-500 overflow-hidden border border-white/10 shadow-inner
                ${isDark ? 'bg-slate-900 justify-end' : 'bg-cyan-200 justify-start'}
            `}
        >
            {/* Background Decoration */}
            <motion.div 
                className="absolute inset-0 pointer-events-none"
                initial={false}
                animate={{ opacity: isDark ? 1 : 0 }}
            >
                {/* Stars for Dark Mode */}
                <div className="absolute top-2 left-8 w-0.5 h-0.5 bg-white rounded-full opacity-80" />
                <div className="absolute bottom-3 left-5 w-0.5 h-0.5 bg-white rounded-full opacity-60" />
                <div className="absolute top-4 right-3 w-1 h-1 bg-white rounded-full opacity-70" />
            </motion.div>
            
            <motion.div 
                className="absolute inset-0 pointer-events-none"
                initial={false}
                animate={{ opacity: isDark ? 0 : 1 }}
            >
                {/* Clouds/Sky for Light Mode */}
                <div className="absolute top-1 right-4 w-6 h-3 bg-white/40 rounded-full blur-sm" />
                <div className="absolute bottom-1 left-2 w-8 h-4 bg-white/30 rounded-full blur-sm" />
            </motion.div>

            {/* The Knob (Sun/Moon) */}
            <motion.div
                className="relative z-10 w-8 h-8 rounded-full shadow-md flex items-center justify-center"
                layout
                transition={{ type: "spring", stiffness: 700, damping: 30 }}
                style={{
                    backgroundColor: isDark ? '#1e293b' : '#fbbf24', // Slate-800 vs Amber-400
                    boxShadow: isDark 
                        ? 'inset -2px -2px 4px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.1)' 
                        : '0 0 10px 2px rgba(251, 191, 36, 0.6), inset 2px 2px 4px rgba(255,255,255,0.5)' // Sun Glow
                }}
            >
                <motion.div
                    key={isDark ? "moon" : "sun"}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {isDark ? (
                        <MoonIcon className="w-5 h-5 text-indigo-200" />
                    ) : (
                        <SunIcon className="w-5 h-5 text-yellow-900" />
                    )}
                </motion.div>
            </motion.div>
        </div>
    );
};

export default ThemeToggle;

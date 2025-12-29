
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
    text: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom';
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'bottom' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const isTop = position === 'top';

    return (
        <div 
            className="relative flex items-center justify-center"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, y: isTop ? 5 : -5, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: isTop ? 5 : -5, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute ${isTop ? 'bottom-full mb-2' : 'top-full mt-2'} px-3 py-1.5 text-xs font-medium text-white bg-gray-900/90 dark:bg-white/10 backdrop-blur-md border border-white/10 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none`}
                    >
                        {text}
                        {/* Arrow */}
                        <div 
                            className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent 
                                ${isTop 
                                    ? '-bottom-[8px] border-t-gray-900/90 dark:border-t-white/10' 
                                    : '-top-[8px] border-b-gray-900/90 dark:border-b-white/10'
                                }
                            `} 
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Tooltip;

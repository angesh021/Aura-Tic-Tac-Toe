import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { AppContext } from '../contexts/AppContext';
import { HomeIcon, XIcon, OIcon } from './Icons';

const FallingPiece: React.FC = () => {
    const isX = Math.random() > 0.5;
    const duration = Math.random() * 8 + 7; // 7-15 seconds to fall
    const delay = Math.random() * 15;
    const initialX = `${Math.random() * 120 - 10}vw`; // -10vw to 110vw
    const size = Math.random() * 60 + 30; // 30px to 90px

    const xPath = [
        initialX, 
        `${parseFloat(initialX) + (Math.random() * 100 - 50)}vw`,
        `${parseFloat(initialX) + (Math.random() * 100 - 50)}vw`
    ];
    
    return (
        <motion.div
            className="absolute top-[-150px]"
            style={{ 
                width: size, 
                height: size,
                color: isX ? 'rgba(34, 211, 238, 0.1)' : 'rgba(236, 114, 182, 0.1)'
            }}
            initial={{ 
                x: initialX,
                rotate: Math.random() * 360 
            }}
            animate={{ 
                y: '120vh',
                x: xPath,
                rotate: Math.random() * 720 
            }}
            transition={{ 
                duration, 
                delay, 
                repeat: Infinity, 
                repeatType: 'loop', 
                ease: 'linear' 
            }}
        >
            {isX ? <XIcon /> : <OIcon />}
        </motion.div>
    );
};


const NotFound: React.FC = () => {
    const context = useContext(AppContext);
    const pieces = Array.from({ length: 25 }); // Number of falling pieces

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center text-center p-4 overflow-hidden">
            {/* Background Animation */}
            <div className="absolute inset-0 z-0 blur-sm">
                {pieces.map((_, i) => <FallingPiece key={i} />)}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative z-10 p-8 rounded-3xl bg-black/30 backdrop-blur-lg border border-white/10 shadow-2xl"
            >
                <h1 className="text-8xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500 mb-2">
                    404
                </h1>
                <h2 className="text-xl md:text-2xl font-bold text-cyan-400 mb-4">Lost in the Grid?</h2>
                <p className="text-gray-400 max-w-xs mx-auto mb-8">
                    The page you're looking for doesn't exist. Let's get you back on track.
                </p>
                <motion.button
                    onClick={context?.goHome}
                    className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-bold text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <HomeIcon className="w-5 h-5" />
                    Return Home
                </motion.button>
            </motion.div>
        </div>
    );
};

export default NotFound;

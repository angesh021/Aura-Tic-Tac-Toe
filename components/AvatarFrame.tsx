
import React from 'react';
import { motion } from 'framer-motion';

interface AvatarFrameProps {
    frameId?: string;
    children: React.ReactNode;
    className?: string;
}

const AvatarFrame: React.FC<AvatarFrameProps> = ({ frameId, children, className }) => {
    if (!frameId || frameId === 'frame-none') {
        return <div className={className}>{children}</div>;
    }

    // --- Frame Definitions ---

    // 1. Neon Cyber (Level 5)
    // Pulsing cyan/pink border with a rotating scan line
    if (frameId === 'frame-neon') {
        return (
            <div className={`relative p-[3px] rounded-full overflow-hidden ${className}`}>
                <motion.div 
                    className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_0deg,#22d3ee_90deg,transparent_180deg,#ec4899_270deg,transparent_360deg)]"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-[3px] rounded-full bg-black/80 z-0"></div>
                <div className="relative rounded-full overflow-hidden z-10 w-full h-full">{children}</div>
            </div>
        );
    }

    // 2. Golden Glory (Level 10)
    // Shimmering gold texture with particles
    if (frameId === 'frame-gold') {
        return (
            <div className={`relative p-[4px] rounded-full ${className}`}>
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700 shadow-[0_0_15px_rgba(234,179,8,0.6)]"></div>
                <motion.div 
                    className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/50 to-transparent"
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
                <div className="absolute inset-[4px] rounded-full bg-black z-0"></div>
                <div className="relative rounded-full overflow-hidden z-10 w-full h-full border border-yellow-500/50">{children}</div>
            </div>
        );
    }

    // Rocket Frame (Level 15)
    if (frameId === 'frame-rocket') {
        return (
            <div className={`relative p-[4px] rounded-full ${className}`}>
                <div className="absolute inset-0 rounded-full border-2 border-slate-700 bg-slate-900"></div>
                
                {/* Rotating Container for Rocket */}
                <motion.div 
                    className="absolute inset-[-10%]"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg transform rotate-45 filter drop-shadow-md">
                        🚀
                    </div>
                    {/* Trail */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-12 bg-gradient-to-t from-transparent to-orange-500 blur-sm opacity-80 origin-bottom transform -rotate-12"></div>
                </motion.div>

                <div className="relative rounded-full overflow-hidden z-10 w-full h-full border border-white/10">{children}</div>
            </div>
        );
    }

    // 3. Inferno (Level 20)
    // Raging fire effect (Orange/Red)
    if (frameId === 'frame-fire') {
        return (
            <div className={`relative p-[3px] rounded-full ${className}`}>
                {/* Outer Glow */}
                <motion.div 
                    className="absolute inset-[-10%] rounded-full bg-gradient-to-t from-red-600 via-orange-500 to-yellow-400 blur-md opacity-70"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-orange-500 to-red-600"></div>
                <div className="absolute inset-[3px] rounded-full bg-black z-0"></div>
                <div className="relative rounded-full overflow-hidden z-10 w-full h-full">{children}</div>
            </div>
        );
    }

    // Vibes / Emojis (Level 25)
    if (frameId === 'frame-vibes') {
        return (
            <div className={`relative p-[4px] rounded-full ${className}`}>
                <div className="absolute inset-0 rounded-full border-2 border-pink-500/50"></div>
                
                {/* Emojis orbiting */}
                {[0, 120, 240].map((deg, i) => (
                    <motion.div
                        key={i}
                        className="absolute inset-[-15%]"
                        initial={{ rotate: deg }}
                        animate={{ rotate: deg + 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    >
                        <motion.div 
                            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm"
                            animate={{ rotate: -360 }} 
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        >
                            {['🔥', '💯', '👑'][i]}
                        </motion.div>
                    </motion.div>
                ))}

                <div className="relative rounded-full overflow-hidden z-10 w-full h-full border border-pink-500/30">{children}</div>
            </div>
        );
    }

    // 4. Cyber Glitch (Level 30)
    // RGB split or rapid color shift
    if (frameId === 'frame-glitch') {
        return (
            <div className={`relative p-[3px] rounded-full ${className}`}>
                <motion.div 
                    className="absolute inset-0 rounded-full bg-green-500"
                    animate={{ x: [-2, 2, -1, 0], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 0.2, repeat: Infinity, repeatType: "mirror" }}
                />
                <motion.div 
                    className="absolute inset-0 rounded-full bg-purple-500"
                    animate={{ y: [2, -2, 1, 0], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 0.25, repeat: Infinity, repeatType: "mirror" }}
                />
                <div className="absolute inset-[3px] rounded-full bg-black z-0"></div>
                <div className="relative rounded-full overflow-hidden z-10 w-full h-full border border-white/20">{children}</div>
            </div>
        );
    }

    // Status Text (Level 40)
    if (frameId === 'frame-status') {
        return (
            <div className={`relative p-[6px] rounded-full ${className}`}>
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-800 border border-yellow-500/30"></div>
                
                {/* Rotating SVG Text */}
                <motion.div 
                    className="absolute inset-[-18%] z-20 pointer-events-none"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                >
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                        <defs>
                            <path id="circlePath" d="M 50, 50 m -42, 0 a 42,42 0 1,1 84,0 a 42,42 0 1,1 -84,0" />
                        </defs>
                        <text fontSize="8.5" fontWeight="bold" fill="#fcd34d" letterSpacing="2">
                            <textPath href="#circlePath" startOffset="0%">
                                • LEGEND • UNSTOPPABLE • LEGEND • UNSTOPPABLE
                            </textPath>
                        </text>
                    </svg>
                </motion.div>

                <div className="relative rounded-full overflow-hidden z-10 w-full h-full border-2 border-yellow-500/50 shadow-inner">{children}</div>
            </div>
        );
    }

    // 5. Cosmic Void (Level 50)
    // Deep purple/black with stars
    if (frameId === 'frame-cosmic') {
        return (
            <div className={`relative p-[3px] rounded-full ${className}`}>
                <div className="absolute inset-0 rounded-full bg-slate-900 border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)] overflow-hidden">
                    <motion.div 
                        className="absolute inset-[-50%] bg-[radial-gradient(circle,rgba(255,255,255,0.8)_1px,transparent_1px)] bg-[length:10px_10px]"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    />
                </div>
                <div className="absolute inset-[3px] rounded-full bg-black z-0"></div>
                <div className="relative rounded-full overflow-hidden z-10 w-full h-full">{children}</div>
            </div>
        );
    }

    // 6. Godlike Radiance (Level 100)
    // Blinding white/rainbow light
    if (frameId === 'frame-godlike') {
        return (
            <div className={`relative p-[4px] rounded-full ${className}`}>
                <motion.div 
                    className="absolute inset-[-20%] rounded-full bg-gradient-to-r from-red-500 via-green-500 to-blue-500 blur-xl opacity-50"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)]"></div>
                <div className="absolute inset-[4px] rounded-full bg-black z-0"></div>
                <div className="relative rounded-full overflow-hidden z-10 w-full h-full border-2 border-white/50">{children}</div>
            </div>
        );
    }

    // Default Fallback
    return <div className={className}>{children}</div>;
};

export default AvatarFrame;

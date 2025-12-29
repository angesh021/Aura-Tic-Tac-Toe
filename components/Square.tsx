
import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { SquareValue } from '../types';
import { OIcon, XIcon, ObstacleIcon, CrownIcon, StarIcon } from './Icons';

interface SquareProps {
  value: SquareValue;
  onClick: () => void;
  isWinner: boolean;
  isHinted: boolean;
  boardSize: number;
  cursor?: string;
  skin?: string; // "skin-classic", "skin-emoji", "skin-geo", "skin-neon"
  isSummary?: boolean;
}

const Square: React.FC<SquareProps> = ({ value, onClick, isWinner, isHinted, boardSize, cursor, skin = 'skin-classic', isSummary = false }) => {
  const sizeClasses: { [key: number]: string } = {
    3: 'w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32',
    4: 'w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24',
    5: 'w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20',
    6: 'w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16',
    7: 'w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14',
    8: 'w-8 h-8 sm:w-11 sm:h-11 md:w-12 md:h-12',
    9: 'w-7 h-7 sm:w-10 sm:h-10 md:w-11 md:h-11',
    10: 'w-6 h-6 sm:w-9 sm:h-9 md:w-10 md:h-10',
  };
  
  // In summary mode, use a fixed, moderate size for calculation consistency
  const size = isSummary 
    ? 'w-14 h-14' 
    : (sizeClasses[boardSize] || 'w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32');
    
  // Reduced padding in summary mode to ensure icons are visible
  const padding = isSummary 
    ? 'p-2' 
    : (boardSize > 6 ? 'p-1 sm:p-2' : 'p-2 sm:p-4 md:p-6');

  // Base background style (Shared)
  const baseStyle = `${size} m-1 relative flex items-center justify-center rounded-xl border backdrop-blur-sm transition-all duration-300 overflow-hidden shadow-sm`;
  
  // Winner Highlight
  const winnerStyle = isWinner 
    ? 'bg-green-500/20 border-green-400/50 dark:border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.4)] z-10' 
    : '';

  // Hint Highlight
  const hintStyle = isHinted ? 'ring-2 ring-yellow-400/80 bg-yellow-100/50 dark:bg-yellow-400/10 shadow-[0_0_15px_rgba(250,204,21,0.3)]' : '';

  // Dynamic Background based on content
  let bgStyle = 'bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 border-white/40 dark:border-white/5 hover:border-white/60 dark:hover:border-white/20';
  if (value === 'OBSTACLE') {
      bgStyle = 'bg-gray-300 dark:bg-gray-800/50 border-gray-400 dark:border-white/10 inner-shadow shadow-inner';
  } else if (isWinner) {
      bgStyle = ''; // Handled by winnerStyle
  }

  // Piece Renderer based on Skin
  const renderPiece = (type: 'X' | 'O') => {
      if (skin === 'skin-golden') {
          return (
              <div className="relative w-full h-full p-1 flex items-center justify-center">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-200/30 via-amber-500/5 to-transparent blur-sm"></div>
                  
                  {/* Metallic Piece with heavy gold shadow */}
                  <div className="relative w-full h-full z-10 filter drop-shadow-[0_2px_4px_rgba(180,83,9,0.6)]">
                      {type === 'X' 
                        ? <XIcon className="w-full h-full text-yellow-300" /> 
                        : <OIcon className="w-full h-full text-yellow-300" />}
                  </div>

                  {/* Luxury Sparkles */}
                  <div className="absolute top-0 right-0 animate-[pulse_2s_infinite]">
                      <StarIcon className="w-3 h-3 text-yellow-100 drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]" />
                  </div>
                  <div className="absolute bottom-1 left-1 animate-[pulse_3s_infinite] delay-300">
                      <StarIcon className="w-2 h-2 text-yellow-100 drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]" />
                  </div>
              </div>
          );
      }
      if (skin === 'skin-grandmaster') {
          return (
              <div className="relative w-full h-full p-1 flex items-center justify-center">
                  {/* Void Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-900/20 to-purple-900/20 rounded-lg"></div>
                  
                  {/* Glowing Amethyst Piece */}
                  <div className="relative w-full h-full z-10">
                      {type === 'X' 
                        ? <XIcon className="w-full h-full text-fuchsia-300 filter drop-shadow-[0_0_12px_rgba(232,121,249,0.8)]" /> 
                        : <OIcon className="w-full h-full text-fuchsia-300 filter drop-shadow-[0_0_12px_rgba(232,121,249,0.8)]" />}
                  </div>

                  {/* Floating Crown Badge */}
                  <div className="absolute -top-1 -right-1 z-20 filter drop-shadow-md animate-bounce" style={{ animationDuration: '2.5s' }}>
                      <CrownIcon className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 fill-yellow-400" fill={true}/>
                  </div>
              </div>
          );
      }
      if (skin === 'skin-emoji') {
          return <span className="text-2xl sm:text-4xl select-none drop-shadow-md filter">{type === 'X' ? '🔥' : '🧊'}</span>;
      }
      if (skin === 'skin-geo') {
          if (type === 'X') {
              return (
                  <svg viewBox="0 0 100 100" className="w-full h-full block">
                      <rect x="20" y="20" width="60" height="60" fill="currentColor" className="text-[var(--color-brand-x)] opacity-90" />
                  </svg>
              );
          }
          return (
              <svg viewBox="0 0 100 100" className="w-full h-full block">
                  <polygon points="50,15 85,85 15,85" fill="currentColor" className="text-[var(--color-brand-o)] opacity-90" />
              </svg>
          );
      }
      if (skin === 'skin-neon') {
          if (type === 'X') {
              return (
                  <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-[0_0_8px_var(--color-brand-x)] block">
                      <path d="M25 25 L75 75 M75 25 L25 75" stroke="currentColor" strokeWidth="10" strokeLinecap="round" className="text-[var(--color-brand-x)]" />
                  </svg>
              );
          }
          return (
              <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-[0_0_8px_var(--color-brand-o)] block">
                  <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="10" fill="none" className="text-[var(--color-brand-o)]" />
              </svg>
          );
      }
      // Classic Default - Added w-full h-full for Safari compatibility
      return type === 'X' 
        ? <XIcon className="w-full h-full text-[var(--color-brand-x)] drop-shadow-sm" /> 
        : <OIcon className="w-full h-full text-[var(--color-brand-o)] drop-shadow-sm" />;
  };

  // Animation Variants
  const pieceVariants: Variants = {
    hidden: { scale: 0, opacity: 0, rotate: -180 },
    visible: { 
        scale: 1, 
        opacity: 1, 
        rotate: 0,
        transition: { type: "spring", stiffness: 260, damping: 20 } 
    },
    exit: { 
        scale: 0, 
        opacity: 0, 
        rotate: 180,
        transition: { duration: 0.3 }
    },
    win: {
        scale: [1, 1.15, 1],
        rotate: [0, 5, -5, 0],
        filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"],
        transition: { 
            duration: 1.5, 
            repeat: Infinity, 
            repeatType: "reverse"
        }
    }
  };

  const obstacleVariants: Variants = {
      hidden: { y: -50, opacity: 0, scale: 1.5 },
      visible: { 
          y: 0, 
          opacity: 1, 
          scale: 1,
          transition: { type: "spring", stiffness: 400, damping: 15, mass: 1.2 }
      },
      exit: { scale: 0, opacity: 0 }
  };

  return (
    <motion.button
      onClick={onClick}
      style={{ cursor: cursor }}
      className={`${baseStyle} ${bgStyle} ${winnerStyle} ${hintStyle} focus:outline-none group`}
      whileHover={(!value && cursor !== 'not-allowed') ? { scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" } : {}}
      whileTap={(!value && cursor !== 'not-allowed') ? { scale: 0.95 } : {}}
      layout={!isSummary} // Disable layout animation in summary to prevent scaling conflicts
    >
      {/* Glass Reflection Effect (only on non-obstacles) */}
      {value !== 'OBSTACLE' && <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />}
      
      <div className={`w-full h-full ${padding} relative z-10 flex items-center justify-center`}>
        <AnimatePresence mode="popLayout">
            {(value === 'X' || value === 'O') && (
                <motion.div 
                    key={value} // Ensures animation when value changes (e.g. Conversion)
                    variants={pieceVariants}
                    initial={isSummary ? "visible" : "hidden"}
                    animate={isWinner ? "win" : "visible"}
                    exit="exit"
                    className="w-full h-full grid place-items-center"
                >
                    {renderPiece(value)}
                </motion.div>
            )}

            {value === 'OBSTACLE' && (
                <motion.div 
                    key="OBSTACLE"
                    variants={obstacleVariants}
                    initial={isSummary ? "visible" : "hidden"}
                    animate="visible"
                    exit="exit"
                    className="w-full h-full flex items-center justify-center p-2"
                >
                    <ObstacleIcon className="w-full h-full text-gray-500 dark:text-gray-400 drop-shadow-lg" />
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
};

export default Square;

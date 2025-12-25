
import React from 'react';
import { motion } from 'framer-motion';
import { PowerUp } from '../../types';
import { UndoIcon, HintIcon, BombIcon, ShieldIcon, DoubleIcon, ConvertIcon } from '../Icons';
import Tooltip from '../Tooltip';

interface PowerUpBarProps {
    powerUps: {[key in PowerUp]?: boolean};
    onAction: (type: PowerUp) => void;
    activePowerUp: PowerUp | null;
}

const PowerUpBar: React.FC<PowerUpBarProps> = ({ powerUps, onAction, activePowerUp }) => {
    const items: { id: PowerUp, icon: any, label: string, color: string }[] = [
        { id: 'undo', icon: UndoIcon, label: 'Undo', color: 'text-blue-400' },
        { id: 'hint', icon: HintIcon, label: 'Hint', color: 'text-yellow-400' },
        { id: 'destroy', icon: BombIcon, label: 'Destroy', color: 'text-red-400' },
        { id: 'wall', icon: ShieldIcon, label: 'Wall', color: 'text-green-400' },
        { id: 'double', icon: DoubleIcon, label: 'Double', color: 'text-orange-400' },
        { id: 'convert', icon: ConvertIcon, label: 'Convert', color: 'text-purple-400' },
    ];

    return (
        <div className="grid grid-cols-3 gap-2 mt-4 w-full max-w-[200px] mx-auto bg-black/20 p-2 rounded-2xl border border-white/5 backdrop-blur-sm">
            {items.map(item => {
                const isAvailable = powerUps?.[item.id];
                const isActive = activePowerUp === item.id;
                
                return (
                    <Tooltip key={item.id} text={isAvailable ? item.label : "Locked/Used"}>
                        <motion.button
                            whileHover={isAvailable ? { scale: 1.05 } : {}}
                            whileTap={isAvailable ? { scale: 0.95 } : {}}
                            onClick={() => isAvailable && onAction(item.id)}
                            disabled={!isAvailable}
                            className={`
                                relative p-2.5 rounded-xl flex items-center justify-center border transition-all duration-300 w-full aspect-square
                                ${isActive 
                                    ? `bg-white/10 border-${item.color.split('-')[1]}-500 shadow-[0_0_10px_rgba(255,255,255,0.2)]` 
                                    : (isAvailable ? 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20' : 'bg-black/20 border-transparent opacity-30 cursor-not-allowed')
                                }
                            `}
                        >
                            <item.icon className={`w-5 h-5 ${isAvailable ? item.color : 'text-gray-500'}`} />
                            {isActive && (
                                <span className="absolute inset-0 rounded-xl border-2 border-white/20 animate-pulse"></span>
                            )}
                        </motion.button>
                    </Tooltip>
                );
            })}
        </div>
    );
};

export default PowerUpBar;

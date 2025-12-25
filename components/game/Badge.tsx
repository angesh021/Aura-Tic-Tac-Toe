
import React from 'react';
import Tooltip from '../Tooltip';

interface BadgeProps {
    text: string;
    icon?: React.ReactNode;
    color: string;
    tooltip?: string;
}

const Badge: React.FC<BadgeProps> = ({ text, icon, color, tooltip }) => {
    const colorClasses: {[key: string]: string} = {
        blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        gray: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
        yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        red: 'bg-red-500/10 text-red-500 border-red-500/20',
        orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        pink: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    };
    
    const content = (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold whitespace-nowrap ${colorClasses[color] || colorClasses.gray}`}>
            {icon}
            <span>{text}</span>
        </div>
    );

    if (tooltip) {
        return <Tooltip text={tooltip}>{content}</Tooltip>;
    }
    return content;
};

export default Badge;

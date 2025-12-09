import React from 'react';
import { UserAvatar } from './Avatars';
import { MessageIcon } from './Icons';

interface ChatNotificationProps {
    avatarId: string;
    name: string;
    message: string;
    onClick: () => void;
    onClose: () => void;
}

const ChatNotification: React.FC<ChatNotificationProps> = ({ avatarId, name, message, onClick, onClose }) => {
    return (
        <div 
            className="relative flex items-start gap-3 p-3 rounded-2xl shadow-xl border bg-gray-900/70 border-white/10 backdrop-blur-md w-[320px] max-w-md cursor-pointer group"
            onClick={onClick}
        >
            <div className="absolute top-2 right-2 text-gray-500 group-hover:text-white transition-colors">
                 <MessageIcon className="w-4 h-4" />
            </div>

            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-500/50 bg-black shrink-0 shadow-md">
                <UserAvatar avatarId={avatarId} className="w-full h-full" />
            </div>
            <div className="flex-1 min-w-0 pt-1">
                <p className="font-bold text-sm text-white truncate">{name}</p>
                <p className="text-sm text-gray-300 truncate">{message}</p>
            </div>
        </div>
    );
};

export default ChatNotification;
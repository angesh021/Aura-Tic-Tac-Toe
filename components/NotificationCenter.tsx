import React, { useContext, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../contexts/NotificationContext';
import { SocialHubContext } from '../contexts/SocialHubContext';
import { AppContext } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { friendsService } from '../services/friends';
import { useDirectMessages } from '../contexts/DirectMessageContext';
import { CloseIcon, MessageIcon, UsersIcon, CheckIcon, SwordIcon, CoinIcon, SendIcon, CogIcon, GiftIcon, BellIcon } from './Icons';
import { UserAvatar } from './Avatars';
import { Notification } from '../types';
import { markAllAsRead } from '../services/notifications';

interface NotificationCenterProps {
    onClose: () => void;
    onGoToSettings: () => void;
}

const timeSince = (date: number) => {
    const seconds = Math.floor((new Date().getTime() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "m";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return Math.floor(seconds) + "s";
};

type GroupedNotification = {
    type: 'chat' | 'friend_request' | 'system' | 'gift' | 'match_result';
    id: string; // senderId for chat, notification.id otherwise
    items: Notification[];
};

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'messages', label: 'Messages', type: 'chat' },
  { id: 'requests', label: 'Requests', type: 'friend_request' },
  { id: 'system', label: 'System' }
];

const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose, onGoToSettings }) => {
    const notifications = useNotifications();
    const socialHub = useContext(SocialHubContext);
    const app = useContext(AppContext);
    const toast = useToast();
    const dm = useDirectMessages();
    const [activeTab, setActiveTab] = useState('all');

    const handleItemClick = (n: Notification) => {
        if (n.type === 'chat' && n.data?.senderId) socialHub?.openHub(n.data.senderId);
        if (n.type === 'friend_request') socialHub?.openHub();
        if (n.type === 'match_result' && n.data?.matchId) app?.watchReplayById(n.data.matchId);
        
        notifications.markAsRead(n.id);
        onClose();
    };

    // Group Chat notifications, leave others as individual items
    const groupedNotifications = useMemo((): GroupedNotification[] => {
        const groups: GroupedNotification[] = [];
        const chatMap = new Map<string, Notification[]>();

        notifications.notifications.forEach(n => {
            if (n.type === 'chat' && n.data?.senderId) {
                const existing = chatMap.get(n.data.senderId) || [];
                chatMap.set(n.data.senderId, [...existing, n]);
            } else {
                groups.push({ type: n.type, id: n.id, items: [n] });
            }
        });

        chatMap.forEach((items, senderId) => {
            groups.push({ type: 'chat', id: senderId, items });
        });

        return groups.sort((a, b) => b.items[0].timestamp - a.items[0].timestamp);
    }, [notifications.notifications]);
    
    // Filter the grouped notifications based on the active tab
    const filteredItems = useMemo(() => {
        if (activeTab === 'all') return groupedNotifications;
        const tabInfo = TABS.find(t => t.id === activeTab);
        if (!tabInfo) return [];

        if (tabInfo.id === 'system') {
            return groupedNotifications.filter(g => g.type === 'system' || g.type === 'match_result' || g.type === 'gift');
        }
        return groupedNotifications.filter(g => g.type === tabInfo.type);

    }, [activeTab, groupedNotifications]);

    return (
        <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-16 right-0 w-[380px] max-h-[500px] flex flex-col bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl pointer-events-auto origin-top-right z-50 overflow-hidden"
        >
            <div className="flex justify-between items-center p-4 border-b border-white/10 shrink-0 bg-black/20">
                <h3 className="font-bold text-white">Notifications</h3>
                <div className="flex items-center gap-2">
                    <button onClick={onGoToSettings} className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><CogIcon className="w-5 h-5"/></button>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10"><CloseIcon className="w-5 h-5 text-gray-400" /></button>
                </div>
            </div>
            
            <div className="flex gap-1 p-2 border-b border-white/5 bg-black/10 shrink-0">
                {TABS.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${activeTab === tab.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                <AnimatePresence>
                    {filteredItems.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-20 text-gray-500"
                        >
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                                <BellIcon className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-medium">No {activeTab !== 'all' ? TABS.find(t=>t.id === activeTab)?.label.toLowerCase() : ''} notifications</p>
                        </motion.div>
                    ) : (
                        filteredItems.map((group) => (
                            <NotificationItem 
                                key={group.id} 
                                group={group} 
                                onClick={() => handleItemClick(group.items[0])} 
                            />
                        ))
                    )}
                </AnimatePresence>
            </div>

            <div className="flex justify-between items-center p-3 border-t border-white/10 shrink-0 bg-black/20">
                <button onClick={() => { notifications.markAllAsRead(); markAllAsRead(); }} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded font-medium transition-colors">Mark all read</button>
                <button onClick={notifications.clearNotifications} className="text-xs text-gray-400 hover:text-red-400 px-2 py-1 rounded font-medium transition-colors">Clear all</button>
            </div>
        </motion.div>
    );
};

const NotificationItem: React.FC<{ group: GroupedNotification, onClick: () => void }> = ({ group, onClick }) => {
    const { items } = group;
    const latest = items[0];
    const notifications = useNotifications();
    const app = useContext(AppContext);
    const toast = useToast();
    const dm = useDirectMessages();

    // --- Action Handlers ---
    const handleAction = (e: React.MouseEvent, action: () => Promise<any> | void) => {
        e.stopPropagation();
        action();
    };

    const handleAcceptRequest = async () => {
        if (!latest.data?.requestId || !latest.data?.sender) return;
        try {
            await friendsService.respondToRequest(latest.data.requestId, 'accept');
            toast.success(`Accepted friend request from ${latest.data.sender.displayName}`);
            notifications.updateNotification(latest.id, {
                message: `You are now friends with ${latest.data.sender.displayName}.`,
                type: 'system',
                data: {}
            });
        } catch (err: any) { toast.error(err.message); }
    };
    
    const handleDeclineRequest = async () => {
        if (!latest.data?.requestId) return;
        try {
            await friendsService.respondToRequest(latest.data.requestId, 'reject');
            notifications.updateNotification(latest.id, {
                message: `You declined the friend request.`,
                type: 'system',
                data: {}
            });
        } catch (err: any) { toast.error(err.message); }
    };

    const handleAcceptGift = async () => {
        if (!latest.data?.giftId) return;
        try {
            const newCoins = await friendsService.acceptGift(latest.data.giftId);
            if (newCoins !== null) {
                toast.success(`Claimed ${latest.data.amount} coins!`);
                app?.refreshCoins();
                notifications.updateNotification(latest.id, {
                    title: 'Gift Claimed',
                    message: `You received ${latest.data.amount} coins from ${latest.data.senderName}.`,
                    type: 'system',
                    data: {}
                });
            }
        } catch (err: any) { toast.error(err.message); }
    };

    // --- Rendeing Logic ---
    let Icon: React.ReactNode;
    let title = latest.title;
    let message = latest.message;
    let avatarId = latest.data?.senderAvatar;

    switch (group.type) {
        case 'chat':
            Icon = <MessageIcon className="w-4 h-4 text-cyan-400" />;
            title = latest.data?.sender?.displayName || "New Message";
            avatarId = latest.data?.sender?.avatar || 'avatar-1';
            message = items.length > 1 ? `${items.length} new messages` : latest.message;
            break;
        case 'friend_request':
            Icon = <UsersIcon className="w-4 h-4 text-purple-400" />;
            avatarId = latest.data?.sender?.avatar || 'avatar-1';
            break;
        case 'match_result':
            Icon = <SwordIcon className="w-4 h-4 text-yellow-400" />;
            break;
        case 'gift':
            Icon = <GiftIcon className="w-4 h-4 text-yellow-400" />;
            break;
        default:
            Icon = <BellIcon className="w-4 h-4 text-gray-400" />;
    }

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={onClick}
            className={`p-3 rounded-lg cursor-pointer hover:bg-white/5 transition-colors ${!latest.read ? 'bg-cyan-500/5' : ''}`}
        >
            <div className="flex items-start gap-3">
                <div className="relative shrink-0 mt-1">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 bg-black">
                        {avatarId ? <UserAvatar avatarId={avatarId} className="w-full h-full" /> : <div className="w-full h-full bg-gray-700 flex items-center justify-center">{Icon}</div>}
                    </div>
                    {!latest.read && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full border-2 border-gray-800" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                        <h4 className="font-bold text-sm text-white truncate">{title}</h4>
                        <time className="text-[10px] text-gray-500 font-mono shrink-0">{timeSince(latest.timestamp)}</time>
                    </div>
                    <p className="text-xs text-gray-300 line-clamp-2">{message}</p>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-2">
                        {group.type === 'friend_request' && latest.data?.requestId && (
                            <>
                                <button onClick={(e) => handleAction(e, handleAcceptRequest)} className="px-3 py-1 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors border border-green-600/30">Accept</button>
                                <button onClick={(e) => handleAction(e, handleDeclineRequest)} className="px-3 py-1 bg-gray-600/20 hover:bg-gray-500 text-gray-300 hover:text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors border border-gray-600/30">Decline</button>
                            </>
                        )}
                        {group.type === 'gift' && latest.data?.giftId && (
                            <button onClick={(e) => handleAction(e, handleAcceptGift)} className="px-3 py-1 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 hover:text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors border border-yellow-600/30">
                                <GiftIcon className="w-3 h-3"/> Accept Gift
                            </button>
                        )}
                        {group.type === 'match_result' && latest.data?.matchId && (
                            <button onClick={onClick} className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors border border-blue-600/30">
                                Watch Replay
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};


export default NotificationCenter;
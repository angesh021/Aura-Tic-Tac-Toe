
import React, { useContext, useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../contexts/NotificationContext';
import { SocialHubContext } from '../contexts/SocialHubContext';
import { AppContext } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { friendsService } from '../services/friends';
import { useDirectMessages } from '../contexts/DirectMessageContext';
import { onlineService } from '../services/online';
import { CloseIcon, MessageIcon, UsersIcon, CheckIcon, SwordIcon, CoinIcon, SendIcon, CogIcon, GiftIcon, BellIcon, ReplyIcon, TrophyIcon } from './Icons';
import { UserAvatar } from './Avatars';
import { Notification } from '../types';

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
    type: 'chat' | 'friend_request' | 'system' | 'gift' | 'match_result' | 'quest_complete';
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
    const [activeTab, setActiveTab] = useState('all');

    const handleItemClick = (n: Notification) => {
        // Default navigation actions if not expanded/handled by specific component
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

        // Sort new to old first
        const sortedNotifications = [...notifications.notifications].sort((a, b) => b.timestamp - a.timestamp);

        sortedNotifications.forEach(n => {
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
            return groupedNotifications.filter(g => g.type === 'system' || g.type === 'match_result' || g.type === 'gift' || g.type === 'quest_complete');
        }
        return groupedNotifications.filter(g => g.type === tabInfo.type);

    }, [activeTab, groupedNotifications]);

    return (
        <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="
                fixed md:absolute 
                top-[4.5rem] md:top-full md:mt-2
                left-4 right-4 md:left-auto md:right-0
                md:w-[380px] 
                max-h-[80vh] md:max-h-[600px] 
                flex flex-col 
                bg-white/95 dark:bg-gray-900/95 
                backdrop-blur-xl 
                border border-gray-200 dark:border-white/10 
                rounded-2xl shadow-2xl 
                pointer-events-auto 
                origin-top-right 
                z-50 overflow-hidden
            "
        >
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-white/10 shrink-0 bg-gray-50 dark:bg-black/20">
                <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
                <div className="flex items-center gap-2">
                    <button onClick={onGoToSettings} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><CogIcon className="w-5 h-5"/></button>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"><CloseIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
                </div>
            </div>
            
            <div className="flex gap-1 p-2 border-b border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-black/10 shrink-0">
                {TABS.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${activeTab === tab.id ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/5'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                <AnimatePresence initial={false}>
                    {filteredItems.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-20 text-gray-500 dark:text-gray-500"
                        >
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
                                <BellIcon className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-medium">No {activeTab !== 'all' ? TABS.find(t=>t.id === activeTab)?.label.toLowerCase() : ''} notifications</p>
                        </motion.div>
                    ) : (
                        filteredItems.map((group) => {
                            if (group.type === 'chat') {
                                return <ChatNotificationGroup key={group.id} group={group} onClosePanel={onClose} />;
                            }
                            return (
                                <NotificationItem 
                                    key={group.id} 
                                    group={group} 
                                    onClick={() => handleItemClick(group.items[0])} 
                                />
                            );
                        })
                    )}
                </AnimatePresence>
            </div>

            <div className="flex justify-between items-center p-3 border-t border-gray-200 dark:border-white/10 shrink-0 bg-gray-50 dark:bg-black/20">
                <button onClick={notifications.markAllAsRead} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-2 py-1 rounded font-medium transition-colors">Mark all read</button>
                <button onClick={notifications.clearNotifications} className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-1 rounded font-medium transition-colors">Clear all</button>
            </div>
        </motion.div>
    );
};

// --- Stacked Chat Notification with Quick Reply ---
const ChatNotificationGroup: React.FC<{ group: GroupedNotification, onClosePanel: () => void }> = ({ group, onClosePanel }) => {
    const { items, id: senderId } = group;
    const latest = items[0];
    const [expanded, setExpanded] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { markAsRead } = useNotifications();
    const socialHub = useContext(SocialHubContext);

    const isUnread = items.some(i => !i.read);
    const count = items.length;

    // Focus input on expand
    useEffect(() => {
        if (expanded && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [expanded]);

    const handleSendQuickReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim() || isSending) return;

        setIsSending(true);
        try {
            // Server validates user identity via Socket Token (Secure)
            onlineService.sendDirectMessage(senderId, replyText);
            
            // Mark all in this stack as read
            items.forEach(item => markAsRead(item.id));
            
            setReplyText('');
            setExpanded(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSending(false);
        }
    };

    const handleOpenChat = (e: React.MouseEvent) => {
        e.stopPropagation();
        items.forEach(item => markAsRead(item.id));
        socialHub?.openHub(senderId);
        onClosePanel();
    };

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`rounded-xl transition-all border overflow-hidden 
                ${expanded 
                    ? 'bg-gray-100 dark:bg-slate-800 border-cyan-500/50 shadow-lg ring-1 ring-cyan-500/20' 
                    : 'bg-white dark:bg-slate-800/50 border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer'
                }`}
            onClick={() => !expanded && setExpanded(true)}
        >
            {/* Header / Collapsed View */}
            <div className="p-3 flex items-start gap-3">
                <div className="relative shrink-0 mt-1">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-white/20 bg-gray-100 dark:bg-black shadow-sm">
                        <UserAvatar avatarId={latest.data?.senderAvatar || 'avatar-1'} frameId={latest.data?.sender?.questData?.equippedFrame} className="w-full h-full" />
                    </div>
                    {isUnread && !expanded && <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full border-2 border-white dark:border-gray-900 animate-pulse" />}
                    
                    {/* Stack Indicator */}
                    {count > 1 && !expanded && (
                        <div className="absolute -bottom-1 -right-1 bg-gray-200 dark:bg-gray-700 text-[9px] font-bold text-gray-700 dark:text-white px-1.5 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm">
                            +{count}
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{latest.data?.sender?.displayName || "Unknown"}</h4>
                        <time className="text-[10px] text-gray-500 dark:text-gray-500 font-mono shrink-0">{timeSince(latest.timestamp)}</time>
                    </div>
                    
                    {!expanded ? (
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1 mt-0.5">
                            {count > 1 ? <span className="font-bold text-cyan-600 dark:text-cyan-400">({count} messages)</span> : ''} {latest.message}
                        </p>
                    ) : (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold mt-0.5">Conversation</p>
                    )}
                </div>

                {expanded && (
                    <button onClick={(e) => { e.stopPropagation(); setExpanded(false); }} className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <CloseIcon className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {expanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-black/20"
                    >
                        {/* Messages List (Show last 3) */}
                        <div className="p-3 space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                            {items.slice(0, 4).reverse().map(msg => (
                                <div key={msg.id} className="text-xs">
                                    <div className="bg-white dark:bg-white/5 p-2 rounded-lg rounded-tl-none inline-block max-w-full break-words text-gray-800 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-transparent">
                                        {msg.data?.messageData?.text || msg.message}
                                    </div>
                                    <div className="text-[9px] text-gray-500 dark:text-gray-600 mt-0.5 ml-1">{timeSince(msg.timestamp)} ago</div>
                                </div>
                            ))}
                        </div>

                        {/* Quick Reply Actions */}
                        <div className="p-2 flex gap-2 items-center bg-gray-100 dark:bg-slate-900/50" onClick={e => e.stopPropagation()}>
                            <form onSubmit={handleSendQuickReply} className="flex-1 relative">
                                <input
                                    ref={inputRef}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Quick reply..."
                                    className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-full pl-3 pr-10 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:bg-white dark:focus:bg-white/10 transition-colors"
                                />
                                <button 
                                    type="submit" 
                                    disabled={!replyText.trim() || isSending}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full disabled:opacity-50 disabled:bg-gray-400 dark:disabled:bg-gray-600 transition-colors"
                                >
                                    {isSending ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <SendIcon className="w-3 h-3" />}
                                </button>
                            </form>
                            <button onClick={handleOpenChat} className="p-2 bg-white dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors border border-gray-200 dark:border-transparent" title="Open Full Chat">
                                <MessageIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// --- Standard Notification Item ---
const NotificationItem: React.FC<{ group: GroupedNotification, onClick: () => void }> = ({ group, onClick }) => {
    const { items } = group;
    const latest = items[0];
    const app = useContext(AppContext);
    const toast = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const { updateNotification } = useNotifications();

    // --- Action Handlers ---
    const handleAction = (e: React.MouseEvent, action: () => Promise<any> | void) => {
        e.stopPropagation();
        action();
    };

    const handleAcceptRequest = async () => {
        if (!latest.data?.requestId || !latest.data?.sender) return;
        setIsProcessing(true);
        try {
            await friendsService.respondToRequest(latest.data.requestId, 'accept');
            toast.success(`Accepted friend request from ${latest.data.sender.displayName}`);
            updateNotification(latest.id, {
                message: `You are now friends with ${latest.data.sender.displayName}.`,
                type: 'system',
                data: {}
            });
        } catch (err: any) { toast.error(err.message); }
        setIsProcessing(false);
    };
    
    const handleDeclineRequest = async () => {
        if (!latest.data?.requestId) return;
        setIsProcessing(true);
        try {
            await friendsService.respondToRequest(latest.data.requestId, 'reject');
            updateNotification(latest.id, {
                message: `You declined the friend request.`,
                type: 'system',
                data: {}
            });
        } catch (err: any) { toast.error(err.message); }
        setIsProcessing(false);
    };

    const handleAcceptGift = async () => {
        if (!latest.data?.giftId) return;
        setIsProcessing(true);
        try {
            const newCoins = await friendsService.acceptGift(latest.data.giftId);
            if (newCoins !== null) {
                toast.success(`Claimed ${latest.data?.amount} Coins!`);
                app?.refreshCoins();
                updateNotification(latest.id, { 
                    read: true,
                    title: 'Gift Claimed',
                    message: `You received ${latest.data.amount} coins from ${latest.data.senderName}.`,
                    type: 'system',
                    data: {} 
                });
            }
        } catch (err: any) { toast.error(err.message); }
        setIsProcessing(false);
    };

    // --- Rendering Logic ---
    let Icon: React.ReactNode;
    let title = latest.title;
    let message = latest.message;
    let avatarId = latest.data?.senderAvatar;
    let frameId = latest.data?.sender?.questData?.equippedFrame; // Extract Frame

    switch (group.type) {
        case 'friend_request':
            Icon = <UsersIcon className="w-4 h-4 text-purple-500 dark:text-purple-400" />;
            avatarId = latest.data?.sender?.avatar || 'avatar-1';
            break;
        case 'match_result':
            Icon = <SwordIcon className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />;
            break;
        case 'gift':
            Icon = <GiftIcon className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />;
            break;
        case 'quest_complete':
            Icon = <TrophyIcon className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />;
            break;
        default:
            Icon = <BellIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
    }

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={onClick}
            className={`p-3 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border border-transparent 
                ${!latest.read ? 'bg-gradient-to-r from-cyan-50 to-transparent dark:from-cyan-500/5 dark:to-transparent border-cyan-200 dark:border-cyan-500/10' : ''}
            `}
        >
            <div className="flex items-start gap-3">
                <div className="relative shrink-0 mt-1">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-black">
                        {avatarId ? <UserAvatar avatarId={avatarId} frameId={frameId} className="w-full h-full" /> : <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">{Icon}</div>}
                    </div>
                    {!latest.read && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full border-2 border-white dark:border-gray-900 shadow-sm" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{title}</h4>
                        <time className="text-[10px] text-gray-500 dark:text-gray-500 font-mono shrink-0">{timeSince(latest.timestamp)}</time>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mt-0.5">{message}</p>
                    
                    {/* Action Buttons: Only show if NOT read */}
                    <div className="flex gap-2 mt-2">
                        {group.type === 'friend_request' && latest.data?.requestId && !latest.read && (
                            <>
                                <button onClick={(e) => handleAction(e, handleAcceptRequest)} disabled={isProcessing} className="px-3 py-1 bg-green-100 dark:bg-green-600/20 hover:bg-green-200 dark:hover:bg-green-600 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors border border-green-200 dark:border-green-600/30">
                                    {isProcessing ? '...' : <><CheckIcon className="w-3 h-3"/> Accept</>}
                                </button>
                                <button onClick={(e) => handleAction(e, handleDeclineRequest)} disabled={isProcessing} className="px-3 py-1 bg-gray-100 dark:bg-gray-600/20 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors border border-gray-200 dark:border-gray-600/30">
                                    Decline
                                </button>
                            </>
                        )}
                        {group.type === 'gift' && latest.data?.giftId && !latest.read && (
                            <button onClick={(e) => handleAction(e, handleAcceptGift)} disabled={isProcessing} className="px-3 py-1 bg-yellow-100 dark:bg-yellow-600/20 hover:bg-yellow-200 dark:hover:bg-yellow-600 text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors border border-yellow-200 dark:border-yellow-600/30">
                                {isProcessing ? '...' : <><GiftIcon className="w-3 h-3"/> Accept Gift</>}
                            </button>
                        )}
                        {group.type === 'match_result' && latest.data?.matchId && (
                            <button onClick={onClick} className="px-3 py-1 bg-blue-100 dark:bg-blue-600/20 hover:bg-blue-200 dark:hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors border border-blue-200 dark:border-blue-600/30">
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

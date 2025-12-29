
import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { MessageIcon, SmileIcon, CloseIcon, SendIcon, CheckIcon, ReplyIcon, SwordIcon, ArrowLeftIcon, ArrowUpIcon, PencilIcon, TrashIcon, CopyIcon, DoubleCheckIcon, CoinIcon, LightningIcon, StarIcon, ShapesIcon, GiftIcon, CheckCircleIcon, ImageIcon, LinkIcon } from './Icons';
import { ChatMessage, User, GameSettings, WagerTier } from '../types';
import { UserAvatar, AVATAR_LIST } from './Avatars';
import { onlineService } from '../services/online';
import MatchSetupModal from './MatchSetupModal';
import { useToast } from '../contexts/ToastContext';
import { getRank } from '../utils/badgeData';
import Tooltip from './Tooltip';
import { AppContext } from '../contexts/AppContext';
import { useDirectMessages } from '../contexts/DirectMessageContext';
import { friendsService } from '../services/friends';
import { progressService } from '../services/progress';

// Helper functions
const getStatusInfo = (status?: string) => {
    switch (status) {
        case 'ONLINE': return { text: 'Online', color: 'bg-green-500' };
        case 'IN_GAME': return { text: 'In Game', color: 'bg-orange-500' };
        case 'WAITING': return { text: 'In Lobby', color: 'bg-blue-500' };
        default: return { text: 'Offline', color: 'bg-gray-500' };
    }
};

const getDateLabel = (timestamp: number) => {
    const d = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === now.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString();
};

const EMOJIS = ['👍', '😂', '😮', '🤔', '🎉', '😡', '❤️', '🔥', '👋', '💀', '😭', '✨'];
const QUICK_CHATS = [
    "Good Luck! 🍀", "Nice Move! 👏", "Oof... 😅", "Well Played! 🤝", 
    "Rematch? ⚔️", "Thanks!", "Thinking... 🤔", "Close one!", "GG WP", "Hello! 👋"
];

// --- Improved Content Parsing Component ---
const MessageContent: React.FC<{ text: string }> = ({ text }) => {
    // Regex for basic image detection
    const imageRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/i;
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    const parts = text.split(urlRegex);

    return (
        <span className="break-words leading-snug whitespace-pre-wrap">
            {parts.map((part, i) => {
                if (part.match(urlRegex)) {
                    if (part.match(imageRegex)) {
                        return (
                            <div key={i} className="my-1.5 relative group cursor-pointer overflow-hidden rounded-lg bg-black/10 dark:bg-white/5 border border-black/10 dark:border-white/10 max-w-[200px]">
                                <img src={part} alt="Shared" className="w-full h-auto object-cover max-h-60" loading="lazy" />
                                <a 
                                    href={part} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <ImageIcon className="w-6 h-6 text-white" />
                                </a>
                            </div>
                        );
                    }
                    return (
                        <a 
                            key={i} 
                            href={part} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-500 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                        >
                            <LinkIcon className="w-3 h-3 inline" /> {part.length > 30 ? part.substring(0, 30) + '...' : part}
                        </a>
                    );
                }
                return part;
            })}
        </span>
    );
};

// --- Sub-components ---

const PickerTab: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`relative flex-1 py-2 flex items-center justify-center gap-1.5 text-[10px] font-bold transition-all z-10 ${active ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
    >
        {active && (
            <motion.div 
                layoutId="pickerTabActive"
                className="absolute inset-0 bg-white dark:bg-white/10 rounded-lg shadow-sm border border-gray-200 dark:border-white/5"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
        )}
        <span className="relative z-10">{icon}</span>
        <span className="relative z-10">{label}</span>
    </button>
);

const ToolbarButton: React.FC<{ 
    icon: React.ReactNode, 
    label: string, 
    isActive: boolean, 
    onClick: () => void,
    activeClasses: string 
}> = ({ icon, label, isActive, onClick, activeClasses }) => {
    return (
        <Tooltip text={label} position="top">
            <button
                type="button"
                onClick={onClick}
                className={`
                    relative p-2 rounded-xl transition-all duration-200 flex items-center justify-center group
                    ${isActive 
                        ? activeClasses
                        : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'
                    }
                `}
            >
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    {icon}
                </motion.div>
            </button>
        </Tooltip>
    );
};

const GiftBubble: React.FC<{ msg: ChatMessage, isMe: boolean }> = ({ msg, isMe }) => {
    if (!msg.giftData) return null;
    const { amount } = msg.giftData;

    return (
        <div className={`
            p-5 rounded-3xl border flex flex-col gap-3 shadow-xl max-w-[280px] relative overflow-hidden group
            ${isMe 
                ? 'bg-gradient-to-br from-yellow-600 to-amber-700 border-yellow-500/30' 
                : 'bg-gradient-to-br from-gray-900 to-gray-800 border-white/10'
            }
        `}>
            {/* Animated Shine Effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none" />
            
            {/* Sparkles */}
            <div className="absolute top-0 right-0 p-2 opacity-50"><StarIcon className={`w-10 h-10 ${isMe ? 'text-yellow-200' : 'text-yellow-500'}`} /></div>
            
            <div className="flex items-center gap-4 relative z-10">
                <div className={`p-3 rounded-full shadow-lg ${isMe ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-800 border border-white/10 text-yellow-400'}`}>
                    <GiftIcon className="w-8 h-8" />
                </div>
                <div>
                    <div className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${isMe ? 'text-yellow-200' : 'text-gray-400'}`}>{isMe ? 'Gift Sent' : 'Gift Received'}</div>
                    <div className={`text-3xl font-black leading-none flex items-center gap-1 ${isMe ? 'text-white' : 'text-white'}`}>
                        {amount} <CoinIcon className="w-5 h-5 text-yellow-300" />
                    </div>
                </div>
            </div>
            
            {!isMe && (
                <div className="mt-1 pt-3 border-t border-white/10">
                    <div className="text-xs text-center text-yellow-400 font-bold animate-pulse">
                        Check Notifications to Claim!
                    </div>
                </div>
            )}
        </div>
    );
};

const InviteBubble: React.FC<{ msg: ChatMessage, isMe: boolean, onJoin: (roomId: string) => void }> = ({ msg, isMe, onJoin }) => {
    if (!msg.inviteData) return null;
    const { roomId, settings } = msg.inviteData;
    
    return (
        <div className={`p-4 rounded-2xl border border-white/10 flex flex-col gap-2 shadow-lg max-w-[280px] relative overflow-hidden
            ${isMe ? 'bg-gradient-to-br from-cyan-800/90 to-slate-800' : 'bg-gradient-to-br from-purple-800/90 to-slate-800'}
        `}>
            {/* Decorative background */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>

            <div className="flex items-center gap-2 mb-1 relative z-10">
                <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md shadow-sm border border-white/10">
                    <SwordIcon className="w-4 h-4 text-white" />
                </div>
                <div className="text-sm font-black text-white uppercase tracking-wide">Duel Challenge</div>
            </div>
            
            <div className="text-xs text-gray-200 relative z-10">
                <span className="font-bold text-white">{isMe ? 'You' : msg.senderName}</span> sent a challenge.
            </div>
            
            {settings && (
                <div className="flex flex-wrap gap-2 text-[10px] text-gray-300 mt-1 relative z-10">
                    <span className="bg-black/20 px-2 py-1 rounded border border-white/10">{settings.boardSize}x{settings.boardSize}</span>
                    <span className="bg-black/20 px-2 py-1 rounded border border-white/10">{settings.variant}</span>
                    {settings.blitzMode && <span className="bg-red-500/20 text-red-200 px-2 py-1 rounded border border-red-500/30">Blitz</span>}
                </div>
            )}

            {!isMe && (
                <button 
                    onClick={() => onJoin(roomId)}
                    className="mt-2 w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-bold text-white uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 relative z-10"
                >
                    Accept Duel
                </button>
            )}
            {isMe && (
                <div className="mt-2 w-full py-2 text-center text-xs text-gray-400 italic relative z-10">Waiting for opponent...</div>
            )}
        </div>
    );
};

// --- New Animated Context Menu ---
const MessageContextMenu: React.FC<{
    msg: ChatMessage;
    x: number;
    y: number;
    onClose: () => void;
    onReaction: (msgId: string, emoji: string) => void;
    onReply: (msg: ChatMessage) => void;
    onCopy: (text: string) => void;
    onEdit: (msg: ChatMessage) => void;
    onDelete: (msgId: string) => void;
    currentUserId: string;
}> = ({ msg, x, y, onClose, onReaction, onReply, onCopy, onEdit, onDelete, currentUserId }) => {
    const [hoveredAction, setHoveredAction] = useState<string | null>(null);
    const isMe = msg.senderId === currentUserId;

    const ActionButton: React.FC<{
        actionId: string;
        label: string;
        icon: React.ReactNode;
        onClick: () => void;
        danger?: boolean;
    }> = ({ actionId, label, icon, onClick, danger = false }) => (
        <motion.button
            layout
            onClick={(e) => { e.stopPropagation(); onClick(); onClose(); }}
            onMouseEnter={() => setHoveredAction(actionId)}
            onMouseLeave={() => setHoveredAction(null)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-colors ${danger ? 'hover:bg-red-500/10' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}
        >
            <span className={`transition-colors ${danger && hoveredAction === actionId ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                {icon}
            </span>
            <AnimatePresence>
                {hoveredAction === actionId && (
                    <motion.span
                        layout="position"
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5, transition: { duration: 0.1 } }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className={`text-xs font-semibold whitespace-nowrap ${danger ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}
                    >
                        {label}
                    </motion.span>
                )}
            </AnimatePresence>
        </motion.button>
    );

    return (
        <div className="fixed inset-0 z-[60]" onClick={onClose} onContextMenu={(e) => e.preventDefault()}>
            <motion.div
                style={{ top: y, left: x }}
                className="absolute z-50"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-1 p-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-full shadow-2xl">
                    {['👍', '😂', '🔥', '❤️'].map(emoji => (
                        <motion.button
                            key={emoji}
                            onClick={() => onReaction(msg.id, emoji)}
                            whileHover={{ scale: 1.2, rotate: 5 }}
                            whileTap={{ scale: 0.9 }}
                            className="w-9 h-9 flex items-center justify-center rounded-full text-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                            {emoji}
                        </motion.button>
                    ))}
                    <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1" />
                    <motion.div layout="position" className="flex items-center">
                        <ActionButton actionId="reply" label="Reply" icon={<ReplyIcon className="w-4 h-4" />} onClick={() => onReply(msg)} />
                        <ActionButton actionId="copy" label="Copy" icon={<CopyIcon className="w-4 h-4" />} onClick={() => onCopy(msg.text)} />
                        {isMe && !msg.deleted && (
                            <>
                                <ActionButton actionId="edit" label="Edit" icon={<PencilIcon className="w-4 h-4" />} onClick={() => onEdit(msg)} />
                                <ActionButton actionId="delete" label="Delete" icon={<TrashIcon className="w-4 h-4" />} onClick={() => onDelete(msg.id)} danger />
                            </>
                        )}
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};


// --- ChatPanel Component ---

interface ChatPanelProps {
    title: string;
    messages?: ChatMessage[];
    currentUserId: string;
    onSendMessage?: (text: string, replyTo?: any) => void;
    onClose?: () => void;
    className?: string;
    placeholder?: string;
    channel?: 'game' | 'lobby' | 'dm';
    targetId?: string; // roomId for game, userId for dm
    targetUser?: User | null; // Nullable
    targetStatus?: 'ONLINE' | 'IN_GAME' | 'OFFLINE' | 'WAITING';
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
    title, messages = [], onSendMessage, currentUserId, onClose, className, placeholder = "Type a message...",
    channel, targetId, targetUser, targetStatus
}) => {
    const [input, setInput] = useState('');
    const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [unreadBelow, setUnreadBelow] = useState(0);
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
    const [showMatchSetup, setShowMatchSetup] = useState(false);
    
    // Improved Picker State
    const [showPicker, setShowPicker] = useState(false);
    const [pickerTab, setPickerTab] = useState<'emoji' | 'sticker' | 'quick' | 'gift'>('emoji');

    // Gift State
    const [giftAmount, setGiftAmount] = useState<string>('');
    const [isGiftShake, setIsGiftShake] = useState(false);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, msg: ChatMessage } | null>(null);
    const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
    
    // UI Refs
    const scrollRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    const app = useContext(AppContext);
    const toast = useToast();
    const dm = useDirectMessages();
    const isDM = channel === 'dm' && targetId;
    const compactMode = app?.preferences.compactMode || false;

    const actualMessages = isDM ? (dm.messagesByPartner[targetId] || []) : messages;
    const hasMore = isDM ? !!dm.cursors[targetId!] : false;
    const isLoading = isDM ? dm.isLoadingHistory[targetId!] : false;
    const unreadCount = isDM ? dm.unreadCounts[targetId!] || 0 : 0;

    // Pre-calculation for rendering
    const firstUnreadMsgId = useMemo(() => {
        if (unreadCount > 0 && actualMessages.length >= unreadCount) {
            return actualMessages[actualMessages.length - unreadCount].id;
        }
        return null;
    }, [unreadCount, actualMessages]);

    const groupedMessages = useMemo(() => {
        const groups: { date: string; msgs: ChatMessage[] }[] = [];
        actualMessages.forEach((msg) => {
            const date = getDateLabel(msg.timestamp);
            if (groups.length > 0 && groups[groups.length - 1].date === date) {
                groups[groups.length - 1].msgs.push(msg);
            } else {
                groups.push({ date, msgs: [msg] });
            }
        });
        return groups;
    }, [actualMessages]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [input]);

    const handleSendMessage = (text: string, replyPayload?: any, stickerId?: string) => {
        if (isDM && targetId) {
            // @ts-ignore
            onlineService.sendDirectMessage(targetId, text, replyPayload, undefined, stickerId);
        } else if (channel === 'lobby') {
            onlineService.sendLobbyChat({ text, replyTo: replyPayload, stickerId });
        } else if (onSendMessage) {
            if (channel === 'game' && targetId) {
                 onlineService.sendChat(targetId, text, replyPayload);
                 if (stickerId) onlineService.sendChat(targetId, `[STICKER:${stickerId}]`, replyPayload);
            } else {
                onSendMessage(text, replyPayload);
            }
        }
        setUnreadBelow(0); // Sending a message resets unread below
        setTimeout(scrollToBottom, 50);
    };

    const handleLoadMore = () => {
        if (isDM && targetId) {
            dm.loadMore(targetId);
        }
    }

    // --- Action Handlers ---
    const handleSendReaction = (messageId: string, emoji: string) => {
        if (!channel || !targetId || channel === 'lobby') return;
        onlineService.sendReaction({ channel, targetId, messageId, emoji });
    };

    const handleDeleteMessage = (messageId: string) => {
        if (!channel || !targetId || channel === 'lobby') return;
        onlineService.deleteMessage({ channel, targetId, messageId });
    };

    const handleCopyMessage = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    const startEditing = (msg: ChatMessage) => {
        setEditingMessage(msg);
        setInput(msg.text);
        setReplyingTo(null);
        if (textareaRef.current) textareaRef.current.focus();
    };

    const cancelEditing = () => {
        setEditingMessage(null);
        setInput('');
    };

    const handleJoinInvite = async (roomId: string) => {
        try {
            await onlineService.joinRoom(roomId);
            toast.success("Joining match...");
            if(onClose) onClose();
        } catch (e: any) {
            toast.error("Could not join: " + e.message);
        }
    };

    // --- Smart Scroll Logic ---
    const scrollToBottom = (smooth = true) => {
        if (scrollRef.current) {
            const { scrollHeight, clientHeight } = scrollRef.current;
            const maxScrollTop = scrollHeight - clientHeight;
            
            // Only scroll if there is scrollable content
            if (maxScrollTop > 0) {
                scrollRef.current.scrollTo({
                    top: maxScrollTop,
                    behavior: smooth ? 'smooth' : 'auto'
                });
            }
            setUnreadBelow(0);
        }
    };

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const distFromBottom = scrollHeight - scrollTop - clientHeight;
        const atBottom = distFromBottom < 100; 
        setIsAtBottom(atBottom);
        if (atBottom) setUnreadBelow(0);
    };

    // Initial scroll
    useEffect(() => {
        setTimeout(() => scrollToBottom(false), 50);
    }, [targetId]);

    // Auto-scroll on new message if already at bottom
    useEffect(() => {
        const lastMsg = actualMessages[actualMessages.length - 1];
        if (!lastMsg) return;
        if (isLoading) return; 

        if (isAtBottom || lastMsg.senderId === currentUserId) {
            setTimeout(() => scrollToBottom(), 50);
        } else {
            setUnreadBelow(prev => prev + 1);
        }
    }, [actualMessages, currentUserId, isAtBottom, isLoading]);

    // Close Context Menu on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Also close picker if clicking outside
            const pickerEl = document.getElementById('emoji-picker-container');
            const toolbarEl = document.getElementById('chat-toolbar');
            if (pickerEl && !pickerEl.contains(event.target as Node) && !toolbarEl?.contains(event.target as Node)) {
                setShowPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        if (channel) {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            onlineService.sendTyping({ channel, roomId: channel === 'game' ? targetId : undefined, toUserId: channel === 'dm' ? targetId : undefined });
            typingTimeoutRef.current = setTimeout(() => {
                onlineService.sendStopTyping({ channel, roomId: channel === 'game' ? targetId : undefined, toUserId: channel === 'dm' ? targetId : undefined });
            }, 3000);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmed = input.trim();
        if (!trimmed) return;
        
        if (editingMessage) {
            if (channel && targetId && channel !== 'lobby') {
                onlineService.editMessage({
                    channel: channel,
                    targetId: targetId,
                    messageId: editingMessage.id,
                    newText: trimmed
                });
            }
            setEditingMessage(null);
        } else {
            const replyPayload = replyingTo ? {
                id: replyingTo.id,
                senderName: replyingTo.senderName,
                text: replyingTo.text.substring(0, 50) + (replyingTo.text.length > 50 ? '...' : '')
            } : undefined;
            handleSendMessage(trimmed, replyPayload);
        }
        
        setInput('');
        setReplyingTo(null);
        setShowPicker(false);
    };
    
    const handleAddEmoji = (emoji: string) => {
        setInput(prev => prev + emoji);
    };

    const handleSendQuickChat = (text: string) => {
        handleSendMessage(text);
        setShowPicker(false);
    };

    const handleSendSticker = (stickerId: string) => {
        handleSendMessage("", undefined, stickerId); // Send sticker ID
        setShowPicker(false);
    };

    const handleSendGift = async () => {
        const amount = parseInt(giftAmount, 10);
        const userBalance = app?.coins || 0;

        if (isNaN(amount) || amount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        if (amount > userBalance) {
            setIsGiftShake(true);
            setTimeout(() => setIsGiftShake(false), 500);
            return;
        }

        if (!targetId) return;

        try {
            // Updated: Expect a return value with new balance
            const newBalance = await friendsService.giftFriendByUser(targetId, amount);
            
            // Immediately update local state
            progressService.setCoins(newBalance);
            app?.refreshCoins(); // Force context update
            
            toast.success(`Gifted ${amount} coins!`);
            setShowPicker(false);
            setGiftAmount('');
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleConfirmChallenge = async (settings: GameSettings, wagerTier: WagerTier) => {
        if (!targetUser) return;
        try {
            const roomId = await onlineService.createRoom(settings, wagerTier); 
            onlineService.sendInvite(targetUser.id, roomId);
            toast.success("Challenge invite sent!");
            setShowMatchSetup(false);
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleContextMenu = (e: React.MouseEvent, msg: ChatMessage) => {
        e.preventDefault();
        const menuWidth = 300; // Estimated max width
        const menuHeight = 50;
        
        let x = e.clientX - menuWidth / 2;
        let y = e.clientY - menuHeight - 10; // 10px buffer above cursor

        if (x < 10) x = 10;
        if (x + menuWidth > window.innerWidth - 10) x = window.innerWidth - menuWidth - 10;
        if (y < 10) y = e.clientY + 20;

        setContextMenu({ x, y, msg });
    };

    const onSwipe = (event: any, info: PanInfo, msg: ChatMessage) => {
        if (info.offset.x > 50) { // Swipe right
            setReplyingTo(msg);
        }
    };

    const togglePicker = (tab: 'emoji' | 'sticker' | 'quick' | 'gift') => {
        if (showPicker && pickerTab === tab) {
            setShowPicker(false);
        } else {
            setPickerTab(tab);
            setShowPicker(true);
        }
    };

    const statusInfo = getStatusInfo(targetStatus);
    const rank = targetUser && targetUser.elo !== undefined ? getRank(targetUser.elo) : undefined;
    const isChallengeable = targetStatus === 'ONLINE' || targetStatus === 'WAITING';

    return (
        <>
        <div className={`flex flex-col bg-gray-50 dark:bg-[#0f172a] relative overflow-hidden h-full ${className}`}>
            
            {/* Header */}
            <div className="shrink-0 px-4 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-gray-200 dark:border-white/5 flex justify-between items-center z-20 shadow-sm dark:shadow-xl">
               <div className="flex items-center gap-3 min-w-0">
                   {onClose && (
                       <button onClick={onClose} className="p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors group">
                           <ArrowLeftIcon className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
                       </button>
                   )}
                   
                   {targetUser ? (
                       <div className="flex items-center gap-3 min-w-0">
                           <div className="relative">
                               <div className="w-10 h-10 rounded-full p-0.5 border border-gray-200 dark:border-white/10 bg-white dark:bg-black overflow-hidden shadow-sm">
                                    <UserAvatar avatarId={targetUser.avatar} frameId={targetUser.questData?.equippedFrame} className="w-full h-full" />
                               </div>
                               <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${statusInfo.color}`}></div>
                           </div>
                           <div className="flex flex-col justify-center min-w-0">
                               <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-wide leading-tight truncate">{targetUser.displayName}</h2>
                               {targetUser.customStatus && (
                                   <div className="text-[10px] text-gray-500 dark:text-gray-300 italic truncate max-w-[200px]">
                                       "{targetUser.customStatus}"
                                   </div>
                               )}
                               {!targetUser.customStatus && (
                                   <div className="flex items-center gap-2 text-xs">
                                       <span className={`${targetStatus === 'ONLINE' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'} font-medium`}>{statusInfo.text}</span>
                                       {rank && (
                                           <>
                                            <span className="text-gray-400 dark:text-gray-600">•</span>
                                            <div className={`flex items-center gap-1 font-bold ${rank.color}`}>
                                                <span>{rank.icon}</span>
                                                <span>{rank.name}</span>
                                            </div>
                                           </>
                                       )}
                                   </div>
                               )}
                           </div>
                       </div>
                   ) : (
                       <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-full flex items-center justify-center border border-cyan-500/30 shadow-inner">
                                <MessageIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">{title}</h2>
                                {channel === 'lobby' && <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Global Channel</span>}
                            </div>
                       </div>
                   )}
               </div>

               <div className="flex items-center gap-2">
                    {targetUser && (
                        <Tooltip text={isChallengeable ? 'Send Duel Request' : `${targetUser.displayName} is busy`}>
                            <motion.button 
                                whileHover={isChallengeable ? { scale: 1.05 } : {}} 
                                whileTap={isChallengeable ? { scale: 0.95 } : {}}
                                onClick={() => isChallengeable && setShowMatchSetup(true)}
                                disabled={!isChallengeable}
                                className={`px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2 text-xs font-bold transition-all border ${
                                    isChallengeable
                                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-500/50 text-white hover:shadow-cyan-500/20'
                                    : 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70'
                                }`}
                            >
                                <SwordIcon className="w-3 h-3" /> 
                                <span className="hidden sm:inline">Duel</span>
                            </motion.button>
                        </Tooltip>
                    )}
               </div>
            </div>

            {/* Messages Area */}
            <div 
                ref={scrollRef} 
                onScroll={handleScroll} 
                className="flex-1 overflow-y-auto custom-scrollbar px-3 pt-4 space-y-1 relative bg-gray-50 dark:bg-[#0f172a] scroll-smooth pb-2"
                style={{ overflowAnchor: 'auto' }} // CSS containment for smoother scrolling
            >
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none fixed"></div>
                
                {hasMore && (
                    <div className="flex justify-center mb-4">
                        <button 
                            onClick={handleLoadMore}
                            disabled={isLoading}
                            className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 px-4 py-2 rounded-full transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading && <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"/>}
                            {isLoading ? 'Loading...' : 'Previous Messages'}
                        </button>
                    </div>
                )}

                {actualMessages.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                        <div className="w-20 h-20 bg-gray-200 dark:bg-white/5 rounded-full flex items-center justify-center border border-gray-300 dark:border-white/5 shadow-inner">
                            <MessageIcon className="w-8 h-8 opacity-40" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-gray-400 dark:text-gray-400">No messages yet</p>
                            <p className="text-xs text-gray-500 dark:text-gray-600 mt-1">Start the conversation!</p>
                        </div>
                    </div>
                )}
                
                {groupedMessages.map((group, groupIndex) => (
                    <div key={group.date + groupIndex} className="relative">
                        <div className="flex justify-center my-6 sticky top-2 z-10 pointer-events-none">
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-white/90 dark:bg-slate-900/90 px-3 py-1 rounded-full border border-gray-200 dark:border-white/10 shadow-sm backdrop-blur-md">
                                {group.date}
                            </span>
                        </div>
                        
                        {group.msgs.map((msg, index) => {
                            const isMe = msg.senderId === currentUserId;
                            const isSystem = msg.type === 'system';
                            
                            // Grouping logic resets per date group intentionally
                            const prevMsg = group.msgs[index - 1];
                            const nextMsg = group.msgs[index + 1];
                            
                            const isPrevSame = prevMsg && prevMsg.senderId === msg.senderId && prevMsg.type === 'user' && !prevMsg.deleted && (msg.timestamp - prevMsg.timestamp < 300000);
                            const isNextSame = nextMsg && nextMsg.senderId === msg.senderId && nextMsg.type === 'user' && !nextMsg.deleted && (nextMsg.timestamp - msg.timestamp < 300000);
                            
                            const isFirstInGroup = !isPrevSame;
                            const isLastInGroup = !isNextSame;
                            
                            const showUnreadDivider = msg.id === firstUnreadMsgId;
                            const isRead = isMe && msg.readBy && targetId && msg.readBy[targetId];

                            // Bubble Shapes
                            let borderRadius = 'rounded-2xl';
                            if (!compactMode) {
                                if (isMe) {
                                    if (!isPrevSame && isNextSame) borderRadius = 'rounded-2xl rounded-br-none';
                                    else if (isPrevSame && isNextSame) borderRadius = 'rounded-2xl rounded-r-md';
                                    else if (isPrevSame && !isNextSame) borderRadius = 'rounded-t-2xl rounded-bl-2xl rounded-br-none';
                                    else borderRadius = 'rounded-2xl rounded-br-none'; 
                                } else {
                                    if (!isPrevSame && isNextSame) borderRadius = 'rounded-2xl rounded-bl-none';
                                    else if (isPrevSame && isNextSame) borderRadius = 'rounded-2xl rounded-l-md';
                                    else if (isPrevSame && !isNextSame) borderRadius = 'rounded-t-2xl rounded-br-2xl rounded-bl-none';
                                    else borderRadius = 'rounded-2xl rounded-bl-none';
                                }
                            }

                            return (
                                <React.Fragment key={msg.id}>
                                    {showUnreadDivider && (
                                        <div className="flex items-center gap-2 my-4 px-4 opacity-80">
                                            <div className="h-px bg-red-500/50 flex-1"></div>
                                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">New Messages</span>
                                            <div className="h-px bg-red-500/50 flex-1"></div>
                                        </div>
                                    )}

                                    {isSystem ? (
                                        msg.inviteData ? (
                                            <div className={`flex justify-center my-4 ${isMe ? 'items-end' : 'items-start'}`}>
                                                <InviteBubble msg={msg} isMe={isMe} onJoin={handleJoinInvite} />
                                            </div>
                                        ) : msg.giftData ? (
                                            <div className={`flex justify-center my-4 ${isMe ? 'items-end' : 'items-start'}`}>
                                                <GiftBubble msg={msg} isMe={isMe} />
                                            </div>
                                        ) : (
                                            <div className="flex justify-center my-4 px-8">
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center italic bg-gray-200 dark:bg-white/5 px-4 py-1.5 rounded-full border border-gray-300 dark:border-white/5 w-auto shadow-sm">
                                                    {msg.text}
                                                </span>
                                            </div>
                                        )
                                    ) : (
                                        <motion.div 
                                            layout
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ duration: 0.2 }}
                                            className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative ${isPrevSame && compactMode ? 'mt-0.5' : 'mt-1'}`}
                                            onContextMenu={(e) => handleContextMenu(e, msg)}
                                        >
                                            <div className={`flex max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                                                {/* Avatar Logic: Show beside message group (bottom aligned) */}
                                                {!compactMode && (
                                                    !isMe ? (
                                                        <div className="w-6 h-6 shrink-0">
                                                            {isLastInGroup && (
                                                                <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-black shadow-sm">
                                                                    <UserAvatar avatarId={msg.senderAvatar || 'avatar-1'} frameId={msg.senderFrame} className="w-full h-full" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : null // Me doesn't need avatar
                                                )}
                                                
                                                <motion.div 
                                                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} min-w-0 relative`}
                                                    drag="x"
                                                    dragConstraints={{ left: 0, right: 0 }}
                                                    dragElastic={0.1}
                                                    onDragEnd={(e, info) => onSwipe(e, info, msg)}
                                                >
                                                    {/* Show Name for other person above the first message in a group */}
                                                    {!isMe && isFirstInGroup && (
                                                        <div className="flex items-center gap-1 ml-1 mb-0.5 select-none">
                                                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                                                {msg.senderName}
                                                            </span>
                                                            {msg.senderVerified && (
                                                                <Tooltip text="Verified User">
                                                                    <CheckCircleIcon className="w-3 h-3 text-cyan-500" />
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                    )}

                                                    {msg.replyTo && (
                                                        <div className={`mb-1 px-2 py-1 rounded-lg text-xs bg-gray-200 dark:bg-white/5 border-l-2 flex flex-col max-w-full backdrop-blur-sm opacity-80 cursor-pointer hover:bg-gray-300 dark:hover:bg-white/10 ${isMe ? 'border-cyan-500 self-end mr-1' : 'border-purple-500 self-start ml-1'}`}>
                                                            <span className="font-bold text-[9px] text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1 mb-0.5">
                                                                <ReplyIcon className="w-3 h-3" /> {msg.replyTo.senderName}
                                                            </span>
                                                            <span className="truncate max-w-[200px] italic text-gray-600 dark:text-gray-500">{msg.replyTo.text}</span>
                                                        </div>
                                                    )}

                                                    {/* Sticker Rendering */}
                                                    {msg.stickerId ? (
                                                        <div className="mb-1">
                                                            <div className="w-28 h-28 rounded-xl overflow-hidden drop-shadow-md">
                                                                <UserAvatar avatarId={msg.stickerId} className="w-full h-full" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className={`relative px-3 py-1.5 text-sm shadow-sm transition-all ${borderRadius} min-w-[50px]
                                                            ${isMe 
                                                                ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-cyan-500/5' 
                                                                : 'bg-white dark:bg-slate-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-white/5'
                                                            }
                                                        `}>
                                                            {msg.deleted ? (
                                                                <span className="italic text-gray-400 flex items-center gap-1 text-xs"><TrashIcon className="w-3 h-3"/> Deleted</span>
                                                            ) : (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <MessageContent text={msg.text} />
                                                                    <div className={`text-[9px] flex items-center justify-end gap-1 opacity-70 font-medium select-none ${isMe ? 'text-blue-100' : 'text-gray-400 dark:text-gray-400'}`}>
                                                                        {msg.editedAt && <span>(edited)</span>}
                                                                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                        {isMe && (
                                                                            <span className="ml-0.5">
                                                                                {isRead ? <DoubleCheckIcon className="w-3 h-3 text-blue-100" /> : <CheckIcon className="w-3 h-3 text-white/70" />}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Reactions */}
                                                    {msg.reactions && Object.keys(msg.reactions).length > 0 && !msg.deleted && (
                                                        <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                            {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                                                                const userIdsArray = userIds as string[];
                                                                return (
                                                                <button
                                                                    key={emoji}
                                                                    onClick={() => handleSendReaction(msg.id, emoji)}
                                                                    className={`px-1.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 transition-colors border shadow-sm ${
                                                                        userIdsArray.includes(currentUserId)
                                                                            ? 'bg-cyan-100 dark:bg-cyan-500/20 border-cyan-200 dark:border-cyan-500/50 text-cyan-600 dark:text-cyan-300'
                                                                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                                                                    }`}
                                                                >
                                                                    <span>{emoji}</span>
                                                                    {userIdsArray.length > 1 && <span className="font-bold">{userIdsArray.length}</span>}
                                                                </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </motion.div>
                                            </div>
                                        </motion.div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                ))}
                
                {/* Typing Indicator */}
                <AnimatePresence>
                    {typingUsers.size > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                            className="flex items-center gap-2 mt-2 ml-10"
                        >
                            <div className="bg-white dark:bg-slate-800 px-3 py-2 rounded-2xl rounded-bl-none border border-gray-200 dark:border-slate-700 flex gap-1 items-center shadow-md">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}/>
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}/>
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}/>
                            </div>
                            <span className="text-[10px] text-gray-500 font-medium">Typing...</span>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                <div id="end-of-chat" className="h-2" />
            </div>

            {/* Input Area */}
            <div className="shrink-0 p-4 z-30 bg-gray-50 dark:bg-[#0f172a] relative">
                {/* Smart Scroll Button */}
                <AnimatePresence>
                    {unreadBelow > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                            className="absolute -top-12 left-0 right-0 flex justify-center pointer-events-none"
                        >
                            <button
                                onClick={() => scrollToBottom()}
                                className="bg-cyan-600/90 hover:bg-cyan-500 text-white text-xs font-bold pl-2 pr-4 py-1.5 rounded-full shadow-lg border border-cyan-400/50 flex items-center gap-2 backdrop-blur-md transition-all active:scale-95 pointer-events-auto"
                            >
                                {/* Latest Sender Avatar Preview */}
                                {actualMessages.length > 0 && (
                                    <div className="w-5 h-5 rounded-full overflow-hidden border border-white/20">
                                        <UserAvatar avatarId={actualMessages[actualMessages.length - 1].senderAvatar || 'avatar-1'} className="w-full h-full" />
                                    </div>
                                )}
                                <span>{unreadBelow} New</span>
                                <ArrowUpIcon className="w-3 h-3 -rotate-180" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Replying To Banner */}
                <AnimatePresence>
                    {replyingTo && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.95 }} 
                            animate={{ opacity: 1, height: 'auto', marginBottom: 8, scale: 1 }} 
                            exit={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.95 }}
                            className="flex justify-between items-center bg-white/95 dark:bg-[#0f172a]/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl mx-1"
                        >
                            <div className="min-w-0 border-l-2 border-cyan-500 pl-3">
                                <div className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase mb-0.5">Replying to {replyingTo.senderName}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-300 truncate font-medium">{replyingTo.text}</div>
                            </div>
                            <button onClick={() => setReplyingTo(null)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                                <CloseIcon className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {/* Advanced Picker Capsule */}
                <AnimatePresence>
                    {showPicker && (
                        <motion.div 
                            id="emoji-picker-container"
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-full max-w-[320px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col"
                        >
                            {/* Segmented Control Header */}
                            <div className="p-2 border-b border-gray-200 dark:border-white/5">
                                <div className="flex bg-gray-100 dark:bg-black/20 rounded-xl p-1 gap-1">
                                    <PickerTab active={pickerTab === 'emoji'} onClick={() => setPickerTab('emoji')} icon={<SmileIcon className="w-3.5 h-3.5"/>} label="Emoji" />
                                    <PickerTab active={pickerTab === 'sticker'} onClick={() => setPickerTab('sticker')} icon={<StarIcon className="w-3.5 h-3.5"/>} label="Stickers" />
                                    <PickerTab active={pickerTab === 'quick'} onClick={() => setPickerTab('quick')} icon={<LightningIcon className="w-3.5 h-3.5"/>} label="Quick" />
                                    {isDM && <PickerTab active={pickerTab === 'gift'} onClick={() => setPickerTab('gift')} icon={<GiftIcon className="w-3.5 h-3.5 text-yellow-500"/>} label="Gift" />}
                                </div>
                            </div>

                            {/* Content Area with Auto-Height Animation */}
                            <motion.div 
                                className={`bg-gray-50 dark:bg-black/10 ${pickerTab === 'gift' ? '' : 'overflow-y-auto custom-scrollbar'}`}
                                layout
                                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                                style={{ maxHeight: pickerTab === 'gift' ? 'none' : '280px' }}
                            >
                                <div className="p-3">
                                    {pickerTab === 'emoji' && (
                                        <div className="grid grid-cols-6 gap-2">
                                            {EMOJIS.map(emoji => (
                                                <motion.button 
                                                    whileHover={{ scale: 1.2 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    key={emoji} 
                                                    onClick={() => handleAddEmoji(emoji)} 
                                                    className="aspect-square flex items-center justify-center text-2xl hover:bg-white dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                                                >
                                                    {emoji}
                                                </motion.button>
                                            ))}
                                        </div>
                                    )}
                                    {pickerTab === 'sticker' && (
                                        <div className="grid grid-cols-4 gap-2">
                                            {AVATAR_LIST.map(av => (
                                                <motion.button 
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    key={av.id} 
                                                    onClick={() => handleSendSticker(av.id)} 
                                                    className="aspect-square rounded-2xl bg-white dark:bg-black/20 border border-gray-200 dark:border-white/5 p-2 shadow-sm hover:shadow-md transition-all overflow-hidden"
                                                >
                                                    <UserAvatar avatarId={av.id} className="w-full h-full" />
                                                </motion.button>
                                            ))}
                                        </div>
                                    )}
                                    {pickerTab === 'quick' && (
                                        <div className="grid grid-cols-2 gap-2">
                                            {QUICK_CHATS.map(txt => (
                                                <button key={txt} onClick={() => handleSendQuickChat(txt)} className="px-2 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/10 shadow-sm hover:shadow">{txt}</button>
                                            ))}
                                        </div>
                                    )}
                                    {pickerTab === 'gift' && (
                                        <div className="flex flex-col gap-3">
                                            {/* Gold Card Header */}
                                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400 via-orange-500 to-yellow-600 p-4 shadow-lg text-white">
                                                <div className="relative z-10 flex justify-between items-center">
                                                    <div>
                                                        <div className="text-[10px] font-bold uppercase tracking-widest opacity-90">Balance</div>
                                                        <div className="text-2xl font-black flex items-center gap-1">
                                                            <CoinIcon className="w-5 h-5 text-yellow-200" /> {app?.coins || 0}
                                                        </div>
                                                    </div>
                                                    <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                                                        <GiftIcon className="w-6 h-6 text-white" />
                                                    </div>
                                                </div>
                                                {/* Shine effect */}
                                                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-r from-transparent via-white/20 to-transparent rotate-45 pointer-events-none" />
                                            </div>
                                            
                                            <div className="grid grid-cols-3 gap-2">
                                                {[50, 100, 500].map(amount => (
                                                    <button 
                                                        key={amount} 
                                                        onClick={() => setGiftAmount(amount.toString())}
                                                        className={`py-3 rounded-xl border font-bold text-xs flex flex-col items-center gap-1 transition-all
                                                            ${giftAmount === amount.toString() 
                                                                ? 'bg-yellow-50 dark:bg-yellow-500/20 border-yellow-500 text-yellow-600 dark:text-yellow-400 shadow-md ring-1 ring-yellow-500' 
                                                                : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10'
                                                            }
                                                        `}
                                                    >
                                                        <CoinIcon className="w-4 h-4" /> {amount}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="relative">
                                                <motion.div animate={{ x: isGiftShake ? [0, -5, 5, -5, 5, 0] : 0 }} transition={{ duration: 0.3 }}>
                                                    <input 
                                                        type="number" 
                                                        value={giftAmount}
                                                        onChange={e => setGiftAmount(Math.floor(Number(e.target.value)).toString())}
                                                        className={`w-full bg-white dark:bg-black/30 border rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 transition-all shadow-inner
                                                            ${isGiftShake ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-white/10 focus:border-yellow-500 focus:ring-yellow-500/50'}
                                                        `}
                                                        placeholder="Custom Amount"
                                                    />
                                                </motion.div>
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                    <CoinIcon className="w-4 h-4" />
                                                </div>
                                            </div>

                                            <button 
                                                onClick={handleSendGift}
                                                disabled={!giftAmount || parseInt(giftAmount) <= 0}
                                                className="w-full py-3.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black font-black uppercase text-xs rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                Send Gift
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div 
                    id="chat-toolbar"
                    className={`
                        relative flex flex-col gap-2 
                        bg-white/90 dark:bg-[#0f172a]/95 backdrop-blur-2xl 
                        border border-white/20 dark:border-white/10 
                        rounded-[28px] p-3 
                        shadow-2xl dark:shadow-[0_0_40px_rgba(0,0,0,0.5)] 
                        transition-all duration-300
                        focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/50
                    `}
                >
                    {/* Text Area Container with subtle inner depth */}
                    <div className="relative bg-gray-50/50 dark:bg-black/20 rounded-2xl border border-gray-200/50 dark:border-white/5 transition-colors focus-within:bg-white dark:focus-within:bg-black/40 focus-within:border-cyan-500/30">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={editingMessage ? "Edit message..." : placeholder}
                            className="w-full bg-transparent border-none text-sm text-gray-900 dark:text-white focus:outline-none placeholder-gray-400 dark:placeholder-gray-600 px-4 py-3 resize-none max-h-[120px] overflow-y-auto custom-scrollbar leading-relaxed min-h-[48px]"
                            rows={1}
                            autoComplete="off"
                            onClick={() => setShowPicker(false)}
                        />
                    </div>

                    {/* Bottom Bar: Tools + Actions */}
                    <div className="flex items-center justify-between pl-1 pr-1">
                        {/* Tools */}
                        <div className="flex items-center gap-1">
                            <ToolbarButton 
                                icon={<SmileIcon className="w-5 h-5"/>} 
                                label="Emoji" 
                                isActive={showPicker && pickerTab === 'emoji'} 
                                onClick={() => togglePicker('emoji')}
                                activeClasses="bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/50"
                            />
                            <ToolbarButton 
                                icon={<StarIcon className="w-5 h-5"/>} 
                                label="Sticker" 
                                isActive={showPicker && pickerTab === 'sticker'} 
                                onClick={() => togglePicker('sticker')}
                                activeClasses="bg-purple-500/10 text-purple-500 ring-1 ring-purple-500/50"
                            />
                            <ToolbarButton 
                                icon={<LightningIcon className="w-5 h-5"/>} 
                                label="Quick" 
                                isActive={showPicker && pickerTab === 'quick'} 
                                onClick={() => togglePicker('quick')}
                                activeClasses="bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/50"
                            />
                            {isDM && (
                                <>
                                    <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1"></div>
                                    <ToolbarButton 
                                        icon={<GiftIcon className="w-5 h-5"/>} 
                                        label="Gift" 
                                        isActive={showPicker && pickerTab === 'gift'} 
                                        onClick={() => togglePicker('gift')}
                                        activeClasses="bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)]"
                                    />
                                </>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            {editingMessage && (
                                <button onClick={cancelEditing} className="px-3 py-1.5 rounded-full text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                    Cancel
                                </button>
                            )}
                            
                            <motion.button 
                                type="button"
                                onClick={() => handleSubmit()}
                                disabled={!input.trim()} 
                                whileTap={{ scale: 0.9 }}
                                whileHover={{ scale: 1.05 }}
                                className={`
                                    w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300
                                    ${input.trim() 
                                        ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-cyan-500/30' 
                                        : 'bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                    }
                                `}
                            >
                                {editingMessage ? <CheckIcon className="w-5 h-5" /> : <SendIcon className="w-5 h-5" />}
                            </motion.button>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>{`
                .action-btn {
                    @apply w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors;
                }
            `}</style>
        </div>

        {/* Custom Context Menu */}
        <AnimatePresence>
            {contextMenu && (
                <MessageContextMenu
                    msg={contextMenu.msg}
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                    onReaction={handleSendReaction}
                    onReply={() => { setReplyingTo(contextMenu.msg); setContextMenu(null); if (textareaRef.current) textareaRef.current.focus(); }}
                    onCopy={handleCopyMessage}
                    onEdit={startEditing}
                    onDelete={handleDeleteMessage}
                    currentUserId={currentUserId}
                />
            )}
        </AnimatePresence>

        {/* Nested Modal for Match Setup */}
        <AnimatePresence>
            {showMatchSetup && targetUser && (
                <MatchSetupModal 
                    opponentName={targetUser.displayName} 
                    onClose={() => setShowMatchSetup(false)}
                    onConfirm={handleConfirmChallenge}
                    userCoins={app?.coins || 0}
                />
            )}
        </AnimatePresence>
        </>
    );
};

export default ChatPanel;

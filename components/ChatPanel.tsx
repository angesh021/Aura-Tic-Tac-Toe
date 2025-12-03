
import React, { useState, useEffect, useRef, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageIcon, SmileIcon, CloseIcon, SendIcon, CheckIcon, ReplyIcon, SwordIcon, ArrowLeftIcon, EllipsisVerticalIcon, ArrowUpIcon, PencilIcon, TrashIcon } from './Icons';
import { ChatMessage, User, GameSettings } from '../types';
import { UserAvatar } from './Avatars';
import { onlineService } from '../services/online';
import MatchSetupModal from './MatchSetupModal';
import { useToast } from '../contexts/ToastContext';
import { getRank } from '../utils/badgeData';
import Tooltip from './Tooltip';
import { AppContext } from '../contexts/AppContext';
import { useDirectMessages } from '../contexts/DirectMessageContext';

const EMOJIS = ['👍', '😂', '😮', '🤔', '🎉', '😡', '❤️', '🔥', '👋', '💀', '😭', '✨'];

// --- Sub-components ---

const ReactionPicker: React.FC<{ onSelect: (emoji: string) => void; onClose: () => void }> = ({ onSelect, onClose }) => {
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    return (
        <div ref={pickerRef} className="flex gap-1 p-1 bg-slate-800 border border-slate-700 rounded-full shadow-lg">
            {EMOJIS.slice(0, 6).map(emoji => (
                <motion.button
                    key={emoji}
                    onClick={() => onSelect(emoji)}
                    whileHover={{ scale: 1.3, rotate: 10 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-1.5 rounded-full text-xl transition-colors hover:bg-white/10"
                >
                    {emoji}
                </motion.button>
            ))}
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
    const [showMuteMenu, setShowMuteMenu] = useState(false);
    const [showEmojis, setShowEmojis] = useState(false);

    // --- New State for Message Actions ---
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
    const [actionMenuMessageId, setActionMenuMessageId] = useState<string | null>(null);
    const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
    const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    
    const app = useContext(AppContext);
    const toast = useToast();
    const dm = useDirectMessages();
    const isDM = channel === 'dm' && targetId;

    const actualMessages = isDM ? (dm.messagesByPartner[targetId] || []) : messages;
    const hasMore = isDM ? !!dm.cursors[targetId!] : false;
    const isLoading = isDM ? dm.isLoadingHistory[targetId!] : false;

    const handleSendMessage = (text: string, replyPayload?: any) => {
        if (isDM && targetId) {
            dm.sendMessage(targetId, text, replyPayload);
        } else if (onSendMessage) {
            onSendMessage(text, replyPayload);
        }
    };

    const handleLoadMore = () => {
        if (isDM && targetId) {
            dm.loadMore(targetId);
        }
    }

    const handleMute = (duration: number) => {
        if (!targetUser) return;
        const expiry = Date.now() + duration;
        const currentMutes = app?.preferences.mutedConversations || {};
        app?.updatePreferences({
            mutedConversations: {
                ...currentMutes,
                [targetUser.id]: expiry
            }
        });
        setShowMuteMenu(false);
        let durationText = duration >= 3600000 ? `${duration / 3600000} hour(s)` : `${duration / 60000} minute(s)`;
        toast.info(`Muted ${targetUser.displayName} for ${durationText}.`);
    };

    const handleUnmute = () => {
        if (!targetUser) return;
        const currentMutes = { ...(app?.preferences.mutedConversations || {}) };
        delete currentMutes[targetUser.id];
        app?.updatePreferences({ mutedConversations: currentMutes });
        setShowMuteMenu(false);
        toast.success(`Unmuted ${targetUser.displayName}.`);
    };

    const isMuted = targetUser && app?.preferences.mutedConversations?.[targetUser.id] && Date.now() < app.preferences.mutedConversations[targetUser.id];

    // --- Action Handlers ---
    const handleSendReaction = (messageId: string, emoji: string) => {
        if (!channel || !targetId || channel === 'lobby') return;
        onlineService.sendReaction({ channel, targetId, messageId, emoji });
        setReactionPickerMessageId(null);
        setActionMenuMessageId(null);
    };

    const handleDeleteMessage = (messageId: string) => {
        if (!channel || !targetId || channel === 'lobby') return;
        onlineService.deleteMessage({ channel, targetId, messageId });
        setActionMenuMessageId(null);
    };

    const startEditing = (msg: ChatMessage) => {
        setEditingMessage(msg);
        setInput(msg.text);
        setReplyingTo(null);
        setActionMenuMessageId(null);
    };

    const cancelEditing = () => {
        setEditingMessage(null);
        setInput('');
    };

    // --- Smart Scroll Logic ---
    const scrollToBottom = (smooth = true) => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: smooth ? 'smooth' : 'auto'
            });
            setUnreadBelow(0);
        }
    };

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const distFromBottom = scrollHeight - scrollTop - clientHeight;
        const atBottom = distFromBottom < 50; 
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
        // Don't auto scroll if we are loading history
        if (isLoading) return; 

        if (isAtBottom || lastMsg.senderId === currentUserId) {
            setTimeout(() => scrollToBottom(), 50);
        } else {
            setUnreadBelow(prev => prev + 1);
        }
    }, [actualMessages, currentUserId, isAtBottom, isLoading]);

    // Handle Typing Events
    useEffect(() => {
        if (!channel) return;

        const handleTyping = (data: { userId: string, displayName: string, channel: string, roomId?: string }) => {
            if (data.channel !== channel) return;
            if (channel === 'game' && data.roomId !== targetId) return;
            if (channel === 'dm' && data.userId !== targetId) return;
            if (data.userId === currentUserId) return; 
            
            setTypingUsers(prev => new Map(prev).set(data.userId, data.displayName));
            if (isAtBottom) scrollToBottom();
        };

        const handleStopTyping = (data: { userId: string, channel: string, roomId?: string }) => {
            if (data.channel !== channel) return;
            if (channel === 'game' && data.roomId !== targetId) return;
            if (channel === 'dm' && data.userId !== targetId) return;

            setTypingUsers(prev => {
                const newMap = new Map(prev);
                newMap.delete(data.userId);
                return newMap;
            });
        };

        onlineService.onUserTyping(handleTyping);
        onlineService.onUserStoppedTyping(handleStopTyping);

        return () => {
            onlineService.offUserTyping();
            onlineService.offUserStoppedTyping();
        };
    }, [channel, targetId, currentUserId, isAtBottom]);
    
    // Close Action Menu on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setActionMenuMessageId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
        if (channel) {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            onlineService.sendTyping({ channel, roomId: channel === 'game' ? targetId : undefined, toUserId: channel === 'dm' ? targetId : undefined });
            typingTimeoutRef.current = setTimeout(() => {
                onlineService.sendStopTyping({ channel, roomId: channel === 'game' ? targetId : undefined, toUserId: channel === 'dm' ? targetId : undefined });
            }, 3000);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
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
        setShowEmojis(false);
        scrollToBottom();
        
        if (channel) {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            onlineService.sendStopTyping({ channel, roomId: channel === 'game' ? targetId : undefined, toUserId: channel === 'dm' ? targetId : undefined });
        }
    };
    
    const handleAddEmoji = (emoji: string) => {
        setInput(prev => prev + emoji);
    };

    const handleConfirmChallenge = async (settings: GameSettings) => {
        if (!targetUser) return;
        try {
            const roomId = await onlineService.createRoom(settings, 'bronze'); // Default to bronze for now
            onlineService.sendInvite(targetUser.id, roomId);
            toast.success("Challenge invite sent!");
            setShowMatchSetup(false);
            if(onClose) onClose(); 
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const getDateLabel = (timestamp: number) => {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const getStatusInfo = (s?: string) => {
        switch(s) {
            case 'ONLINE': return { text: 'Online', color: 'bg-green-500', ring: 'ring-green-500/30' };
            case 'IN_GAME': return { text: 'In Match', color: 'bg-orange-500', ring: 'ring-orange-500/30' };
            case 'WAITING': return { text: 'In Lobby', color: 'bg-blue-500', ring: 'ring-blue-500/30' };
            default: return { text: 'Offline', color: 'bg-gray-500', ring: 'ring-gray-500/30' };
        }
    };

    const statusInfo = getStatusInfo(targetStatus);
    const rank = targetUser && targetUser.elo !== undefined ? getRank(targetUser.elo) : undefined;
    const isChallengeable = targetStatus === 'ONLINE' || targetStatus === 'WAITING';
    const challengeTooltip = targetStatus === 'IN_GAME' ? `${targetUser?.displayName} is in a match` : (targetStatus === 'OFFLINE' ? `${targetUser?.displayName} is offline` : '');

    return (
        <>
        <div className={`flex flex-col bg-[#0f172a] relative overflow-hidden h-full ${className}`}>
            
            {/* Header */}
            <div className="shrink-0 px-4 py-3 bg-slate-900/90 backdrop-blur-xl border-b border-white/5 flex justify-between items-center z-20 shadow-xl">
               <div className="flex items-center gap-3 min-w-0">
                   {onClose && (
                       <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors group">
                           <ArrowLeftIcon className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
                       </button>
                   )}
                   
                   {targetUser ? (
                       <div className="flex items-center gap-3 min-w-0">
                           <div className="relative">
                               <div className="w-10 h-10 rounded-full p-0.5 border border-white/10 bg-black overflow-hidden shadow-lg">
                                    <UserAvatar avatarId={targetUser.avatar} className="w-full h-full" />
                               </div>
                               <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${statusInfo.color}`}></div>
                           </div>
                           <div className="flex flex-col justify-center min-w-0">
                               <h2 className="text-base font-bold text-white tracking-wide leading-tight truncate">{targetUser.displayName}</h2>
                               <div className="flex items-center gap-2 text-xs">
                                   <span className={`${targetStatus === 'ONLINE' ? 'text-green-400' : 'text-gray-400'} font-medium`}>{statusInfo.text}</span>
                                   {rank && (
                                       <>
                                        <span className="text-gray-600">•</span>
                                        <div className={`flex items-center gap-1 font-bold ${rank.color}`}>
                                            <span>{rank.icon}</span>
                                            <span>{rank.name}</span>
                                        </div>
                                       </>
                                   )}
                               </div>
                           </div>
                       </div>
                   ) : (
                       <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-full flex items-center justify-center border border-cyan-500/30 shadow-inner">
                                <MessageIcon className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
                                {channel === 'lobby' && <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Global Channel</span>}
                            </div>
                       </div>
                   )}
               </div>

               <div className="flex items-center gap-2">
                    {targetUser && (
                        <Tooltip text={challengeTooltip}>
                            <motion.button 
                                whileHover={isChallengeable ? { scale: 1.05 } : {}} 
                                whileTap={isChallengeable ? { scale: 0.95 } : {}}
                                onClick={() => isChallengeable && setShowMatchSetup(true)}
                                disabled={!isChallengeable}
                                className={`px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 text-xs font-bold transition-all border ${
                                    isChallengeable
                                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-500/50 text-white hover:shadow-cyan-500/20'
                                    : 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed opacity-70'
                                }`}
                            >
                                <SwordIcon className="w-3 h-3" /> 
                                <span className="hidden sm:inline">{targetStatus === 'IN_GAME' ? 'Busy' : (targetStatus === 'OFFLINE' ? 'Offline' : 'Duel')}</span>
                            </motion.button>
                        </Tooltip>
                    )}
                    {targetUser && (
                        <div className="relative">
                            <button onClick={() => setShowMuteMenu(s => !s)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                                <EllipsisVerticalIcon className="w-5 h-5" />
                            </button>
                            <AnimatePresence>
                                {showMuteMenu && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                        className="absolute top-full right-0 mt-2 w-48 bg-slate-800 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                                    >
                                        <div className="p-2 text-xs font-semibold text-gray-400 border-b border-white/5">Mute Notifications</div>
                                        <div className="flex flex-col p-1">
                                            <button onClick={() => handleMute(3600 * 1000)} className="px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/5 rounded-md">For 1 hour</button>
                                            <button onClick={() => handleMute(8 * 3600 * 1000)} className="px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/5 rounded-md">For 8 hours</button>
                                            <button onClick={() => handleMute(24 * 3600 * 1000)} className="px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/5 rounded-md">For 24 hours</button>
                                            {isMuted && <button onClick={handleUnmute} className="px-3 py-2 text-left text-sm text-green-400 hover:bg-white/5 rounded-md">Unmute</button>}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
               </div>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-4 pb-24 space-y-1 relative bg-[#0f172a]">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none fixed"></div>
                
                {/* Load More Button */}
                {hasMore && (
                    <div className="flex justify-center mb-4">
                        <button 
                            onClick={handleLoadMore}
                            disabled={isLoading}
                            className="text-xs font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-colors disabled:opacity-50"
                        >
                            {isLoading ? 'Loading...' : 'Load Previous Messages'}
                        </button>
                    </div>
                )}

                {actualMessages.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-4">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/5 shadow-inner">
                            <MessageIcon className="w-8 h-8 opacity-40" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-gray-400">No messages yet</p>
                            <p className="text-xs text-gray-600 mt-1">Start the conversation!</p>
                        </div>
                    </div>
                )}
                
                {actualMessages.map((msg, index) => {
                    const isMe = msg.senderId === currentUserId;
                    const isSystem = msg.type === 'system';
                    const prevMsg = actualMessages[index - 1];
                    const nextMsg = actualMessages[index + 1];
                    
                    const showDate = index === 0 || new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();
                    
                    // Grouping Logic
                    const isPrevSame = prevMsg && prevMsg.senderId === msg.senderId && prevMsg.type === 'user' && !prevMsg.deleted && (msg.timestamp - prevMsg.timestamp < 300000);
                    const isNextSame = nextMsg && nextMsg.senderId === msg.senderId && nextMsg.type === 'user' && !nextMsg.deleted && (nextMsg.timestamp - msg.timestamp < 300000);
                    
                    let borderRadius = '';
                    if (isMe) {
                        borderRadius = 'rounded-[20px] rounded-br-[4px]'; 
                        if (isPrevSame && isNextSame) borderRadius = 'rounded-[20px] rounded-r-[4px]';
                        else if (isPrevSame) borderRadius = 'rounded-[20px] rounded-tr-[4px] rounded-br-[20px]';
                        else if (isNextSame) borderRadius = 'rounded-[20px] rounded-br-[4px]';
                    } else {
                        borderRadius = 'rounded-[20px] rounded-bl-[4px]';
                        if (isPrevSame && isNextSame) borderRadius = 'rounded-[20px] rounded-l-[4px]';
                        else if (isPrevSame) borderRadius = 'rounded-[20px] rounded-tl-[4px] rounded-bl-[20px]';
                        else if (isNextSame) borderRadius = 'rounded-[20px] rounded-bl-[4px]';
                    }

                    return (
                        <React.Fragment key={msg.id}>
                            {showDate && (
                                <div className="flex justify-center my-6 sticky top-2 z-10">
                                    <span className="text-[10px] font-bold text-gray-400 bg-slate-900/80 px-3 py-1 rounded-full border border-white/10 shadow-sm backdrop-blur-md">
                                        {getDateLabel(msg.timestamp)}
                                    </span>
                                </div>
                            )}

                            {isSystem ? (
                                <div className="flex justify-center my-4 px-8">
                                    <span className="text-[10px] text-gray-400 text-center italic bg-white/5 px-4 py-1.5 rounded-full border border-white/5 w-auto shadow-sm">
                                        {msg.text}
                                    </span>
                                </div>
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative ${isPrevSame ? 'mt-0.5' : 'mt-4'}`}
                                    onMouseEnter={() => !msg.deleted && setHoveredMessageId(msg.id)}
                                    onMouseLeave={() => { if (actionMenuMessageId !== msg.id) setHoveredMessageId(null) }}
                                >
                                    <div className={`flex max-w-[85%] sm:max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                                        {!isMe && (
                                            <div className="w-8 h-8 shrink-0 mb-1">
                                                {!isNextSame ? (
                                                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shadow-md bg-black">
                                                        <UserAvatar avatarId={msg.senderAvatar || 'avatar-1'} className="w-full h-full" />
                                                    </div>
                                                ) : <div className="w-8 h-8" />}
                                            </div>
                                        )}
                                        
                                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} min-w-0 relative`}>
                                            {!isMe && !isPrevSame && (
                                                <span className="text-[10px] font-bold text-gray-400 ml-3 mb-1 block opacity-70">{msg.senderName}</span>
                                            )}
                                            
                                            {msg.replyTo && (
                                                <div className={`mb-1 px-3 py-2 rounded-2xl text-xs bg-white/5 border-l-2 flex flex-col max-w-full backdrop-blur-sm ${isMe ? 'border-cyan-500 rounded-br-none mr-1' : 'border-purple-500 rounded-bl-none ml-1'}`}>
                                                    <span className="font-bold text-[9px] text-gray-400 uppercase flex items-center gap-1 mb-0.5">
                                                        <ReplyIcon className="w-3 h-3" /> {msg.replyTo.senderName}
                                                    </span>
                                                    <span className="truncate max-w-[200px] italic text-gray-500">{msg.replyTo.text}</span>
                                                </div>
                                            )}

                                            <div className={`relative px-4 py-2.5 text-sm shadow-sm transition-all hover:shadow-md ${borderRadius}
                                                ${isMe 
                                                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white border border-blue-400/20 shadow-cyan-500/10' 
                                                    : 'bg-slate-800 text-gray-100 border border-white/10'
                                                }
                                            `}>
                                                {msg.deleted ? (
                                                    <span className="italic text-gray-400">This message was deleted</span>
                                                ) : (
                                                    <span className="break-words leading-relaxed whitespace-pre-wrap">{msg.text}</span>
                                                )}
                                                
                                                {/* Timestamp & Status */}
                                                <div className={`text-[9px] mt-1 flex items-center gap-1 opacity-60 font-medium ${isMe ? 'justify-end text-blue-50' : 'justify-start text-gray-400'}`}>
                                                    {msg.editedAt && <span>(edited)</span>}
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>

                                            {/* Reactions Display */}
                                            {msg.reactions && typeof msg.reactions === 'object' && Object.keys(msg.reactions).length > 0 && !msg.deleted && (
                                                <div className={`flex gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'} pl-2`}>
                                                    {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                                                        const userIdsArray = userIds as string[];
                                                        return (
                                                        <Tooltip key={emoji} text={`${userIdsArray.length} reaction${userIdsArray.length > 1 ? 's' : ''}`}>
                                                            <button
                                                                onClick={() => handleSendReaction(msg.id, emoji)}
                                                                className={`px-1.5 py-0.5 rounded-full text-xs flex items-center gap-1 transition-colors border ${
                                                                    userIdsArray.includes(currentUserId)
                                                                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                                                                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                                                                }`}
                                                            >
                                                                <span>{emoji}</span>
                                                                <span className="font-bold text-[10px]">{userIdsArray.length}</span>
                                                            </button>
                                                        </Tooltip>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Action Menu Trigger */}
                                    <AnimatePresence>
                                        {hoveredMessageId === msg.id && !msg.deleted && (
                                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                                                className={`absolute top-0 z-20 flex items-center ${isMe ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'}`}
                                            >
                                                <button onClick={() => setActionMenuMessageId(actionMenuMessageId === msg.id ? null : msg.id)} className="p-1.5 rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
                                                    <EllipsisVerticalIcon className="w-5 h-5"/>
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    
                                    {/* Action Menu */}
                                    <AnimatePresence>
                                        {actionMenuMessageId === msg.id && (
                                            <motion.div
                                                ref={actionMenuRef}
                                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                                className={`absolute z-30 p-1 bg-slate-800 border border-white/10 rounded-xl shadow-xl flex flex-col gap-1 w-32 ${isMe ? 'right-0' : 'left-0'} top-full mt-1`}
                                            >
                                                <button onClick={() => { setReplyingTo(msg); setActionMenuMessageId(null); }} className="action-btn text-left"><ReplyIcon className="w-4 h-4"/> Reply</button>
                                                <button onClick={() => { setReactionPickerMessageId(msg.id); setActionMenuMessageId(null); }} className="action-btn text-left"><SmileIcon className="w-4 h-4"/> React</button>
                                                {isMe && <button onClick={() => startEditing(msg)} className="action-btn text-left"><PencilIcon className="w-4 h-4"/> Edit</button>}
                                                {isMe && <button onClick={() => handleDeleteMessage(msg.id)} className="action-btn text-left text-red-400"><TrashIcon className="w-4 h-4"/> Delete</button>}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    
                                    {/* Reaction Picker */}
                                    <AnimatePresence>
                                        {reactionPickerMessageId === msg.id && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                                className={`absolute z-30 ${isMe ? 'right-0' : 'left-0'} bottom-full mb-2`}
                                            >
                                                <ReactionPicker onSelect={(emoji) => handleSendReaction(msg.id, emoji)} onClose={() => setReactionPickerMessageId(null)} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )}
                        </React.Fragment>
                    );
                })}
                
                {/* Typing Indicator */}
                <AnimatePresence>
                    {typingUsers.size > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                            className="flex items-center gap-2 mt-4 ml-12"
                        >
                            <div className="bg-slate-800 px-3 py-2 rounded-2xl rounded-bl-sm border border-slate-700 flex gap-1 items-center shadow-lg">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}/>
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}/>
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}/>
                            </div>
                            <span className="text-[10px] text-gray-500 font-medium">
                                {Array.from(typingUsers.values()).join(', ')} is typing...
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                <div id="end-of-chat" className="h-4" />
            </div>

            {/* Scroll To Bottom Button */}
            <AnimatePresence>
                {unreadBelow > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-24 left-0 right-0 flex justify-center z-30 pointer-events-none"
                    >
                        <button
                            onClick={() => scrollToBottom()}
                            className="bg-cyan-600/90 hover:bg-cyan-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg border border-cyan-400/50 flex items-center gap-2 backdrop-blur-md transition-all active:scale-95 pointer-events-auto"
                        >
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                            <span>{unreadBelow} New Message{unreadBelow > 1 ? 's' : ''}</span>
                            <ArrowUpIcon className="w-4 h-4 -rotate-180" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="absolute bottom-6 left-6 right-6 z-30">
                <AnimatePresence>
                    {replyingTo && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.95 }} 
                            animate={{ opacity: 1, height: 'auto', marginBottom: 8, scale: 1 }} 
                            exit={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.95 }}
                            className="flex justify-between items-center bg-[#0f172a]/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 shadow-2xl mx-1"
                        >
                            <div className="min-w-0 border-l-2 border-cyan-500 pl-3">
                                <div className="text-[10px] font-bold text-cyan-400 uppercase mb-0.5">Replying to {replyingTo.senderName}</div>
                                <div className="text-xs text-gray-300 truncate font-medium">{replyingTo.text}</div>
                            </div>
                            <button onClick={() => setReplyingTo(null)} className="p-1.5 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-colors">
                                <CloseIcon className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                <AnimatePresence>
                    {showEmojis && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute bottom-full mb-3 left-0 p-3 bg-slate-800 border border-white/10 rounded-2xl shadow-xl grid grid-cols-6 gap-2 z-50 w-64 origin-bottom-left"
                        >
                            {EMOJIS.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => handleAddEmoji(emoji)}
                                    className="p-2 hover:bg-white/10 rounded-lg text-2xl transition-colors flex items-center justify-center"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <form 
                    onSubmit={handleSubmit} 
                    className="flex gap-2 items-center bg-slate-800/80 backdrop-blur-2xl border border-white/10 rounded-full p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.5)] ring-1 ring-white/5 transition-all focus-within:ring-cyan-500/50 focus-within:border-cyan-500/50 focus-within:shadow-[0_8px_40px_rgba(6,182,212,0.15)]"
                >
                    <button 
                        type="button" 
                        onClick={() => setShowEmojis(!showEmojis)}
                        className={`p-2 rounded-full transition-colors ${showEmojis ? 'text-cyan-400 bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <SmileIcon className="w-5 h-5" />
                    </button>
                    
                    <input 
                        value={input}
                        onChange={handleInputChange}
                        placeholder={editingMessage ? "Edit message..." : placeholder}
                        className="flex-1 bg-transparent border-none text-sm text-white focus:outline-none placeholder-gray-500 py-2"
                        autoComplete="off"
                    />

                    {editingMessage && (
                        <button type="button" onClick={cancelEditing} className="px-3 py-1 rounded-full text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-colors">Cancel</button>
                    )}
                    
                    <button 
                        type="submit" 
                        disabled={!input.trim()} 
                        className="p-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-full disabled:opacity-30 disabled:cursor-not-allowed shadow-lg hover:shadow-cyan-500/25 active:scale-95 transition-all flex items-center justify-center aspect-square"
                    >
                        {editingMessage ? <CheckIcon className="w-5 h-5" /> : <SendIcon className="w-5 h-5" />}
                    </button>
                </form>
            </div>
        </div>

        {/* Nested Modal for Match Setup */}
        <AnimatePresence>
            {showMatchSetup && targetUser && (
                <MatchSetupModal 
                    opponentName={targetUser.displayName} 
                    onClose={() => setShowMatchSetup(false)}
                    onConfirm={handleConfirmChallenge}
                />
            )}
        </AnimatePresence>
        </>
    );
};

export default ChatPanel;

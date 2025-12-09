
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageIcon, SmileIcon, CloseIcon, SendIcon, LightningIcon, ReplyIcon, CheckCircleIcon } from './Icons';
import { ChatMessage, User } from '../types';
import { UserAvatar } from './Avatars';
import { onlineService } from '../services/online';

const EMOJIS = ['👍', '😂', '😮', '🤔', '🎉', '😡', '❤️', '🔥'];

const QUICK_CHATS = [
    "Good Luck! 🍀", "Nice Move! 👏", "Oof... 😅", "Well Played! 🤝", 
    "Rematch? ⚔️", "Thanks!", "Thinking... 🤔", "Close one!"
];

interface GameChatProps {
    messages: ChatMessage[];
    onSendMessage: (text: string, replyTo?: any) => void;
    onSendEmote: (emoji: string) => void;
    currentUserId: string;
    isOpen: boolean;
    onToggle: () => void;
    className?: string;
    opponent?: User;
    roomId: string;
}

const ReactionPicker: React.FC<{ onSelect: (emoji: string) => void }> = ({ onSelect }) => (
    <div className="flex gap-1 p-1 bg-slate-800 border border-slate-700 rounded-full shadow-lg">
        {EMOJIS.map(emoji => (
            <motion.button
                key={emoji}
                onClick={() => onSelect(emoji)}
                whileHover={{ scale: 1.3, rotate: 10 }}
                whileTap={{ scale: 0.9 }}
                className="p-1 rounded-full text-lg"
            >
                {emoji}
            </motion.button>
        ))}
    </div>
);


const GameChat: React.FC<GameChatProps> = ({ 
    messages, onSendMessage, onSendEmote, currentUserId, isOpen, onToggle, className, opponent, roomId
}) => {
    const [input, setInput] = useState('');
    const [showEmojis, setShowEmojis] = useState(false);
    const [showQuickChat, setShowQuickChat] = useState(false);
    const [unreadPreview, setUnreadPreview] = useState<ChatMessage | null>(null);
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
    const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastMessageCountRef = useRef(messages.length);

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const distFromBottom = scrollHeight - scrollTop - clientHeight;
        const atBottom = distFromBottom < 50; 
        setIsAtBottom(atBottom);
    };

    const scrollToBottom = (smooth = true) => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: smooth ? 'smooth' : 'auto'
            });
        }
    };

    // Auto-scroll to bottom
    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (!lastMsg && isOpen) {
            scrollToBottom(false);
            return;
        }
        if (isAtBottom || (lastMsg && lastMsg.senderId === currentUserId)) {
            setTimeout(() => scrollToBottom(), 50);
        }
    }, [messages, isOpen, isAtBottom, currentUserId]);

    // Handle Unread Preview
    useEffect(() => {
        if (!isOpen && messages.length > lastMessageCountRef.current) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.senderId !== currentUserId && lastMsg.type === 'user') {
                setUnreadPreview(lastMsg);
                const timer = setTimeout(() => setUnreadPreview(null), 4000);
                return () => clearTimeout(timer);
            }
        }
        if (isOpen) setUnreadPreview(null);
        lastMessageCountRef.current = messages.length;
    }, [messages, isOpen, currentUserId]);

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmed = input.trim();
        if (!trimmed) return;

        if (editingMessage) {
            onlineService.editMessage({ channel: 'game', targetId: roomId, messageId: editingMessage.id, newText: trimmed });
            setEditingMessage(null);
        } else {
            onSendMessage(trimmed);
        }
        setInput('');
    };

    const handleQuickChat = (text: string) => {
        onSendMessage(text, undefined);
        setShowQuickChat(false);
    };
    
    const handleReaction = (messageId: string, emoji: string) => {
        onlineService.sendReaction({ channel: 'game', targetId: roomId, messageId, emoji });
    };

    const handleDelete = (messageId: string) => {
        onlineService.deleteMessage({ channel: 'game', targetId: roomId, messageId });
    };
    
    const startEditing = (msg: ChatMessage) => {
        setEditingMessage(msg);
        setInput(msg.text);
    };

    return (
        <div className={`fixed bottom-24 right-4 z-40 flex flex-col items-end pointer-events-none ${className}`}>
            
            {/* Unread Preview Bubble */}
            <AnimatePresence>
                {unreadPreview && !isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: -20, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        className="mb-4 mr-2 pointer-events-auto origin-bottom-right"
                    >
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-3 rounded-2xl rounded-br-none shadow-2xl max-w-[200px] flex items-start gap-2 relative">
                            <div className="w-6 h-6 rounded-full overflow-hidden border border-white/30 shrink-0">
                                <UserAvatar avatarId={unreadPreview.senderAvatar || 'avatar-1'} className="w-full h-full" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate">{unreadPreview.senderName}</div>
                                <div className="text-xs text-gray-300 truncate">{unreadPreview.text}</div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
            {isOpen ? (
                 <motion.div 
                    key="chat-window"
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="w-[340px] h-[450px] flex flex-col bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl pointer-events-auto"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b border-white/10 shrink-0">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <MessageIcon className="w-5 h-5 text-cyan-400" />
                            Game Chat
                        </h3>
                        <button onClick={onToggle} className="p-1 rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
                            <CloseIcon className="w-5 h-5"/>
                        </button>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                         {messages.map((msg, index) => {
                            const isMe = msg.senderId === currentUserId;
                            const isSystem = msg.type === 'system';
                            if (isSystem) {
                                return (
                                    <div key={msg.id} className="text-center text-xs text-gray-500 italic py-2">
                                        {msg.text}
                                    </div>
                                )
                            }
                            return (
                                <motion.div 
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex items-start gap-2 ${isMe ? 'justify-end' : ''}`}
                                >
                                    {!isMe && (
                                        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 bg-black shrink-0">
                                            <UserAvatar avatarId={msg.senderAvatar || 'avatar-1'} className="w-full h-full" />
                                        </div>
                                    )}
                                    <div className={`p-3 rounded-2xl text-sm max-w-[80%] ${isMe ? 'bg-cyan-600 text-white rounded-br-md' : 'bg-gray-700 text-gray-200 rounded-bl-md'}`}>
                                        {!isMe && (
                                            <div className="flex items-center gap-1 mb-1">
                                                <span className="text-[10px] font-bold text-cyan-400">{msg.senderName}</span>
                                                {msg.senderVerified && <CheckCircleIcon className="w-3 h-3 text-cyan-500" />}
                                            </div>
                                        )}
                                        <p className="break-words">{msg.text}</p>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                    {/* Input */}
                    <div className="p-2 border-t border-white/10 shrink-0">
                         <div className="grid grid-cols-2 gap-1 mb-1">
                             <button onClick={() => setShowEmojis(!showEmojis)} className="p-2 bg-white/5 rounded-lg text-xs font-semibold text-gray-300 hover:bg-white/10 flex items-center justify-center gap-1"><SmileIcon className="w-4 h-4"/> Emojis</button>
                             <button onClick={() => setShowQuickChat(!showQuickChat)} className="p-2 bg-white/5 rounded-lg text-xs font-semibold text-gray-300 hover:bg-white/10 flex items-center justify-center gap-1"><LightningIcon className="w-4 h-4"/> Quick</button>
                         </div>
                         <AnimatePresence>
                            {showEmojis && (
                                <motion.div initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}} exit={{opacity: 0, height: 0}} className="overflow-hidden">
                                    <div className="p-2 bg-black/20 rounded-lg flex flex-wrap justify-center gap-1">
                                        {EMOJIS.map(e => <button key={e} onClick={() => onSendEmote(e)} className="text-2xl p-1 hover:bg-white/10 rounded-lg">{e}</button>)}
                                    </div>
                                </motion.div>
                            )}
                            {showQuickChat && (
                                <motion.div initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}} exit={{opacity: 0, height: 0}} className="overflow-hidden">
                                    <div className="p-2 bg-black/20 rounded-lg grid grid-cols-2 gap-1">
                                        {QUICK_CHATS.map(q => <button key={q} onClick={() => handleQuickChat(q)} className="p-2 text-left text-xs font-medium text-gray-300 hover:bg-white/10 rounded">{q}</button>)}
                                    </div>
                                </motion.div>
                            )}
                         </AnimatePresence>
                         <form onSubmit={handleSend} className="flex gap-2 items-center mt-1">
                             <input value={input} onChange={e => setInput(e.target.value)} placeholder="Say something..." className="flex-1 bg-black/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
                             <button type="submit" className="p-2.5 bg-cyan-600 rounded-lg text-white disabled:opacity-50" disabled={!input.trim()}><SendIcon className="w-4 h-4"/></button>
                         </form>
                    </div>
                 </motion.div>
            ) : (
                <motion.button 
                    key="fab"
                    onClick={onToggle}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    className="relative w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-xl border-2 border-white/20 pointer-events-auto flex items-center justify-center text-white"
                >
                    <MessageIcon className="w-8 h-8"/>
                </motion.button>
            )}
        </AnimatePresence>
        </div>
    );
};
export default GameChat;

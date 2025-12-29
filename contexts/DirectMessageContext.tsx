
import React, { createContext, useState, useCallback, useContext, useMemo, ReactNode, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { onlineService } from '../services/online';
import { AuthContext } from './AuthContext';

interface DirectMessageContextType {
    messagesByPartner: { [partnerId: string]: ChatMessage[] };
    unreadCounts: { [partnerId: string]: number };
    cursors: { [partnerId: string]: string | null };
    isLoadingHistory: { [partnerId: string]: boolean };
    addMessage: (message: ChatMessage) => void;
    sendMessage: (toUserId: string, text: string, replyTo?: any) => void;
    markConversationAsRead: (partnerId: string) => void;
    loadChat: (partnerId: string) => Promise<void>;
    loadMore: (partnerId: string) => Promise<void>;
    clearAllUnreadCounts: () => void;
}

const DirectMessageContext = createContext<DirectMessageContextType | null>(null);

export const useDirectMessages = () => {
    const context = useContext(DirectMessageContext);
    if (!context) {
        throw new Error('useDirectMessages must be used within a DirectMessageProvider');
    }
    return context;
};

export const DirectMessageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const auth = useContext(AuthContext);
    const [messagesByPartner, setMessagesByPartner] = useState<{ [partnerId: string]: ChatMessage[] }>({});
    const [unreadCounts, setUnreadCounts] = useState<{ [partnerId: string]: number }>({});
    const [cursors, setCursors] = useState<{ [partnerId: string]: string | null }>({});
    const [isLoadingHistory, setIsLoadingHistory] = useState<{ [partnerId: string]: boolean }>({});
    const [loadedPartners, setLoadedPartners] = useState<Set<string>>(new Set());
    
    // Track message IDs to prevent duplicates
    const knownMessageIds = useRef<Set<string>>(new Set());
    
    const userId = auth?.currentUser?.id;

    // Clear state on logout
    useEffect(() => {
        if (!userId) {
            setMessagesByPartner({});
            setUnreadCounts({});
            setCursors({});
            setLoadedPartners(new Set());
            knownMessageIds.current.clear();
        }
    }, [userId]);

    // FETCH SYNC: Get active conversations from server to sync unread counts
    useEffect(() => {
        if (userId) {
            onlineService.getConversations().then(chats => {
                const newUnread: Record<string, number> = {};
                const newMessages: Record<string, ChatMessage[]> = {}; // Store last messages

                chats.forEach((chat: any) => {
                    if (chat.unreadCount > 0) {
                        newUnread[chat.partner.id] = chat.unreadCount;
                    }
                    
                    // Hydrate last message so list snippet works immediately
                    if (chat.lastMessage) {
                        newMessages[chat.partner.id] = [chat.lastMessage];
                    }
                });
                
                setUnreadCounts(prev => ({ ...prev, ...newUnread }));
                
                // Merge last messages into messagesByPartner
                setMessagesByPartner(prev => {
                    const next = { ...prev };
                    for (const [pid, msgs] of Object.entries(newMessages)) {
                        // Only set if we don't have history loaded yet
                        if (!next[pid] || next[pid].length === 0) {
                            next[pid] = msgs;
                            // Add to known IDs to prevent re-add glitches
                            msgs.forEach(m => knownMessageIds.current.add(m.id));
                        }
                    }
                    return next;
                });
            });
        }
    }, [userId]);

    // Core function to add a message safely and maintain sort order
    const addMessage = useCallback((message: ChatMessage) => {
        if (message.type === 'system' && message.channel !== 'dm') return;
        if (knownMessageIds.current.has(message.id)) return;

        knownMessageIds.current.add(message.id);

        // Determine partner ID.
        // If I sent it, the partner is the recipient.
        // If I received it, the partner is the sender.
        const partnerId = message.senderId === userId ? message.recipientId : message.senderId;
        
        if (!partnerId) {
            // This might happen if recipientId isn't set on sent messages.
            // However, for real-time messages, the server should set it.
            // For historical messages, loadChat handles it explicitly.
            return;
        }

        setMessagesByPartner(prev => {
            const history = prev[partnerId] || [];
            if (history.some(m => m.id === message.id)) return prev;
            
            const updatedHistory = [...history, message];
            
            // STRICT SORT by timestamp
            updatedHistory.sort((a, b) => a.timestamp - b.timestamp);

            return {
                ...prev,
                [partnerId]: updatedHistory
            };
        });

        // Increment unread count if message is not from current user
        if (message.senderId !== userId) {
            setUnreadCounts(prev => ({
                ...prev,
                [partnerId]: (prev[partnerId] || 0) + 1
            }));
        }
    }, [userId]);

    // Listen for real-time updates
    useEffect(() => {
        if (!userId) return;

        const handleDirectMessage = (msg: ChatMessage) => {
            addMessage(msg);
        };

        const handleMessageUpdated = ({ channel, message }: { channel: string, message: ChatMessage }) => {
            if (channel !== 'dm') return;
            const partnerId = message.senderId === userId ? message.recipientId : message.senderId;
            if (!partnerId) return;

            setMessagesByPartner(prev => {
                const history = prev[partnerId] || [];
                return { ...prev, [partnerId]: history.map(m => m.id === message.id ? { ...m, ...message } : m) };
            });
        };

        const handleMessageDeleted = ({ channel, messageId }: { channel: string, messageId: string }) => {
            if (channel !== 'dm') return;
            setMessagesByPartner(prev => {
                const next = { ...prev };
                for (const pId in next) {
                    if (next[pId].some(m => m.id === messageId)) {
                        next[pId] = next[pId].map(m => m.id === messageId ? { ...m, text: 'This message was deleted.', deleted: true, reactions: {}, replyTo: undefined } : m);
                    }
                }
                return next;
            });
        };
        
        const handleReactionUpdate = ({ channel, messageId, reactions }: { channel: string, messageId: string, reactions: ChatMessage['reactions'] }) => {
            if (channel !== 'dm') return;
            setMessagesByPartner(prev => {
                const next = { ...prev };
                for (const pId in next) {
                    if (next[pId].some(m => m.id === messageId)) {
                        next[pId] = next[pId].map(m => m.id === messageId ? { ...m, reactions } : m);
                    }
                }
                return next;
            });
        };

        const handleMessagesRead = ({ conversationPartnerId, readByUserId, readAt, partnerId }: { conversationPartnerId: string, readByUserId: string, readAt: number, partnerId?: string }) => {
            if (readByUserId !== userId) {
                const partner = readByUserId; 
                setMessagesByPartner(prev => {
                    const history = prev[partner] || [];
                    if (history.length === 0) return prev;
                    const updatedHistory = history.map(m => {
                        if (m.senderId === userId) {
                            const currentReadBy = m.readBy || {};
                            if (!currentReadBy[partner]) {
                                return { ...m, readBy: { ...currentReadBy, [partner]: readAt } };
                            }
                        }
                        return m;
                    });
                    return { ...prev, [partner]: updatedHistory };
                });
            } else if (readByUserId === userId && partnerId) {
                setUnreadCounts(prev => {
                    if (!prev[partnerId]) return prev;
                    const next = { ...prev };
                    delete next[partnerId];
                    return next;
                });
            }
        };

        onlineService.onDirectMessage(handleDirectMessage);
        onlineService.onMessageUpdated(handleMessageUpdated);
        onlineService.onMessageDeleted(handleMessageDeleted);
        onlineService.onReactionUpdate(handleReactionUpdate);
        onlineService.onMessagesRead(handleMessagesRead);
        
        return () => {
            onlineService.offDirectMessage(handleDirectMessage);
            onlineService.offMessageUpdated(handleMessageUpdated);
            onlineService.offMessageDeleted(handleMessageDeleted);
            onlineService.offReactionUpdate(handleReactionUpdate);
            onlineService.offMessagesRead(handleMessagesRead);
        }
    }, [userId, addMessage]);

    const sendMessage = useCallback((toUserId: string, text: string, replyTo?: any) => {
        onlineService.sendDirectMessage(toUserId, text, replyTo);
    }, []);

    const markConversationAsRead = useCallback((partnerId: string) => {
        setUnreadCounts(prev => {
            if (!prev[partnerId]) return prev;
            const next = { ...prev };
            delete next[partnerId];
            return next;
        });
        onlineService.markConversationAsRead(partnerId);
    }, []);

    const clearAllUnreadCounts = useCallback(() => {
        setUnreadCounts({});
    }, []);

    // Fetch initial history or refresh
    const loadChat = useCallback(async (partnerId: string) => {
        if (loadedPartners.has(partnerId)) return;

        setIsLoadingHistory(prev => ({ ...prev, [partnerId]: true }));
        try {
            const { messages, nextCursor } = await onlineService.getChatHistory(partnerId);
            
            // Manual fix: Ensure sent messages have recipientId set to partnerId
            const fixedMessages = messages.map(m => {
                if (m.senderId === userId && !m.recipientId) {
                    return { ...m, recipientId: partnerId };
                }
                return m;
            });

            // Optimization: Directly update state for this partnerId
            // This ensures messages are attributed to the correct conversation window
            // regardless of any ambiguity in the message object itself.
            setMessagesByPartner(prev => {
                const existing = prev[partnerId] || [];
                const merged = [...fixedMessages];
                
                fixedMessages.forEach(m => knownMessageIds.current.add(m.id));

                // Merge existing messages (e.g. from real-time events that happened while loading)
                existing.forEach(existMsg => {
                    if (!merged.some(m => m.id === existMsg.id)) {
                        merged.push(existMsg);
                    }
                });
                
                return {
                    ...prev,
                    [partnerId]: merged.sort((a, b) => a.timestamp - b.timestamp)
                };
            });
            
            setCursors(prev => ({ ...prev, [partnerId]: nextCursor }));
            setLoadedPartners(prev => new Set(prev).add(partnerId));
        } catch (e) {
            console.error("Failed to load chat history", e);
        } finally {
            setIsLoadingHistory(prev => ({ ...prev, [partnerId]: false }));
        }
    }, [loadedPartners, userId]);

    // Pagination
    const loadMore = useCallback(async (partnerId: string) => {
        const cursor = cursors[partnerId];
        if (!cursor) return;

        setIsLoadingHistory(prev => ({ ...prev, [partnerId]: true }));
        try {
            const { messages, nextCursor } = await onlineService.getChatHistory(partnerId, cursor);
            
            // Manual fix for older messages too
            const fixedMessages = messages.map(m => {
                if (m.senderId === userId && !m.recipientId) {
                    return { ...m, recipientId: partnerId };
                }
                return m;
            });

            setMessagesByPartner(prev => {
                const existing = prev[partnerId] || [];
                fixedMessages.forEach(m => knownMessageIds.current.add(m.id));
                
                const uniqueNew = fixedMessages.filter(m => !existing.some(e => e.id === m.id));
                const merged = [...uniqueNew, ...existing];
                
                return {
                    ...prev,
                    [partnerId]: merged.sort((a, b) => a.timestamp - b.timestamp)
                };
            });
            
            setCursors(prev => ({ ...prev, [partnerId]: nextCursor }));
        } catch (e) {
            console.error("Failed to load more messages", e);
        } finally {
            setIsLoadingHistory(prev => ({ ...prev, [partnerId]: false }));
        }
    }, [cursors, userId]);

    const value = useMemo(() => ({
        messagesByPartner,
        unreadCounts,
        cursors,
        isLoadingHistory,
        addMessage,
        sendMessage,
        markConversationAsRead,
        loadChat,
        loadMore,
        clearAllUnreadCounts
    }), [messagesByPartner, unreadCounts, cursors, isLoadingHistory, addMessage, sendMessage, markConversationAsRead, loadChat, loadMore, clearAllUnreadCounts]);

    return (
        <DirectMessageContext.Provider value={value}>
            {children}
        </DirectMessageContext.Provider>
    );
};

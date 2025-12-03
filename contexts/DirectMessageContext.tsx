

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
    
    // Track message IDs to prevent duplicates and double-counting unreads
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
                
                chats.forEach((chat: any) => {
                    if (chat.unreadCount > 0) {
                        newUnread[chat.partner.id] = chat.unreadCount;
                    }
                });
                
                setUnreadCounts(prev => ({ ...prev, ...newUnread }));
            });
        }
    }, [userId]);

    // Core function to add a message safely
    const addMessage = useCallback((message: ChatMessage) => {
        if (message.type === 'system' && message.channel !== 'dm') return;
        if (knownMessageIds.current.has(message.id)) return;

        knownMessageIds.current.add(message.id);

        const partnerId = message.senderId === userId ? message.recipientId : message.senderId;
        if (!partnerId) return;

        setMessagesByPartner(prev => {
            const history = prev[partnerId] || [];
            // Double check inside setter just in case, though ref should handle it
            if (history.some(m => m.id === message.id)) return prev;
            
            return {
                ...prev,
                [partnerId]: [...history, message].sort((a, b) => a.timestamp - b.timestamp)
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
            let partnerIdFound: string | null = null;
            for (const pId in messagesByPartner) {
                if (messagesByPartner[pId].some(m => m.id === messageId)) {
                    partnerIdFound = pId;
                    break;
                }
            }

            if (partnerIdFound) {
                 setMessagesByPartner(prev => {
                    const history = prev[partnerIdFound!] || [];
                    return { ...prev, [partnerIdFound!]: history.map(m => m.id === messageId ? { ...m, text: 'This message was deleted.', deleted: true, reactions: {}, replyTo: undefined } : m)};
                });
            }
        };
        
        const handleReactionUpdate = ({ channel, messageId, reactions }: { channel: string, messageId: string, reactions: ChatMessage['reactions'] }) => {
            if (channel !== 'dm') return;
            let partnerIdFound: string | null = null;
            for (const pId in messagesByPartner) {
                if (messagesByPartner[pId].some(m => m.id === messageId)) {
                    partnerIdFound = pId;
                    break;
                }
            }
             if (partnerIdFound) {
                 setMessagesByPartner(prev => {
                    const history = prev[partnerIdFound!] || [];
                    return { ...prev, [partnerIdFound!]: history.map(m => m.id === messageId ? { ...m, reactions } : m)};
                });
            }
        };

        // Listen for Read Receipts
        const handleMessagesRead = ({ conversationPartnerId, readByUserId, readAt, partnerId }: { conversationPartnerId: string, readByUserId: string, readAt: number, partnerId?: string }) => {
            // Case 1: Partner read MY message. Update UI to show ticks.
            if (readByUserId !== userId) {
                const partner = readByUserId; // They read it
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
            } 
            // Case 2: I read the message on another device. Clear unread count here.
            else if (readByUserId === userId && partnerId) {
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
            onlineService.offMessageUpdated();
            onlineService.offMessageDeleted();
            onlineService.offReactionUpdate();
            onlineService.offMessagesRead();
        }
    }, [userId, messagesByPartner, addMessage]);

    
    const sendMessage = useCallback((toUserId: string, text: string, replyTo?: any) => {
        onlineService.sendDirectMessage(toUserId, text, replyTo);
    }, []);

    const markConversationAsRead = useCallback((partnerId: string) => {
        // Update local state immediately
        setUnreadCounts(prev => {
            if (!prev[partnerId]) return prev;
            const next = { ...prev };
            delete next[partnerId];
            return next;
        });
        
        // Notify Server (which will then sync other devices)
        onlineService.markConversationAsRead(partnerId);
    }, []);

    // Fetch initial history or refresh
    const loadChat = useCallback(async (partnerId: string) => {
        if (loadedPartners.has(partnerId)) return;

        setIsLoadingHistory(prev => ({ ...prev, [partnerId]: true }));
        try {
            const { messages, nextCursor } = await onlineService.getChatHistory(partnerId);
            
            setMessagesByPartner(prev => {
                const existing = prev[partnerId] || [];
                const merged = [...messages];
                
                // Add fetched messages to known list
                messages.forEach(m => knownMessageIds.current.add(m.id));

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
    }, [loadedPartners]);

    // Pagination
    const loadMore = useCallback(async (partnerId: string) => {
        const cursor = cursors[partnerId];
        if (!cursor) return; // No more messages

        setIsLoadingHistory(prev => ({ ...prev, [partnerId]: true }));
        try {
            const { messages, nextCursor } = await onlineService.getChatHistory(partnerId, cursor);
            
            setMessagesByPartner(prev => {
                const existing = prev[partnerId] || [];
                
                // Add fetched messages to known list
                messages.forEach(m => knownMessageIds.current.add(m.id));

                const merged = [...messages, ...existing];
                
                // Dedup just in case
                const unique = Array.from(new Map(merged.map(m => [m.id, m])).values());
                
                return {
                    ...prev,
                    [partnerId]: unique.sort((a, b) => a.timestamp - b.timestamp)
                };
            });
            
            setCursors(prev => ({ ...prev, [partnerId]: nextCursor }));
        } catch (e) {
            console.error("Failed to load more messages", e);
        } finally {
            setIsLoadingHistory(prev => ({ ...prev, [partnerId]: false }));
        }
    }, [cursors]);

    const value = useMemo(() => ({
        messagesByPartner,
        unreadCounts,
        cursors,
        isLoadingHistory,
        addMessage,
        sendMessage,
        markConversationAsRead,
        loadChat,
        loadMore
    }), [messagesByPartner, unreadCounts, cursors, isLoadingHistory, addMessage, sendMessage, markConversationAsRead, loadChat, loadMore]);

    return (
        <DirectMessageContext.Provider value={value}>
            {children}
        </DirectMessageContext.Provider>
    );
};

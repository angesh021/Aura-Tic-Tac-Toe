import React, { createContext, useState, useCallback, useContext, useMemo, ReactNode, useEffect, useRef } from 'react';
import { Notification } from '../types';
import { getNotifications, clearAllNotifications, markAsRead as apiMarkRead } from '../services/notifications';
import { useDirectMessages } from './DirectMessageContext';
import { AuthContext } from './AuthContext';

interface NotificationContextType {
    notifications: Notification[];
    activeBanners: Notification[];
    unreadCount: number;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
    updateNotification: (id: string, updates: Partial<Notification>) => void;
    removeNotification: (id: string) => void;
    dismissBanner: (id: string) => void;
}

export const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const auth = useContext(AuthContext);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [activeBanners, setActiveBanners] = useState<Notification[]>([]);
    const { addMessage, clearAllUnreadCounts } = useDirectMessages();
    
    // Track if we've fetched notifications for the current user session
    const lastFetchedUserId = useRef<string | null>(null);

    // Fetch initial notifications (offline catch-up)
    useEffect(() => {
        const userId = auth?.currentUser?.id;

        if (!userId) {
            setNotifications([]);
            setActiveBanners([]);
            lastFetchedUserId.current = null;
            return;
        }

        // Prevent re-fetching if we already fetched for this user ID
        if (lastFetchedUserId.current === userId) {
            return;
        }

        const fetchOfflineNotifications = async () => {
            lastFetchedUserId.current = userId;
            const data = await getNotifications();
            if (data.length > 0) {
                // Initial State Hydration
                // Sort oldest to newest to process DMs correctly
                const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

                sortedData.forEach(n => {
                    // Sync DMs if applicable
                    if (n.type === 'chat' && n.data?.messageData) {
                        addMessage(n.data.messageData);
                    }
                });

                // Just set the history. Do NOT trigger banners on initial load.
                // Banners should only appear for live events.
                setNotifications(data.sort((a, b) => b.timestamp - a.timestamp));
            }
        };
        fetchOfflineNotifications();
    }, [auth?.currentUser?.id, addMessage]);

    const addNotification = useCallback((notificationPayload: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        // Prepare new notification object
        const newNotification: Notification = {
            ...notificationPayload,
            id: Math.random().toString(36).substring(2, 9),
            timestamp: Date.now(),
            read: false,
        };
        
        // Ensure data exists
        if (!newNotification.data) newNotification.data = {};
        if (!newNotification.data.count) newNotification.data.count = 1;

        // 1. Update Global Notification List (History) - Always append new
        setNotifications(prev => {
            // Deduplication Check
            const isDuplicate = prev.some(n => {
                if (notificationPayload.type === 'match_result' && n.data?.matchId && n.data?.matchId === notificationPayload.data?.matchId) return true;
                if (notificationPayload.type === 'friend_request' && n.data?.requestId && n.data?.requestId === notificationPayload.data?.requestId) return true;
                if (notificationPayload.type === 'gift' && n.data?.giftId && n.data?.giftId === notificationPayload.data?.giftId) return true;
                if (notificationPayload.type === 'chat' && n.data?.messageData?.id && n.data?.messageData?.id === notificationPayload.data?.messageData?.id) return true;
                return false;
            });

            if (isDuplicate) return prev;
            return [newNotification, ...prev];
        });

        // 2. Update Active Banners (Transient Toast) - Implement Stacking
        setActiveBanners(prevBanners => {
            // Logic: If it's a chat message from an existing sender in the active banners,
            // update that banner instead of adding a new one.
            if (newNotification.type === 'chat' && newNotification.data?.senderId) {
                const existingIndex = prevBanners.findIndex(b => 
                    b.type === 'chat' && b.data?.senderId === newNotification.data?.senderId
                );

                if (existingIndex !== -1) {
                    const existingBanner = prevBanners[existingIndex];
                    const updatedBanner = {
                        ...existingBanner,
                        message: newNotification.message, // Update to latest message
                        timestamp: Date.now(), // Reset timestamp for animation/timer
                        data: {
                            ...existingBanner.data,
                            count: (existingBanner.data?.count || 1) + 1,
                            messageData: newNotification.data?.messageData // Update reference
                        }
                    };

                    // Move to top of stack
                    const filtered = prevBanners.filter((_, i) => i !== existingIndex);
                    return [updatedBanner, ...filtered];
                }
            }

            // Default: Add to top, slice to max 3
            const nextState = [newNotification, ...prevBanners];
            if (nextState.length > 3) return nextState.slice(0, 3);
            return nextState;
        });

    }, []);

    const markAsRead = useCallback(async (id: string) => {
        // Optimistic UI update
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
        // Remove from active banner immediately
        setActiveBanners(prev => prev.filter(n => n.id !== id));
        
        // API call to persist read state
        try {
            await apiMarkRead([id]);
        } catch (e) { console.error("Failed to mark read on server", e); }
    }, []);

    const markAllAsRead = useCallback(async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setActiveBanners([]);
        clearAllUnreadCounts();
        
        try {
            const { markAllAsRead: apiMarkAll } = await import('../services/notifications');
            await apiMarkAll();
        } catch(e) { console.error("Failed to mark all read on server", e); }
    }, [clearAllUnreadCounts]);

    const clearNotifications = useCallback(async () => {
        setNotifications([]);
        setActiveBanners([]);
        await clearAllNotifications();
    }, []);
    
    const updateNotification = useCallback((id: string, updates: Partial<Notification>) => {
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, ...updates } : n)));
        setActiveBanners(prev => prev.filter(n => n.id !== id));
    }, []);
    
    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        setActiveBanners(prev => prev.filter(n => n.id !== id));
    }, []);

    const dismissBanner = useCallback((id: string) => {
        setActiveBanners(prev => prev.filter(n => n.id !== id));
    }, []);
    
    const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

    const value = useMemo(() => ({
        notifications,
        activeBanners,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        updateNotification,
        removeNotification,
        dismissBanner
    }), [notifications, activeBanners, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotifications, updateNotification, removeNotification, dismissBanner]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

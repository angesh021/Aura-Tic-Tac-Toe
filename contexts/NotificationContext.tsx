
import React, { createContext, useState, useCallback, useContext, useMemo, ReactNode, useEffect } from 'react';
import { Notification } from '../types';
import { getNotifications, clearAllNotifications } from '../services/notifications';
import { useDirectMessages } from './DirectMessageContext';
import { AuthContext } from './AuthContext';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
    updateNotification: (id: string, updates: Partial<Notification>) => void;
    removeNotification: (id: string) => void;
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
    const { addMessage } = useDirectMessages();

    // Fetch initial notifications (offline catch-up)
    useEffect(() => {
        if (!auth?.currentUser) {
            setNotifications([]);
            return;
        }

        const fetchOfflineNotifications = async () => {
            const data = await getNotifications();
            if (data.length > 0) {
                // Prepend to current state
                setNotifications(prev => {
                    const existingIds = new Set(prev.map(n => n.id));
                    const newNotifs = data.filter(n => !existingIds.has(n.id));
                    return [...newNotifs, ...prev];
                });

                // Also inject chat messages into DM context if present
                data.forEach(n => {
                    if (n.type === 'chat' && n.data?.messageData) {
                        addMessage(n.data.messageData);
                    }
                });
            }
        };
        fetchOfflineNotifications();
    }, [auth?.currentUser, addMessage]);

    const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        const newNotification: Notification = {
            ...notification,
            id: Math.random().toString(36).substring(2, 9),
            timestamp: Date.now(),
            read: false,
        };
        // Add to the beginning of the list
        setNotifications(prev => [newNotification, ...prev]);
    }, []);

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    const clearNotifications = useCallback(async () => {
        setNotifications([]);
        await clearAllNotifications(); // Also clear on server
    }, []);
    
    const updateNotification = useCallback((id: string, updates: Partial<Notification>) => {
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, ...updates } : n)));
    }, []);
    
    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);
    
    const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

    const value = useMemo(() => ({
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        updateNotification,
        removeNotification,
    }), [notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotifications, updateNotification, removeNotification]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

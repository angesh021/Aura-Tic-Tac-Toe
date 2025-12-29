
import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationBanner from './NotificationBanner';

const NotificationBannerStack: React.FC = () => {
    const { activeBanners, dismissBanner, markAsRead } = useNotifications();

    return (
        <div className="fixed top-24 right-4 z-[90] flex flex-col gap-2 pointer-events-none max-w-sm w-[calc(100%-2rem)] md:w-full">
            <AnimatePresence mode="popLayout">
                {activeBanners.map((notification) => (
                    <NotificationBanner
                        key={notification.id}
                        notification={notification}
                        onDismiss={() => dismissBanner(notification.id)}
                        onView={() => markAsRead(notification.id)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBannerStack;

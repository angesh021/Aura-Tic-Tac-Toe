
import { prisma } from '../db';
import { socketService } from '../socketService';
import { Notification } from '../types';

export const notificationService = {
    async send(userId: string, type: Notification['type'], title: string, message: string, data: any = {}) {
        try {
            // 1. Persist to Database
            const notification = await prisma.notification.create({
                data: {
                    userId,
                    type,
                    title,
                    message,
                    data: data || {},
                    read: false,
                    timestamp: new Date()
                }
            });

            // 2. Emit Real-time
            // We map the DB object to the payload expected by the client
            const payload: Notification = {
                id: notification.id,
                userId: notification.userId,
                type: notification.type as Notification['type'],
                title: notification.title,
                message: notification.message,
                timestamp: notification.timestamp.getTime(),
                read: notification.read,
                data: notification.data ? JSON.parse(JSON.stringify(notification.data)) : {}
            };

            socketService.emitToUser(userId, 'newNotification', payload);
            
            return notification;
        } catch (error) {
            console.error("Failed to send notification:", error);
        }
    }
};

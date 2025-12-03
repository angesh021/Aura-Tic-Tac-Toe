
import { prisma } from './db';

export const startCleanupJob = () => {
    // Run immediately on startup
    cleanupNotifications();
    
    // Schedule to run every 24 hours (24 * 60 * 60 * 1000 ms)
    setInterval(cleanupNotifications, 24 * 60 * 60 * 1000);
};

const cleanupNotifications = async () => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        // Delete notifications older than 30 days
        const { count } = await prisma.notification.deleteMany({
            where: {
                timestamp: {
                    lt: thirtyDaysAgo
                }
            }
        });
        
        if (count > 0) {
            console.log(`🧹 Cleanup: Removed ${count} old notifications.`);
        }
    } catch (e) {
        console.error("⚠️ Cleanup job encountered an error:", e);
    }
};

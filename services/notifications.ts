import { Notification } from '../types';
import { getToken } from './auth';
import { API_URL } from '../utils/config';

const getHeaders = () => {
    const token = getToken();
    if (!token) return null;
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
};

export const getNotifications = async (): Promise<Notification[]> => {
    try {
        const headers = getHeaders();
        if (!headers) return [];

        const res = await fetch(`${API_URL}/notifications`, { headers });
        if (!res.ok) throw new Error('Failed to fetch notifications');
        return await res.json();
    } catch (e) {
        console.error("Error fetching notifications:", e);
        return [];
    }
};

export const markAsRead = async (ids: string[]): Promise<void> => {
    try {
        const headers = getHeaders();
        if (!headers) return;

        await fetch(`${API_URL}/notifications/read`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ids }),
        });
    } catch (e) {
        console.error("Error marking notification as read:", e);
    }
};

export const markAllAsRead = async (): Promise<void> => {
    try {
        const headers = getHeaders();
        if (!headers) return;

        await fetch(`${API_URL}/notifications/read-all`, {
            method: 'POST',
            headers,
        });
    } catch (e) {
        console.error("Error marking all as read:", e);
    }
};

export const clearAllNotifications = async (): Promise<void> => {
    try {
        const headers = getHeaders();
        if (!headers) return;

        await fetch(`${API_URL}/notifications`, {
            method: 'DELETE',
            headers,
        });
    } catch (e) {
        console.error("Error clearing notifications:", e);
    }
};
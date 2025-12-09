
import { Friendship, User, Theme, PendingGift } from '../types';
import { getToken } from './auth';
import { API_URL } from '../utils/config';

class FriendsService {
    private getHeaders() {
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` };
    }

    async getFriends(): Promise<{ friends: Friendship[], pending: Friendship[] }> {
        try {
            const res = await fetch(`${API_URL}/friends`, { headers: this.getHeaders() });
            if (!res.ok) throw new Error('Failed to fetch friends');
            return await res.json();
        } catch (e) {
            console.error(e);
            return { friends: [], pending: [] };
        }
    }

    async getRecentPlayers(): Promise<User[]> {
        try {
            const res = await fetch(`${API_URL}/friends/recent`, { headers: this.getHeaders() });
            if (!res.ok) return [];
            return await res.json();
        } catch (e) {
            return [];
        }
    }

    async searchUser(friendCode: string): Promise<Partial<User> | null> {
        try {
            const res = await fetch(`${API_URL}/users/search?code=${friendCode}`, { headers: this.getHeaders() });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            return null;
        }
    }

    async sendRequest(friendCode: string): Promise<void> {
        try {
            const res = await fetch(`${API_URL}/friends/request`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ friendCode })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to send request');
            }
        } catch (error: any) {
            if (error instanceof TypeError) throw new Error('📡 Connection lost. Check internet.');
            throw error; // Re-throw server error message
        }
    }

    async respondToRequest(requestId: string, action: 'accept' | 'reject'): Promise<void> {
        try {
            const res = await fetch(`${API_URL}/friends/respond`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ requestId, action })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to respond');
            }
        } catch (error: any) {
            if (error instanceof TypeError) throw new Error('📡 Connection lost.');
            throw error;
        }
    }

    async removeFriend(friendId: string): Promise<void> {
        try {
            const res = await fetch(`${API_URL}/friends/${friendId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            if (!res.ok) {
                throw new Error('Failed to remove friend');
            }
        } catch (error: any) {
            if (error instanceof TypeError) throw new Error('📡 Connection lost.');
            throw new Error('🤖 Failed to remove friend.');
        }
    }

    async giftFriendByUser(toUserId: string, amount: number): Promise<number> {
        try {
            const res = await fetch(`${API_URL}/friends/gift-by-user`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ toUserId, amount })
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.message || 'Failed to send gift');
            }
            
            return data.newBalance;
        } catch (error: any) {
            if (error instanceof TypeError) throw new Error('📡 Connection lost.');
            throw error;
        }
    }

    async giftFriend(friendshipId: string, amount: number): Promise<void> {
        try {
            const res = await fetch(`${API_URL}/friends/gift`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ friendshipId, amount })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to send gift');
            }
        } catch (error: any) {
            if (error instanceof TypeError) throw new Error('📡 Connection lost.');
            throw error;
        }
    }

    async acceptGift(giftId: string): Promise<number | null> {
        try {
            const res = await fetch(`${API_URL}/friends/gift/accept`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ giftId })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to accept gift');
            }
            const data = await res.json();
            return data.coins;
        } catch (error: any) {
            if (error instanceof TypeError) throw new Error('📡 Connection lost.');
            throw error;
        }
    }
}

export const friendsService = new FriendsService();

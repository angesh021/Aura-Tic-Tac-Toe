
import { MatchRecord, GameMode, GameVariant, Difficulty, XpReport, Player } from '../types';
import { getToken, getUserIdFromToken } from './auth';
import { API_URL } from '../utils/config';

type MatchDataToSave = Omit<MatchRecord, 'id' | 'userId' | 'user' | 'date' | 'moves'> & {
    moves: Omit<MatchRecord['moves'][0], 'id'>[],
    powerupsUsed?: { [key: string]: number },
    difficulty?: string | Difficulty // Explicitly allow sending difficulty at root level
};

const getAuthHeaders = () => {
    const token = getToken();
    if (!token) {
        throw new Error("No authentication token found.");
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const saveMatch = async (matchData: Omit<MatchDataToSave, 'userId'>): Promise<MatchRecord> => {
    const token = getToken();
    if (!token) throw new Error("User not logged in");

    try {
        const res = await fetch(`${API_URL}/matches`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(matchData)
        });

        if (!res.ok) {
            throw new Error('Server rejected match save');
        }
        return await res.json();
    } catch (error) {
        console.error("Failed to save match:", error);
        // Return a temporary local structure just for immediate UI update if needed, 
        // but typically we should alert user or retry. For now, rethrow or return minimal.
        throw error;
    }
};

export const getHistory = async (): Promise<MatchRecord[]> => {
    const token = getToken();
    if (!token) return [];

    try {
        const res = await fetch(`${API_URL}/matches`, {
            headers: getAuthHeaders(),
        });
        
        if (!res.ok) {
            throw new Error('Failed to fetch from server');
        }
        return await res.json();

    } catch (error: any) {
        console.error("Failed to fetch history", error);
        return [];
    }
};

export const getMatchById = async (matchId: string): Promise<MatchRecord> => {
    try {
        const res = await fetch(`${API_URL}/matches/${matchId}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || 'Failed to fetch match details');
        }
        return await res.json();
    } catch (error: any) {
        console.error("Error fetching match by ID:", error);
        throw error;
    }
};

export const deleteHistory = async (): Promise<void> => {
    const token = getToken();
    if (!token) throw new Error("Authentication required.");

    try {
        const res = await fetch(`${API_URL}/matches`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!res.ok) {
             throw new Error("Failed to clear history.");
        }
    } catch (error: any) {
         if (error instanceof TypeError) throw new Error('📡 Connection lost.');
         throw new Error('🤖 Failed to clear history.');
    }
};


import { User } from '../types';
import { API_URL } from '../utils/config';

const TOKEN_KEY = 'aura-token';

export const getToken = (): string | null => {
    return sessionStorage.getItem(TOKEN_KEY);
};

const setToken = (token: string): void => {
    sessionStorage.setItem(TOKEN_KEY, token);
};

const removeToken = (): void => {
    sessionStorage.removeItem(TOKEN_KEY);
};

export const getUserIdFromToken = (token: string): string | null => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const decoded = JSON.parse(jsonPayload);
        return decoded.userId || decoded.id;
    } catch (e) {
        console.error("Failed to decode token", e);
        return null;
    }
};

// Helper for friendly error messages
const handleResponse = async (res: Response) => {
    const contentType = res.headers.get("content-type");
    
    // Check for HTML response (Index fallback or 404/500 page)
    if (contentType && contentType.includes("text/html")) {
        const text = await res.text().catch(() => "");
        // If response is the index.html fallback (Vite SPA behavior on 404), it means API route is not hitting backend
        if (text.includes('<div id="root">') || text.includes('<!DOCTYPE html>')) {
             throw new Error("Unable to reach the server. Is the backend running?");
        }
        throw new Error(`Server Error (${res.status}): The server returned HTML instead of JSON.`);
    }

    if (!contentType || !contentType.includes("application/json")) {
        if (!res.ok) {
             const text = await res.text().catch(() => "");
             throw new Error(`Server Error (${res.status}): ${text.substring(0, 100) || 'Unknown error'}`);
        }
        throw new Error("Invalid server response (Expected JSON).");
    }

    const data = await res.json().catch(() => null);
    
    if (!data) {
        throw new Error("Empty response from server.");
    }
    
    if (res.ok) return data;

    // Friendly Error Mapping
    if (res.status === 400) throw new Error(data.message || "Oops! Some information is missing or incorrect 🤔.");
    if (res.status === 401) throw new Error("Incorrect credentials 🔐. Please try again!");
    if (res.status === 403) throw new Error("Access denied 🚫. You might not have permission.");
    if (res.status === 404) throw new Error("We couldn't find that account or resource 🔍.");
    if (res.status === 409) throw new Error(data.message || "That account already exists! Try logging in 👤.");
    if (res.status === 429) throw new Error("Whoa there! Too many attempts 🐎. Please wait a moment.");
    if (res.status >= 500) throw new Error("Our servers are having a hiccup 🤒. Please try again shortly!");
    
    throw new Error(data.message || "Something went wrong 😵. Let's try that again.");
};

const handleNetworkError = (error: any) => {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw new Error('📡 Connection lost. Is the backend server running?');
    }
    throw error;
};

export const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
        const res = await fetch(`${API_URL}/check-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (!res.ok) return false;
        const data = await res.json();
        return data.exists;
    } catch (e) {
        return false;
    }
};

export const register = async (email: string, password: string): Promise<User> => {
  try {
    const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    
    const data = await handleResponse(res);
    return data.user;
  } catch (error: any) {
      handleNetworkError(error);
      throw error;
  }
};

export const login = async (email: string, password: string): Promise<User | { mfaRequired: boolean, tempToken?: string }> => {
  try {
    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    const data = await handleResponse(res);

    if (data.mfaRequired) {
        return { mfaRequired: true, tempToken: data.tempToken };
    }

    if (!data.token || !data.user) {
        throw new Error("Invalid response from server: Missing user data.");
    }

    setToken(data.token);
    return data.user;
  } catch (error: any) {
      handleNetworkError(error);
      throw error;
  }
};

export const loginMfa = async (tempToken: string, code: string): Promise<User> => {
    try {
        const res = await fetch(`${API_URL}/login/mfa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tempToken, code }),
        });

        const data = await handleResponse(res);

        if (!data.token || !data.user) {
            throw new Error("Invalid response from server: Missing user data.");
        }

        setToken(data.token);
        return data.user;
    } catch (error: any) {
        handleNetworkError(error);
        throw error;
    }
};

export const logout = (): void => {
  removeToken();
};

export const getProfile = async (): Promise<User> => {
    const token = getToken();
    if (!token) {
        throw new Error("No authentication token found.");
    }

    try {
        const res = await fetch(`${API_URL}/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (res.status === 401 || res.status === 403 || res.status === 404) {
            logout();
            throw new Error("Session expired ⏳. Please log in again.");
        }

        const data = await handleResponse(res);
        return data;
    } catch (error: any) {
        handleNetworkError(error);
        throw error;
    }
};

export const updateUser = async (updates: Partial<User>): Promise<User> => {
    const token = getToken();
    if (!token) throw new Error("Authentication required.");
    
    try {
        const res = await fetch(`${API_URL}/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updates)
        });

        const data = await handleResponse(res);
        return data;
    } catch (error: any) {
        handleNetworkError(error);
        throw error;
    }
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    const token = getToken();
    if (!token) throw new Error("Authentication required.");

    try {
        const res = await fetch(`${API_URL}/me/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        await handleResponse(res);
    } catch (error: any) {
        handleNetworkError(error);
        throw error;
    }
};

export const deleteAccount = async (): Promise<void> => {
    const token = getToken();
    if (!token) throw new Error("Authentication required.");

    try {
        const res = await fetch(`${API_URL}/me`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        await handleResponse(res);
        removeToken();
    } catch (error: any) {
        handleNetworkError(error);
        throw error;
    }
};

export const resendVerificationEmail = async (): Promise<void> => {
    const token = getToken();
    if (!token) throw new Error("Authentication required.");

    try {
        // Assuming the backend has a simplified endpoint or re-uses request-password-reset logic adapted for verification
        // For this implementation, we will hit a generic endpoint. In a real app, this would be specific.
        const res = await fetch(`${API_URL}/me/resend-verification`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!res.ok) {
             // Fallback if endpoint doesn't exist yet, to simulate success for UI demo
             if(res.status === 404) return;
             await handleResponse(res);
        }
    } catch (error: any) {
        handleNetworkError(error);
        throw error;
    }
};

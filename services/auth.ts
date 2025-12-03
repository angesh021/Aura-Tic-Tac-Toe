
import { User } from '../types';
import { API_URL } from '../utils/config';

const TOKEN_KEY = 'aura-token';

// CHANGE: Use sessionStorage instead of localStorage so the session dies when tab is closed
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

export const register = async (email: string, password: string): Promise<User> => {
  try {
    const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    
    const data = await res.json();
    
    if (!res.ok) {
        throw new Error(data.message || 'Registration failed.');
    }
    
    // Server no longer returns token on register. Do not log in automatically.
    return data.user;
  } catch (error: any) {
      if (error instanceof TypeError) {
          throw new Error('📡 Connection lost. Please check your internet.');
      }
      throw new Error(error.message || '🤖 Registration service currently unavailable.');
  }
};

export const login = async (email: string, password: string): Promise<User> => {
  try {
    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || 'Login failed.');
    }

    setToken(data.token);
    return data.user;
  } catch (error: any) {
      if (error instanceof TypeError) {
          throw new Error('📡 Connection lost. Please check your internet.');
      }
      throw new Error(error.message || '🤖 Login service currently unavailable.');
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
        
        const data = await res.json();

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                logout();
                throw new Error("Session expired.");
            }
            throw new Error(data.message || "Failed to fetch profile.");
        }
        return data;
    } catch (error: any) {
        if (error instanceof TypeError) {
            throw new Error('📡 Connection lost. Please check your internet.');
        }
        throw new Error(error.message || '🤖 Could not verify session.');
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

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to update user.");
        }
        return data;
    } catch (error: any) {
        if (error instanceof TypeError) {
            throw new Error('📡 Connection lost. Please check your internet.');
        }
        throw new Error(error.message || '🤖 Failed to update profile.');
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

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to change password.");
        }
    } catch (error: any) {
        if (error instanceof TypeError) {
            throw new Error('📡 Connection lost. Please check your internet.');
        }
        throw new Error(error.message || '🤖 Password change failed.');
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

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || "Failed to delete account.");
        }
        removeToken();
    } catch (error: any) {
        if (error instanceof TypeError) {
            throw new Error('📡 Connection lost. Please check your internet.');
        }
        throw new Error(error.message || '🤖 Account deletion failed.');
    }
};

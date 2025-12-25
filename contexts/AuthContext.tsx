
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, AuthContextType } from '../types';
import * as authService from '../services/auth';
import { Theme } from '../types';

interface ExtendedAuthContextType extends AuthContextType {
    changePassword?: (current: string, newPass: string) => Promise<void>;
    reloadUser?: () => Promise<void>;
    loginMfa?: (tempToken: string, code: string) => Promise<void>;
}

export const AuthContext = createContext<ExtendedAuthContextType | null>(null);

// 15 minutes of inactivity to logout
const INACTIVITY_LIMIT = 15 * 60 * 1000; 

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const lastActivityRef = useRef(Date.now());

  const logout = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
  }, []);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Inactivity Monitor
  useEffect(() => {
    if (!currentUser) return;

    const checkInactivity = () => {
        if (Date.now() - lastActivityRef.current > INACTIVITY_LIMIT) {
            console.log("User inactive for too long. Logging out.");
            logout();
        }
    };

    const interval = setInterval(checkInactivity, 60000); 
    
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('touchstart', resetTimer);

    return () => {
        clearInterval(interval);
        window.removeEventListener('mousemove', resetTimer);
        window.removeEventListener('keypress', resetTimer);
        window.removeEventListener('click', resetTimer);
        window.removeEventListener('touchstart', resetTimer);
    };
  }, [currentUser, logout, resetTimer]);


  // Initial Session Check
  useEffect(() => {
    const verifyUser = async () => {
      const token = authService.getToken();
      if (token) {
        try {
          const user = await authService.getProfile();
          setCurrentUser(user);
        } catch (error) {
          console.log("Session verification failed, logging out.");
          authService.logout(); 
          setCurrentUser(null);
        }
      } else {
          setCurrentUser(null);
      }
      setIsLoading(false);
    };
    verifyUser();
  }, []);

  const reloadUser = useCallback(async () => {
      try {
          const user = await authService.getProfile();
          setCurrentUser(user);
      } catch (e) {
          console.error("Failed to reload user profile", e);
      }
  }, [currentUser]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.login(email, password);
    
    if (!result) {
        throw new Error("Login failed: No response from server");
    }

    // If MFA is required, the service returns an object with mfaRequired: true
    // We don't set current user yet
    if ('mfaRequired' in result && result.mfaRequired) {
        return result; 
    }
    
    // Standard Login - Ensure result is a valid User object
    // We assume if it's not MFA, it's the User object
    const user = result as User;
    if (user && user.id) {
        setCurrentUser(user);
        lastActivityRef.current = Date.now();
        return user;
    } else {
        throw new Error("Login failed: Invalid user data");
    }
  }, []);

  const loginMfa = useCallback(async (tempToken: string, code: string) => {
      const user = await authService.loginMfa(tempToken, code);
      if (user && user.id) {
          setCurrentUser(user);
          lastActivityRef.current = Date.now();
      } else {
          throw new Error("MFA Login failed: Invalid user data");
      }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    await authService.register(email, password);
  }, []);
  
  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!currentUser) return;
    try {
      const updatedUser = await authService.updateUser(updates);
      setCurrentUser(updatedUser);
    } catch(error) {
        console.error("Failed to update user", error);
        throw error; 
    }
  }, [currentUser]);
  
  const changePassword = useCallback(async (current: string, newPass: string) => {
      if (!currentUser) return;
      await authService.changePassword(current, newPass);
  }, [currentUser]);

  const deleteAccount = useCallback(async () => {
    if (!currentUser) return;
    try {
        await authService.deleteAccount();
        setCurrentUser(null); 
        authService.logout();
    } catch (error) {
        console.error("Failed to delete account", error);
        throw error;
    }
  }, [currentUser]);

  const contextValue: ExtendedAuthContextType = {
    currentUser,
    isLoading,
    register,
    login,
    loginMfa,
    logout,
    updateUser,
    deleteAccount,
    changePassword,
    reloadUser
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

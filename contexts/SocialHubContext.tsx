import React, { createContext, useState, useCallback, useMemo } from 'react';

interface SocialHubContextType {
    isHubOpen: boolean;
    initialTargetId: string | null;
    openHub: (targetUserId?: string) => void;
    closeHub: () => void;
}

export const SocialHubContext = createContext<SocialHubContextType | null>(null);

export const SocialHubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isHubOpen, setIsHubOpen] = useState(false);
    const [initialTargetId, setInitialTargetId] = useState<string | null>(null);

    const openHub = useCallback((targetUserId?: string) => {
        if (targetUserId) {
            setInitialTargetId(targetUserId);
        }
        setIsHubOpen(true);
    }, []);

    const closeHub = useCallback(() => {
        setIsHubOpen(false);
        setInitialTargetId(null); // Clear target on close
    }, []);

    const value = useMemo(() => ({
        isHubOpen,
        initialTargetId,
        openHub,
        closeHub
    }), [isHubOpen, initialTargetId, openHub, closeHub]);

    return (
        <SocialHubContext.Provider value={value}>
            {children}
        </SocialHubContext.Provider>
    );
};
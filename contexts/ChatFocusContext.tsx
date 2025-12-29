
import React, { createContext, useState, useMemo } from 'react';

interface ChatFocusContextType {
    focusedChatId: string | null;
    setFocusedChatId: (id: string | null) => void;
}

export const ChatFocusContext = createContext<ChatFocusContextType | null>(null);

export const ChatFocusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [focusedChatId, setFocusedChatId] = useState<string | null>(null);

    const value = useMemo(() => ({
        focusedChatId,
        setFocusedChatId,
    }), [focusedChatId]);

    return (
        <ChatFocusContext.Provider value={value}>
            {children}
        </ChatFocusContext.Provider>
    );
};

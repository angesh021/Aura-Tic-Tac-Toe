
import React, { createContext, useState, useCallback, useContext, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertIcon, InfoIcon, CheckCircleIcon, CloseIcon } from '../components/Icons';

type ToastType = 'success' | 'error' | 'info' | 'custom';

interface ToastAction {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'danger' | 'neutral';
}

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    actions?: ToastAction[];
    content?: React.ReactNode;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number, actions?: ToastAction[], content?: React.ReactNode) => string;
    removeToast: (id: string) => void;
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const MAX_VISIBLE_TOASTS = 4;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000, actions?: ToastAction[], content?: React.ReactNode): string => {
        const id = Math.random().toString(36).substr(2, 9);
        // Add new toasts to the beginning of the array for stacking
        setToasts(prev => [{ id, message, type, actions, content }, ...prev]);
        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
        return id;
    }, [removeToast]);

    const success = useCallback((msg: string, duration?: number) => showToast(msg, 'success', duration), [showToast]);
    const error = useCallback((msg: string, duration?: number) => showToast(msg, 'error', duration), [showToast]);
    const info = useCallback((msg: string, duration?: number) => showToast(msg, 'info', duration), [showToast]);

    const value = useMemo(() => ({
        showToast,
        removeToast,
        success,
        error,
        info
    }), [showToast, removeToast, success, error, info]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col items-end gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.slice(0, MAX_VISIBLE_TOASTS).map((toast, i) => (
                        <motion.div
                            key={toast.id}
                            layout
                            initial={{ opacity: 0, x: 50, scale: 0.85 }}
                            animate={{
                                opacity: i > 2 ? 0 : 1, // Fade out the 4th item
                                y: i * 16,
                                scale: 1 - i * 0.05,
                                zIndex: toasts.length - i,
                            }}
                            exit={{ opacity: 0, x: 50, scale: 0.85 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="absolute top-0 right-0"
                            style={{
                                pointerEvents: i === 0 ? 'auto' : 'none',
                            }}
                        >
                            {toast.content ? toast.content : (
                                <div
                                    className={`flex flex-col p-4 rounded-xl shadow-xl border backdrop-blur-md min-w-[300px] max-w-md
                                        ${toast.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-100' : ''}
                                        ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-100' : ''}
                                        ${toast.type === 'info' ? 'bg-blue-500/10 border-blue-500/20 text-blue-100' : ''}
                                        bg-gray-900/80
                                    `}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 shrink-0">
                                            {toast.type === 'success' && <CheckCircleIcon className="w-5 h-5 text-green-400" />}
                                            {toast.type === 'error' && <AlertIcon className="w-5 h-5 text-red-400" />}
                                            {toast.type === 'info' && <InfoIcon className="w-5 h-5 text-blue-400" />}
                                        </div>
                                        <p className="text-sm font-medium flex-1">{toast.message}</p>
                                        <button onClick={() => removeToast(toast.id)} className="opacity-50 hover:opacity-100 transition-opacity">
                                            <CloseIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    {toast.actions && toast.actions.length > 0 && (
                                        <div className="flex gap-2 mt-3 ml-8">
                                            {toast.actions.map((action, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => {
                                                        action.onClick();
                                                        removeToast(toast.id);
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors
                                                        ${action.variant === 'primary' ? 'bg-green-600 hover:bg-green-500 text-white' : 
                                                          action.variant === 'danger' ? 'bg-red-600 hover:bg-red-500 text-white' : 
                                                          'bg-white/10 hover:bg-white/20 text-gray-200'}
                                                    `}
                                                >
                                                    {action.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};


import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from './Modal';
import { CloseIcon, SendIcon, CheckCircleIcon, MessageIcon, AlertIcon } from './Icons';
import { API_URL } from '../utils/config';
import { useToast } from '../contexts/ToastContext';

interface ForgotPasswordModalProps {
    onClose: () => void;
    initialEmail?: string;
}

type Status = 'idle' | 'processing' | 'success' | 'error';

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ onClose, initialEmail = '' }) => {
    const [email, setEmail] = useState(initialEmail);
    const [status, setStatus] = useState<Status>('idle');
    const toast = useToast();

    const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateEmail(email)) {
            toast.error("Please enter a valid email address.");
            return;
        }

        setStatus('processing');

        // Create an AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second client-side timeout

        try {
            const url = `${API_URL}/request-password-reset`;
            console.log("Sending password reset request to:", url);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Artificial delay for UX perception (prevent flickering)
            await new Promise(resolve => setTimeout(resolve, 500));

            // We attempt to parse JSON, but if response isn't JSON (e.g. 502/504 HTML), we catch it
            const data = await response.json().catch(() => ({}));

            if (response.ok) {
                setStatus('success');
            } else {
                throw new Error(data.message || 'Service unavailable');
            }
        } catch (error: any) {
            console.error("Password reset error:", error);
            setStatus('error');
            
            if (error.name === 'AbortError') {
                toast.error("Request timed out. Server might be busy.");
            } else {
                // If it's a TypeError (e.g. failed to fetch due to CORS or network), error.message is usually generic
                if (error.message === 'Failed to fetch') {
                    toast.error("Network error. Check connection.");
                } else {
                    toast.error(error.message || "Failed to send reset link.");
                }
            }
            
            // Ensure we go back to idle so user can retry
            setTimeout(() => setStatus('idle'), 2500);
        } finally {
            clearTimeout(timeoutId);
        }
    };

    return (
        <Modal onClose={onClose} className="max-w-md">
            <div className="relative overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">Reset Password</h2>
                        <p className="text-sm text-gray-400">Don't worry, it happens to the best of us.</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {status === 'success' ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-8"
                        >
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                                <MessageIcon className="w-10 h-10 text-green-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Check your inbox</h3>
                            <p className="text-gray-400 text-sm mb-8 leading-relaxed px-4">
                                If an account exists for <strong className="text-white">{email}</strong>, we've sent instructions to reset your password.
                            </p>
                            <button 
                                onClick={onClose}
                                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors"
                            >
                                Back to Login
                            </button>
                        </motion.div>
                    ) : (
                        <motion.form
                            key="form"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onSubmit={handleSubmit}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email"
                                        className="w-full p-4 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 focus:bg-black/40 transition-all text-white placeholder-gray-600"
                                        disabled={status === 'processing'}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={status === 'processing' || !email}
                                className={`relative w-full py-4 rounded-xl font-bold text-white overflow-hidden transition-all
                                    ${status === 'processing' ? 'bg-cyan-900 cursor-wait' : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg hover:shadow-cyan-500/25'}
                                    ${status === 'error' ? 'bg-red-600 hover:bg-red-500' : ''}
                                `}
                            >
                                <div className="relative z-10 flex items-center justify-center gap-2">
                                    {status === 'processing' ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Sending...</span>
                                        </>
                                    ) : status === 'error' ? (
                                        <>
                                            <AlertIcon className="w-4 h-4" />
                                            <span>Failed - Retry</span>
                                        </>
                                    ) : (
                                        <>
                                            <SendIcon className="w-4 h-4" />
                                            <span>Send Reset Link</span>
                                        </>
                                    )}
                                </div>
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>
            </div>
        </Modal>
    );
};

export default ForgotPasswordModal;

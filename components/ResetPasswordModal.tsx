
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from './Modal';
import { CloseIcon, LockIcon, CheckIcon, AlertIcon, CheckCircleIcon } from './Icons';
import { useToast } from '../contexts/ToastContext';
import { API_URL } from '../utils/config';

interface ResetPasswordModalProps {
    token: string;
    onClose: () => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ token, onClose }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const toast = useToast();

    // Validation Logic
    const passwordsMatch = password && confirmPassword && password === confirmPassword;
    const requirements = useMemo(() => [
        { id: 'len', label: '6+ characters', met: password.length >= 6 },
        { id: 'num', label: 'Number', met: /[0-9]/.test(password) },
    ], [password]);
    const isFormValid = passwordsMatch && requirements.every(r => r.met);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;

        setStatus('processing');
        try {
            const res = await fetch(`${API_URL}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Failed to reset password');

            setStatus('success');
            toast.success("Password reset successfully!");
            
            // Close after delay
            setTimeout(() => {
                onClose();
                // Remove token from URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }, 2000);

        } catch (error: any) {
            setStatus('error');
            toast.error(error.message);
            setTimeout(() => setStatus('idle'), 2000);
        }
    };

    return (
        <Modal onClose={onClose} className="max-w-md">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">Set New Password</h2>
                <p className="text-gray-400 text-sm">Create a secure password for your account.</p>
            </div>

            <AnimatePresence mode="wait">
                {status === 'success' ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="py-10 flex flex-col items-center"
                    >
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                            <CheckCircleIcon className="w-10 h-10 text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white">All Set!</h3>
                        <p className="text-gray-400 mt-2">Redirecting to login...</p>
                    </motion.div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">New Password</label>
                                <div className="relative">
                                    <input 
                                        type="password" 
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full p-4 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 text-white placeholder-gray-600 transition-all"
                                        placeholder="••••••••"
                                        disabled={status === 'processing'}
                                    />
                                    <LockIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                </div>
                                {/* Mini Requirements */}
                                <div className="flex gap-3 mt-2">
                                    {requirements.map(req => (
                                        <div key={req.id} className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${req.met ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-500'}`}>
                                            {req.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Confirm Password</label>
                                <div className="relative">
                                    <input 
                                        type="password" 
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="w-full p-4 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 text-white placeholder-gray-600 transition-all"
                                        placeholder="••••••••"
                                        disabled={status === 'processing'}
                                    />
                                    {confirmPassword && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            {passwordsMatch ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CloseIcon className="w-4 h-4 text-red-500" />}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={!isFormValid || status === 'processing'}
                            className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg
                                ${isFormValid 
                                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/20' 
                                    : 'bg-gray-700 opacity-50 cursor-not-allowed'
                                }
                            `}
                        >
                            {status === 'processing' ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}
            </AnimatePresence>
        </Modal>
    );
};

export default ResetPasswordModal;


import React, { useState, useContext, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Modal from './Modal';
import { CheckIcon, CloseIcon, LockIcon, CheckCircleIcon, ClockIcon, AlertIcon } from './Icons';

interface ChangePasswordModalProps {
    onClose: () => void;
}

type Status = 'idle' | 'processing' | 'success' | 'error';

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [touched, setTouched] = useState({ current: false, new: false, confirm: false });
    const [isFocused, setIsFocused] = useState(false);
    const [status, setStatus] = useState<Status>('idle');
    
    const auth = useContext(AuthContext);
    const toast = useToast();

    // --- Validation Logic (Same as Register.tsx) ---
    const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

    const requirements = useMemo(() => [
        { id: 'len', label: 'At least 6 characters', met: newPassword.length >= 6 },
        { id: 'num', label: 'Contains a number', met: /[0-9]/.test(newPassword) },
        { id: 'spec', label: 'Contains a special char', met: /[^A-Za-z0-9]/.test(newPassword) },
        { id: 'case', label: 'Mixed case (Up/Low)', met: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) },
    ], [newPassword]);

    const allRequirementsMet = useMemo(() => requirements.every(r => r.met), [requirements]);
    const isFormValid = currentPassword.length > 0 && passwordsMatch && allRequirementsMet;

    const passwordStrength = useMemo(() => {
        if (!newPassword) return { score: 0, label: '', color: 'bg-gray-700' };
        let score = 0;
        requirements.forEach(r => { if(r.met) score++; });
        if (newPassword.length > 10) score++;

        if (score <= 2) return { score, label: 'Weak 😱', color: 'bg-red-500' };
        if (score === 3) return { score, label: 'Fair 😐', color: 'bg-yellow-500' };
        if (score === 4) return { score, label: 'Good 🙂', color: 'bg-blue-500' };
        if (score >= 5) return { score, label: 'Godlike 🔥', color: 'bg-purple-500' };
        return { score, label: 'Weak', color: 'bg-gray-500' };
    }, [newPassword, requirements]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({ current: true, new: true, confirm: true });

        if (!isFormValid) {
            setStatus('error');
            setTimeout(() => setStatus('idle'), 500);
            return;
        }

        setStatus('processing');
        try {
            if (auth?.changePassword) {
                // Artificial delay for UX
                const apiCall = auth.changePassword(currentPassword, newPassword);
                const delay = new Promise(resolve => setTimeout(resolve, 1000));
                
                await Promise.all([apiCall, delay]);
                
                setStatus('success');
                toast.success("Password changed successfully.");
                setTimeout(onClose, 1000);
            } else {
                throw new Error("Service unavailable");
            }
        } catch (error: any) {
            setStatus('error');
            toast.error(error.message || "Failed to change password.");
            setTimeout(() => setStatus('idle'), 2000);
        }
    };

    // Expiration Info Calculation
    const expiryInfo = useMemo(() => {
        const lastChange = auth?.currentUser?.questData?.lastPasswordChange;
        
        // Handle undefined or null lastChange gracefully
        if (!lastChange) {
            return {
                text: "Security Update Recommended",
                color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
                icon: <AlertIcon className="w-3 h-3" />
            };
        }

        const changeDate = new Date(lastChange);
        const expiryDate = new Date(changeDate);
        expiryDate.setMonth(expiryDate.getMonth() + 6); // 6 months rotation
        
        const now = new Date();
        const diffTime = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return {
                text: `Expired ${Math.abs(diffDays)} days ago`,
                color: "text-red-400 bg-red-500/10 border-red-500/20",
                icon: <AlertIcon className="w-3 h-3" />
            };
        }
        
        if (diffDays <= 30) {
            return {
                text: `Expires in ${diffDays} days`,
                color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
                icon: <ClockIcon className="w-3 h-3" />
            };
        }

        return {
            text: `Expires in ~${Math.round(diffDays / 30)} months`,
            color: "text-green-400 bg-green-500/10 border-green-500/20",
            icon: <CheckCircleIcon className="w-3 h-3" />
        };
    }, [auth?.currentUser?.questData?.lastPasswordChange]);

    // Shake animation for error state
    const shakeVariant = {
        idle: { x: 0 },
        error: { x: [-10, 10, -10, 10, 0], transition: { duration: 0.4 } }
    };

    const isSubmitting = status === 'processing' || status === 'success';

    return (
        <Modal onClose={onClose}>
            <motion.form 
                onSubmit={handleSubmit} 
                className="space-y-5 w-full max-w-sm mx-auto"
                noValidate
                initial="idle"
                animate={status === 'error' ? 'error' : 'idle'}
                variants={shakeVariant}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Change Password</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-white/10 transition-colors">
                        <CloseIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                
                {/* Expiration Banner */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border ${expiryInfo.color} mb-4`}>
                    {expiryInfo.icon}
                    <span>{expiryInfo.text}</span>
                </div>
                
                {/* Current Password */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Password</label>
                    <input 
                        type="password" 
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        onBlur={() => setTouched(s => ({ ...s, current: true }))}
                        className={`w-full p-3 bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 focus:outline-none transition-colors dark:text-white
                            ${touched.current && currentPassword.length === 0 ? 'border-red-500/50 focus:border-red-500' : 'focus:border-cyan-500'}
                        `}
                        placeholder="Enter current password"
                        disabled={isSubmitting}
                    />
                </div>

                {/* New Password with Strength Meter */}
                <div className="space-y-2 relative">
                    <div className="flex justify-between items-baseline">
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">New Password</label>
                        {newPassword && (
                            <motion.span 
                                key={passwordStrength.label}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`text-xs font-bold transition-colors ${passwordStrength.color.replace('bg-', 'text-')}`}
                            >
                                {passwordStrength.label}
                            </motion.span>
                        )}
                    </div>
                    
                    <div className="relative">
                        <input 
                            type="password" 
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => { setTouched(s => ({ ...s, new: true })); setIsFocused(false); }}
                            className={`w-full p-3 bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 focus:outline-none transition-colors dark:text-white
                                ${touched.new && newPassword.length > 0 && !requirements[0].met ? 'border-yellow-500/50 focus:border-yellow-500' : 'focus:border-cyan-500'}
                            `}
                            placeholder="Create a strong password"
                            disabled={isSubmitting}
                        />
                         {/* Visual Connector Line */}
                        <AnimatePresence>
                            {newPassword.length > 0 && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: '24px', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className={`absolute left-6 top-full w-0.5 z-0 ${passwordsMatch ? 'bg-green-500' : 'bg-gray-600'}`}
                                />
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Strength Bar */}
                    <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                        <motion.div 
                            className={`h-full ${passwordStrength.color}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                    </div>

                    {/* Checklist */}
                    <AnimatePresence>
                        {(isFocused || newPassword.length > 0) && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    {requirements.map((req) => (
                                        <motion.div 
                                            key={req.id}
                                            className={`flex items-center gap-2 text-[10px] sm:text-xs transition-colors duration-300 ${req.met ? 'text-green-500 dark:text-green-400 font-medium' : 'text-gray-400'}`}
                                            animate={{ scale: req.met ? [1, 1.1, 1] : 1 }}
                                        >
                                            <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full flex items-center justify-center border ${req.met ? 'border-green-500 bg-green-500/20' : 'border-gray-400'}`}>
                                                {req.met && <motion.svg initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} viewBox="0 0 24 24" className="w-2.5 h-2.5 stroke-current stroke-2 fill-none"><path d="M5 12l5 5l10 -10" /></motion.svg>}
                                            </div>
                                            <span>{req.label}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2 relative">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Confirm New Password</label>
                    <div className="relative">
                        <input 
                            type="password" 
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            onBlur={() => setTouched(s => ({ ...s, confirm: true }))}
                            className={`w-full p-3 bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 focus:outline-none transition-colors pr-10 dark:text-white
                                ${passwordsMatch 
                                    ? 'border-green-500/50 focus:border-green-500 shadow-[0_0_10px_rgba(74,222,128,0.2)]' 
                                    : (touched.confirm && confirmPassword && !passwordsMatch ? 'border-red-500/50 focus:border-red-500' : 'focus:border-cyan-500')
                                }
                            `}
                            placeholder="Re-enter new password"
                            disabled={isSubmitting}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <AnimatePresence mode="wait">
                                {passwordsMatch ? (
                                    <motion.div key="match" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
                                        <CheckIcon className="w-5 h-5 text-green-500" />
                                    </motion.div>
                                ) : confirmPassword.length > 0 ? (
                                    <motion.div key="mismatch" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                        <CloseIcon className="w-5 h-5 text-red-500" />
                                    </motion.div>
                                ) : (
                                    <motion.div key="lock" initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}>
                                        <LockIcon className="w-5 h-5 text-gray-400" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                    <button 
                        type="button" 
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-gray-700 dark:text-gray-200 text-sm font-semibold"
                    >
                        Cancel
                    </button>
                    
                    <motion.button 
                        type="submit" 
                        disabled={isSubmitting || !isFormValid}
                        whileHover={isFormValid ? { scale: 1.02 } : {}}
                        whileTap={isFormValid ? { scale: 0.98 } : {}}
                        className={`relative px-6 py-2 rounded-lg font-bold text-white overflow-hidden transition-all min-w-[140px]
                            ${!isFormValid ? 'bg-gray-400 dark:bg-white/10 cursor-not-allowed opacity-50' : 'bg-cyan-600 hover:bg-cyan-500'}
                        `}
                    >
                         <AnimatePresence mode="wait">
                            {status === 'processing' && (
                                <motion.div 
                                    key="processing"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex items-center justify-center gap-2"
                                >
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Updating...</span>
                                </motion.div>
                            )}
                            
                            {status === 'success' && (
                                <motion.div 
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center justify-center gap-2"
                                >
                                    <CheckCircleIcon className="w-5 h-5" />
                                    <span>Updated</span>
                                </motion.div>
                            )}

                            {(status === 'idle' || status === 'error') && (
                                <motion.div 
                                    key="idle"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                >
                                    Update Password
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.button>
                </div>
            </motion.form>
        </Modal>
    );
};

export default ChangePasswordModal;

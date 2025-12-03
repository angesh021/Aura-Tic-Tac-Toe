
import React, { useState, useContext, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { CheckIcon, CloseIcon, LockIcon, AlertIcon, CheckCircleIcon } from './Icons';

interface RegisterProps {
    onSwitchToLogin: () => void;
}

type RegisterStatus = 'idle' | 'processing' | 'success' | 'error';

const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [touched, setTouched] = useState({ email: false, password: false, confirm: false });
    const [isFocused, setIsFocused] = useState(false);
    const [status, setStatus] = useState<RegisterStatus>('idle');

    const auth = useContext(AuthContext);
    const toast = useToast();

    const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    const isEmailValid = validateEmail(email);
    const passwordsMatch = password && confirmPassword && password === confirmPassword;

    const requirements = useMemo(() => [
        { id: 'len', label: 'At least 6 characters', met: password.length >= 6 },
        { id: 'num', label: 'Contains a number', met: /[0-9]/.test(password) },
        { id: 'spec', label: 'Contains a special char', met: /[^A-Za-z0-9]/.test(password) },
        { id: 'case', label: 'Mixed case (Up/Low)', met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    ], [password]);

    const allRequirementsMet = useMemo(() => requirements.every(r => r.met), [requirements]);
    const isFormValid = isEmailValid && passwordsMatch && allRequirementsMet && email.length > 0;

    const passwordStrength = useMemo(() => {
        if (!password) return { score: 0, label: '', color: 'bg-gray-700' };
        let score = 0;
        requirements.forEach(r => { if(r.met) score++; });
        if (password.length > 10) score++;

        if (score <= 2) return { score, label: 'Weak 😱', color: 'bg-red-500' };
        if (score === 3) return { score, label: 'Fair 😐', color: 'bg-yellow-500' };
        if (score === 4) return { score, label: 'Good 🙂', color: 'bg-blue-500' };
        if (score >= 5) return { score, label: 'Godlike 🔥', color: 'bg-purple-500' };
        return { score, label: 'Weak', color: 'bg-gray-500' };
    }, [password, requirements]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({ email: true, password: true, confirm: true });

        // Final strict check before proceeding
        if (!isFormValid) {
            setStatus('error');
            setTimeout(() => setStatus('idle'), 500); 
            return;
        }
        
        setStatus('processing');

        try {
            // Artificial delay to allow animation to be seen
            const registerPromise = auth?.register(email, password);
            const minDelay = new Promise(resolve => setTimeout(resolve, 1500));
            
            await Promise.all([registerPromise, minDelay]);

            setStatus('success');
            
            // Show success state briefly before switching
            setTimeout(() => {
                toast.success('Account created! Please log in.');
                onSwitchToLogin();
            }, 1000);

        } catch (err: any) {
            setStatus('error');
            
            if(err.message.includes('Too many requests')) {
                 toast.error('Too many signup attempts. Please wait.');
            } else if (err.message.includes('already exists')) {
                toast.error('Account already exists. Redirecting to login...');
                setTimeout(onSwitchToLogin, 2000);
            } else {
                toast.error(err.message || 'Failed to register.');
            }

            setTimeout(() => {
                setStatus('idle');
            }, 2000);
        }
    };

    const isSubmitting = status === 'processing' || status === 'success';

    // Shake animation for error state
    const shakeVariant = {
        idle: { x: 0 },
        error: { x: [-10, 10, -10, 10, 0], transition: { duration: 0.4 } }
    };

    return (
        <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-4" 
            noValidate
            initial="idle"
            animate={status === 'error' ? 'error' : 'idle'}
            variants={shakeVariant}
        >
            <div className="space-y-2">
                <label htmlFor="email-register" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <div className="relative">
                    <input
                        id="email-register"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setTouched(s => ({ ...s, email: true }))}
                        className={`w-full p-3 bg-white/10 border border-transparent rounded-lg focus:outline-none focus:ring-2 transition-all
                                ${touched.email && !isEmailValid && email.length > 0 ? 'border-red-500/50 focus:ring-red-400' : 'focus:ring-pink-400'}
                        `}
                        placeholder="you@example.com"
                        disabled={isSubmitting}
                    />
                     {/* Inline Email Error */}
                     <AnimatePresence>
                        {touched.email && email.length > 0 && !isEmailValid && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0, y: -5 }}
                                animate={{ opacity: 1, height: 'auto', y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -5 }}
                                className="flex items-center gap-1.5 mt-1 text-red-400 text-xs font-medium"
                            >
                                <AlertIcon className="w-3 h-3" />
                                <span>Please enter a valid email address (e.g., user@domain.com)</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            
            {/* Password Section */}
            <div className="space-y-2 relative">
                <div className="flex justify-between items-baseline">
                    <label htmlFor="password-register" className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                    {password && (
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
                        id="password-register"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => { setTouched(s => ({ ...s, password: true })); setIsFocused(false); }}
                        className={`w-full p-3 bg-white/10 border border-transparent rounded-lg focus:outline-none focus:ring-2 transition-all
                                ${touched.password && password.length > 0 && !requirements[0].met ? 'border-yellow-500/50 focus:ring-yellow-400' : 'focus:ring-pink-400'}
                        `}
                        placeholder="Create a strong password"
                        disabled={isSubmitting}
                    />
                    {/* Visual Connector Line to Confirm Input */}
                    <AnimatePresence>
                        {password.length > 0 && (
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
                <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden mt-1">
                    <motion.div 
                        className={`h-full ${passwordStrength.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                </div>

                {/* Checklist Animation */}
                <AnimatePresence>
                    {(isFocused || password.length > 0) && (
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
                                        className={`flex items-center gap-2 text-xs transition-colors duration-300 ${req.met ? 'text-green-400 font-medium' : 'text-gray-500'}`}
                                        animate={{ scale: req.met ? [1, 1.1, 1] : 1 }}
                                    >
                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${req.met ? 'border-green-500 bg-green-500/20' : 'border-gray-600'}`}>
                                            {req.met && <motion.svg initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} viewBox="0 0 24 24" className="w-3 h-3 stroke-current stroke-2 fill-none"><path d="M5 12l5 5l10 -10" /></motion.svg>}
                                        </div>
                                        <span>{req.label}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            {/* Confirm Password with Match Animation */}
             <div className="space-y-2 relative">
                <label htmlFor="confirm-password-register" className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
                <div className="relative">
                    <input
                        id="confirm-password-register"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onBlur={() => setTouched(s => ({ ...s, confirm: true }))}
                        className={`w-full p-3 bg-white/10 border border-transparent rounded-lg focus:outline-none focus:ring-2 transition-all pl-3 pr-10
                                ${passwordsMatch 
                                    ? 'border-green-500/50 focus:ring-green-400 shadow-[0_0_10px_rgba(74,222,128,0.2)]' 
                                    : (touched.confirm && confirmPassword && !passwordsMatch ? 'border-red-500/50 focus:ring-red-400' : 'focus:ring-pink-400')
                                }
                        `}
                        placeholder="Re-enter password"
                        disabled={isSubmitting}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <AnimatePresence mode="wait">
                            {passwordsMatch ? (
                                <motion.div key="match" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
                                    <CheckIcon className="w-5 h-5 text-green-400" />
                                </motion.div>
                            ) : confirmPassword.length > 0 ? (
                                <motion.div key="mismatch" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                    <CloseIcon className="w-5 h-5 text-red-400" />
                                </motion.div>
                            ) : (
                                <motion.div key="lock" initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}>
                                    <LockIcon className="w-5 h-5 text-gray-500" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                 {/* Inline Confirm Password Error */}
                 <AnimatePresence>
                    {touched.confirm && confirmPassword.length > 0 && !passwordsMatch && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0, y: -5 }}
                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -5 }}
                            className="flex items-center gap-1.5 mt-1 text-red-400 text-xs font-medium"
                        >
                            <AlertIcon className="w-3 h-3" />
                            <span>Passwords do not match.</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            <div className="pt-2">
                <motion.button
                    whileHover={!isSubmitting && isFormValid ? { scale: 1.02, filter: "brightness(1.1)" } : {}}
                    whileTap={!isSubmitting && isFormValid ? { scale: 0.98 } : {}}
                    type="submit"
                    disabled={isSubmitting || !isFormValid}
                    className={`relative w-full h-14 rounded-xl overflow-hidden group border border-white/10 shadow-lg transition-all
                        ${!isFormValid ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}
                    `}
                >
                    {/* Dynamic Background */}
                    <motion.div 
                        className="absolute inset-0"
                        initial={false}
                        animate={{
                            backgroundColor: 
                                status === 'success' ? '#22c55e' : // Green
                                status === 'error' ? '#ef4444' :   // Red
                                'transparent'
                        }}
                    >
                         {/* Gradient for Idle/Processing state */}
                        {status !== 'success' && status !== 'error' && (
                            <div className={`absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 transition-opacity duration-300`} />
                        )}
                         {/* Shimmer Effect */}
                        {status === 'idle' && isFormValid && (
                            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>
                        )}
                    </motion.div>
                    
                    {/* Loading Progress Bar */}
                    {status === 'processing' && (
                         <motion.div 
                            className="absolute bottom-0 left-0 h-1 bg-white/50 z-20"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
                         />
                    )}

                    {/* Button Content */}
                    <div className="relative z-10 flex items-center justify-center gap-3 font-bold text-white tracking-wide text-lg h-full">
                        <AnimatePresence mode="wait">
                            {status === 'processing' && (
                                <motion.div 
                                    key="processing"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex items-center gap-2"
                                >
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>CREATING...</span>
                                </motion.div>
                            )}
                            
                            {status === 'success' && (
                                <motion.div 
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center gap-2"
                                >
                                    <CheckCircleIcon className="w-6 h-6" />
                                    <span>ACCOUNT CREATED</span>
                                </motion.div>
                            )}

                            {status === 'error' && (
                                <motion.div 
                                    key="error"
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    className="flex items-center gap-2"
                                >
                                    <AlertIcon className="w-6 h-6" />
                                    <span>FAILED</span>
                                </motion.div>
                            )}

                            {status === 'idle' && (
                                <motion.div 
                                    key="idle"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex items-center gap-2"
                                >
                                    <span>CREATE ACCOUNT</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.button>
            </div>
            
            <p className="text-sm text-center text-gray-400">
                Already have an account?{' '}
                <button type="button" onClick={onSwitchToLogin} className="font-semibold text-pink-400 hover:underline focus:outline-none focus:text-pink-300">
                    Sign in
                </button>
            </p>
        </motion.form>
    );
};

export default Register;

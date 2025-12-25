import React, { useState, useContext, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { CheckIcon, CloseIcon, LockIcon, AlertIcon, CheckCircleIcon, SendIcon, UserIcon } from './Icons';
import { checkEmailExists } from '../services/auth';

interface RegisterProps {
    onSwitchToLogin: () => void;
}

type RegisterStatus = 'idle' | 'processing' | 'success' | 'error';

// Reusing Peekaboo Toggle Component locally for independence
const PasswordToggle = ({ isVisible, onToggle }: { isVisible: boolean; onToggle: () => void }) => {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-pink-400 focus:outline-none transition-colors group z-20"
            aria-label={isVisible ? "Hide password" : "Show password"}
        >
            <div className="relative w-6 h-6 flex items-center justify-center overflow-hidden">
                {/* Eye Base */}
                <motion.svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="w-full h-full relative z-0"
                    animate={{ color: isVisible ? '#f472b6' : '#9ca3af' }}
                >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <motion.circle 
                        cx="12" cy="12" r="3" 
                        initial={false}
                        animate={{ 
                            scale: isVisible ? 1 : 0.8,
                        }}
                    />
                </motion.svg>

                {/* Hands Overlay */}
                <motion.div 
                    className="absolute inset-0 z-10 flex justify-center pointer-events-none"
                    initial={false}
                    animate={{ 
                        y: isVisible ? 14 : 1, // 1 covers the eyes, 14 sits at bottom
                    }}
                    transition={{ type: "spring", stiffness: 220, damping: 20 }}
                >
                    {/* Left Hand */}
                    <motion.svg 
                        viewBox="0 0 24 24" 
                        className="absolute w-full h-full"
                        initial={false}
                        animate={{ 
                            x: isVisible ? -5 : -1,
                            rotate: isVisible ? -20 : 0 
                        }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    >
                        <path 
                            d="M 0 24 L 0 14 C 0 14 2 10 7 11 C 10 11.5 11 14 11 14 L 11 24 Z" 
                            className="fill-gray-200 dark:fill-gray-700 stroke-gray-400 dark:stroke-gray-500"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                        />
                    </motion.svg>

                    {/* Right Hand */}
                    <motion.svg 
                        viewBox="0 0 24 24" 
                        className="absolute w-full h-full"
                        initial={false}
                        animate={{ 
                            x: isVisible ? 5 : 1,
                            rotate: isVisible ? 20 : 0 
                        }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    >
                        <path 
                            d="M 24 24 L 24 14 C 24 14 22 10 17 11 C 14 11.5 13 14 13 14 L 13 24 Z" 
                            className="fill-gray-200 dark:fill-gray-700 stroke-gray-400 dark:stroke-gray-500"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                        />
                    </motion.svg>
                </motion.div>
            </div>
        </button>
    );
};

const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [touched, setTouched] = useState({ email: false, password: false, confirm: false });
    const [isFocused, setIsFocused] = useState(false);
    const [status, setStatus] = useState<RegisterStatus>('idle');
    const [emailCheckStatus, setEmailCheckStatus] = useState<'checking' | 'exists' | 'available' | 'idle'>('idle');

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
    // Also block if account exists
    const isFormValid = isEmailValid && passwordsMatch && allRequirementsMet && email.length > 0 && emailCheckStatus !== 'exists';

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

    // Check email existence with debounce
    useEffect(() => {
        if (!validateEmail(email)) {
            setEmailCheckStatus('idle');
            return;
        }

        const timer = setTimeout(async () => {
            setEmailCheckStatus('checking');
            const exists = await checkEmailExists(email);
            setEmailCheckStatus(exists ? 'exists' : 'available');
        }, 800);

        return () => clearTimeout(timer);
    }, [email]);

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
            const registerPromise = auth?.register(email, password);
            const minDelay = new Promise(resolve => setTimeout(resolve, 1000));
            
            await Promise.all([registerPromise, minDelay]);

            setStatus('success');
        } catch (err: any) {
            setStatus('error');
            toast.error(err.message || 'Failed to register 😵.');
            setTimeout(() => {
                setStatus('idle');
            }, 2000);
        }
    };

    const isSubmitting = status === 'processing' || status === 'success';

    const shakeVariant = {
        idle: { x: 0 },
        error: { x: [-10, 10, -10, 10, 0], transition: { duration: 0.4 } }
    };

    if (status === 'success') {
        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
            >
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                    <SendIcon className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Check your Inbox!</h2>
                <p className="text-gray-300 text-sm mb-6 leading-relaxed px-4">
                    We've sent a verification link to <br/>
                    <strong className="text-cyan-400">{email}</strong>
                </p>
                <p className="text-xs text-gray-500 mb-8">
                    Please verify your email to unlock all competitive features.
                </p>
                <button 
                    onClick={onSwitchToLogin}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors"
                >
                    Back to Login
                </button>
            </motion.div>
        );
    }

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
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <UserIcon className="w-5 h-5" />
                    </div>
                    <input
                        id="email-register"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setTouched(s => ({ ...s, email: true }))}
                        className={`w-full p-3 pl-10 pr-20 bg-white/10 border border-transparent rounded-lg focus:outline-none focus:ring-2 transition-all
                                ${touched.email && !isEmailValid && email.length > 0 ? 'border-red-500/50 focus:ring-red-400' : 'focus:ring-pink-400'}
                        `}
                        placeholder="you@example.com"
                        disabled={isSubmitting}
                    />
                    <AnimatePresence>
                        {email.length > 0 && !isSubmitting && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9, y: "-50%" }}
                                animate={{ opacity: 1, scale: 1, y: "-50%" }}
                                exit={{ opacity: 0, scale: 0.9, y: "-50%" }}
                                type="button"
                                onClick={() => { setEmail(''); setTouched(s => ({...s, email: false})); setEmailCheckStatus('idle'); }}
                                className="absolute right-2 top-1/2 text-[9px] font-black uppercase tracking-wider text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/5 hover:border-white/20 px-2.5 py-1.5 rounded-full transition-all backdrop-blur-md"
                                aria-label="Clear email"
                            >
                                Clear
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
                {/* Inline Email Error & Suggestion */}
                <AnimatePresence>
                    {touched.email && email.length > 0 && !isEmailValid && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="flex items-center gap-1.5 text-red-400 text-xs font-medium overflow-hidden"
                        >
                            <AlertIcon className="w-3 h-3" />
                            <span>Please enter a valid email address</span>
                        </motion.div>
                    )}
                    {emailCheckStatus === 'exists' && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="flex items-center gap-1.5 text-red-400 text-xs font-medium overflow-hidden"
                        >
                            <AlertIcon className="w-3 h-3" />
                            <span>Account already exists.</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            {/* Password Section */}
            <div className="relative">
                <div className="flex justify-between items-baseline mb-2">
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
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <LockIcon className="w-5 h-5" />
                    </div>
                    <input
                        id="password-register"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => { setTouched(s => ({ ...s, password: true })); setIsFocused(false); }}
                        className={`w-full p-3 pl-10 pr-24 bg-white/10 border border-transparent rounded-lg focus:outline-none focus:ring-2 transition-all
                                ${touched.password && password.length > 0 && !requirements[0].met ? 'border-yellow-500/50 focus:ring-yellow-400' : 'focus:ring-pink-400'}
                        `}
                        placeholder="Create a strong password"
                        disabled={isSubmitting}
                    />
                    <AnimatePresence>
                        {password.length > 0 && !isSubmitting && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9, y: "-50%" }}
                                animate={{ opacity: 1, scale: 1, y: "-50%" }}
                                exit={{ opacity: 0, scale: 0.9, y: "-50%" }}
                                type="button"
                                onClick={() => setPassword('')}
                                className="absolute right-12 top-1/2 text-[9px] font-black uppercase tracking-wider text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/5 hover:border-white/20 px-2.5 py-1.5 rounded-full transition-all backdrop-blur-md"
                                aria-label="Clear password"
                            >
                                Clear
                            </motion.button>
                        )}
                    </AnimatePresence>
                    <PasswordToggle 
                        isVisible={showPassword} 
                        onToggle={() => setShowPassword(!showPassword)} 
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
                <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden mt-2">
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
             <div className="relative">
                <label htmlFor="confirm-password-register" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <LockIcon className="w-5 h-5" />
                    </div>
                    <input
                        id="confirm-password-register"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onBlur={() => setTouched(s => ({ ...s, confirm: true }))}
                        className={`w-full p-3 pl-10 pr-24 bg-white/10 border border-transparent rounded-lg focus:outline-none focus:ring-2 transition-all
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
                                    <LockIcon className="w-5 h-5 text-gray-400" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    {/* Clear Button for Confirm Password */}
                    <AnimatePresence>
                        {confirmPassword.length > 0 && !isSubmitting && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9, y: "-50%" }}
                                animate={{ opacity: 1, scale: 1, y: "-50%" }}
                                exit={{ opacity: 0, scale: 0.9, y: "-50%" }}
                                type="button"
                                onClick={() => setConfirmPassword('')}
                                className="absolute right-10 top-1/2 text-[9px] font-black uppercase tracking-wider text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/5 hover:border-white/20 px-2.5 py-1.5 rounded-full transition-all backdrop-blur-md"
                                aria-label="Clear confirm password"
                            >
                                Clear
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
                 {/* Inline Confirm Password Error - Outside Relative Container */}
                 <AnimatePresence>
                    {touched.confirm && confirmPassword.length > 0 && !passwordsMatch && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 8 }} // 8px = mt-2
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="flex items-center gap-1.5 text-red-400 text-xs font-medium overflow-hidden"
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
                                status === 'error' ? '#ef4444' :   // Red
                                'transparent'
                        }}
                    >
                         {/* Gradient for Idle/Processing state */}
                        {status !== 'error' && (
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
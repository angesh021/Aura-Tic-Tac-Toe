import React, { useState, useContext, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { CheckCircleIcon, AlertIcon, ShieldCheckIcon, UserIcon, LockIcon } from './Icons';
import ForgotPasswordModal from './ForgotPasswordModal';
import { checkEmailExists } from '../services/auth';

interface LoginProps {
    onSwitchToRegister: () => void;
}

type LoginStatus = 'idle' | 'processing' | 'success' | 'error' | 'mfa_required';

// Playful "Peekaboo" Toggle Component
const PasswordToggle = ({ isVisible, onToggle }: { isVisible: boolean; onToggle: () => void }) => {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-cyan-400 focus:outline-none transition-colors group z-20"
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
                    animate={{ color: isVisible ? '#22d3ee' : '#9ca3af' }}
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
                            x: isVisible ? -5 : -1, // Spread out when down
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
                            x: isVisible ? 5 : 1, // Spread out when down
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

const Login: React.FC<LoginProps> = ({ onSwitchToRegister }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [status, setStatus] = useState<LoginStatus>('idle');
    const [touched, setTouched] = useState({ email: false, password: false });
    const [showForgot, setShowForgot] = useState(false);
    const [emailCheckStatus, setEmailCheckStatus] = useState<'checking' | 'exists' | 'available' | 'idle'>('idle');
    
    // MFA State
    const [mfaCode, setMfaCode] = useState('');
    const [tempToken, setTempToken] = useState<string | null>(null);
    const mfaInputRef = useRef<HTMLInputElement>(null);
    
    const auth = useContext(AuthContext);
    const toast = useToast();

    const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    const isEmailValid = validateEmail(email);
    const isFormValid = isEmailValid && password.length > 0;

    useEffect(() => {
        if (status === 'mfa_required' && mfaInputRef.current) {
            mfaInputRef.current.focus();
        }
    }, [status]);

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
        
        if (status === 'mfa_required') {
            handleMfaSubmit();
            return;
        }

        setTouched({ email: true, password: true });

        // 1. Client-side Validation
        if (!isFormValid) {
            triggerError();
            return;
        }

        // 2. Start Processing Animation
        setStatus('processing');
        
        try {
            const loginPromise = auth?.login(email, password);
            const minDelay = new Promise(resolve => setTimeout(resolve, 800));
            
            const [result] = await Promise.all([loginPromise, minDelay]);

            if (result && result.mfaRequired && result.tempToken) {
                setTempToken(result.tempToken);
                setStatus('mfa_required');
                return;
            }

            // 3. Success State
            setStatus('success');

        } catch (err: any) {
            // 4. Error State
            setStatus('error');
            
            toast.error(err.message || 'Login failed 😵.');

            // Reset to idle after showing error state
            setTimeout(() => {
                setStatus('idle');
            }, 2000);
        }
    };

    const handleMfaSubmit = async () => {
        if (!mfaCode || !tempToken || !auth?.loginMfa) return;
        
        setStatus('processing');
        try {
            await auth.loginMfa(tempToken, mfaCode);
            setStatus('success');
        } catch (err: any) {
            setStatus('mfa_required'); // Stay on MFA screen
            toast.error(err.message || "Invalid code 🚫");
            setMfaCode('');
        }
    };

    const triggerError = () => {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 500);
    };

    const isSubmitting = status === 'processing' || status === 'success';

    // Shake animation for error state
    const shakeVariant = {
        idle: { x: 0 },
        error: { x: [-10, 10, -10, 10, 0], transition: { duration: 0.4 } }
    };

    if (status === 'mfa_required') {
        return (
            <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6 text-center"
            >
                <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/30 animate-pulse">
                    <ShieldCheckIcon className="w-8 h-8 text-cyan-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Security Check</h2>
                    <p className="text-gray-400 text-sm mt-1">Enter the 6-digit code from your authenticator app.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        ref={mfaInputRef}
                        type="text"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full p-4 text-center text-3xl font-mono tracking-[0.5em] bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 text-white placeholder-gray-700"
                        placeholder="000000"
                        maxLength={6}
                        autoFocus
                    />
                    <button 
                        type="submit"
                        className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg transition-all"
                        disabled={mfaCode.length !== 6}
                    >
                        Verify
                    </button>
                    <button 
                        type="button" 
                        onClick={() => { setStatus('idle'); setTempToken(null); setMfaCode(''); }}
                        className="text-sm text-gray-500 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                </form>
            </motion.div>
        );
    }

    return (
        <>
        <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-6" 
            noValidate
            initial="idle"
            animate={status === 'error' ? 'error' : 'idle'}
            variants={shakeVariant}
        >
            <div className="space-y-2">
                <label htmlFor="email-login" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <UserIcon className="w-5 h-5" />
                    </div>
                    <input
                        id="email-login"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setTouched(s => ({ ...s, email: true }))}
                        className={`w-full p-3 pl-10 pr-20 bg-white/10 border border-transparent rounded-lg focus:outline-none focus:ring-2 transition-all
                                   ${touched.email && !isEmailValid && email.length > 0 ? 'border-red-500/50 focus:ring-red-400' : 'focus:ring-cyan-400'}
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
                            <span>Please enter a valid email address.</span>
                        </motion.div>
                    )}
                    {emailCheckStatus === 'available' && isEmailValid && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="flex items-center gap-1.5 text-yellow-500 text-xs font-medium overflow-hidden"
                        >
                            <AlertIcon className="w-3 h-3" />
                            <span>No account found.</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label htmlFor="password-login" className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                    <button 
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="text-xs font-medium text-cyan-500 hover:text-cyan-400 transition-colors"
                        disabled={isSubmitting}
                    >
                        Forgot Password?
                    </button>
                </div>
                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <LockIcon className="w-5 h-5" />
                    </div>
                    <input
                        id="password-login"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => setTouched(s => ({ ...s, password: true }))}
                        className="w-full p-3 pl-10 pr-24 bg-white/10 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        placeholder="••••••••"
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
                </div>
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
                            <div className={`absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 transition-opacity duration-300`} />
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
                                    <span>VERIFYING...</span>
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
                                    <span>VERIFIED</span>
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
                                    <span>SIGN IN</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 group-hover:translate-x-1 transition-transform">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                    </svg>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.button>
            </div>
            
            <p className="text-sm text-center text-gray-400">
                Don't have an account?{' '}
                <button type="button" onClick={onSwitchToRegister} className="font-semibold text-cyan-400 hover:underline focus:outline-none focus:text-cyan-300">
                    Sign up
                </button>
            </p>
        </motion.form>

        <AnimatePresence>
            {showForgot && (
                <ForgotPasswordModal 
                    onClose={() => setShowForgot(false)} 
                    initialEmail={email}
                />
            )}
        </AnimatePresence>
        </>
    );
};

export default Login;
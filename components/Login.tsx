
import React, { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { CheckCircleIcon, AlertIcon } from './Icons';

interface LoginProps {
    onSwitchToRegister: () => void;
}

type LoginStatus = 'idle' | 'processing' | 'success' | 'error';

// Playful "Peekaboo" Toggle Component
const PasswordToggle = ({ isVisible, onToggle }: { isVisible: boolean; onToggle: () => void }) => {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-gray-400 hover:text-cyan-400 focus:outline-none transition-colors group z-10"
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
                        y: isVisible ? 19 : 3, // 3 covers the eyes, 19 sits at bottom
                    }}
                    transition={{ type: "spring", stiffness: 220, damping: 20 }}
                >
                    {/* Left Hand */}
                    <motion.svg 
                        viewBox="0 0 24 24" 
                        className="absolute w-full h-full"
                        initial={false}
                        animate={{ 
                            x: isVisible ? -6 : -1, // Spread out when down
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
                            x: isVisible ? 6 : 1, // Spread out when down
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
    
    const auth = useContext(AuthContext);
    const toast = useToast();

    const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    const isEmailValid = validateEmail(email);
    const isFormValid = isEmailValid && password.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({ email: true, password: true });

        // 1. Client-side Validation
        if (!isFormValid) {
            triggerError();
            return;
        }

        // 2. Start Processing Animation
        setStatus('processing');
        
        try {
            // Artificial delay (min 800ms) so user can see the "Verifying" animation
            // This prevents the button from flickering too fast on fast connections
            const loginPromise = auth?.login(email, password);
            const minDelay = new Promise(resolve => setTimeout(resolve, 1500));
            
            await Promise.all([loginPromise, minDelay]);

            // 3. Success State
            setStatus('success');
            // The AuthContext will update currentUser, causing App.tsx to unmount this component
            // and show the Dashboard automatically. The 'success' state just shows the green check
            // for a split second before the unmount happens.

        } catch (err: any) {
            // 4. Error State
            setStatus('error');
            
            if(err.message.includes('Too many requests')) {
                 toast.error('Too many login attempts. Please wait.');
            } else {
                 toast.error(err.message || 'Failed to log in.');
            }

            // Reset to idle after showing error state
            setTimeout(() => {
                setStatus('idle');
            }, 2000);
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

    return (
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
                    <input
                        id="email-login"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setTouched(s => ({ ...s, email: true }))}
                        className={`w-full p-3 bg-white/10 border border-transparent rounded-lg focus:outline-none focus:ring-2 transition-all
                                   ${touched.email && !isEmailValid && email.length > 0 ? 'border-red-500/50 focus:ring-red-400' : 'focus:ring-cyan-400'}
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
                                <span>Please enter a valid email address.</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            <div className="space-y-2">
                <label htmlFor="password-login" className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <div className="relative">
                    <input
                        id="password-login"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => setTouched(s => ({ ...s, password: true }))}
                        className="w-full p-3 pr-12 bg-white/10 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        placeholder="••••••••"
                        disabled={isSubmitting}
                    />
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
                    
                    {/* Loading Progress Bar (visible during processing) */}
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
    );
};

export default Login;

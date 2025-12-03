import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Login from './Login';
import Register from './Register';

const AuthScreen: React.FC = () => {
    const [isLoginView, setIsLoginView] = useState(true);

    return (
        <motion.div
            className="w-full max-w-md p-8 space-y-6 bg-white/20 dark:bg-black/20 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="text-center mb-8">
                <h1 className="text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
                    Aura Tic-Tac-Toe
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Sign in to continue</p>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={isLoginView ? 'login' : 'register'}
                    initial={{ opacity: 0, x: isLoginView ? -50 : 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isLoginView ? 50 : -50 }}
                    transition={{ duration: 0.3 }}
                >
                    {isLoginView ? (
                        <Login onSwitchToRegister={() => setIsLoginView(false)} />
                    ) : (
                        <Register onSwitchToLogin={() => setIsLoginView(true)} />
                    )}
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
};

export default AuthScreen;

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Login from './Login';
import Register from './Register';

const AuthScreen: React.FC = () => {
    const [isLoginView, setIsLoginView] = useState(true);

    return (
        <motion.div
            className="w-full max-w-md p-8 space-y-6 bg-white/20 dark:bg-black/20 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
            layout // Animates height/layout changes automatically
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
            <motion.div layout className="text-center mb-8">
                <h1 className="text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
                    Aura Tic-Tac-Toe
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Sign in to continue</p>
            </motion.div>

            <AnimatePresence mode="wait" initial={false}>
                {isLoginView ? (
                    <motion.div
                        key="login"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Login onSwitchToRegister={() => setIsLoginView(false)} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="register"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Register onSwitchToLogin={() => setIsLoginView(true)} />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default AuthScreen;

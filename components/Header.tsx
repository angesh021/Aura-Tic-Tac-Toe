
import React, { useContext, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import { AuthContext } from '../contexts/AuthContext';
import { AppContext } from '../contexts/AppContext';
import { HistoryIcon, LogoutIcon, BookOpenIcon, CoinIcon, UsersIcon, CloseIcon, BellIcon, MenuIcon, UserIcon, CogIcon, StarIcon } from './Icons';
import { UserAvatar } from './Avatars';
import Tooltip from './Tooltip';
import InstructionsModal from './InstructionsModal';
import { SocialHubContext } from '../contexts/SocialHubContext';
import NotificationCenter from './NotificationCenter';
import { useNotifications } from '../contexts/NotificationContext';
import { useToast } from '../contexts/ToastContext';
import { getRank } from '../utils/badgeData';
import { useGameStore } from '../stores/gameStore';

type ProfileTab = 'overview' | 'customize';

interface HeaderProps {
    onGoToProfile: (tab?: ProfileTab) => void;
    onGoToHistory: () => void;
    onOpenSettings?: () => void;
}

const getXPForLevel = (level: number) => 100 + (level - 1) * 50;

const formatBalance = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1') + 'M';
    if (num >= 100000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num.toLocaleString();
};

// Sub-component for animated balance
const AnimatedBalance = ({ value, className }: { value: number, className: string }) => {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(value);
    const prevValueRef = useRef(value);
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            // Set initial value immediately without animation
            if (ref.current) ref.current.textContent = formatBalance(value);
            motionValue.set(value);
            return;
        }

        if (value !== prevValueRef.current) {
            // Delay the start of the count-up animation to allow "flying coins" to arrive
            const timeoutId = setTimeout(() => {
                const controls = animate(motionValue, value, {
                    duration: 1.5,
                    ease: "circOut",
                    onUpdate: (latest) => {
                        if (ref.current) {
                            ref.current.textContent = formatBalance(Math.round(latest));
                        }
                    }
                });
                return () => controls.stop();
            }, 1200); // 1.2s delay to match CoinTransferAnimation duration

            prevValueRef.current = value;
            return () => clearTimeout(timeoutId);
        }
    }, [value, motionValue]);

    return <span ref={ref} className={`${className} tabular-nums tracking-tight`}>{formatBalance(value)}</span>;
};

const Header: React.FC<HeaderProps> = ({ onGoToProfile, onGoToHistory, onOpenSettings }) => {
    const auth = useContext(AuthContext);
    const app = useContext(AppContext);
    const socialHub = useContext(SocialHubContext);
    const notifications = useNotifications();
    const toast = useToast();
    
    const [showInstructions, setShowInstructions] = useState(false);
    const [showNotificationCenter, setShowNotificationCenter] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const dropdownRef = useRef<HTMLDivElement>(null);
    const prevCoinsRef = useRef(app?.coins || 0);
    const [coinChange, setCoinChange] = useState(0);
    const [xpChange, setXpChange] = useState(0);
    const [pulseNotif, setPulseNotif] = useState(false);
    const prevUnreadCount = useRef(notifications.unreadCount);

    const currentUser = auth?.currentUser;
    const prevLevelRef = useRef(currentUser?.level || 1);
    const prevXpRef = useRef(currentUser?.xp || 0);

    const isHydratingRef = useRef((app?.coins === 0 && (currentUser?.coins || 0) > 0));

    const activeRoomId = useGameStore(state => state.room?.id);
    const activeRoomStatus = useGameStore(state => state.room?.status);

    useEffect(() => {
        if (activeRoomId) {
            setShowNotificationCenter(false);
            setIsProfileOpen(false);
            setIsMobileMenuOpen(false);
            setShowInstructions(false);
        }
    }, [activeRoomId, activeRoomStatus]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (notifications.unreadCount > 0 && notifications.unreadCount > prevUnreadCount.current) {
            setPulseNotif(true);
            const timer = setTimeout(() => setPulseNotif(false), 2000);
            return () => clearTimeout(timer);
        }
        prevUnreadCount.current = notifications.unreadCount;
    }, [notifications.unreadCount]);

    useEffect(() => {
        if (currentUser && currentUser.level > prevLevelRef.current) {
            toast.success(`🎉 Level Up! You are now Level ${currentUser.level}!`);
            prevLevelRef.current = currentUser.level;
        }
    }, [currentUser?.level, toast]);

    useEffect(() => {
        if (currentUser?.xp !== undefined) {
            let diff = 0;
            if (currentUser.level > (prevLevelRef.current || 1)) {
                diff = currentUser.xp + 50; 
            } else {
                diff = currentUser.xp - prevXpRef.current;
            }

            if (diff > 0) {
                setXpChange(diff);
                const timer = setTimeout(() => setXpChange(0), 3000);
                prevXpRef.current = currentUser.xp;
                return () => clearTimeout(timer);
            }
            prevXpRef.current = currentUser.xp;
        }
    }, [currentUser?.xp, currentUser?.level]);

    useEffect(() => {
        if (app?.coins !== undefined) {
            const diff = app.coins - prevCoinsRef.current;
            if (diff !== 0) {
                if (isHydratingRef.current) {
                    isHydratingRef.current = false;
                    prevCoinsRef.current = app.coins;
                    return;
                }

                // Delay the visual "+50" popup to sync with the counter animation
                const startDelay = setTimeout(() => {
                    setCoinChange(diff);
                }, 1200);

                prevCoinsRef.current = app.coins;
                
                // Clear the popup after it has been shown for a while
                const clearDelay = setTimeout(() => setCoinChange(0), 1200 + 3000);
                
                return () => {
                    clearTimeout(startDelay);
                    clearTimeout(clearDelay);
                };
            }
        }
    }, [app?.coins]);


    if (!currentUser) return null;

    const xpForNextLevel = getXPForLevel(currentUser.level || 1);
    const currentXp = currentUser.xp || 0;
    const xpPercentage = Math.min(100, Math.max(0, (currentXp / xpForNextLevel) * 100));
    const rank = getRank(currentUser.elo);

    const navItemClass = "relative h-10 px-3 flex items-center justify-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg transition-all duration-200 cursor-pointer group";
    const iconClass = "w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity";

    const closeAllPopups = () => {
        setIsMobileMenuOpen(false);
        setIsProfileOpen(false);
        setShowNotificationCenter(false);
    }
    
    const handleGoToProfile = () => { closeAllPopups(); onGoToProfile(); }
    const handleGoToHistory = () => { closeAllPopups(); onGoToHistory(); }
    const handleOpenSettings = () => { closeAllPopups(); if(onOpenSettings) onOpenSettings(); };
    const handleOpenSocial = () => { closeAllPopups(); socialHub?.openHub(); }
    const handleShowInstructions = () => { closeAllPopups(); setShowInstructions(true); }
    
    const NavItem = ({ children, tooltipText, onClick, className }: React.PropsWithChildren<{ tooltipText: string, onClick?: () => void, className?: string }>) => (
        <Tooltip text={tooltipText}>
            <button onClick={onClick} className={`${navItemClass} ${className}`}>
                <div className="absolute inset-0 bg-gray-200/50 dark:bg-white/0 group-hover:bg-gray-200 dark:group-hover:bg-white/10 rounded-lg transition-colors duration-300 opacity-0 group-hover:opacity-100"></div>
                <div className="relative z-10 flex items-center justify-center gap-2">
                    {children}
                </div>
            </button>
        </Tooltip>
    );

    const mobileMenuItemClass = "flex items-center gap-4 p-4 text-left font-semibold text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors w-full";

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-40 h-16 md:h-24 px-2 md:px-4 flex justify-center items-center pointer-events-none">
                <motion.div 
                    className="w-full max-w-7xl h-14 md:h-16 px-4 flex items-center justify-between pointer-events-auto"
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                    {/* Left: Logo */}
                    <button onClick={app?.goHome} className="text-xl md:text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-pink-600 dark:from-cyan-400 dark:to-pink-500 hover:opacity-80 transition-opacity">
                        Aura
                    </button>

                    {/* Center & Right: Desktop */}
                    <div className="hidden md:flex items-center gap-2">
                        {/* XP Bar Enhanced */}
                        <div className="relative group mr-2">
                            <Tooltip text={`Current XP: ${currentXp} / ${xpForNextLevel} (${Math.floor(xpPercentage)}%)`}>
                                <div className="flex items-center gap-2 pl-1 pr-3 py-1 bg-gray-100 dark:bg-black/20 hover:bg-gray-200 dark:hover:bg-black/30 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 rounded-full transition-all duration-300 cursor-help">
                                    {/* Level Badge */}
                                    <div className="relative w-8 h-8 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 rounded-full shadow-lg border border-white/10 shrink-0 z-10">
                                        <span className="text-xs font-black text-white">{currentUser.level}</span>
                                        {/* Level Up Pulse Ring */}
                                        <AnimatePresence>
                                            {xpChange > 0 && currentUser.level > (prevLevelRef.current || 1) && (
                                                <motion.div
                                                    initial={{ scale: 1, opacity: 0.8 }}
                                                    animate={{ scale: 2, opacity: 0 }}
                                                    transition={{ duration: 1, repeat: 3 }}
                                                    className="absolute inset-0 rounded-full bg-purple-500"
                                                />
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Bar Container */}
                                    <div className="flex flex-col justify-center gap-0.5 w-24 sm:w-28">
                                        <div className="flex justify-between items-end px-1">
                                            <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lvl Progress</span>
                                            <span className="text-[9px] font-mono text-purple-600 dark:text-purple-300 font-bold">{Math.floor(xpPercentage)}%</span>
                                        </div>
                                        
                                        <div className="relative h-2 bg-gray-200 dark:bg-gray-900/50 rounded-full overflow-hidden border border-gray-300 dark:border-white/5">
                                            {/* Progress Fill */}
                                            <motion.div 
                                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                                                initial={false}
                                                animate={{ width: `${xpPercentage}%` }}
                                                transition={{ type: "spring", stiffness: 50, damping: 15 }}
                                            >
                                                {/* Shimmer Effect */}
                                                <motion.div 
                                                    className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg]"
                                                    animate={{ x: ['-100%', '200%'] }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                                                />
                                            </motion.div>
                                        </div>
                                    </div>
                                </div>
                            </Tooltip>

                            {/* Floating +XP Animation */}
                            <AnimatePresence>
                                {xpChange > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10, scale: 0.5 }}
                                        animate={{ opacity: 1, y: -25, scale: 1 }}
                                        exit={{ opacity: 0, y: -35 }}
                                        className="absolute top-0 right-0 pointer-events-none flex items-center gap-1 z-50 drop-shadow-md"
                                    >
                                        <span className="text-xs font-black text-purple-600 dark:text-purple-400 drop-shadow-[0_0_5px_rgba(192,132,252,0.8)]">+{xpChange} XP</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        
                        <Tooltip text={`Total Balance: ${app?.coins?.toLocaleString()}`}>
                             <motion.div 
                                id="header-coin-balance"
                                className={`flex items-center gap-2 px-3 h-10 rounded-lg transition-colors duration-300 cursor-help relative w-28 justify-center
                                    ${coinChange > 0 ? 'bg-green-100 dark:bg-green-500/20' : (coinChange < 0 ? 'bg-red-100 dark:bg-red-500/20' : 'bg-gray-100 dark:bg-black/20')}
                                `}
                                animate={coinChange !== 0 ? { scale: [1, 1.05, 1] } : {}}
                                transition={{ duration: 0.4 }}
                            >
                                <CoinIcon className={`w-5 h-5 transition-colors ${coinChange > 0 ? 'text-green-600 dark:text-green-400' : (coinChange < 0 ? 'text-red-600 dark:text-red-400' : 'text-yellow-500 dark:text-yellow-400')}`} />
                                <AnimatedBalance 
                                    value={app?.coins || 0} 
                                    className={`text-sm font-bold block ${coinChange > 0 ? 'text-green-700 dark:text-green-300' : (coinChange < 0 ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white')}`} 
                                />
                                <AnimatePresence>
                                    {coinChange !== 0 && (
                                        <motion.span 
                                            initial={{ opacity: 0, y: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, y: -25, scale: 1.1 }}
                                            exit={{ opacity: 0, y: -30, scale: 0.5 }}
                                            className={`absolute right-0 top-0 text-sm font-black drop-shadow-md z-50 pointer-events-none ${coinChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                                        >
                                            {coinChange > 0 ? '+' : ''}{coinChange}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </Tooltip>
                        
                        <div className="h-6 w-px bg-gray-300 dark:bg-white/10 mx-1"></div>
                        
                        <NavItem tooltipText="Social Hub" onClick={() => socialHub?.openHub()}><UsersIcon className={iconClass} /></NavItem>
                        
                        <div className="relative">
                            <NavItem tooltipText="Notifications" onClick={() => setShowNotificationCenter(prev => !prev)}>
                                <div className="relative">
                                    <BellIcon className={`${iconClass} ${pulseNotif ? 'animate-glow-pulse rounded-full' : ''}`} />
                                    {notifications.unreadCount > 0 && (
                                        <motion.div 
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            key={notifications.unreadCount}
                                            className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] px-1 bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 text-[9px] font-bold text-white shadow-sm z-20"
                                        >
                                            {notifications.unreadCount > 99 ? '99+' : notifications.unreadCount}
                                        </motion.div>
                                    )}
                                </div>
                            </NavItem>
                            <AnimatePresence>{showNotificationCenter && <NotificationCenter onClose={() => setShowNotificationCenter(false)} onGoToSettings={handleOpenSettings} />}</AnimatePresence>
                        </div>

                        <NavItem tooltipText="How to Play" onClick={() => setShowInstructions(true)}><BookOpenIcon className={iconClass} /></NavItem>
                        
                        <div className="h-6 w-px bg-gray-300 dark:bg-white/10 mx-1"></div>

                        {/* User Dropdown */}
                        <div ref={dropdownRef} className="relative ml-1">
                            <button 
                                onClick={() => setIsProfileOpen(o => !o)} 
                                className="relative flex items-center gap-3 pl-1 pr-4 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-all duration-200 group"
                            >
                                {/* Avatar Container */}
                                <div className="relative">
                                    <div className={`w-10 h-10 rounded-full p-0.5 border-2 ${rank.color.replace('text-', 'border-').replace('400', '500/50').replace('500', '600/50')} bg-white dark:bg-black/40 overflow-hidden`}>
                                        <UserAvatar avatarId={currentUser.avatar} frameId={currentUser.questData?.equippedFrame} className="w-full h-full rounded-full" />
                                    </div>
                                    {/* Rank Icon Badge */}
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center border border-gray-200 dark:border-white/10 shadow-lg text-xs">
                                        {rank.icon}
                                    </div>
                                </div>

                                {/* Info Column */}
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate max-w-[100px] text-left">{currentUser.displayName}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-[10px] font-black uppercase tracking-wider ${rank.color}`}>{rank.name}</span>
                                        <span className="w-0.5 h-0.5 rounded-full bg-gray-400 dark:bg-gray-600"></span>
                                        <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">{currentUser.elo}</span>
                                    </div>
                                </div>
                            </button>
                            <AnimatePresence>
                                {isProfileOpen && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                        className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-xl shadow-xl p-2 z-50"
                                    >
                                        <button onClick={handleGoToProfile} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-700 dark:text-gray-200"><UserIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400"/> My Profile</button>
                                        <button onClick={handleGoToHistory} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-700 dark:text-gray-200"><HistoryIcon className="w-4 h-4 text-purple-600 dark:text-purple-400"/> History</button>
                                        <button onClick={handleOpenSettings} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-700 dark:text-gray-200"><CogIcon className="w-4 h-4 text-gray-500 dark:text-gray-400"/> Settings</button>
                                        <div className="h-px bg-gray-200 dark:bg-white/10 my-1"></div>
                                        <button onClick={auth?.logout} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-red-50 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors"><LogoutIcon className="w-4 h-4"/> Logout</button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                    
                    {/* Mobile: Minimal + Hamburger */}
                    <div className="flex md:hidden items-center gap-3">
                         <div className="relative">
                            <button onClick={() => setShowNotificationCenter(p => !p)} className={`${navItemClass} relative !px-2`}>
                                <div className="relative">
                                    <BellIcon className={`${iconClass} ${pulseNotif ? 'animate-glow-pulse rounded-full' : ''}`} />
                                    {notifications.unreadCount > 0 && (
                                        <motion.div 
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            key={notifications.unreadCount}
                                            className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] px-1 bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 text-[9px] font-bold text-white shadow-sm z-20"
                                        >
                                            {notifications.unreadCount > 99 ? '99+' : notifications.unreadCount}
                                        </motion.div>
                                    )}
                                </div>
                            </button>
                            <AnimatePresence>{showNotificationCenter && <NotificationCenter onClose={() => setShowNotificationCenter(false)} onGoToSettings={handleOpenSettings} />}</AnimatePresence>
                         </div>

                        <button onClick={() => setIsMobileMenuOpen(true)} className={navItemClass}><MenuIcon className="w-6 h-6"/></button>
                    </div>
                </motion.div>
            </header>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        key="mobile-menu-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
                    >
                        <motion.div
                            key="mobile-menu-panel"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-[#0f172a]/95 border-l border-gray-200 dark:border-white/10 flex flex-col p-6 shadow-2xl overflow-y-auto"
                        >
                           <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-6 right-6 p-2 text-gray-500 dark:text-gray-400"><CloseIcon className="w-6 h-6"/></button>

                           {/* User Profile Section */}
                           <div className="flex items-center gap-4 mb-8 mt-4">
                                <div className="relative">
                                    <div className={`w-14 h-14 rounded-full p-0.5 border-2 ${rank.color.replace('text-', 'border-').replace('400', '500/50').replace('500', '600/50')} bg-white dark:bg-black/40 overflow-hidden`}>
                                        <UserAvatar avatarId={currentUser.avatar} frameId={currentUser.questData?.equippedFrame} className="w-full h-full rounded-full" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center border border-gray-200 dark:border-white/10 shadow-lg text-sm">
                                        {rank.icon}
                                    </div>
                                </div>
                                <div>
                                    <h2 className="font-bold text-lg text-gray-900 dark:text-white">{currentUser.displayName}</h2>
                                    <p className={`text-xs font-bold uppercase tracking-wider ${rank.color}`}>{rank.name} • {currentUser.elo} ELO</p>
                                </div>
                           </div>

                           {/* Stats */}
                           <div className="flex gap-4 mb-8">
                                <div className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/5">
                                    <CoinIcon className="w-6 h-6 text-yellow-500 dark:text-yellow-400"/>
                                    <div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Coins</div>
                                        <div className="font-bold text-gray-900 dark:text-white">{app?.coins}</div>
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col justify-center p-3 rounded-xl bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/5">
                                    <div className="flex items-center justify-between text-xs text-purple-600 dark:text-purple-300 mb-1">
                                        <span>XP</span>
                                        <span>{currentXp} / {xpForNextLevel}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-purple-200 dark:bg-purple-900 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500" style={{ width: `${xpPercentage}%` }}></div>
                                    </div>
                                </div>
                           </div>

                           {/* Links */}
                           <div className="flex-1 space-y-2">
                                <button onClick={handleGoToProfile} className={mobileMenuItemClass}><UserIcon className="w-5 h-5"/> Profile</button>
                                <button onClick={handleOpenSocial} className={mobileMenuItemClass}><UsersIcon className="w-5 h-5"/> Friends</button>
                                <button onClick={handleGoToHistory} className={mobileMenuItemClass}><HistoryIcon className="w-5 h-5"/> History</button>
                                <button onClick={handleShowInstructions} className={mobileMenuItemClass}><BookOpenIcon className="w-5 h-5"/> How to Play</button>
                                <button onClick={handleOpenSettings} className={mobileMenuItemClass}><CogIcon className="w-5 h-5"/> Settings</button>
                           </div>

                           <button onClick={() => { setIsMobileMenuOpen(false); auth?.logout(); }} className="mt-8 p-4 flex items-center justify-center gap-2 text-red-500 font-bold bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
                               <LogoutIcon className="w-5 h-5"/> Sign Out
                           </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}
            </AnimatePresence>
        </>
    );
};

export default Header;

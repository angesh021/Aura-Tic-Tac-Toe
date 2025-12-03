
import React, { useContext, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../contexts/AuthContext';
import { AppContext } from '../contexts/AppContext';
import { HistoryIcon, LogoutIcon, BookOpenIcon, CoinIcon, UsersIcon, CloseIcon, BellIcon, MenuIcon, UserIcon } from './Icons';
import { UserAvatar } from './Avatars';
import Tooltip from './Tooltip';
import InstructionsModal from './InstructionsModal';
import { SocialHubContext } from '../contexts/SocialHubContext';
import NotificationCenter from './NotificationCenter';
import { useNotifications } from '../contexts/NotificationContext';
import { useToast } from '../contexts/ToastContext';

type ProfileTab = 'overview' | 'customize' | 'settings';

interface HeaderProps {
    onGoToProfile: (tab?: ProfileTab) => void;
    onGoToHistory: () => void;
}

const getXPForLevel = (level: number) => 100 + (level - 1) * 50;

const Header: React.FC<HeaderProps> = ({ onGoToProfile, onGoToHistory }) => {
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
    const [pulseNotif, setPulseNotif] = useState(false);
    const prevUnreadCount = useRef(notifications.unreadCount);

    const currentUser = auth?.currentUser;
    const prevLevelRef = useRef(currentUser?.level || 1);

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
        if (app?.coins !== undefined) {
            const diff = app.coins - prevCoinsRef.current;
            if (diff !== 0) {
                setCoinChange(diff);
                prevCoinsRef.current = app.coins;
                const timer = setTimeout(() => setCoinChange(0), 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [app?.coins]);


    if (!currentUser) return null;

    const xpForNextLevel = getXPForLevel(currentUser.level || 1);
    const currentXp = currentUser.xp || 0;
    const xpPercentage = (currentXp / xpForNextLevel) * 100;

    const navItemClass = "relative h-10 px-3 flex items-center justify-center gap-2 text-sm font-semibold text-gray-300 hover:text-white rounded-lg transition-all duration-200 cursor-pointer group";
    const iconClass = "w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity";

    const closeAllPopups = () => {
        setIsMobileMenuOpen(false);
        setIsProfileOpen(false);
        setShowNotificationCenter(false);
    }
    
    const handleGoToProfile = () => { closeAllPopups(); onGoToProfile(); }
    const handleGoToHistory = () => { closeAllPopups(); onGoToHistory(); }
    const handleGoToSettings = () => { closeAllPopups(); onGoToProfile('settings'); };
    const handleOpenSocial = () => { closeAllPopups(); socialHub?.openHub(); }
    const handleShowInstructions = () => { closeAllPopups(); setShowInstructions(true); }
    
    const NavItem = ({ children, tooltipText, onClick, className }: React.PropsWithChildren<{ tooltipText: string, onClick?: () => void, className?: string }>) => (
        <Tooltip text={tooltipText}>
            <button onClick={onClick} className={`${navItemClass} ${className}`}>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 rounded-lg transition-colors duration-300"></div>
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 12px 2px rgba(34, 211, 238, 0.3)' }}></div>
                <div className="relative z-10 flex items-center justify-center gap-2">
                    {children}
                </div>
            </button>
        </Tooltip>
    );

    const mobileMenuItemClass = "flex items-center gap-4 p-4 text-left font-semibold text-gray-300 rounded-xl hover:bg-white/10 transition-colors w-full";

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-40 h-24 px-4 flex justify-center items-center pointer-events-none">
                <motion.div 
                    className="w-full max-w-7xl h-16 px-4 flex items-center justify-between glass-panel rounded-2xl pointer-events-auto"
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                    {/* Left: Logo */}
                    <button onClick={app?.goHome} className="text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 hover:opacity-80 transition-opacity">
                        Aura
                    </button>

                    {/* Center & Right: Desktop */}
                    <div className="hidden md:flex items-center gap-2">
                        {/* XP and Coins */}
                        <Tooltip text={`XP: ${currentXp} / ${xpForNextLevel}`}>
                            <div className="flex items-center gap-2 px-3 h-10 rounded-lg bg-black/20">
                                <div className="px-2 py-0.5 bg-purple-500/20 border border-purple-400/30 rounded-md text-xs font-black text-purple-300 shadow-sm">{currentUser.level || 1}</div>
                                <div className="w-24 h-2 bg-purple-900/50 rounded-full overflow-hidden border border-white/5">
                                    <motion.div 
                                        className="h-full bg-gradient-to-r from-purple-400 to-pink-500"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${xpPercentage}%`}}
                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                    />
                                </div>
                            </div>
                        </Tooltip>
                        
                        <Tooltip text="Aura Coins">
                             <motion.div 
                                id="header-coin-balance"
                                className={`flex items-center gap-2 px-3 h-10 rounded-lg transition-colors duration-300 cursor-help relative
                                    ${coinChange > 0 ? 'bg-green-500/20' : (coinChange < 0 ? 'bg-red-500/20' : 'bg-black/20')}
                                `}
                                animate={coinChange !== 0 ? { scale: [1, 1.1, 1] } : {}}
                                transition={{ duration: 0.4 }}
                            >
                                <CoinIcon className={`w-5 h-5 transition-colors ${coinChange > 0 ? 'text-green-400' : (coinChange < 0 ? 'text-red-400' : 'text-yellow-400')}`} />
                                <span className={`text-sm font-bold block ${coinChange > 0 ? 'text-green-300' : (coinChange < 0 ? 'text-red-300' : 'text-white')}`}>{app?.coins}</span>
                                <AnimatePresence>
                                    {coinChange !== 0 && (
                                        <motion.span 
                                            initial={{ opacity: 0, y: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, y: -25, scale: 1.1 }}
                                            exit={{ opacity: 0, y: -30, scale: 0.5 }}
                                            className={`absolute right-0 top-0 text-sm font-black drop-shadow-md z-50 pointer-events-none ${coinChange > 0 ? 'text-green-400' : 'text-red-400'}`}
                                        >
                                            {coinChange > 0 ? '+' : ''}{coinChange}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </Tooltip>
                        
                        <div className="h-6 w-px bg-white/10 mx-1"></div>
                        
                        <NavItem tooltipText="Social Hub" onClick={() => socialHub?.openHub()}><UsersIcon className={iconClass} /></NavItem>
                        
                        <div className="relative">
                            <NavItem tooltipText="Notifications" onClick={() => setShowNotificationCenter(prev => !prev)}>
                                <BellIcon className={`${iconClass} ${pulseNotif ? 'animate-glow-pulse' : ''}`} />
                                {notifications.unreadCount > 0 && (
                                    <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-gray-900" />
                                )}
                            </NavItem>
                            <AnimatePresence>{showNotificationCenter && <NotificationCenter onClose={() => setShowNotificationCenter(false)} onGoToSettings={handleGoToSettings} />}</AnimatePresence>
                        </div>

                        <NavItem tooltipText="How to Play" onClick={() => setShowInstructions(true)}><BookOpenIcon className={iconClass} /></NavItem>

                        <div className="h-6 w-px bg-white/10 mx-1"></div>

                        {/* User Dropdown */}
                        <div ref={dropdownRef} className="relative">
                            <button onClick={() => setIsProfileOpen(o => !o)} className={`${navItemClass} pl-1.5 pr-3 h-10 bg-white/5 group`}>
                                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 rounded-lg transition-colors duration-300"></div>
                                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 12px 2px rgba(34, 211, 238, 0.3)' }}></div>
                                <div className="relative z-10 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/10">
                                        <UserAvatar avatarId={currentUser.avatar} className="w-full h-full" />
                                    </div>
                                    <span className="max-w-[100px] truncate">{currentUser.displayName}</span>
                                </div>
                            </button>
                            <AnimatePresence>
                                {isProfileOpen && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                        className="absolute top-full right-0 mt-2 w-48 bg-slate-800/90 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-2 z-50"
                                    >
                                        <button onClick={handleGoToProfile} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-white/10 transition-colors text-gray-200"><UserIcon className="w-4 h-4 text-cyan-400"/> My Profile</button>
                                        <button onClick={handleGoToHistory} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-white/10 transition-colors text-gray-200"><HistoryIcon className="w-4 h-4 text-purple-400"/> History</button>
                                        <div className="h-px bg-white/10 my-1"></div>
                                        <button onClick={auth?.logout} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-red-500/20 text-red-400 transition-colors"><LogoutIcon className="w-4 h-4"/> Logout</button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                    
                    {/* Mobile: Hamburger */}
                    <div className="flex md:hidden items-center gap-2">
                         <div className="relative">
                            <button onClick={() => setShowNotificationCenter(p => !p)} className={`${navItemClass} relative`}>
                                <BellIcon className={`${iconClass} ${pulseNotif ? 'animate-glow-pulse' : ''}`} />
                                {notifications.unreadCount > 0 && <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-gray-900" />}
                            </button>
                            <AnimatePresence>{showNotificationCenter && <NotificationCenter onClose={() => setShowNotificationCenter(false)} onGoToSettings={handleGoToSettings} />}</AnimatePresence>
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
                            className="absolute top-0 right-0 h-full w-full max-w-sm bg-[#0f172a]/95 border-l border-white/10 flex flex-col p-6"
                        >
                           <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400"><CloseIcon className="w-6 h-6"/></button>

                           {/* User Profile Section */}
                           <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-cyan-400/50">
                                    <UserAvatar avatarId={currentUser.avatar} className="w-full h-full" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-lg text-white">{currentUser.displayName}</h2>
                                    <p className="text-xs text-gray-400">Level {currentUser.level || 1}</p>
                                </div>
                           </div>

                           {/* Stats */}
                           <div className="flex gap-4 mb-8">
                                <div className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-black/20">
                                    <CoinIcon className="w-6 h-6 text-yellow-400"/>
                                    <div>
                                        <div className="text-xs text-gray-400">Coins</div>
                                        <div className="font-bold text-white">{app?.coins}</div>
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col justify-center p-3 rounded-xl bg-black/20">
                                    <div className="flex items-center justify-between text-xs text-purple-300 mb-1">
                                        <span>XP</span>
                                        <span>{currentXp} / {xpForNextLevel}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-purple-900/50 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500" style={{width: `${xpPercentage}%`}}/>
                                    </div>
                                </div>
                           </div>
                           
                           {/* Links */}
                           <nav className="flex flex-col gap-2 flex-1">
                                <button onClick={handleGoToProfile} className={mobileMenuItemClass}><UserIcon className="w-5 h-5 text-cyan-400"/> Profile & Settings</button>
                                <button onClick={handleGoToHistory} className={mobileMenuItemClass}><HistoryIcon className="w-5 h-5 text-purple-400"/> Match History</button>
                                <button onClick={handleOpenSocial} className={mobileMenuItemClass}><UsersIcon className="w-5 h-5 text-pink-400"/> Social Hub</button>
                                <button onClick={handleShowInstructions} className={mobileMenuItemClass}><BookOpenIcon className="w-5 h-5 text-yellow-400"/> How to Play</button>
                           </nav>

                           {/* Logout */}
                           <button onClick={() => { closeAllPopups(); auth?.logout(); }} className="mt-8 w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold transition-colors">
                               <LogoutIcon className="w-5 h-5"/> Logout
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

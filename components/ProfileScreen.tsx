


import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { AuthContext } from '../contexts/AuthContext';
import { AppContext } from '../contexts/AppContext';
import { 
    CloseIcon, CheckCircleIcon, BadgeIcon, CopyIcon, UserIcon, 
    PaletteIcon, CogIcon, LockIcon, TrophyIcon, LightningIcon, FlameIcon, ChartIcon, CheckIcon, ShieldCheckIcon, SmartphoneIcon, KeyIcon,
    TrashIcon, LogoutIcon, InfoIcon, ShieldIcon, HistoryIcon, SendIcon, CrownIcon, GridIcon, CoinIcon, PencilIcon, WifiIcon, GiftIcon, AlertIcon, ClockIcon, StarIcon, UsersIcon, MessageIcon
} from './Icons';
import { AVATAR_LIST, UserAvatar } from './Avatars';
import { useToast } from '../contexts/ToastContext';
import Tooltip from './Tooltip';
import { getBadge, getRank, RANKS, ALL_BADGES } from '../utils/badgeData';
import Modal from './Modal';
import { SHOP_ITEMS, progressService } from '../services/progress';
import { API_URL } from '../utils/config';
import ChangePasswordModal from './ChangePasswordModal';
import { getToken, resendVerificationEmail } from '../services/auth';
import AvatarFrame from './AvatarFrame';
import { User } from '../types';
import ConfirmationModal from './ConfirmationModal';
import { deleteHistory } from '../services/history';
import SecurityRewardModal from './SecurityRewardModal';

type ProfileTab = 'overview' | 'customize' | 'security';

interface ProfileScreenProps {
  onBack: () => void;
  initialTab?: 'overview' | 'customize' | 'security';
}

const XP_PER_LEVEL_BASE = 100;
const XP_PER_LEVEL_GROWTH = 50;

const getLevelProgress = (xp: number, level: number) => {
    const xpForCurrentLevel = XP_PER_LEVEL_BASE + (level - 1) * XP_PER_LEVEL_GROWTH;
    return Math.min(100, Math.max(0, (xp / xpForCurrentLevel) * 100));
};

const getXPNeededForNextLevel = (level: number) => {
    return XP_PER_LEVEL_BASE + (level - 1) * XP_PER_LEVEL_GROWTH;
};

const getRankProgress = (elo: number) => {
    const currentRank = getRank(elo);
    const nextRankIndex = RANKS.findIndex(r => r.name === currentRank.name) + 1;
    const nextRank = RANKS[nextRankIndex];

    if (!nextRank) return { progress: 100, nextRank: null, min: currentRank.minElo, max: currentRank.minElo }; // Max rank

    const min = currentRank.minElo;
    const max = nextRank.minElo;
    const progress = Math.min(100, Math.max(0, ((elo - min) / (max - min)) * 100));

    return { progress, nextRank, min, max };
};

const SecurityBadgeItem: React.FC<{
    label: string;
    subtext: string;
    icon: React.ReactNode;
    active: boolean;
    colorTheme: 'green' | 'blue' | 'purple' | 'orange';
    delay: number;
    onClick?: () => void;
}> = ({ label, subtext, icon, active, colorTheme, delay, onClick }) => {
    const styles = {
        green: { activeBg: 'bg-green-500/10', border: 'border-green-500/30', iconBg: 'bg-green-500', dot: 'bg-green-400', shadow: 'shadow-green-500/10' },
        blue: { activeBg: 'bg-blue-500/10', border: 'border-blue-500/30', iconBg: 'bg-blue-500', dot: 'bg-blue-400', shadow: 'shadow-blue-500/10' },
        purple: { activeBg: 'bg-purple-500/10', border: 'border-purple-500/30', iconBg: 'bg-purple-500', dot: 'bg-purple-400', shadow: 'shadow-purple-500/10' },
        orange: { activeBg: 'bg-orange-500/10', border: 'border-orange-500/30', iconBg: 'bg-orange-500', dot: 'bg-orange-400', shadow: 'shadow-orange-500/10' },
    };
    const s = styles[colorTheme];

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            onClick={onClick}
            className={`
                relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-500 overflow-hidden min-w-[100px] flex-1
                ${active 
                    ? `${s.activeBg} ${s.border} shadow-[0_0_20px_-5px_rgba(0,0,0,0.3)]` 
                    : 'bg-white/5 border-white/5 opacity-50 grayscale'
                }
                ${onClick ? 'cursor-pointer hover:bg-white/10' : ''}
            `}
        >
            <div className={`p-2.5 rounded-xl mb-2 transition-all ${active ? `${s.iconBg} text-white shadow-lg` : 'bg-gray-800 text-gray-500'}`}>
                {icon}
            </div>
            <div className="text-center">
                <div className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${active ? 'text-white' : 'text-gray-500'}`}>{label}</div>
                <div className="text-[10px] text-gray-400 font-medium leading-tight">{subtext}</div>
            </div>
            {active && <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse shadow-[0_0_8px_currentColor]`} />}
        </motion.div>
    );
};

const SecurityGauge: React.FC<{ score: number }> = ({ score }) => {
    const motionScore = useMotionValue(0);
    const roundedScore = useTransform(motionScore, Math.round);

    useEffect(() => {
        const animation = animate(motionScore, score, { duration: 2, ease: "circOut" });
        return animation.stop;
    }, [score]);

    let color = "#ef4444"; // Red (Vulnerable)
    
    if (score >= 50) color = "#eab308";
    if (score >= 80) color = "#06b6d4";
    if (score === 100) color = "#8b5cf6";

    const circumference = Math.PI * 140; // r=70

    return (
        <div className="relative flex items-center justify-center w-48 h-48">
            {/* Rotating Outer Ring */}
            <motion.div 
                className="absolute inset-0 rounded-full border border-dashed border-white/10"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
            
            {/* Main Gauge SVG */}
            <svg className="w-full h-full transform -rotate-90 drop-shadow-2xl" viewBox="0 0 160 160">
                <defs>
                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={score < 50 ? "#ef4444" : (score < 80 ? "#eab308" : "#06b6d4")} />
                        <stop offset="100%" stopColor={color} />
                    </linearGradient>
                </defs>
                
                {/* Track */}
                <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                
                {/* Progress */}
                <motion.circle
                    cx="80" cy="80" r="70" fill="none" stroke="url(#gaugeGradient)" strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
                    transition={{ duration: 2, ease: "circOut" }}
                />
            </svg>
            
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div className="text-5xl font-black text-white tracking-tighter leading-none" style={{ textShadow: `0 0 20px ${color}80` }}>
                    <motion.span>{roundedScore}</motion.span>
                </motion.div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Score</span>
            </div>
        </div>
    );
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack, initialTab = 'overview' }) => {
    const auth = useContext(AuthContext);
    const app = useContext(AppContext);
    const toast = useToast();
    
    const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [mfaSetupData, setMfaSetupData] = useState<{ secret: string, qr: string, backupCodes: string[] } | null>(null);
    const [mfaCode, setMfaCode] = useState('');
    const [showMfaSetup, setShowMfaSetup] = useState(false);
    const [mfaStep, setMfaStep] = useState(1); // 1: QR, 2: Code, 3: Backup
    
    // Security Reward State
    const [pendingReward, setPendingReward] = useState<{ type: 'email' | 'mfa' | 'password', reward: number } | null>(null);
    
    // Email Verification Cooldown & Status
    const [emailCooldown, setEmailCooldown] = useState(0);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [lastEmailSentAt, setLastEmailSentAt] = useState<number | null>(null);
    
    // Edit Profile State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        displayName: auth?.currentUser?.displayName || '',
        bio: auth?.currentUser?.bio || '',
        customStatus: auth?.currentUser?.customStatus || ''
    });

    const [showHistoryConfirm, setShowHistoryConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    const user = auth?.currentUser;
    
    const rank = user ? getRank(user.elo) : null;
    const rankData = user ? getRankProgress(user.elo) : null;
    const xpProgress = user ? getLevelProgress(user.xp, user.level) : 0;
    const xpNeeded = user ? getXPNeededForNextLevel(user.level) : 100;

    // Detect if security rewards are available
    useEffect(() => {
        if (!user || !user.questData) return;
        const rewards = user.questData.securityRewards || {};
        
        // Priority check order: Email -> MFA -> Password
        if (user.emailVerified && !rewards.email) {
            setPendingReward({ type: 'email', reward: 500 });
        } else if (user.mfaEnabled && !rewards.mfa) {
            setPendingReward({ type: 'mfa', reward: 1000 });
        } else if (isPasswordFresh(user.questData.lastPasswordChange) && !rewards.password) {
            setPendingReward({ type: 'password', reward: 250 });
        }
    }, [user, user?.questData, user?.emailVerified, user?.mfaEnabled]);

    const handleClaimSecurityReward = async () => {
        if (!pendingReward) return;
        const res = await progressService.claimSecurityReward(pendingReward.type);
        if (res.success) {
            app?.refreshCoins();
            auth?.reloadUser?.();
            setPendingReward(null);
        } else {
            toast.error("Could not claim reward.");
        }
    };

    useEffect(() => {
        if (user) {
            setEditForm({
                displayName: user.displayName,
                bio: user.bio || '',
                customStatus: user.customStatus || ''
            });
        }
    }, [user]);

    // Check cooldown & last sent on mount
    useEffect(() => {
        const stored = localStorage.getItem('aura_email_cooldown');
        if (stored) {
            const targetTime = parseInt(stored, 10);
            const now = Date.now();
            if (targetTime > now) {
                setEmailCooldown(Math.ceil((targetTime - now) / 1000));
            } else {
                localStorage.removeItem('aura_email_cooldown');
            }
        }

        const sentTime = localStorage.getItem('aura_email_sent_timestamp');
        if (sentTime) {
            setLastEmailSentAt(parseInt(sentTime, 10));
        }
    }, []);

    // Timer logic
    useEffect(() => {
        if (emailCooldown > 0) {
            const interval = setInterval(() => {
                setEmailCooldown(prev => {
                    if (prev <= 1) {
                        localStorage.removeItem('aura_email_cooldown');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [emailCooldown]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getSentTimeLabel = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return isToday ? `today at ${timeStr}` : `on ${date.toLocaleDateString()} at ${timeStr}`;
    };

    const copyFriendCode = () => {
        if (user?.friendCode) {
            navigator.clipboard.writeText(user.friendCode);
            toast.success("Friend Code copied!");
        }
    };

    const handleResendEmail = async () => {
        if (emailCooldown > 0 || isSendingEmail) return;
        
        setIsSendingEmail(true);
        try {
            await resendVerificationEmail();
            toast.success("Verification email sent! Check your inbox.");
            
            // Record success time
            const now = Date.now();
            localStorage.setItem('aura_email_sent_timestamp', now.toString());
            setLastEmailSentAt(now);
            
            // Set 60 seconds cooldown (Only on success)
            const cooldownSecs = 60;
            const target = Date.now() + cooldownSecs * 1000;
            localStorage.setItem('aura_email_cooldown', target.toString());
            setEmailCooldown(cooldownSecs);
        } catch (e: any) {
            toast.error(e.message || "Failed to send email");
        } finally {
            setIsSendingEmail(false);
        }
    };

    const handleEquip = async (itemId: string, type: 'avatar' | 'theme' | 'skin' | 'frame') => {
        const success = await progressService.equipItem(itemId, type);
        if (success) {
            if (type === 'avatar') auth?.updateUser({ avatar: itemId });
            if (type === 'frame') {
                if (auth?.currentUser) {
                    const updatedQuestData = { ...auth.currentUser.questData, equippedFrame: itemId };
                    auth.updateUser({ questData: updatedQuestData as any });
                }
            }
            app?.refreshUser();
            toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} equipped!`);
        } else {
            toast.error("Failed to equip item.");
        }
    };

    const handleSaveProfile = async () => {
        if (!editForm.displayName.trim()) {
            toast.error("Display Name cannot be empty.");
            return;
        }
        
        try {
            await auth?.updateUser({
                displayName: editForm.displayName,
                bio: editForm.bio,
                customStatus: editForm.customStatus
            });
            setIsEditing(false);
            toast.success("Profile Updated!");
        } catch (e: any) {
            toast.error(e.message || "Failed to update profile.");
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        if (user) {
            setEditForm({
                displayName: user.displayName,
                bio: user.bio || '',
                customStatus: user.customStatus || ''
            });
        }
    };

    const initiateMfa = async () => {
        try {
            const res = await fetch(`${API_URL}/me/mfa/setup`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || "Failed to start MFA setup");
            }

            const data = await res.json();
            setMfaSetupData(data);
            setShowMfaSetup(true);
            setMfaStep(1);
        } catch (e: any) {
            toast.error(e.message || "Failed to start MFA setup");
        }
    };

    const cancelMfaSetup = () => {
        setShowMfaSetup(false);
        setMfaSetupData(null);
        setMfaCode('');
        setMfaStep(1);
    };

    const verifyMfa = async () => {
        if (mfaCode.length !== 6) return;
        try {
            const res = await fetch(`${API_URL}/me/mfa/verify`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}` 
                },
                body: JSON.stringify({ code: mfaCode })
            });
            
            if (res.ok) {
                toast.success("2FA Verified!");
                setMfaStep(3); // Go to backup codes
            } else {
                toast.error("Invalid code");
            }
        } catch (e) {
            toast.error("Verification failed");
        }
    };

    const finishMfaSetup = () => {
        setShowMfaSetup(false);
        setMfaSetupData(null);
        setMfaCode('');
        // Optimistic update for immediate UI feedback
        auth?.updateUser({ mfaEnabled: true }).then(() => {
            // Then reload to sync fully
            auth?.reloadUser?.();
        });
        toast.success("Account Secured!");
    };

    const disableMfa = async () => {
        if (!confirm("Are you sure you want to disable 2FA? This makes your account less secure.")) return;
        try {
            const res = await fetch(`${API_URL}/me/mfa`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (res.ok) {
                toast.success("2FA Disabled");
                auth?.updateUser({ mfaEnabled: false });
            }
        } catch (e) {
            toast.error("Failed to disable 2FA");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    const isPasswordFresh = (lastChange?: string) => {
        if (!lastChange) return false;
        const changeDate = new Date(lastChange);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return changeDate > sixMonthsAgo;
    };

    const getPasswordAgeText = (lastChange?: string) => {
        if (!lastChange) return "Security Update Recommended";
        const changeDate = new Date(lastChange);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - changeDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return "Changed today";
        if (diffDays === 1) return "Changed yesterday";
        if (diffDays < 7) return `Changed ${diffDays} days ago`;
        if (diffDays < 30) return `Changed ${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
        if (diffDays < 60) return "Changed 1 month ago";
        if (diffDays > 180) return "Update Recommended";
        return `Changed ${Math.floor(diffDays / 30)} months ago`;
    };

    const getSecurityScore = (u: User) => {
        let score = 10; // Base account creation
        if (u.emailVerified) score += 30;
        if (u.mfaEnabled) score += 40;
        if (isPasswordFresh(u.questData?.lastPasswordChange)) score += 20;
        return score;
    };

    const handleClearHistory = async () => {
        try {
            await deleteHistory();
            toast.success("History cleared.");
        } catch(e: any) {
            toast.error(e.message);
        }
        setShowHistoryConfirm(false);
    };

    const handleDeleteAccount = async () => {
        try {
            await auth?.deleteAccount?.();
            toast.success("Account deleted.");
            setShowDeleteConfirm(false);
            onBack(); // Ensure we close this screen too if needed
        } catch(e: any) {
            toast.error(e.message);
        }
    };

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight animation class logic could go here
        }
    }

    if (!user) return null;

    // Filter items
    const allAvatars = SHOP_ITEMS.filter(i => i.type === 'avatar');
    const allFrames = SHOP_ITEMS.filter(i => i.type === 'frame');

    const equippedFrame = user.questData?.equippedFrame || 'frame-none';

    // Mask email for security tab
    const maskedEmail = user.email.replace(/(^.{2}).*(@.*$)/, '$1***$2');

    // Progression Calcs
    const passwordRotated = isPasswordFresh(user.questData?.lastPasswordChange);
    const securityScore = getSecurityScore(user);
    const passwordStatusText = getPasswordAgeText(user.questData?.lastPasswordChange);
    const passwordStatusColor = passwordRotated ? 'text-green-500' : 'text-orange-500';
    
    // Dynamic BG for Security Card
    const securityTier = securityScore >= 80 ? 'Fortified' : (securityScore >= 50 ? 'Moderate' : 'Vulnerable');
    const securityColor = securityScore >= 80 ? 'purple' : (securityScore >= 50 ? 'yellow' : 'red');
    const securityBgClass = securityScore >= 80 ? "bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 border-purple-500/30" :
                securityScore >= 50 ? "bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-yellow-500/20" :
                "bg-gradient-to-br from-red-900/30 to-orange-900/30 border-red-500/20";

    return (
        <motion.div 
            className="w-full md:max-w-5xl h-full md:h-[85vh] bg-gray-50 dark:bg-[#0f172a] rounded-none md:rounded-[32px] shadow-2xl border-0 md:border border-gray-200 dark:border-white/10 flex flex-col relative overflow-hidden fixed inset-0 md:relative"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
        >
            {/* Header / Sidebar Toggle Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 md:p-8 shrink-0 relative z-20 gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-white transition-colors">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Profile</h1>
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex bg-gray-200 dark:bg-white/5 p-1 rounded-xl w-full md:w-auto">
                    {[
                        { id: 'overview', icon: <ChartIcon className="w-4 h-4"/>, label: 'Overview' },
                        { id: 'customize', icon: <PaletteIcon className="w-4 h-4"/>, label: 'Customize' },
                        { id: 'security', icon: <ShieldCheckIcon className="w-4 h-4"/>, label: 'Security' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as ProfileTab)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                activeTab === tab.id 
                                ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                        >
                            {tab.icon} <span className="inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 pt-0 relative z-10 pb-24 md:pb-8">
                <AnimatePresence mode="wait">
                    {/* ... (Overview and Customize tabs remain unchanged) ... */}
                    {activeTab === 'overview' && (
                        <motion.div 
                            key="overview"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-black p-8 text-white border border-white/10 shadow-2xl">
                                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                                    <UserIcon className="w-64 h-64" />
                                </div>
                                
                                <div className="flex flex-col md:flex-row items-start gap-8 relative z-10">
                                    {/* Avatar & Rank */}
                                    <div className="relative group self-center md:self-start">
                                        <div className="w-32 h-32 rounded-full p-1 border-4 border-white/10 bg-black shadow-2xl">
                                            <AvatarFrame frameId={equippedFrame} className="w-full h-full">
                                                <UserAvatar avatarId={user.avatar} className="w-full h-full rounded-full" />
                                            </AvatarFrame>
                                        </div>
                                        <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-lg text-xl bg-white dark:bg-gray-800`}>
                                            {rank?.icon}
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 w-full">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1">
                                                {isEditing ? (
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="text-xs text-gray-400 uppercase font-bold">Display Name</label>
                                                            <input 
                                                                value={editForm.displayName}
                                                                onChange={(e) => setEditForm({...editForm, displayName: e.target.value})}
                                                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white font-bold text-xl focus:outline-none focus:border-cyan-400"
                                                                maxLength={20}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-gray-400 uppercase font-bold">Custom Status</label>
                                                            <input 
                                                                value={editForm.customStatus}
                                                                onChange={(e) => setEditForm({...editForm, customStatus: e.target.value})}
                                                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-400"
                                                                placeholder="What's on your mind?"
                                                                maxLength={30}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            <h2 className="text-2xl md:text-4xl font-black tracking-tight break-all">{user.displayName}</h2>
                                                            {user.clan && <span className="text-sm font-bold px-2 py-0.5 rounded bg-white/10 text-cyan-300">[{user.clan.tag}]</span>}
                                                            {user.emailVerified && (
                                                                <Tooltip text="Verified Account">
                                                                    <CheckCircleIcon className="w-6 h-6 text-cyan-400" />
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {user.customStatus && (
                                                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-medium text-cyan-200">
                                                                    {user.customStatus}
                                                                </div>
                                                            )}
                                                            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs font-bold text-gray-400">
                                                                Joined {new Date().getFullYear()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-start gap-2 ml-4">
                                                {isEditing ? (
                                                    <>
                                                        <button 
                                                            onClick={handleCancelEdit}
                                                            className="p-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors shrink-0"
                                                            title="Cancel"
                                                        >
                                                            <CloseIcon className="w-5 h-5"/>
                                                        </button>
                                                        <button 
                                                            onClick={handleSaveProfile}
                                                            className="p-2 rounded-xl bg-green-500 hover:bg-green-600 text-white transition-colors shrink-0"
                                                            title="Save"
                                                        >
                                                            <CheckIcon className="w-5 h-5"/>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button 
                                                        onClick={() => setIsEditing(true)}
                                                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
                                                        title="Edit Profile"
                                                    >
                                                        <PencilIcon className="w-5 h-5"/>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="mt-4 mb-6">
                                            {isEditing ? (
                                                <div>
                                                    <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Bio</label>
                                                    <textarea 
                                                        value={editForm.bio}
                                                        onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                                                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-400 resize-none h-20"
                                                        placeholder="Tell the world about yourself..."
                                                        maxLength={100}
                                                    />
                                                </div>
                                            ) : (
                                                <p className="text-indigo-200 text-sm leading-relaxed max-w-lg min-h-[1.5em] italic">
                                                    "{user.bio || "No bio set."}"
                                                </p>
                                            )}
                                        </div>

                                        {/* Rank Progress */}
                                        <div className="mb-4 bg-black/20 p-3 rounded-xl border border-white/5">
                                            <div className="flex justify-between items-end mb-1">
                                                <div className="flex items-center gap-2">
                                                    <TrophyIcon className="w-4 h-4 text-yellow-400" />
                                                    <span className={`text-sm font-bold uppercase ${rank?.color}`}>{rank?.name}</span>
                                                    <span className="text-xs text-gray-400">({user.elo} ELO)</span>
                                                </div>
                                                {rankData?.nextRank && <span className="text-xs font-bold text-gray-500 uppercase">Next: {rankData.nextRank.name}</span>}
                                            </div>
                                            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-yellow-500 to-orange-500" 
                                                    style={{ width: `${rankData?.progress || 100}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Level XP */}
                                        <div className="flex justify-between items-end mb-1">
                                            <div className="text-xs font-bold text-indigo-300">Level {user.level}</div>
                                            <div className="text-xs font-mono text-gray-400">{user.xp} / {xpNeeded} XP</div>
                                        </div>
                                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-cyan-400 to-purple-500" 
                                                style={{ width: `${xpProgress}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Friend Code - Hidden on small mobile, visible on desktop */}
                                    <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 text-center min-w-[140px] hidden md:block">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Friend Code</div>
                                        <button 
                                            onClick={copyFriendCode}
                                            className="text-2xl font-mono font-black text-white hover:text-cyan-400 transition-colors flex items-center justify-center gap-2 group"
                                        >
                                            {user.friendCode}
                                            <CopyIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-green-500/10 rounded-full text-green-500"><TrophyIcon className="w-6 h-6" /></div>
                                    <div>
                                        <div className="text-2xl font-black text-green-500">{user.wins}</div>
                                        <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Victories</div>
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-cyan-500/10 rounded-full text-cyan-500"><ChartIcon className="w-6 h-6" /></div>
                                    <div>
                                        <div className="text-2xl font-black text-cyan-500">
                                            {user.wins + user.losses > 0 ? Math.round((user.wins / (user.wins + user.losses)) * 100) : 0}%
                                        </div>
                                        <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Win Rate</div>
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-orange-500/10 rounded-full text-orange-500"><FlameIcon className="w-6 h-6" /></div>
                                    <div>
                                        <div className="text-2xl font-black text-orange-500">{user.questData?.dailyStreak || 0}</div>
                                        <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Day Streak</div>
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-purple-500/10 rounded-full text-purple-500"><GridIcon className="w-6 h-6" /></div>
                                    <div>
                                        <div className="text-2xl font-black text-purple-500">{user.wins + user.losses + user.draws}</div>
                                        <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Games</div>
                                    </div>
                                </div>
                            </div>

                            {/* Trophy Case */}
                            <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-200 dark:border-white/5">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <StarIcon className="w-5 h-5 text-yellow-500" /> Trophy Case
                                </h3>
                                
                                {(!user.badges || user.badges.length === 0) ? (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <LockIcon className="w-5 h-5 opacity-50" />
                                        </div>
                                        <p className="text-sm font-medium">No badges earned yet.</p>
                                        <p className="text-xs">Play matches to unlock achievements!</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                        {user.badges.map(badgeId => {
                                            const badge = getBadge(badgeId);
                                            if (!badge) return null;
                                            return (
                                                <Tooltip key={badgeId} text={badge.description}>
                                                    <div className={`p-3 rounded-xl border ${badge.border} bg-white/5 flex flex-col items-center gap-2 text-center group transition-transform hover:scale-105 cursor-help`}>
                                                        <div className="text-2xl filter drop-shadow-md">{badge.icon}</div>
                                                        <div className={`text-[10px] font-bold uppercase ${badge.color}`}>{badge.name}</div>
                                                    </div>
                                                </Tooltip>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'customize' && (
                        <motion.div 
                            key="customize"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-8"
                        >
                            {/* Frame Selection */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <CrownIcon className="w-4 h-4" /> Avatar Frames
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                                    <button
                                        onClick={() => handleEquip('frame-none', 'frame')}
                                        className={`relative aspect-square rounded-2xl border-2 transition-all p-4 flex flex-col items-center justify-center gap-2
                                            ${equippedFrame === 'frame-none' ? 'border-green-500 bg-green-500/10' : 'border-gray-200 dark:border-white/10 hover:bg-white/5'}
                                        `}
                                    >
                                        <div className="w-12 h-12 rounded-full bg-gray-500/20 border-2 border-dashed border-gray-500/50"></div>
                                        <span className="text-xs font-bold text-gray-500">None</span>
                                        {equippedFrame === 'frame-none' && <div className="absolute top-2 right-2 text-green-500"><CheckCircleIcon className="w-4 h-4"/></div>}
                                    </button>

                                    {allFrames.map(frame => {
                                        const isOwned = progressService.isItemOwned(frame.id);
                                        const isEquipped = equippedFrame === frame.assetId;
                                        const isLocked = !isOwned;
                                        const isLevelLocked = frame.unlockLevel ? user.level < frame.unlockLevel : false;

                                        return (
                                            <button
                                                key={frame.id}
                                                onClick={() => isOwned && !isLevelLocked && handleEquip(frame.assetId, 'frame')}
                                                disabled={isLocked || isLevelLocked}
                                                className={`relative aspect-square rounded-2xl border-2 transition-all p-2 flex flex-col items-center justify-center gap-2 overflow-hidden
                                                    ${isEquipped 
                                                        ? 'border-green-500 bg-green-500/10' 
                                                        : (isLocked || isLevelLocked
                                                            ? 'border-gray-200 dark:border-white/5 opacity-60 cursor-not-allowed bg-black/20' 
                                                            : 'border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30 hover:bg-white/5')
                                                    }
                                                `}
                                            >
                                                <AvatarFrame frameId={frame.assetId} className="w-16 h-16">
                                                    <UserAvatar avatarId={user.avatar} className="w-full h-full" />
                                                </AvatarFrame>
                                                
                                                <div className="text-center z-10">
                                                    <div className="text-[10px] font-bold text-gray-300 truncate w-full px-1">{frame.name}</div>
                                                    {isLevelLocked ? (
                                                        <div className="text-[9px] text-red-400 font-bold flex items-center justify-center gap-1"><LockIcon className="w-3 h-3"/> Lvl {frame.unlockLevel}</div>
                                                    ) : isOwned ? (
                                                        <div className="text-[9px] text-green-400 font-bold">Owned</div>
                                                    ) : (
                                                        <div className="text-[9px] text-yellow-400 font-bold flex items-center justify-center gap-1"><LockIcon className="w-3 h-3"/> {frame.cost} <CoinIcon className="w-3 h-3"/></div>
                                                    )}
                                                </div>

                                                {isEquipped && <div className="absolute top-2 right-2 text-green-500 z-10"><CheckCircleIcon className="w-4 h-4"/></div>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Avatar Selection */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <UserIcon className="w-4 h-4" /> Avatars
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {allAvatars.map(avatar => {
                                        const isOwned = progressService.isItemOwned(avatar.id);
                                        const isEquipped = user.avatar === avatar.assetId;
                                        return (
                                            <button 
                                                key={avatar.id}
                                                onClick={() => isOwned && handleEquip(avatar.assetId, 'avatar')}
                                                disabled={!isOwned}
                                                className={`relative rounded-2xl border-2 transition-all p-3 flex flex-col items-center justify-between group overflow-hidden min-h-[160px]
                                                    ${isEquipped 
                                                        ? 'border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.2)]' 
                                                        : (!isOwned 
                                                            ? 'border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-black/20 opacity-80 cursor-not-allowed'
                                                            : 'border-gray-200 dark:border-white/10 hover:border-cyan-400 hover:bg-white/5'
                                                        )
                                                    }
                                                `}
                                            >
                                                <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-2 mt-2">
                                                    <UserAvatar avatarId={avatar.assetId} className={`w-full h-full drop-shadow-md transition-transform duration-300 ${isOwned ? 'group-hover:scale-110' : 'grayscale opacity-60'}`} />
                                                    {isEquipped && (
                                                        <div className="absolute -top-1 -right-1 text-green-500 bg-white dark:bg-black rounded-full p-0.5 shadow-sm border border-green-500 z-10">
                                                            <CheckCircleIcon className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                    {!isOwned && (
                                                        <div className="absolute inset-0 flex items-center justify-center z-10">
                                                            <div className="bg-black/60 p-1.5 rounded-full backdrop-blur-sm border border-white/10">
                                                                <LockIcon className="w-5 h-5 text-gray-300" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="text-center w-full mt-2">
                                                    <div className="text-xs font-bold text-gray-900 dark:text-white truncate w-full px-1 mb-1.5">{avatar.name}</div>
                                                    
                                                    {isOwned ? (
                                                        <div className="text-[10px] font-bold text-green-500 uppercase tracking-wider py-1">Owned</div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="text-[9px] text-gray-500 dark:text-gray-400 font-medium">Acquire in Shop</span>
                                                            <div className="text-[10px] font-bold text-yellow-500 dark:text-yellow-400 flex items-center justify-center gap-1 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full border border-yellow-500/20 w-full max-w-[80px]">
                                                                <CoinIcon className="w-3 h-3" /> {avatar.cost}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'security' && (
                        <motion.div 
                            key="security"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex flex-col gap-6 pb-8"
                        >
                            {/* Security Dashboard */}
                            <div className={`w-full rounded-[32px] border ${securityBgClass} overflow-hidden relative mb-2 shadow-2xl`}>
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none" />
                                
                                <div className="flex flex-col md:flex-row p-6 md:p-8 gap-8 items-center">
                                    {/* Gauge */}
                                    <div className="shrink-0">
                                        <SecurityGauge score={securityScore} />
                                    </div>

                                    {/* Info & Badges */}
                                    <div className="flex-1 w-full text-center md:text-left">
                                        <div className="mb-6">
                                            <h3 className="text-2xl font-bold text-white mb-1">Security Health</h3>
                                            <p className={`text-sm font-medium uppercase tracking-widest text-${securityColor}-400`}>
                                                Status: {securityTier}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                                            <SecurityBadgeItem 
                                                label="Verified" 
                                                subtext="Identity Confirmed" 
                                                icon={<ShieldCheckIcon className="w-5 h-5"/>} 
                                                active={!!user.emailVerified} 
                                                colorTheme="green" 
                                                delay={0.1} 
                                                onClick={() => scrollToSection('identity-card')}
                                            />
                                            <SecurityBadgeItem 
                                                label="2FA Active" 
                                                subtext="Extra Protection" 
                                                icon={<SmartphoneIcon className="w-5 h-5"/>} 
                                                active={!!user.mfaEnabled} 
                                                colorTheme="purple" 
                                                delay={0.2} 
                                                onClick={() => scrollToSection('mfa-card')}
                                            />
                                            <SecurityBadgeItem 
                                                label="Fresh Pwd" 
                                                subtext={passwordStatusText} 
                                                icon={<KeyIcon className="w-5 h-5"/>} 
                                                active={passwordRotated} 
                                                colorTheme={passwordRotated ? 'blue' : 'orange'} 
                                                delay={0.3} 
                                                onClick={() => setShowPasswordModal(true)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Identity Card (Email) */}
                                <div id="identity-card" className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-200 dark:border-white/10 relative overflow-hidden flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-start justify-between mb-4">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                <UserIcon className="w-5 h-5 text-blue-500" /> Identity
                                            </h3>
                                            {user.emailVerified ? (
                                                <span className="text-green-500 bg-green-500/10 px-2 py-1 rounded text-xs font-bold uppercase">Verified</span>
                                            ) : lastEmailSentAt ? (
                                                <span className="text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded text-xs font-bold uppercase flex items-center gap-1">
                                                    <ClockIcon className="w-3 h-3" /> Pending
                                                </span>
                                            ) : (
                                                <span className="text-red-500 bg-red-500/10 px-2 py-1 rounded text-xs font-bold uppercase">Action Needed</span>
                                            )}
                                        </div>
                                        
                                        <div className="bg-gray-100 dark:bg-black/20 p-3 rounded-xl border border-gray-200 dark:border-white/5 mb-4">
                                            <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Email Address</div>
                                            <div className="font-mono text-gray-700 dark:text-gray-300 truncate">{maskedEmail}</div>
                                        </div>
                                    </div>

                                    {!user.emailVerified ? (
                                        <div className="flex flex-col gap-2">
                                            <button 
                                                onClick={handleResendEmail}
                                                disabled={emailCooldown > 0 || isSendingEmail}
                                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 text-sm flex items-center justify-center gap-2"
                                            >
                                                {isSendingEmail ? (
                                                    <span>Sending...</span>
                                                ) : emailCooldown > 0 ? (
                                                    <span>Resend available in {formatTime(emailCooldown)}</span>
                                                ) : (
                                                    <>Send Verification Link <SendIcon className="w-4 h-4"/></>
                                                )}
                                            </button>
                                            
                                            {lastEmailSentAt && (
                                                <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl flex items-start gap-3 mt-2 animate-fade-in">
                                                    <div className="p-1.5 bg-yellow-500/20 rounded-full text-yellow-500 mt-0.5 shrink-0">
                                                        <MessageIcon className="w-3 h-3" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-yellow-500 uppercase mb-0.5">Check your inbox</p>
                                                        <p className="text-xs text-yellow-600 dark:text-yellow-200/70 leading-relaxed">
                                                            Email sent {getSentTimeLabel(lastEmailSentAt)}. <br/>
                                                            Link expires in 24 hours.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-green-600 dark:text-green-400 font-medium bg-green-500/5 p-3 rounded-lg border border-green-500/10">
                                            Your email is verified. This helps recover your account if you lose access.
                                        </p>
                                    )}
                                </div>

                                {/* MFA Card */}
                                <div id="mfa-card" className={`rounded-2xl p-6 border relative overflow-hidden transition-colors flex flex-col justify-between ${user.mfaEnabled ? 'bg-green-900/10 border-green-500/30' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10'}`}>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                            <SmartphoneIcon className={`w-5 h-5 ${user.mfaEnabled ? 'text-green-500' : 'text-purple-500'}`} /> 
                                            Two-Factor Auth
                                        </h3>
                                        
                                        {!user.mfaEnabled && !showMfaSetup && (
                                            <>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                                                    Protect your account with an extra layer of security using an authenticator app.
                                                </p>
                                                <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20 mb-4">
                                                    <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase mb-1">
                                                        <ShieldIcon className="w-4 h-4" /> Recommended
                                                    </div>
                                                    <p className="text-xs text-purple-300">
                                                        Adds +40 to Security Score.
                                                    </p>
                                                </div>
                                            </>
                                        )}

                                        {/* MFA Setup Flow */}
                                        {showMfaSetup && mfaSetupData && (
                                            <div className="mt-2">
                                                <div className="flex items-center justify-between mb-4 px-2">
                                                    {[1,2,3].map(step => (
                                                        <div key={step} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${mfaStep >= step ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-500'}`}>
                                                            {step}
                                                        </div>
                                                    ))}
                                                </div>

                                                <AnimatePresence mode="wait">
                                                    {mfaStep === 1 && (
                                                        <motion.div 
                                                            key="step1"
                                                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                                            className="text-center"
                                                        >
                                                            <div className="bg-white p-2 rounded-xl inline-block mb-3">
                                                                <img src={mfaSetupData.qr} alt="MFA QR Code" className="w-32 h-32" />
                                                            </div>
                                                            <button onClick={() => copyToClipboard(mfaSetupData.secret)} className="bg-black/30 px-3 py-2 rounded-lg text-xs font-mono text-cyan-400 border border-white/10 hover:bg-black/50 transition-colors flex items-center justify-center gap-2 w-full mb-3">
                                                                {mfaSetupData.secret.substring(0, 4)}... <CopyIcon className="w-3 h-3"/>
                                                            </button>
                                                            <button onClick={() => setMfaStep(2)} className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-sm transition-colors">
                                                                Next
                                                            </button>
                                                        </motion.div>
                                                    )}

                                                    {mfaStep === 2 && (
                                                        <motion.div 
                                                            key="step2"
                                                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                                        >
                                                            <input 
                                                                type="text" 
                                                                value={mfaCode} 
                                                                onChange={e => {
                                                                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                                    setMfaCode(val);
                                                                    if (val.length === 6) verifyMfa();
                                                                }}
                                                                placeholder="000000"
                                                                className="w-full text-center p-3 rounded-xl bg-black/40 border border-white/10 text-xl font-mono tracking-widest focus:outline-none focus:border-purple-500 mb-3"
                                                                autoFocus
                                                            />
                                                            <button onClick={verifyMfa} disabled={mfaCode.length !== 6} className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-lg text-sm transition-colors">
                                                                Verify
                                                            </button>
                                                        </motion.div>
                                                    )}

                                                    {mfaStep === 3 && (
                                                        <motion.div 
                                                            key="step3"
                                                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                                        >
                                                            <p className="text-xs text-green-400 font-bold mb-2 flex items-center gap-1"><CheckIcon className="w-3 h-3"/> Verified!</p>
                                                            <p className="text-xs text-gray-400 mb-3">Save these backup codes in a safe place.</p>
                                                            <div className="grid grid-cols-2 gap-2 mb-4 bg-black/30 p-2 rounded-lg">
                                                                {mfaSetupData.backupCodes.slice(0, 4).map(code => (
                                                                    <div key={code} className="text-[10px] font-mono text-gray-300 bg-black/40 px-2 py-1 rounded">{code}</div>
                                                                ))}
                                                            </div>
                                                            <button onClick={finishMfaSetup} className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg text-sm transition-colors">
                                                                Finish
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto">
                                        {!user.mfaEnabled ? (
                                            !showMfaSetup ? (
                                                <button 
                                                    onClick={initiateMfa}
                                                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2"
                                                >
                                                    Enable 2FA
                                                </button>
                                            ) : (
                                                <button onClick={cancelMfaSetup} className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 mt-2">Cancel Setup</button>
                                            )
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="bg-green-500/20 border border-green-500/30 p-3 rounded-xl flex items-center gap-3">
                                                    <div className="bg-green-500 p-1 rounded-full"><CheckIcon className="w-3 h-3 text-white" /></div>
                                                    <div>
                                                        <div className="text-green-400 text-xs font-bold uppercase">Active</div>
                                                        <div className="text-green-200/70 text-[10px]">Your account is secure.</div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={disableMfa}
                                                    className="w-full py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    Disable 2FA
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Password Management */}
                                <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-200 dark:border-white/10 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <KeyIcon className="w-5 h-5 text-yellow-500" /> Password
                                        </h3>
                                        <div className="bg-gray-100 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5 mb-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`w-2 h-2 rounded-full ${passwordRotated ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                                                <span className={`text-xs font-bold ${passwordStatusColor}`}>{passwordStatusText}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 leading-relaxed">
                                                Regularly updating your password helps prevent unauthorized access.
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setShowPasswordModal(true)}
                                        className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 text-gray-700 dark:text-white font-bold rounded-xl transition-colors text-sm"
                                    >
                                        Change Password
                                    </button>
                                </div>

                                {/* Danger Zone */}
                                <div className="bg-red-500/5 rounded-2xl p-6 border border-red-500/20 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-red-500 mb-2 flex items-center gap-2">
                                            <TrashIcon className="w-5 h-5" /> Danger Zone
                                        </h3>
                                        <p className="text-xs text-red-400/70 mb-4">
                                            Irreversible actions. Proceed with caution.
                                        </p>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <button 
                                            onClick={() => setShowHistoryConfirm(true)}
                                            className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl transition-colors text-xs flex items-center justify-center gap-2"
                                        >
                                            <HistoryIcon className="w-4 h-4"/> Clear Match History
                                        </button>
                                        <button 
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors text-xs shadow-lg shadow-red-500/10"
                                        >
                                            Delete Account
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
                
                {showHistoryConfirm && (
                    <ConfirmationModal 
                        title="Clear History?" 
                        description="This will permanently delete all your past match records. Stats (wins/losses) will remain."
                        onConfirm={handleClearHistory}
                        onClose={() => setShowHistoryConfirm(false)}
                    />
                )}

                {showDeleteConfirm && (
                    <ConfirmationModal 
                        title="Delete Account?" 
                        description="This action cannot be undone. All progress, coins, and badges will be lost forever."
                        onConfirm={handleDeleteAccount}
                        onClose={() => setShowDeleteConfirm(false)}
                    />
                )}

                {pendingReward && (
                    <SecurityRewardModal 
                        type={pendingReward.type}
                        reward={pendingReward.reward}
                        onClaim={handleClaimSecurityReward}
                        onClose={() => setPendingReward(null)}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../contexts/AuthContext';
import { AppContext } from '../contexts/AppContext';
import { 
    CloseIcon, CheckCircleIcon, BadgeIcon, CopyIcon, UserIcon, 
    PaletteIcon, CogIcon, LockIcon, TrophyIcon, LightningIcon, FlameIcon, ChartIcon, CheckIcon, ShieldCheckIcon, SmartphoneIcon, KeyIcon,
    TrashIcon, LogoutIcon, InfoIcon, ShieldIcon, HistoryIcon, SendIcon, CrownIcon, GridIcon, CoinIcon, PencilIcon, WifiIcon, GiftIcon, AlertIcon, ClockIcon, StarIcon, UsersIcon
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

const AnimatedScoreCircle: React.FC<{ score: number, className?: string }> = ({ score, className = "w-32 h-32" }) => {
    const radius = 45; 
    const circumference = 2 * Math.PI * radius;
    
    let color = "#ef4444"; // red
    let label = "At Risk";
    if (score >= 60) { color = "#eab308"; label = "Fair"; } // yellow
    if (score >= 80) { color = "#3b82f6"; label = "Good"; } // blue
    if (score === 100) { color = "#22c55e"; label = "Secure"; } // green

    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            {/* Outer Glow */}
            <div className="absolute inset-0 rounded-full blur-2xl opacity-20 transition-colors duration-500" style={{ backgroundColor: color }}></div>
            
            <svg className="w-full h-full transform -rotate-90 drop-shadow-xl" viewBox="0 0 120 120">
                {/* Background Track */}
                <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-black/20 dark:text-white/5"
                />
                {/* Progress Arc */}
                <motion.circle
                    cx="60"
                    cy="60"
                    r={radius}
                    stroke={color}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference - (score / 100) * circumference }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
                <motion.span 
                    className="text-4xl font-black text-gray-900 dark:text-white leading-none tracking-tighter"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    {score}
                </motion.span>
                <motion.span 
                    className="text-[10px] font-bold uppercase tracking-widest mt-1 px-2 py-0.5 rounded-full border bg-white/50 dark:bg-black/20 backdrop-blur-sm"
                    style={{ color: color, borderColor: `${color}40` }}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                >
                    {label}
                </motion.span>
            </div>
        </div>
    );
};

const SecurityCheckItem: React.FC<{ label: string, points: number, completed: boolean, icon: React.ReactNode, index: number }> = ({ label, points, completed, icon, index }) => (
    <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 * index }}
        className={`flex items-center justify-between p-3 rounded-xl border mb-2 transition-all group
            ${completed 
                ? 'bg-green-500/5 border-green-500/20' 
                : 'bg-white/5 border-white/5 opacity-70 hover:opacity-100'
            }`}
    >
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${completed ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-gray-800 text-gray-500 group-hover:bg-gray-700 group-hover:text-gray-300'}`}>
                {completed ? <CheckIcon className="w-3.5 h-3.5" /> : icon}
            </div>
            <div>
                <div className={`text-sm font-bold ${completed ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{label}</div>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${completed ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-white/5 text-gray-500 border-white/10'}`}>
                +{points}
            </span>
        </div>
    </motion.div>
);

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
    
    // Email Verification Cooldown
    const [emailCooldown, setEmailCooldown] = useState(0);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    
    // Edit Profile State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        displayName: auth?.currentUser?.displayName || '',
        bio: auth?.currentUser?.bio || '',
        customStatus: auth?.currentUser?.customStatus || ''
    });
    
    const user = auth?.currentUser;
    
    const rank = user ? getRank(user.elo) : null;
    const rankData = user ? getRankProgress(user.elo) : null;
    const xpProgress = user ? getLevelProgress(user.xp, user.level) : 0;
    const xpNeeded = user ? getXPNeededForNextLevel(user.level) : 100;

    useEffect(() => {
        if (user) {
            setEditForm({
                displayName: user.displayName,
                bio: user.bio || '',
                customStatus: user.customStatus || ''
            });
        }
    }, [user]);

    // Check cooldown on mount
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
        auth?.reloadUser?.();
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
                auth?.reloadUser?.();
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

    const getSecurityScore = (u: User) => {
        let score = 10; // Base account creation
        if (u.emailVerified) score += 30;
        if (u.mfaEnabled) score += 40;
        if (isPasswordFresh(u.questData?.lastPasswordChange)) score += 20;
        return score;
    };

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
    
    // Recommendations logic
    const recommendations = [];
    if (!user.emailVerified) recommendations.push("Verify your email address");
    if (!user.mfaEnabled) recommendations.push("Enable Two-Factor Authentication");
    if (!passwordRotated) recommendations.push("Rotate your password (expired)");

    return (
        <motion.div 
            className="w-full max-w-5xl h-[85vh] bg-gray-50 dark:bg-[#0f172a] rounded-[32px] shadow-2xl border border-white/10 flex flex-col relative overflow-hidden"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
        >
            {/* Header / Sidebar Toggle Area */}
            <div className="flex justify-between items-center p-6 md:p-8 shrink-0 relative z-20">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-white transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Profile</h1>
                </div>
                
                {/* Tabs */}
                <div className="flex bg-gray-200 dark:bg-white/5 p-1 rounded-xl">
                    {[
                        { id: 'overview', icon: <ChartIcon className="w-4 h-4"/>, label: 'Overview' },
                        { id: 'customize', icon: <PaletteIcon className="w-4 h-4"/>, label: 'Customize' },
                        { id: 'security', icon: <ShieldCheckIcon className="w-4 h-4"/>, label: 'Security' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as ProfileTab)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                activeTab === tab.id 
                                ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                        >
                            {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 pt-0 relative z-10">
                <AnimatePresence mode="wait">
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
                                                        <div className="flex items-center gap-3">
                                                            <h2 className="text-4xl font-black tracking-tight">{user.displayName}</h2>
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

                                    {/* Friend Code */}
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
                                        // Fix: Ensure boolean logic
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
                            {/* Hero Dashboard */}
                            <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-black rounded-[32px] p-8 text-white flex flex-col md:flex-row items-center gap-8 shadow-2xl border border-white/10 relative overflow-hidden group">
                                {/* Background decorations */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                                <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
                                <div className="absolute right-8 bottom-8 opacity-5 text-9xl pointer-events-none transform rotate-12"><ShieldCheckIcon className="w-40 h-40" /></div>

                                {/* Circle */}
                                <div className="shrink-0 relative z-10">
                                    <AnimatedScoreCircle score={securityScore} className="w-40 h-40" />
                                </div>

                                {/* Breakdown */}
                                <div className="flex-1 w-full space-y-4 relative z-10">
                                    <div>
                                        <h2 className="text-3xl font-black tracking-tight mb-2">Security Audit</h2>
                                        <p className="text-gray-400 text-sm">Review your account protection status.</p>
                                    </div>

                                    <div className="space-y-1">
                                        <SecurityCheckItem 
                                            label="Account Created" 
                                            points={10} 
                                            completed={true} 
                                            icon={<UserIcon className="w-4 h-4 text-white" />} 
                                            index={0}
                                        />
                                        <SecurityCheckItem 
                                            label="Email Verified" 
                                            points={30} 
                                            completed={!!user.emailVerified} 
                                            icon={<ShieldCheckIcon className="w-4 h-4 text-white" />} 
                                            index={1}
                                        />
                                        <SecurityCheckItem 
                                            label="2FA Enabled" 
                                            points={40} 
                                            completed={!!user.mfaEnabled} 
                                            icon={<SmartphoneIcon className="w-4 h-4 text-white" />} 
                                            index={2}
                                        />
                                        <SecurityCheckItem 
                                            label="Password Rotation" 
                                            points={20} 
                                            completed={passwordRotated} 
                                            icon={<KeyIcon className="w-4 h-4 text-white" />} 
                                            index={3}
                                        />
                                    </div>
                                    
                                    {recommendations.length > 0 && (
                                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-start gap-3 mt-4">
                                            <div className="p-2 bg-orange-500/20 rounded-lg text-orange-500">
                                                <AlertIcon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-sm font-bold text-orange-200 uppercase tracking-wide mb-1">Action Recommended</h4>
                                                <div className="space-y-1">
                                                    {recommendations.map((rec, i) => (
                                                        <div key={i} className="text-sm text-gray-300 flex items-center gap-2">
                                                            <div className="w-1 h-1 rounded-full bg-orange-500"></div>
                                                            {rec}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
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
                                            {emailCooldown > 0 && (
                                                <p className="text-center text-xs text-yellow-500 animate-pulse">Email sent! Check your inbox.</p>
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
                                                                {mfaSetupData.secret?.substring(0, 15)}... <CopyIcon className="w-3 h-3"/>
                                                            </button>
                                                            <button onClick={() => setMfaStep(2)} className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-sm">Next</button>
                                                        </motion.div>
                                                    )}

                                                    {mfaStep === 2 && (
                                                        <motion.div 
                                                            key="step2"
                                                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                                        >
                                                            <p className="text-xs text-gray-400 mb-3">Enter code from app:</p>
                                                            <input 
                                                                type="text" 
                                                                value={mfaCode}
                                                                onChange={e => setMfaCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                                                                className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-center text-xl font-mono tracking-[0.5em] text-white focus:border-purple-500 outline-none mb-4"
                                                                placeholder="000000"
                                                                autoFocus
                                                            />
                                                            <button onClick={verifyMfa} className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-sm mb-2">Verify</button>
                                                            <button onClick={() => setMfaStep(1)} className="w-full py-2 text-gray-400 hover:text-white text-xs">Back</button>
                                                        </motion.div>
                                                    )}

                                                    {mfaStep === 3 && (
                                                        <motion.div 
                                                            key="step3"
                                                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                                        >
                                                            <div className="flex items-center gap-2 text-green-400 font-bold mb-2 justify-center text-sm">
                                                                <CheckCircleIcon className="w-4 h-4"/> Success!
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 mb-4">
                                                                {mfaSetupData.backupCodes?.slice(0, 4).map(code => (
                                                                    <code key={code} className="bg-black/40 text-gray-300 text-[10px] text-center py-1.5 rounded font-mono border border-white/5">
                                                                        {code}
                                                                    </code>
                                                                ))}
                                                            </div>
                                                            <button onClick={finishMfaSetup} className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg text-sm shadow-lg shadow-green-500/20">Finish</button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </div>

                                    {!user.mfaEnabled && !showMfaSetup && (
                                        <button 
                                            onClick={initiateMfa}
                                            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg transition-all text-sm"
                                        >
                                            Setup 2FA
                                        </button>
                                    )}

                                    {user.mfaEnabled && (
                                        <>
                                            <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl mb-4">
                                                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                                                    <CheckIcon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-green-500 text-sm">Active</div>
                                                    <div className="text-[10px] text-green-400/70">Account secured.</div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={disableMfa}
                                                className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-xs font-bold transition-colors"
                                            >
                                                Disable 2FA
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* Password Management */}
                                <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-200 dark:border-white/10 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                            <KeyIcon className="w-5 h-5 text-yellow-500" /> Password
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                            Manage your login credentials.
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => setShowPasswordModal(true)}
                                        className="w-full py-3 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-xl text-sm font-bold text-gray-900 dark:text-white transition-colors"
                                    >
                                        Change Password
                                    </button>
                                </div>

                                {/* Active Sessions */}
                                <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-200 dark:border-white/10 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                            <WifiIcon className="w-5 h-5 text-orange-500" /> Active Sessions
                                        </h3>
                                        <div className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded-xl mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900 dark:text-white">Current Session</div>
                                                    <div className="text-xs text-green-600 dark:text-green-400 font-medium">Active Now • Web Browser</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            if(confirm("Log out of all devices?")) auth?.logout();
                                        }}
                                        className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm font-bold text-red-400 hover:text-red-300 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <LogoutIcon className="w-4 h-4"/> Sign Out Everywhere
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {showPasswordModal && (
                    <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

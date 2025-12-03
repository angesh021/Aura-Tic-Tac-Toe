
import React, { useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../contexts/AuthContext';
import { AppContext } from '../contexts/AppContext';
import { 
    CloseIcon, LockIcon, TrashIcon, HistoryIcon, CogIcon, 
    StarIcon, CheckCircleIcon, BadgeIcon, CopyIcon, UserIcon, 
    PaletteIcon, InfoIcon, GridIcon, LightningIcon, BellIcon, 
    UserPlusIcon, MessageIcon, ShieldIcon
} from './Icons';
import ConfirmationModal from './ConfirmationModal';
import { AVATAR_LIST, UserAvatar } from './Avatars';
import { useToast } from '../contexts/ToastContext';
import Tooltip from './Tooltip';
import ChangePasswordModal from './ChangePasswordModal';
import { deleteHistory } from '../services/history';
import { getBadge, getRank } from '../utils/badgeData';
import Modal from './Modal';
import { SHOP_ITEMS, progressService } from '../services/progress';

type Tab = 'overview' | 'customize' | 'settings';
// Sub-categories for the sidebar
type NavSection = 'account_overview' | 'account_edit' | 'app_general' | 'app_notifications' | 'app_privacy' | 'app_danger';

interface ProfileScreenProps {
  onBack: () => void;
  initialTab?: Tab;
}

// --- Advanced UI Components ---

const AdvancedToggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label?: string }> = ({ checked, onChange, label }) => (
    <div className="flex items-center cursor-pointer" onClick={() => onChange(!checked)}>
        <motion.div
            className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-500 border ${checked ? 'bg-cyan-500/20 border-cyan-500' : 'bg-slate-800 border-slate-600'}`}
            animate={{ backgroundColor: checked ? "rgba(6, 182, 212, 0.2)" : "rgba(30, 41, 59, 1)" }}
        >
            <motion.div
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`w-6 h-6 rounded-full shadow-lg ${checked ? 'bg-cyan-400' : 'bg-gray-400'}`}
                style={{ 
                    boxShadow: checked ? '0 0 15px rgba(34, 211, 238, 0.6)' : 'none'
                }}
            />
        </motion.div>
    </div>
);

const SettingItem: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    action: React.ReactNode;
    isDanger?: boolean;
}> = ({ icon, title, description, action, isDanger }) => (
    <motion.div 
        layout
        className={`flex items-center justify-between p-5 rounded-2xl border mb-3 transition-all duration-200 group
            ${isDanger 
                ? 'bg-red-500/5 border-red-500/10 hover:bg-red-500/10' 
                : 'bg-white/5 border-white/5 hover:bg-white/10'
            }
        `}
    >
        <div className="flex items-start gap-4 pr-4">
            <div className={`mt-1 p-2.5 rounded-xl ${isDanger ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-gray-300 group-hover:text-white transition-colors'}`}>
                {icon}
            </div>
            <div>
                <h4 className={`text-base font-bold ${isDanger ? 'text-red-400' : 'text-gray-200 group-hover:text-white'}`}>{title}</h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-sm">{description}</p>
            </div>
        </div>
        <div className="shrink-0">
            {action}
        </div>
    </motion.div>
);

const SidebarButton: React.FC<{ 
    active: boolean; 
    icon: React.ReactNode; 
    label: string; 
    onClick: () => void;
    isDanger?: boolean;
}> = ({ active, icon, label, onClick, isDanger }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 relative overflow-hidden group
            ${active 
                ? (isDanger ? 'bg-red-500/10 text-red-400' : 'bg-cyan-500/10 text-cyan-400') 
                : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
            }
        `}
    >
        {active && <motion.div layoutId="activeInd" className={`absolute left-0 top-0 bottom-0 w-1 ${isDanger ? 'bg-red-500' : 'bg-cyan-500'}`} />}
        <span className={`transition-colors ${active ? (isDanger ? 'text-red-400' : 'text-cyan-400') : 'text-gray-500 group-hover:text-gray-200'}`}>
            {icon}
        </span>
        <span>{label}</span>
    </button>
);

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack, initialTab = 'overview' }) => {
    const auth = useContext(AuthContext);
    const appContext = useContext(AppContext);
    const toast = useToast();
    const currentUser = auth?.currentUser;

    // Mapping tabs to sections
    const getInitialSection = (t: string): NavSection => {
        if (t === 'settings') return 'app_general';
        if (t === 'customize') return 'account_edit';
        return 'account_overview';
    };

    const [activeSection, setActiveSection] = useState<NavSection>(getInitialSection(initialTab));
    
    // Editable state
    const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
    const [avatar, setAvatar] = useState(currentUser?.avatar || 'avatar-1');
    const [bio, setBio] = useState(currentUser?.bio || '');
    const [customStatus, setCustomStatus] = useState(currentUser?.customStatus || '');
    const [showcasedBadges, setShowcasedBadges] = useState(currentUser?.showcasedBadges || []);
    const [equippedTheme, setEquippedTheme] = useState(currentUser?.equippedTheme || 'theme-default');
    
    // Modal & Loading state
    const [isSaving, setIsSaving] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showHistoryConfirm, setShowHistoryConfirm] = useState(false);
    const [showBadgeSelector, setShowBadgeSelector] = useState(false);

    // Stats
    const [stats, setStats] = useState({ winRate: 0, totalGames: 0, rankName: 'Unranked' });

    useEffect(() => { auth?.reloadUser?.(); }, []);

    useEffect(() => {
        if (currentUser) {
            setDisplayName(currentUser.displayName);
            setAvatar(currentUser.avatar);
            setBio(currentUser.bio || '');
            setCustomStatus(currentUser.customStatus || '');
            setShowcasedBadges(currentUser.showcasedBadges || []);
            setEquippedTheme(currentUser.equippedTheme);

            const total = currentUser.wins + currentUser.losses + currentUser.draws;
            const winRate = total > 0 ? (currentUser.wins / total) * 100 : 0;
            const rank = getRank(currentUser.elo);
            setStats({ winRate, totalGames: total, rankName: rank.name });
        }
    }, [currentUser]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await auth?.updateUser({ displayName, avatar, bio, customStatus, showcasedBadges, equippedTheme });
            if (equippedTheme !== appContext?.equippedTheme) {
                appContext?.refreshUser();
            }
            toast.success('Profile updated successfully!');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const copyFriendCode = () => {
        if(currentUser?.friendCode) {
            navigator.clipboard.writeText(currentUser.friendCode);
            toast.success("Friend Code copied!");
        }
    }

    if (!currentUser) return null;
    const rank = getRank(currentUser.elo);

    // --- Content Renders ---

    const renderAccountOverview = () => (
        <div className="space-y-6 animate-fade-in">
            {/* Header Card */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-white/5 p-8 text-center md:text-left shadow-2xl">
                <div className={`absolute inset-0 bg-gradient-to-br ${rank.color.replace('text-', 'from-').replace('500', '900/30')} to-slate-900/90 pointer-events-none`}></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="relative group cursor-pointer" onClick={() => setActiveSection('account_edit')}>
                        <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-white/10 shadow-2xl">
                            <UserAvatar avatarId={avatar} className="w-full h-full rounded-full bg-black/50" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full">
                            <CogIcon className="w-8 h-8 text-white" />
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-950 border border-white/10 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">
                            LVL {currentUser.level}
                        </div>
                    </div>

                    <div className="flex-1 space-y-2">
                        <h2 className="text-4xl font-black text-white tracking-tight">{displayName}</h2>
                        <p className="text-gray-400 font-medium italic">"{customStatus || 'No status set.'}"</p>
                        
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-2">
                            <div className="px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-xs font-bold text-gray-300 flex items-center gap-2">
                                <span className={rank.color}>{rank.icon} {rank.name}</span>
                                <span className="w-px h-3 bg-white/20"></span>
                                <span className="font-mono">{currentUser.elo} ELO</span>
                            </div>
                            <button onClick={copyFriendCode} className="px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-xs font-bold text-gray-300 hover:bg-white/10 transition-colors flex items-center gap-2 group">
                                <span className="opacity-50">CODE:</span>
                                <span className="font-mono text-cyan-400">{currentUser.friendCode}</span>
                                <CopyIcon className="w-3 h-3 group-hover:text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Win Rate', val: `${stats.winRate.toFixed(0)}%`, icon: '🎯', color: 'text-green-400' },
                    { label: 'Matches', val: stats.totalGames, icon: '⚔️', color: 'text-blue-400' },
                    { label: 'Streak', val: currentUser.winStreak, icon: '🔥', color: 'text-orange-400' },
                    { label: 'Coins', val: currentUser.coins, icon: '🪙', color: 'text-yellow-400' }
                ].map((s, i) => (
                    <div key={i} className="bg-slate-800/50 border border-white/5 p-5 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-slate-800 transition-colors">
                        <span className="text-2xl filter drop-shadow-lg mb-1">{s.icon}</span>
                        <span className="text-xl font-black text-white">{s.val}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider opacity-70 ${s.color}`}>{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Badges */}
            <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <BadgeIcon className="w-4 h-4" /> Trophy Case
                    </h3>
                    <button onClick={() => setShowBadgeSelector(true)} className="text-xs font-bold text-cyan-400 hover:text-cyan-300">Edit</button>
                </div>
                <div className="grid grid-cols-4 gap-4">
                    {showcasedBadges.slice(0, 4).map(badgeId => {
                        const badge = getBadge(badgeId);
                        if (!badge) return null;
                        return (
                            <Tooltip key={badgeId} text={badge.name}>
                                <div className={`aspect-square rounded-2xl border ${badge.border} bg-gradient-to-br from-black/40 to-transparent flex flex-col items-center justify-center gap-2 p-2 hover:scale-105 transition-transform`}>
                                    <span className="text-3xl filter drop-shadow-md">{badge.icon}</span>
                                </div>
                            </Tooltip>
                        );
                    })}
                    {Array.from({ length: Math.max(0, 4 - showcasedBadges.length) }).map((_, i) => (
                        <div key={i} className="aspect-square rounded-2xl border border-dashed border-white/5 bg-white/5 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white/5"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderAccountEdit = () => (
        <div className="space-y-6 h-full flex flex-col">
            <h2 className="text-2xl font-bold text-white mb-2">Customize Profile</h2>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                {/* Identity */}
                <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Display Name</label>
                            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={20} className="input-field" placeholder="Name" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                            <input value={customStatus} onChange={(e) => setCustomStatus(e.target.value)} maxLength={50} className="input-field" placeholder="What's on your mind?" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Biography</label>
                            <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} className="input-field h-24 resize-none" placeholder="Tell us about yourself..." />
                        </div>
                    </div>
                </div>

                {/* Avatar Selection */}
                <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Choose Avatar</h3>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                        {AVATAR_LIST.map(av => {
                            const isOwned = currentUser.inventory.includes(av.id) || av.id === 'avatar-1';
                            return (
                                <button key={av.id} onClick={() => isOwned && setAvatar(av.id)} disabled={!isOwned} 
                                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${avatar === av.id ? 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-105' : 'border-white/5 hover:border-white/20'} ${!isOwned ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}>
                                    <UserAvatar avatarId={av.id} className="w-full h-full bg-black/40" />
                                    {!isOwned && <div className="absolute inset-0 flex items-center justify-center"><LockIcon className="w-4 h-4 text-white" /></div>}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Theme Selection */}
                <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">UI Theme</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <button onClick={() => setEquippedTheme('theme-default')} className={`relative h-14 rounded-xl border-2 bg-slate-900 flex items-center justify-center transition-all ${equippedTheme === 'theme-default' ? 'border-cyan-500 shadow-lg' : 'border-white/10 opacity-70 hover:opacity-100'}`}>
                            <span className="text-xs font-bold text-gray-300">Default Slate</span>
                        </button>
                        {SHOP_ITEMS.filter(i => i.type === 'theme').map(theme => {
                            const isOwned = progressService.isItemOwned(theme.id);
                            if (!isOwned) return null;
                            return (
                                <button key={theme.id} onClick={() => setEquippedTheme(theme.id)} className={`relative h-14 rounded-xl border-2 overflow-hidden transition-all ${equippedTheme === theme.id ? 'border-white shadow-lg scale-105' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                                    <div className="absolute inset-0" style={{ background: theme.bgGradient }}></div>
                                    <span className="relative z-10 text-xs font-bold text-white shadow-sm">{theme.name}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end">
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircleIcon className="w-5 h-5" />}
                    Save Changes
                </button>
            </div>
        </div>
    );

    const renderAppSettings = () => (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-4">Application Settings</h2>
            
            {activeSection === 'app_general' && (
                <div className="space-y-2">
                    <SettingItem 
                        icon={<LightningIcon className="w-6 h-6"/>}
                        title="Low Performance Mode"
                        description="Reduces visual effects like blurs and particle systems to save battery on mobile devices."
                        action={<AdvancedToggle checked={appContext?.preferences.lowPerformance ?? false} onChange={v => appContext?.updatePreferences({ lowPerformance: v })} />}
                    />
                    <SettingItem 
                        icon={<GridIcon className="w-6 h-6"/>}
                        title="Show Board Coordinates"
                        description="Displays algebraic notation (e.g., A1, B2) on the game board."
                        action={<AdvancedToggle checked={appContext?.preferences.showCoordinates ?? false} onChange={v => appContext?.updatePreferences({ showCoordinates: v })} />}
                    />
                    <SettingItem 
                        icon={<div className="w-6 h-6 text-center text-lg leading-none">📳</div>}
                        title="Haptic Feedback"
                        description="Enables subtle vibrations on interactions (Supported devices only)."
                        action={<AdvancedToggle checked={appContext?.preferences.haptics ?? true} onChange={v => appContext?.updatePreferences({ haptics: v })} />}
                    />
                </div>
            )}

            {activeSection === 'app_notifications' && (
                <div className="space-y-2">
                    <SettingItem 
                        icon={<UserPlusIcon className="w-6 h-6"/>}
                        title="Friend Requests"
                        description="Receive alerts when someone sends you a friend request."
                        action={<AdvancedToggle checked={appContext?.preferences.notifyOnFriendRequest ?? true} onChange={v => appContext?.updatePreferences({ notifyOnFriendRequest: v })} />}
                    />
                    <SettingItem 
                        icon={<MessageIcon className="w-6 h-6"/>}
                        title="Direct Messages"
                        description="Show toast notifications for incoming chats."
                        action={<AdvancedToggle checked={appContext?.preferences.notifyOnChat ?? true} onChange={v => appContext?.updatePreferences({ notifyOnChat: v })} />}
                    />
                    <SettingItem 
                        icon={<InfoIcon className="w-6 h-6"/>}
                        title="System Alerts"
                        description="Notifications for game updates, maintenance, and rewards."
                        action={<AdvancedToggle checked={appContext?.preferences.notifyOnSystem ?? true} onChange={v => appContext?.updatePreferences({ notifyOnSystem: v })} />}
                    />
                </div>
            )}

            {activeSection === 'app_danger' && (
                <div className="space-y-2">
                    <SettingItem 
                        icon={<LockIcon className="w-6 h-6"/>}
                        title="Change Password"
                        description="Update your login credentials securely."
                        action={<button onClick={() => setShowChangePassword(true)} className="px-4 py-2 text-xs font-bold bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors">Update</button>}
                    />
                    <SettingItem 
                        icon={<HistoryIcon className="w-6 h-6"/>}
                        title="Clear History"
                        description="Permanently delete all locally saved match replays."
                        action={<button onClick={() => setShowHistoryConfirm(true)} className="px-4 py-2 text-xs font-bold bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors">Clear</button>}
                    />
                    <SettingItem 
                        icon={<TrashIcon className="w-6 h-6"/>}
                        title="Delete Account"
                        description="Permanently remove your account and all data. This cannot be undone."
                        isDanger={true}
                        action={<button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg shadow-red-500/20">Delete</button>}
                    />
                </div>
            )}
        </div>
    );

    return (
        <>
            <motion.div
                className="w-full max-w-5xl h-[85vh] flex flex-col md:flex-row bg-[#0f172a] rounded-3xl overflow-hidden relative shadow-2xl"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
            >
                {/* Close Button (Mobile Absolute) */}
                <button onClick={onBack} className="absolute top-4 right-4 md:hidden z-50 p-2 bg-black/50 rounded-full text-white">
                    <CloseIcon className="w-5 h-5" />
                </button>

                {/* Left Sidebar */}
                <div className="w-full md:w-72 bg-slate-900 border-r border-white/5 flex flex-col p-4 overflow-y-auto">
                    <div className="mb-8 px-2 pt-2">
                        <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tighter">
                            Settings
                        </h1>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Control Center</p>
                    </div>

                    <div className="space-y-6 flex-1">
                        <div>
                            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3 px-2">Account</div>
                            <div className="space-y-1">
                                <SidebarButton active={activeSection === 'account_overview'} icon={<UserIcon className="w-5 h-5"/>} label="Overview" onClick={() => setActiveSection('account_overview')} />
                                <SidebarButton active={activeSection === 'account_edit'} icon={<PaletteIcon className="w-5 h-5"/>} label="Customize" onClick={() => setActiveSection('account_edit')} />
                            </div>
                        </div>

                        <div>
                            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3 px-2">Application</div>
                            <div className="space-y-1">
                                <SidebarButton active={activeSection === 'app_general'} icon={<CogIcon className="w-5 h-5"/>} label="General" onClick={() => setActiveSection('app_general')} />
                                <SidebarButton active={activeSection === 'app_notifications'} icon={<BellIcon className="w-5 h-5"/>} label="Notifications" onClick={() => setActiveSection('app_notifications')} />
                                <SidebarButton active={activeSection === 'app_danger'} icon={<ShieldIcon className="w-5 h-5"/>} label="Security & Data" onClick={() => setActiveSection('app_danger')} isDanger={true} />
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-white/5">
                        <button onClick={onBack} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
                            <CloseIcon className="w-5 h-5" />
                            <span>Close Menu</span>
                        </button>
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="flex-1 bg-[#0f172a] relative overflow-hidden flex flex-col">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 relative z-10">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeSection}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="h-full"
                            >
                                {activeSection.startsWith('account') ? (
                                    activeSection === 'account_overview' ? renderAccountOverview() : renderAccountEdit()
                                ) : (
                                    renderAppSettings()
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>

            {/* Modals & Dialogs */}
            <AnimatePresence>
                {showBadgeSelector && (
                    <Modal onClose={() => setShowBadgeSelector(false)} className="max-w-xl">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white">Select Badges</h2>
                                <div className="text-sm text-gray-400">{showcasedBadges.length}/4 Selected</div>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-80 overflow-y-auto custom-scrollbar p-1">
                                {currentUser.badges.map(bId => {
                                    const badge = getBadge(bId);
                                    if(!badge) return null;
                                    const isSelected = showcasedBadges.includes(bId);
                                    return (
                                        <button 
                                            key={bId}
                                            onClick={() => {
                                                if (isSelected) setShowcasedBadges(s => s.filter(id => id !== bId));
                                                else if (showcasedBadges.length < 4) setShowcasedBadges(s => [...s, bId]);
                                            }}
                                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${isSelected ? 'bg-cyan-500/20 border-cyan-500 ring-1 ring-cyan-500' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                        >
                                            <span className="text-2xl">{badge.icon}</span>
                                            <span className="text-[10px] font-bold text-gray-300 truncate w-full">{badge.name}</span>
                                        </button>
                                    )
                                })}
                            </div>
                            <div className="flex justify-end mt-6">
                                <button onClick={() => setShowBadgeSelector(false)} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-bold text-sm transition-colors">Done</button>
                            </div>
                        </div>
                    </Modal>
                )}
                {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
                {showHistoryConfirm && (
                    <ConfirmationModal 
                        title="Clear History?" 
                        description="Permanently delete all match replays." 
                        confirmText="CLEAR" 
                        onConfirm={async () => { await deleteHistory(); setShowHistoryConfirm(false); toast.success('History cleared'); }} 
                        onClose={() => setShowHistoryConfirm(false)} 
                    />
                )}
                {showDeleteConfirm && (
                    <ConfirmationModal 
                        title="Delete Account?" 
                        description="This action is irreversible. All data will be lost." 
                        confirmText="DELETE" 
                        onConfirm={async () => { await auth?.deleteAccount(); }} 
                        onClose={() => setShowDeleteConfirm(false)} 
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default ProfileScreen;

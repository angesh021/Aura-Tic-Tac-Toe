
import React, { useContext, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from './Modal';
import { AppContext } from '../contexts/AppContext';
import { AuthContext } from '../contexts/AuthContext';
import { 
    CloseIcon, GridIcon, 
    PaletteIcon, MoonIcon, SunIcon, CheckIcon,
    UserIcon, BellIcon, ShieldIcon
} from './Icons';
import { useToast } from '../contexts/ToastContext';
import { SHOP_ITEMS, progressService } from '../services/progress';
import { Theme } from '../types';

interface SettingsModalProps {
    onClose: () => void;
}

// --- Components ---

const FluidSwitch: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
    <button
        onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
        className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none shrink-0 flex items-center p-1 ${checked ? 'bg-cyan-500' : 'bg-gray-300 dark:bg-gray-700'}`}
    >
        <motion.div
            className="w-6 h-6 bg-white rounded-full shadow-md"
            layout
            transition={{ type: "spring", stiffness: 700, damping: 30 }}
            style={{ x: checked ? 24 : 0 }} 
        />
    </button>
);

const ThemeModeToggle: React.FC<{ isDark: boolean; toggle: () => void }> = ({ isDark, toggle }) => (
    <button
        onClick={(e) => { e.stopPropagation(); toggle(); }}
        className={`relative w-16 h-9 rounded-full transition-all duration-500 focus:outline-none shrink-0 flex items-center p-1 overflow-hidden border border-white/10 shadow-inner ${isDark ? 'bg-slate-900' : 'bg-sky-300'}`}
    >
        {/* Background elements */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
             <motion.div initial={false} animate={{ opacity: isDark ? 1 : 0 }} className="absolute inset-0">
                <div className="absolute top-2 left-5 w-0.5 h-0.5 bg-white rounded-full opacity-80" />
                <div className="absolute bottom-2 left-3 w-0.5 h-0.5 bg-white rounded-full opacity-60" />
             </motion.div>
             <motion.div initial={false} animate={{ opacity: isDark ? 0 : 1 }} className="absolute inset-0">
                <div className="absolute top-1 right-3 w-4 h-2 bg-white/40 rounded-full blur-[1px]" />
             </motion.div>
        </div>

        <motion.div
            className="w-7 h-7 rounded-full shadow-lg flex items-center justify-center relative z-10"
            layout
            transition={{ type: "spring", stiffness: 600, damping: 30 }}
            style={{ 
                marginLeft: isDark ? '28px' : '0px',
                backgroundColor: isDark ? '#1e293b' : '#fbbf24'
            }}
        >
             <motion.div
                key={isDark ? "moon" : "sun"}
                initial={{ scale: 0.5, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.2 }}
            >
                {isDark ? <MoonIcon className="w-4 h-4 text-indigo-200" /> : <SunIcon className="w-4 h-4 text-yellow-100" />}
            </motion.div>
        </motion.div>
    </button>
);

const SettingRow: React.FC<{ 
    label: string; 
    description?: string;
    icon: React.ReactNode;
    iconColor: string;
    action: React.ReactNode;
    onClick?: () => void;
    danger?: boolean;
}> = ({ label, description, icon, iconColor, action, onClick, danger }) => (
    <div 
        onClick={onClick}
        className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${onClick ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : ''}`}
    >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconColor} shadow-sm`}>
            {React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5 text-white" })}
        </div>
        <div className="flex-1 min-w-0">
            <div className={`text-base font-bold ${danger ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>{label}</div>
            {description && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{description}</div>}
        </div>
        <div className="shrink-0">
            {action}
        </div>
    </div>
);

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 mt-4 px-1">
        {title}
    </h3>
);

// --- Main Component ---

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
    const app = useContext(AppContext);
    const auth = useContext(AuthContext);
    
    if (!app || !auth) return null;

    const togglePref = (key: keyof typeof app.preferences) => {
        app.updatePreferences({ [key]: !app.preferences[key] });
    };

    const handleThemeSelect = async (themeId: string) => {
        if (themeId !== app.equippedTheme) {
            const success = await progressService.equipItem(themeId, 'theme');
            if(success) app.refreshUser();
        }
    };

    // Derived Lists
    const ownedThemes = SHOP_ITEMS.filter(item => item.type === 'theme' && progressService.isItemOwned(item.id));
    const allThemes = [
        { id: 'theme-default', name: 'Standard Slate', description: 'Clean and classic.', bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }, 
        ...ownedThemes
    ];

    return (
        <Modal onClose={onClose} noPadding className="max-w-3xl w-full h-[80vh] max-h-[800px] bg-gray-50 dark:bg-[#0f172a] overflow-hidden flex flex-col rounded-[32px] border border-white/10 shadow-2xl">
            
            {/* Header */}
            <div className="relative h-20 shrink-0 z-20 flex items-center justify-between px-4 md:px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center border border-gray-200 dark:border-white/10">
                        <GridIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Settings</h2>
                </div>
                <button onClick={onClose} className="p-2 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                    <CloseIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                </button>
            </div>

            {/* Main Scrollable Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 md:p-8">
                
                {/* Visuals Section */}
                <div className="mb-8">
                    <SectionTitle title="Visual Experience" />
                    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-3xl p-2 shadow-sm space-y-2">
                        <SettingRow 
                            label="Interface Theme" 
                            description={app.theme === Theme.DARK ? 'Dark Mode Active' : 'Light Mode Active'}
                            icon={app.theme === Theme.DARK ? <MoonIcon /> : <SunIcon />} 
                            iconColor={app.theme === Theme.DARK ? "bg-indigo-500" : "bg-amber-400"}
                            action={<ThemeModeToggle isDark={app.theme === Theme.DARK} toggle={() => app.toggleTheme()} />}
                        />
                        
                        {/* Detailed Theme Grid */}
                        <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-2xl mx-2 mb-2">
                            <div className="flex items-center gap-2 mb-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                <PaletteIcon className="w-4 h-4" />
                                <span>Color Palette</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {allThemes.map(t => {
                                    const isSelected = app.equippedTheme === t.id;
                                    return (
                                        <button 
                                            key={t.id} 
                                            onClick={() => handleThemeSelect(t.id)}
                                            className={`relative w-full h-24 rounded-xl border-2 transition-all overflow-hidden group text-left flex flex-col justify-end p-4
                                                ${isSelected 
                                                    ? 'border-cyan-500 ring-2 ring-cyan-500/20 shadow-lg scale-[1.02]' 
                                                    : 'border-gray-200 dark:border-white/5 hover:border-cyan-500/50 hover:shadow-md'
                                                }
                                            `}
                                        >
                                            <div className="absolute inset-0 z-0" style={{ background: t.bgGradient }}></div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent z-10"></div>
                                            
                                            <div className="relative z-20 flex justify-between items-end w-full">
                                                <div>
                                                    <span className="font-bold text-white text-base block drop-shadow-md">{t.name}</span>
                                                    <span className="text-xs text-gray-300 block font-medium opacity-90">{t.description || "Custom Theme"}</span>
                                                </div>
                                                {isSelected && (
                                                    <div className="bg-cyan-500 text-white rounded-full p-1 shadow-lg">
                                                        <CheckIcon className="w-3 h-3" />
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Gameplay Column */}
                    <div className="space-y-8">
                        <div>
                            <SectionTitle title="Gameplay" />
                            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-3xl p-2 shadow-sm space-y-1">
                                <SettingRow 
                                    label="Haptic Feedback" 
                                    description="Vibrate on interaction"
                                    icon={<GridIcon />} 
                                    iconColor="bg-orange-500"
                                    action={<FluidSwitch checked={app.preferences.haptics} onChange={() => togglePref('haptics')} />}
                                />
                                <SettingRow 
                                    label="Show Coordinates" 
                                    description="Grid notation (A1, B2...)"
                                    icon={<GridIcon />} 
                                    iconColor="bg-green-500"
                                    action={<FluidSwitch checked={app.preferences.showCoordinates} onChange={() => togglePref('showCoordinates')} />}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notifications & System Column */}
                    <div className="space-y-8">
                        <div>
                            <SectionTitle title="Notifications" />
                            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-3xl p-2 shadow-sm space-y-1">
                                <SettingRow 
                                    label="Friend Requests" 
                                    icon={<UserIcon />} 
                                    iconColor="bg-blue-500"
                                    action={<FluidSwitch checked={app.preferences.notifyOnFriendRequest} onChange={() => togglePref('notifyOnFriendRequest')} />}
                                />
                                <SettingRow 
                                    label="Direct Messages" 
                                    icon={<BellIcon />} 
                                    iconColor="bg-purple-500"
                                    action={<FluidSwitch checked={app.preferences.notifyOnChat} onChange={() => togglePref('notifyOnChat')} />}
                                />
                                <SettingRow 
                                    label="System Alerts" 
                                    icon={<ShieldIcon />} 
                                    iconColor="bg-teal-500"
                                    action={<FluidSwitch checked={app.preferences.notifyOnSystem} onChange={() => togglePref('notifyOnSystem')} />}
                                />
                            </div>
                        </div>

                        <div>
                            <SectionTitle title="System" />
                            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-3xl p-2 shadow-sm space-y-1">
                                <SettingRow 
                                    label="Performance Mode" 
                                    description="Reduce animations"
                                    icon={<GridIcon />} 
                                    iconColor="bg-yellow-500"
                                    action={<FluidSwitch checked={app.preferences.lowPerformance} onChange={() => togglePref('lowPerformance')} />}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center pt-8 pb-2">
                    <div className="text-[10px] font-bold text-gray-300 dark:text-white/20 uppercase tracking-[0.2em]">AURA v1.2.5</div>
                </div>
            </div>
        </Modal>
    );
};

export default SettingsModal;

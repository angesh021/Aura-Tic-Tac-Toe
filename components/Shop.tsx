
import React, { useEffect, useState, useContext, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SHOP_ITEMS, progressService } from '../services/progress';
import { AppContext } from '../contexts/AppContext';
import { AuthContext } from '../contexts/AuthContext';
import { CoinIcon, CheckCircleIcon, LockIcon, CloseIcon, UserIcon, PaletteIcon, ShapesIcon, XIcon, OIcon, LightningIcon, BombIcon, ShieldIcon, DoubleIcon, ConvertIcon, ClockIcon, BadgeIcon, CheckIcon } from './Icons';
import { UserAvatar } from './Avatars';
import { useToast } from '../contexts/ToastContext';
import Modal from './Modal';
import AvatarFrame from './AvatarFrame';
import CoinTransferAnimation from './CoinTransferAnimation';
import { ShopItem } from '../types';

interface ShopProps {
    onClose: () => void;
}

type Tab = 'daily' | 'owned' | 'avatar' | 'theme' | 'skin' | 'powerup' | 'frame';

const SkinPreview = ({ skinId }: { skinId: string }) => {
    const renderShape = (type: 'X' | 'O') => {
        if (skinId === 'skin-emoji') {
            return <span className="text-2xl drop-shadow-md">{type === 'X' ? '🔥' : '🧊'}</span>;
        }
        if (skinId === 'skin-geo') {
            if (type === 'X') {
                return (
                    <svg viewBox="0 0 100 100" className="w-full h-full p-1">
                        <rect x="20" y="20" width="60" height="60" fill="currentColor" className="text-[var(--color-brand-x)]" />
                    </svg>
                );
            }
            return (
                <svg viewBox="0 0 100 100" className="w-full h-full p-1">
                    <polygon points="50,15 85,85 15,85" fill="currentColor" className="text-[var(--color-brand-o)]" />
                </svg>
            );
        }
        if (skinId === 'skin-neon') {
             if (type === 'X') {
                return (
                    <svg viewBox="0 0 100 100" className="w-full h-full p-1 filter drop-shadow-[0_0_8px_var(--color-brand-x)]">
                        <path d="M25 25 L75 75 M75 25 L25 75" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-[var(--color-brand-x)]" />
                    </svg>
                );
            }
            return (
                <svg viewBox="0 0 100 100" className="w-full h-full p-1 filter drop-shadow-[0_0_8px_var(--color-brand-o)]">
                    <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="8" fill="none" className="text-[var(--color-brand-o)]" />
                </svg>
            );
        }
        if (skinId === 'skin-golden') {
            const glowStyle = { filter: 'drop-shadow(0 0 6px rgba(253, 224, 71, 0.9))' };
            if (type === 'X') {
               return (
                   <div className="relative w-full h-full p-1">
                       <XIcon className="w-full h-full text-yellow-300" style={glowStyle} />
                   </div>
               );
           }
           return (
               <div className="relative w-full h-full p-1">
                   <OIcon className="w-full h-full text-yellow-300" style={glowStyle} />
               </div>
           );
        }
        if (skinId === 'skin-grandmaster') {
            const glowStyle = { filter: 'drop-shadow(0 0 6px rgba(232, 121, 249, 0.9))' };
            if (type === 'X') {
               return (
                   <div className="relative w-full h-full p-1">
                       <XIcon className="w-full h-full text-fuchsia-300" style={glowStyle} />
                   </div>
               );
           }
           return (
               <div className="relative w-full h-full p-1">
                   <OIcon className="w-full h-full text-fuchsia-300" style={glowStyle} />
               </div>
           );
        }
        // Default Classic
        return type === 'X' 
            ? <XIcon className="text-[var(--color-brand-x)] p-1" /> 
            : <OIcon className="text-[var(--color-brand-o)] p-1" />;
    };

    return (
        <div className="flex gap-3">
            <div className="w-12 h-12 bg-black/20 rounded-xl border border-white/10 flex items-center justify-center shadow-inner">
                {renderShape('X')}
            </div>
            <div className="w-12 h-12 bg-black/20 rounded-xl border border-white/10 flex items-center justify-center shadow-inner">
                {renderShape('O')}
            </div>
        </div>
    );
};

const Shop: React.FC<ShopProps> = ({ onClose }) => {
    const [progress, setProgress] = useState(progressService.getProgress());
    const [activeTab, setActiveTab] = useState<Tab>('daily');
    const [confirmItem, setConfirmItem] = useState<{ id: string, name: string, cost: number, type: string, icon?: React.ReactNode } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const [showTransfer, setShowTransfer] = useState(false);
    
    const app = useContext(AppContext);
    const auth = useContext(AuthContext);
    const toast = useToast();
    
    useEffect(() => {
        const handleUpdate = () => setProgress(progressService.getProgress());
        window.addEventListener('aura_progress_update', handleUpdate);
        
        // Initial Fetch
        setProgress(progressService.getProgress());

        return () => window.removeEventListener('aura_progress_update', handleUpdate);
    }, []);

    // Countdown Timer for Daily Shop
    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const midnightLocal = new Date();
            midnightLocal.setDate(now.getDate() + 1);
            midnightLocal.setHours(0, 0, 0, 0);
            const diff = midnightLocal.getTime() - now.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            return `${hours}h ${minutes}m`;
        };
        setTimeLeft(calculateTimeLeft());
        const interval = setInterval(() => setTimeLeft(calculateTimeLeft()), 60000);
        return () => clearInterval(interval);
    }, []);

    const initiatePurchase = (item: any, discountedCost?: number) => {
        // Allow multiple purchases for consumables (powerups)
        if (item.type !== 'powerup' && progressService.isItemOwned(item.id)) return;
        
        // Level Check for Frames
        if (item.type === 'frame' && item.unlockLevel && (auth?.currentUser?.level || 1) < item.unlockLevel) {
            toast.error(`Requires Level ${item.unlockLevel}`);
            return;
        }

        setConfirmItem({ 
            id: item.id, 
            name: item.name, 
            cost: discountedCost ?? item.cost,
            type: item.type,
            icon: renderPreview(item, true) // Small preview for modal
        });
    };

    const confirmPurchase = async () => {
        if (!confirmItem || isProcessing) return;
        
        setIsProcessing(true);
        
        try {
            const success = await progressService.purchaseItem(confirmItem.id);
            if (success) {
                // Trigger animation
                setShowTransfer(true);
                toast.success(`Acquired ${confirmItem.name}!`);
                app?.refreshCoins();
                if (activeTab === 'powerup') {
                    app?.refreshUser();
                }
                setConfirmItem(null);
            } else {
                toast.error("Purchase failed. Please check your balance.");
            }
        } catch (e: any) {
            toast.error(e.message || "Transaction failed.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEquip = async (itemId: string, type: string) => {
        if (type === 'powerup' || type === 'daily') return; 

        const actualType = type as 'avatar' | 'theme' | 'skin' | 'frame';
        const success = await progressService.equipItem(itemId, actualType);
        if (success) {
            if (actualType === 'avatar') auth?.updateUser({ avatar: itemId });
            if (actualType === 'theme' || actualType === 'skin' || actualType === 'frame') {
                app?.refreshUser();
            }
            toast.success("Equipped!");
        } else {
            toast.error("Failed to equip.");
        }
    };

    const getEquippedId = (type: Tab) => {
        if (type === 'avatar') return auth?.currentUser?.avatar;
        if (type === 'theme') return app?.equippedTheme;
        if (type === 'skin') return app?.equippedSkin;
        if (type === 'frame') return auth?.currentUser?.questData?.equippedFrame || 'frame-none';
        return '';
    }

    const renderPreview = (item: typeof SHOP_ITEMS[0], isSmall = false) => {
        const sizeClass = isSmall ? 'w-12 h-12' : 'w-20 h-20';
        
        if (item.type === 'avatar') {
            return (
                <div className={`${sizeClass} rounded-full overflow-hidden border-2 border-white/10 bg-black/20 shadow-lg`}>
                    <UserAvatar avatarId={item.assetId} className="w-full h-full" />
                </div>
            );
        }
        if (item.type === 'theme' && item.colors) {
            if (isSmall) {
                return <div className="w-12 h-12 rounded-lg" style={{ background: item.bgGradient }}></div>
            }
            return (
                <div className="w-full h-24 rounded-xl border-2 border-white/10 overflow-hidden shadow-lg relative group-hover:scale-[1.02] transition-transform">
                    <div className="absolute inset-0" style={{ background: item.colors[2] }} />
                    {item.bgGradient && <div className="absolute inset-0" style={{ background: item.bgGradient, opacity: 0.8 }} />}
                    <div className="absolute inset-0 flex items-center justify-center gap-2">
                        <div className="w-8 h-8 rounded bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                            <XIcon className="w-5 h-5" style={{ color: item.colors[0] }} />
                        </div>
                        <div className="w-8 h-8 rounded bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                            <OIcon className="w-5 h-5" style={{ color: item.colors[1] }} />
                        </div>
                    </div>
                </div>
            );
        }
        if (item.type === 'skin') {
            return <SkinPreview skinId={item.assetId} />;
        }
        if (item.type === 'powerup') {
            return (
                <div className={`${isSmall ? 'w-12 h-12' : 'w-24 h-24'} bg-gradient-to-br from-white/10 to-transparent rounded-2xl border border-white/10 flex items-center justify-center`}>
                    {item.assetId === 'powerup-destroy' && <BombIcon className={`${isSmall ? 'w-6 h-6' : 'w-12 h-12'} text-red-400`} />}
                    {item.assetId === 'powerup-wall' && <ShieldIcon className={`${isSmall ? 'w-6 h-6' : 'w-12 h-12'} text-green-400`} />}
                    {item.assetId === 'powerup-double' && <DoubleIcon className={`${isSmall ? 'w-6 h-6' : 'w-12 h-12'} text-yellow-400`} />}
                    {item.assetId === 'powerup-convert' && <ConvertIcon className={`${isSmall ? 'w-6 h-6' : 'w-12 h-12'} text-purple-400`} />}
                </div>
            );
        }
        if (item.type === 'frame') {
            return (
                <div className={`${isSmall ? 'w-12 h-12' : 'w-24 h-24'} flex items-center justify-center`}>
                    <AvatarFrame frameId={item.assetId} className={isSmall ? 'w-10 h-10' : 'w-20 h-20'}>
                        <UserAvatar avatarId={auth?.currentUser?.avatar || 'avatar-1'} className="w-full h-full" />
                    </AvatarFrame>
                </div>
            );
        }
        return null;
    };

    // Filter Logic
    const dailyShopIds = progress.dailyShop || [];
    
    // Grouped Owned Items Logic
    const groupedOwnedItems = useMemo(() => {
        const inventoryCounts: Record<string, number> = {};
        progress.inventory.forEach(id => {
            inventoryCounts[id] = (inventoryCounts[id] || 0) + 1;
        });

        // Add default items that might not be in inventory explicitly but are owned
        // (Though usually we only want to show things they acquired, let's stick to inventory for the "Owned" tab as requested)
        
        const ownedItems = Object.keys(inventoryCounts).map(id => {
            const def = SHOP_ITEMS.find(i => i.id === id);
            return def ? { ...def, count: inventoryCounts[id] } : null;
        }).filter((i): i is (ShopItem & { count: number }) => !!i);

        const groups: Record<string, (ShopItem & { count: number })[]> = {};
        ownedItems.forEach(item => {
            if (!groups[item.type]) groups[item.type] = [];
            groups[item.type].push(item);
        });

        return groups;
    }, [progress.inventory]);

    let displayedItems: ShopItem[] = [];
    if (activeTab === 'daily') {
        displayedItems = SHOP_ITEMS.filter(i => dailyShopIds.includes(i.id));
    } else if (activeTab !== 'owned') {
        displayedItems = SHOP_ITEMS.filter(i => i.type === activeTab);
    }

    return (
        <>
        <motion.div 
            className="w-full md:max-w-5xl h-full md:h-[85vh] p-4 md:p-6 bg-gray-50 dark:bg-gray-900/80 backdrop-blur-xl md:rounded-3xl rounded-none shadow-2xl border-0 md:border border-gray-200 dark:border-white/10 flex flex-col relative overflow-hidden fixed inset-0 md:relative"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 shrink-0 relative z-10 gap-4 pt-4 md:pt-0">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                        Marketplace
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Upgrade your style & arsenal</p>
                </div>
                <div className="flex items-center gap-3 self-end md:self-auto w-full md:w-auto justify-end">
                    <div id="shop-balance-display" className="px-4 py-2 bg-yellow-100 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-xl flex items-center gap-2 shadow-sm">
                        <CoinIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        <span className="font-bold text-yellow-800 dark:text-yellow-100 text-lg">{progress.coins}</span>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-full bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/5 transition-colors"><CloseIcon className="w-6 h-6 text-gray-500 dark:text-white" /></button>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4 shrink-0 relative z-10">
                {/* Tabs */}
                <div className="flex-1 flex gap-1 p-1 bg-white dark:bg-black/20 rounded-2xl border border-gray-200 dark:border-white/5 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 whitespace-nowrap
                            ${activeTab === 'daily' 
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md' 
                                : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent'
                            }
                        `}
                    >
                        <ClockIcon className="w-4 h-4" /> <span className="hidden sm:inline">Daily</span>
                    </button>
                    {[
                        { id: 'avatar', label: 'Avatars', icon: <UserIcon className="w-4 h-4"/> },
                        { id: 'frame', label: 'Frames', icon: <BadgeIcon className="w-4 h-4"/> },
                        { id: 'theme', label: 'Themes', icon: <PaletteIcon className="w-4 h-4"/> },
                        { id: 'skin', label: 'Skins', icon: <ShapesIcon className="w-4 h-4"/> },
                        { id: 'powerup', label: 'Upgrades', icon: <LightningIcon className="w-4 h-4"/> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 whitespace-nowrap
                                ${activeTab === tab.id ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-white/10' : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent'}
                            `}
                        >
                            {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Owned Items - Separated */}
                <button
                    onClick={() => setActiveTab('owned')}
                    className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 shadow-sm
                        ${activeTab === 'owned' 
                            ? 'bg-green-600 text-white shadow-lg shadow-green-500/30 ring-2 ring-green-500 ring-offset-2 ring-offset-gray-50 dark:ring-offset-[#0f172a] transform scale-105' 
                            : 'bg-white dark:bg-black/20 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 border border-gray-200 dark:border-white/5 hover:border-green-500/30'
                        }
                    `}
                >
                    <CheckCircleIcon className="w-5 h-5" /> 
                    <span>Owned</span>
                </button>
            </div>

            {/* Daily Deal Timer */}
            {activeTab === 'daily' && (
                <div className="mb-4 flex items-center justify-center gap-2 text-xs font-bold text-orange-500 uppercase tracking-widest bg-orange-500/10 py-2 rounded-xl border border-orange-500/20 shrink-0">
                    <ClockIcon className="w-4 h-4" /> Refresh in: {timeLeft}
                </div>
            )}

            {/* Main Content Area */}
            <div className="overflow-y-auto custom-scrollbar p-1 flex-1 relative z-10 pb-24 md:pb-4">
                <AnimatePresence mode='popLayout'>
                    {activeTab === 'owned' ? (
                        /* Owned Items View */
                        <div className="space-y-8">
                            {Object.keys(groupedOwnedItems).length === 0 ? (
                                <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex flex-col items-center justify-center h-48 text-gray-500">
                                    <LockIcon className="w-12 h-12 mb-2 opacity-30" />
                                    <p>No items acquired yet.</p>
                                </motion.div>
                            ) : (
                                (['powerup', 'avatar', 'frame', 'theme', 'skin'] as const).map(type => {
                                    const items = groupedOwnedItems[type];
                                    if (!items || items.length === 0) return null;

                                    return (
                                        <div key={type} className="space-y-3">
                                            <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2 border-l-4 border-cyan-500 pl-3">
                                                {type === 'powerup' ? 'Upgrades' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
                                            </h3>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                                {items.map(item => {
                                                    const isEquipped = getEquippedId(item.type as Tab) === item.assetId;
                                                    
                                                    return (
                                                        <motion.div 
                                                            key={item.id}
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            className={`relative flex flex-col items-center p-3 rounded-2xl border transition-all h-full bg-white dark:bg-white/5 border-gray-200 dark:border-white/5 ${isEquipped ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-[#0f172a]' : ''}`}
                                                        >
                                                            {/* Quantity Badge */}
                                                            {item.count > 1 && (
                                                                <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[10px] font-black px-2 py-1 rounded-full shadow-lg border border-yellow-400 z-20">
                                                                    x{item.count}
                                                                </div>
                                                            )}

                                                            <div className="mb-3 relative w-full flex justify-center items-center h-16">
                                                                {renderPreview(item, true)}
                                                            </div>
                                                            
                                                            <div className="text-center w-full mb-3">
                                                                <h4 className="font-bold text-xs text-gray-900 dark:text-white truncate">{item.name}</h4>
                                                            </div>

                                                            {item.type !== 'powerup' ? (
                                                                <button 
                                                                    onClick={() => handleEquip(item.assetId, item.type)}
                                                                    disabled={isEquipped}
                                                                    className={`w-full py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wide transition-all
                                                                        ${isEquipped 
                                                                            ? 'bg-green-500/20 text-green-500 cursor-default' 
                                                                            : 'bg-white/10 hover:bg-cyan-600 text-gray-500 dark:text-gray-400 hover:text-white border border-gray-200 dark:border-white/10'
                                                                        }`}
                                                                >
                                                                    {isEquipped ? 'Equipped' : 'Equip'}
                                                                </button>
                                                            ) : (
                                                                <div className="text-[10px] text-gray-400 font-medium bg-black/20 px-2 py-1 rounded">Consumable</div>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        /* Standard Shop Grid */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {displayedItems.length === 0 ? (
                                <motion.div initial={{opacity:0}} animate={{opacity:1}} className="col-span-full flex flex-col items-center justify-center text-gray-500 h-48">
                                    <LockIcon className="w-12 h-12 mb-2 opacity-30" />
                                    <p>No items found.</p>
                                </motion.div>
                            ) : (
                                displayedItems.map((item, idx) => {
                                    const isOwned = progressService.isItemOwned(item.id);
                                    const isEquipped = getEquippedId(item.type as Tab) === item.assetId;
                                    const isDailyDeal = dailyShopIds.includes(item.id);
                                    let finalCost = item.cost;
                                    if (isDailyDeal) finalCost = Math.floor(item.cost * 0.7);
                                    const canAfford = progress.coins >= finalCost;
                                    const isLevelLocked = (item.type === 'frame' && item.unlockLevel) ? (auth?.currentUser?.level || 1) < item.unlockLevel : false;
                                    const missingFunds = finalCost - progress.coins;

                                    return (
                                        <motion.div 
                                            key={item.id} 
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className={`
                                                relative flex flex-col items-center p-4 rounded-2xl border transition-all duration-300 group overflow-hidden h-full min-h-[280px]
                                                ${isEquipped 
                                                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-500/30' 
                                                    : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 hover:-translate-y-1 shadow-sm hover:shadow-lg'
                                                }
                                            `}
                                        >
                                            {isDailyDeal && !isOwned && (
                                                <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded shadow-md z-20">-30%</div>
                                            )}
                                            {isLevelLocked && (
                                                <div className="absolute top-2 right-2 bg-gray-800 text-gray-400 text-[10px] font-bold px-2 py-1 rounded border border-white/10 z-20 flex items-center gap-1">
                                                    <LockIcon className="w-3 h-3"/> LVL {item.unlockLevel}
                                                </div>
                                            )}

                                            <div className="mb-4 relative w-full flex justify-center items-center flex-1 min-h-[100px]">
                                                {renderPreview(item)}
                                            </div>
                                            
                                            <div className="text-center w-full mb-4 shrink-0">
                                                <h3 className="font-bold text-base text-gray-900 dark:text-white truncate px-1">{item.name}</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 h-8 leading-snug">{item.description || "Unlock this exclusive item."}</p>
                                            </div>

                                            <div className="w-full mt-auto shrink-0 flex flex-col gap-2">
                                                {isOwned ? (
                                                    item.type === 'powerup' ? (
                                                        <button 
                                                            onClick={() => initiatePurchase(item, finalCost)}
                                                            className="w-full py-3 rounded-xl font-bold text-xs bg-yellow-100 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 text-yellow-600 dark:text-yellow-400 flex items-center justify-center gap-1 hover:bg-yellow-200 dark:hover:bg-yellow-500/20 transition-colors"
                                                        >
                                                            Buy More <div className="ml-1 bg-black/10 px-1.5 rounded text-[10px]">{finalCost}</div>
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleEquip(item.assetId, item.type)}
                                                            disabled={isEquipped}
                                                            className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all
                                                                ${isEquipped 
                                                                    ? 'bg-transparent text-green-600 dark:text-green-500 border border-green-200 dark:border-green-500/30 opacity-100 cursor-default' 
                                                                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg hover:shadow-cyan-500/25'
                                                                }`}
                                                        >
                                                            {isEquipped ? <><CheckCircleIcon className="w-3 h-3"/> Equipped</> : 'Equip'}
                                                        </button>
                                                    )
                                                ) : (
                                                    <>
                                                        <button 
                                                            onClick={() => initiatePurchase(item, finalCost)}
                                                            disabled={isLevelLocked}
                                                            className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border
                                                                ${isLevelLocked 
                                                                    ? 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-400 cursor-not-allowed'
                                                                    : canAfford
                                                                        ? 'bg-yellow-100 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/50 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500 hover:text-white dark:hover:text-black hover:border-yellow-500 shadow-sm'
                                                                        : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-500/20 text-red-500 dark:text-red-400 cursor-not-allowed opacity-80'
                                                                }`}
                                                        >
                                                            {isLevelLocked ? (
                                                                <span>Locked</span>
                                                            ) : (
                                                                <>
                                                                    <span>Buy</span>
                                                                    <div className="flex items-center gap-1 bg-black/5 dark:bg-black/20 px-1.5 py-0.5 rounded ml-1">
                                                                        <CoinIcon className="w-3 h-3" />
                                                                        <span className={isDailyDeal ? 'font-black' : ''}>{finalCost}</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </button>
                                                        {!canAfford && !isLevelLocked && (
                                                            <div className="text-[10px] text-center font-bold text-red-400 flex items-center justify-center gap-1 animate-pulse">
                                                                <span>Missing</span>
                                                                <span className="font-mono">{missingFunds}</span>
                                                                <CoinIcon className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>

        {/* Transaction Modal */}
        <AnimatePresence>
            {confirmItem && (
                <Modal onClose={() => !isProcessing && setConfirmItem(null)} className="max-w-sm bg-white dark:bg-[#1e293b]">
                    <div className="p-4 space-y-6">
                        <div className="text-center">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1">Confirm Purchase</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Review details below</p>
                        </div>

                        <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/5">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="bg-white dark:bg-white/5 p-2 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                                    {confirmItem.icon}
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Item</div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">{confirmItem.name}</div>
                                </div>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center text-gray-500 dark:text-gray-400">
                                    <span>Current Balance</span>
                                    <span className="font-mono">{progress.coins}</span>
                                </div>
                                <div className="flex justify-between items-center text-red-500 font-bold">
                                    <span>Cost</span>
                                    <span className="font-mono">-{confirmItem.cost}</span>
                                </div>
                                <div className="h-px bg-gray-200 dark:bg-white/10 my-1"></div>
                                <div className="flex justify-between items-center font-black text-base">
                                    <span className="text-gray-900 dark:text-white">New Balance</span>
                                    <span className={`font-mono ${progress.coins >= confirmItem.cost ? 'text-green-500' : 'text-red-500'}`}>
                                        {progress.coins - confirmItem.cost}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setConfirmItem(null)}
                                disabled={isProcessing}
                                className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmPurchase}
                                disabled={isProcessing || progress.coins < confirmItem.cost}
                                className={`flex-[1.5] py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 text-sm transition-all
                                    ${progress.coins >= confirmItem.cost 
                                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400' 
                                        : 'bg-gray-400 cursor-not-allowed opacity-70'}
                                `}
                            >
                                {isProcessing ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing</>
                                ) : (
                                    <>Confirm <CoinIcon className="w-4 h-4"/></>
                                )}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </AnimatePresence>

        {showTransfer && confirmItem && (
            <CoinTransferAnimation 
                amount={-confirmItem.cost}
                startId="shop-balance-display"
                onComplete={() => setShowTransfer(false)}
            />
        )}
        </>
    );
};

export default Shop;

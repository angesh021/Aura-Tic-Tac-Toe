
import React, { useEffect, useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SHOP_ITEMS, progressService } from '../services/progress';
import { AppContext } from '../contexts/AppContext';
import { AuthContext } from '../contexts/AuthContext';
import { CoinIcon, CheckCircleIcon, LockIcon, CloseIcon, UserIcon, PaletteIcon, ShapesIcon, XIcon, OIcon, LightningIcon, BombIcon, ShieldIcon, DoubleIcon, ConvertIcon, ClockIcon, BadgeIcon } from './Icons';
import { UserAvatar } from './Avatars';
import { useToast } from '../contexts/ToastContext';
import Modal from './Modal';
import AvatarFrame from './AvatarFrame';

interface ShopProps {
    onClose: () => void;
}

type Tab = 'daily' | 'avatar' | 'theme' | 'skin' | 'powerup' | 'frame';

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
    const [confirmItem, setConfirmItem] = useState<{ id: string, name: string, cost: number } | null>(null);
    const [filterOwned, setFilterOwned] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    
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
        if (progressService.isItemOwned(item.id)) return;
        
        // Level Check for Frames
        if (item.type === 'frame' && item.unlockLevel && (auth?.currentUser?.level || 1) < item.unlockLevel) {
            toast.error(`Requires Level ${item.unlockLevel}`);
            return;
        }

        setConfirmItem({ id: item.id, name: item.name, cost: discountedCost ?? item.cost });
    };

    const confirmPurchase = async () => {
        if (!confirmItem || isProcessing) return;
        
        setIsProcessing(true);
        
        try {
            const success = await progressService.purchaseItem(confirmItem.id);
            if (success) {
                toast.success(`Acquired ${confirmItem.name}!`);
                app?.refreshCoins();
                if (activeTab === 'powerup') {
                    // Force user refresh to ensure game logic picks up ownership
                    app?.refreshUser();
                }
            } else {
                // The service handles error toast or fallback
            }
        } catch (e) {
            toast.error("Transaction encountered an error.");
        } finally {
            setIsProcessing(false);
            setConfirmItem(null);
        }
    };

    const handleEquip = async (itemId: string, type: string) => {
        if (type === 'powerup' || type === 'daily') return; // Cannot equip powerups directly here (passive)

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

    const renderPreview = (item: typeof SHOP_ITEMS[0]) => {
        if (item.type === 'avatar') {
            return (
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white/10 bg-black/20 shadow-lg group-hover:scale-105 transition-transform duration-300">
                    <UserAvatar avatarId={item.assetId} className="w-full h-full" />
                </div>
            );
        }
        if (item.type === 'theme' && item.colors) {
            return (
                <div className="w-full h-24 rounded-xl border-2 border-white/10 overflow-hidden shadow-lg relative group-hover:scale-[1.02] transition-transform">
                    {/* Background Preview */}
                    <div 
                        className="absolute inset-0"
                        style={{ background: item.colors[2] }} 
                    />
                    {item.bgGradient && <div className="absolute inset-0" style={{ background: item.bgGradient, opacity: 0.8 }} />}
                    
                    {/* Mini Board Representation */}
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
                <div className="w-24 h-24 bg-gradient-to-br from-white/10 to-transparent rounded-2xl border border-white/10 flex items-center justify-center shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] group-hover:scale-105 transition-transform duration-300">
                    {item.assetId === 'powerup-destroy' && <BombIcon className="w-12 h-12 text-red-400 drop-shadow-lg" />}
                    {item.assetId === 'powerup-wall' && <ShieldIcon className="w-12 h-12 text-green-400 drop-shadow-lg" />}
                    {item.assetId === 'powerup-double' && <DoubleIcon className="w-12 h-12 text-yellow-400 drop-shadow-lg" />}
                    {item.assetId === 'powerup-convert' && <ConvertIcon className="w-12 h-12 text-purple-400 drop-shadow-lg" />}
                </div>
            );
        }
        if (item.type === 'frame') {
            return (
                <div className="w-24 h-24 flex items-center justify-center">
                    <AvatarFrame frameId={item.assetId} className="w-20 h-20">
                        <UserAvatar avatarId={auth?.currentUser?.avatar || 'avatar-1'} className="w-full h-full" />
                    </AvatarFrame>
                </div>
            );
        }
        return null;
    };

    // Filter Logic
    const dailyShopIds = progress.dailyShop || [];
    
    let displayedItems = SHOP_ITEMS;
    if (activeTab === 'daily') {
        displayedItems = SHOP_ITEMS.filter(i => dailyShopIds.includes(i.id));
    } else {
        displayedItems = SHOP_ITEMS.filter(i => {
            const matchesTab = i.type === activeTab;
            if (!filterOwned) return matchesTab;
            return matchesTab && progressService.isItemOwned(i.id);
        });
    }

    return (
        <>
        <motion.div 
            className="w-full max-w-5xl p-6 bg-gray-50 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 dark:border-white/10 h-full flex flex-col relative overflow-hidden"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 shrink-0 relative z-10 gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                        Marketplace
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Spend your hard-earned coins</p>
                </div>
                <div className="flex items-center gap-4 self-end md:self-auto">
                    <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-xl flex items-center gap-2 shadow-sm">
                        <CoinIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        <span className="font-bold text-yellow-800 dark:text-yellow-100 text-lg">{progress.coins}</span>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-full bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/5 transition-colors"><CloseIcon className="w-6 h-6 text-gray-500 dark:text-white" /></button>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6 shrink-0 relative z-10">
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
                        <ClockIcon className="w-4 h-4" /> <span className="hidden sm:inline">Daily Deals</span>
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
                
                {/* Filter Toggle */}
                {activeTab !== 'daily' && (
                    <button 
                        onClick={() => setFilterOwned(!filterOwned)}
                        className={`px-4 py-2 rounded-xl border font-bold text-sm transition-all whitespace-nowrap
                            ${filterOwned ? 'bg-green-100 dark:bg-green-500/20 border-green-200 dark:border-green-500/30 text-green-600 dark:text-green-400' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10'}
                        `}
                    >
                        {filterOwned ? 'Show All' : 'Show Inventory'}
                    </button>
                )}
            </div>

            {/* Daily Deal Timer Banner */}
            {activeTab === 'daily' && (
                <div className="mb-4 flex items-center justify-center gap-2 text-xs font-bold text-orange-500 uppercase tracking-widest bg-orange-500/10 py-2 rounded-xl border border-orange-500/20">
                    <ClockIcon className="w-4 h-4" /> Resets in: {timeLeft}
                </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto custom-scrollbar p-1 flex-1 relative z-10 pb-4">
                {displayedItems.map((item, idx) => {
                    const isOwned = progressService.isItemOwned(item.id);
                    const isEquipped = getEquippedId(item.type as Tab) === item.assetId;
                    
                    // Logic for discount
                    const isDailyDeal = dailyShopIds.includes(item.id);
                    let finalCost = item.cost;
                    if (isDailyDeal) {
                        finalCost = Math.floor(item.cost * 0.7); // 30% off
                    }
                    const canAfford = progress.coins >= finalCost;
                    
                    // --- FIX: Correct type check for isLevelLocked ---
                    // Ensure the condition results in a boolean
                    const isLevelLocked = (item.type === 'frame' && item.unlockLevel) ? (auth?.currentUser?.level || 1) < item.unlockLevel : false;

                    return (
                        <motion.div 
                            key={item.id} 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className={`
                                relative flex flex-col items-center p-4 rounded-2xl border transition-all duration-300 group overflow-hidden
                                ${isEquipped 
                                    ? 'bg-green-50 dark:bg-green-500/5 border-green-200 dark:border-green-500/30 shadow-sm dark:shadow-[0_0_20px_rgba(34,197,94,0.05)]' 
                                    : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/10 hover:-translate-y-1 shadow-sm dark:shadow-lg'
                                }
                            `}
                        >
                            {/* Daily Deal Badge */}
                            {isDailyDeal && !isOwned && (
                                <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded shadow-md z-20">
                                    -30%
                                </div>
                            )}

                            <div className="mb-4 relative w-full flex justify-center min-h-[100px] items-center">
                                {renderPreview(item)}
                                {isEquipped && (
                                    <div className="absolute top-0 right-0 bg-green-500 text-white dark:text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                                        <CheckCircleIcon className="w-3 h-3" /> EQUIPPED
                                    </div>
                                )}
                                {item.type === 'powerup' && isOwned && (
                                    <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 border border-white/20">
                                        <CheckCircleIcon className="w-3 h-3" /> UNLOCKED
                                    </div>
                                )}
                            </div>
                            
                            <div className="text-center w-full mb-4">
                                <h3 className="font-bold text-base text-gray-900 dark:text-white truncate">{item.name}</h3>
                                {item.description && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-2 min-h-[2.5em] leading-relaxed">{item.description}</p>}
                            </div>

                            <div className="w-full mt-auto">
                                {isOwned ? (
                                    item.type === 'powerup' ? (
                                        <button disabled className="w-full py-3 rounded-xl font-bold text-xs bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-400 cursor-default">
                                            Purchased
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleEquip(item.assetId, item.type)}
                                            disabled={isEquipped}
                                            className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all
                                                ${isEquipped 
                                                    ? 'bg-transparent text-green-600 dark:text-green-500 border border-green-200 dark:border-green-500/30 opacity-50 cursor-default' 
                                                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg hover:shadow-cyan-500/25'
                                                }`}
                                        >
                                            {isEquipped ? 'Active' : 'Equip'}
                                        </button>
                                    )
                                ) : (
                                    <button 
                                        onClick={() => initiatePurchase(item, finalCost)}
                                        disabled={!canAfford || isLevelLocked}
                                        className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border
                                            ${canAfford && !isLevelLocked
                                                ? 'bg-yellow-100 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/50 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500 hover:text-white dark:hover:text-black hover:border-yellow-500' 
                                                : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        {isLevelLocked ? (
                                            <><LockIcon className="w-3 h-3" /> Lvl {item.unlockLevel}</>
                                        ) : canAfford ? (
                                            <>Purchase 
                                                <span className={`bg-black/10 dark:bg-black/20 px-1.5 rounded text-[10px] ${isDailyDeal ? 'line-through opacity-50 mr-1' : ''}`}>{item.cost}</span>
                                                {isDailyDeal && <span className="text-red-500 dark:text-red-400 font-black">{finalCost}</span>}
                                            </>
                                        ) : (
                                            <><LockIcon className="w-3 h-3" /> {finalCost}</>
                                        )}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>

        {/* Purchase Confirmation Modal */}
        <AnimatePresence>
            {confirmItem && (
                <Modal onClose={() => !isProcessing && setConfirmItem(null)}>
                    <div className="text-center space-y-6 p-2">
                        <div className="w-20 h-20 mx-auto bg-yellow-100 dark:bg-yellow-500/20 rounded-full flex items-center justify-center border-2 border-yellow-400 dark:border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                            <CoinIcon className="w-10 h-10 text-yellow-500 dark:text-yellow-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Confirm Purchase</h2>
                            <p className="text-gray-500 dark:text-gray-400">
                                Buy <strong className="text-gray-900 dark:text-white">{confirmItem.name}</strong> for <strong className="text-yellow-500 dark:text-yellow-400">{confirmItem.cost}</strong> coins?
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => setConfirmItem(null)}
                                disabled={isProcessing}
                                className="flex-1 py-3 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmPurchase}
                                disabled={isProcessing}
                                className="flex-1 py-3 rounded-xl font-bold text-white dark:text-black bg-yellow-500 hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white dark:text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    "Confirm"
                                )}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </AnimatePresence>
        </>
    );
};

export default Shop;

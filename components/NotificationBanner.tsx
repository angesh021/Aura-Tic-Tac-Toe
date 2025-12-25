
import React, { useEffect, useContext, useState, useRef } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { Notification } from '../types';
import { 
    MessageIcon, UsersIcon, SwordIcon, GiftIcon, BellIcon, 
    CloseIcon, TrophyIcon, CoinIcon, StarIcon,
    PlayIcon, BombIcon, ShieldIcon, DoubleIcon, ConvertIcon, CheckIcon as CheckSmallIcon, LightningIcon
} from './Icons';
import { UserAvatar } from './Avatars';
import { SocialHubContext } from '../contexts/SocialHubContext';
import { AppContext } from '../contexts/AppContext';
import { friendsService } from '../services/friends';
import { useToast } from '../contexts/ToastContext';
import { useNotifications } from '../contexts/NotificationContext';

interface NotificationBannerProps {
    notification: Notification;
    onDismiss: () => void;
    onView: () => void;
}

const AUTO_DISMISS_DURATION = 6000;

// --- Sub-components ---

const ActionButton: React.FC<{ 
    label?: string, 
    onClick: (e: React.MouseEvent) => void, 
    variant?: 'primary' | 'danger' | 'neutral' | 'special',
    isLoading?: boolean
}> = ({ label, onClick, variant = 'neutral', isLoading = false }) => {
    
    // iOS-style translucent buttons
    const variantClasses = {
        primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30 shadow-lg border border-blue-400/20',
        danger: 'bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 dark:text-red-400 border border-red-500/20',
        neutral: 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10',
        special: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-orange-500/30 shadow-lg border border-orange-400/20'
    };

    return (
        <button 
            onClick={onClick}
            disabled={isLoading}
            className={`
                flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 
                disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2 backdrop-blur-sm
                ${variantClasses[variant]}
            `}
        >
            {isLoading && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"/>}
            {label}
        </button>
    );
};

// --- Timer Hook ---
const usePausableTimer = (callback: () => void, duration: number) => {
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    
    const startTimeRef = useRef<number>(Date.now());
    const remainingRef = useRef<number>(duration);
    const frameRef = useRef<number>(0);

    useEffect(() => {
        const animate = () => {
            if (isPaused) {
                startTimeRef.current = Date.now() - (duration - remainingRef.current);
                frameRef.current = requestAnimationFrame(animate);
                return;
            }

            const now = Date.now();
            const elapsed = now - startTimeRef.current;
            const newProgress = Math.min(100, (elapsed / duration) * 100);
            
            setProgress(newProgress);
            remainingRef.current = duration - elapsed;

            if (elapsed < duration) {
                frameRef.current = requestAnimationFrame(animate);
            } else {
                callback();
            }
        };

        frameRef.current = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(frameRef.current);
    }, [isPaused, duration, callback]);

    return { progress, setIsPaused };
};

// --- Helper for Quest Icons ---
const getQuestIcon = (type?: string) => {
    switch(type) {
        case 'win': return <SwordIcon className="w-5 h-5 text-white" />;
        case 'play': return <PlayIcon className="w-5 h-5 text-white" />;
        case 'destroy': return <BombIcon className="w-5 h-5 text-white" />;
        case 'wall': return <ShieldIcon className="w-5 h-5 text-white" />;
        case 'double': return <DoubleIcon className="w-5 h-5 text-white" />;
        case 'convert': return <ConvertIcon className="w-5 h-5 text-white" />;
        case 'draw': return <CheckSmallIcon className="w-5 h-5 text-white" />;
        case 'play_online': return <UsersIcon className="w-5 h-5 text-white" />;
        case 'powerup_generic': return <LightningIcon className="w-5 h-5 text-white" />;
        default: return <TrophyIcon className="w-5 h-5 text-white" />;
    }
};

const getQuestColor = (type?: string) => {
    switch(type) {
        case 'win': return 'bg-purple-500';
        case 'play': return 'bg-cyan-500';
        case 'destroy': return 'bg-red-500';
        case 'wall': return 'bg-emerald-500';
        case 'double': return 'bg-yellow-500';
        case 'convert': return 'bg-indigo-500';
        case 'draw': return 'bg-slate-500';
        case 'play_online': return 'bg-blue-500';
        case 'powerup_generic': return 'bg-orange-500';
        default: return 'bg-slate-600';
    }
};

const NotificationBanner: React.FC<NotificationBannerProps> = ({ notification, onDismiss, onView }) => {
    const socialHub = useContext(SocialHubContext);
    const app = useContext(AppContext);
    const toast = useToast();
    const { updateNotification } = useNotifications();
    const [isProcessing, setIsProcessing] = useState(false);
    
    const { progress, setIsPaused } = usePausableTimer(onDismiss, AUTO_DISMISS_DURATION);

    const count = notification.data?.count || 1;
    const isStack = count > 1;

    const handleDragEnd = (_event: any, info: PanInfo) => {
        if (info.offset.x > 50 || info.offset.x < -50 || info.offset.y < -50) onDismiss();
    };

    const handleGenericClick = () => {
        onView();
        if (notification.type === 'chat' && notification.data?.senderId) socialHub?.openHub(notification.data.senderId);
        else if (notification.type === 'friend_request') socialHub?.openHub();
        else if (notification.type === 'match_result' && notification.data?.matchId) app?.watchReplayById(notification.data.matchId);
        else if (notification.type === 'gift') socialHub?.openHub();
    };

    const handleAction = async (e: React.MouseEvent, action: () => Promise<any>) => {
        e.stopPropagation();
        setIsProcessing(true);
        try {
            await action();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAcceptFriendLogic = async () => {
        if (!notification.data?.requestId || !notification.data?.sender) return;
        await friendsService.respondToRequest(notification.data.requestId, 'accept');
        toast.success(`Friend Added!`);
        onDismiss();
        updateNotification(notification.id, { read: true });
    };
    
    const handleDeclineFriendLogic = async () => {
        if (!notification.data?.requestId) return;
        await friendsService.respondToRequest(notification.data.requestId, 'reject');
        onDismiss();
        updateNotification(notification.id, { read: true });
    };

    const handleClaimGiftLogic = async () => {
        if (!notification.data?.giftId) return;
        const coins = await friendsService.acceptGift(notification.data.giftId);
        if (coins !== null) {
            toast.success(`Claimed ${notification.data?.amount} Coins!`);
            app?.refreshCoins();
            onDismiss();
            updateNotification(notification.id, { read: true });
        }
    };

    const handleWatchReplay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (notification.data?.matchId) {
            app?.watchReplayById(notification.data.matchId);
            onView();
        }
    };

    const handleReply = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (notification.data?.senderId) {
            socialHub?.openHub(notification.data.senderId);
            onView();
        }
    };

    const getConfig = () => {
        const baseProps = {
            handleAcceptFriend: () => handleAction(new MouseEvent('click') as any, handleAcceptFriendLogic),
            handleDeclineFriend: () => handleAction(new MouseEvent('click') as any, handleDeclineFriendLogic),
            handleClaimGift: () => handleAction(new MouseEvent('click') as any, handleClaimGiftLogic),
            handleWatchReplay,
            handleReply,
        };

        switch (notification.type) {
            case 'chat': return {
                headerLabel: 'MESSAGES',
                headerIcon: <MessageIcon className="w-3.5 h-3.5 text-green-500" />,
                renderActions: () => <ActionButton label="Reply" onClick={baseProps.handleReply} variant="neutral" isLoading={isProcessing} />
            };
            case 'friend_request': return {
                headerLabel: 'FRIEND REQUEST',
                headerIcon: <UsersIcon className="w-3.5 h-3.5 text-blue-500" />,
                renderActions: () => (
                    <>
                        <ActionButton label="Decline" onClick={baseProps.handleDeclineFriend} variant="neutral" isLoading={isProcessing}/>
                        <ActionButton label="Accept" onClick={baseProps.handleAcceptFriend} variant="primary" isLoading={isProcessing} />
                    </>
                )
            };
            case 'match_result':
                const isWin = notification.data?.result === 'win';
                return {
                    headerLabel: 'GAME RESULT',
                    headerIcon: <SwordIcon className={`w-3.5 h-3.5 ${isWin ? 'text-yellow-500' : 'text-red-500'}`} />,
                    renderActions: () => <ActionButton label="Watch Replay" onClick={baseProps.handleWatchReplay} variant="neutral" isLoading={isProcessing} />
                };
            case 'gift':
                 return {
                    headerLabel: 'GIFT',
                    headerIcon: <GiftIcon className="w-3.5 h-3.5 text-amber-500" />,
                    renderActions: () => <ActionButton label="Claim" onClick={baseProps.handleClaimGift} variant="special" isLoading={isProcessing} />
                };
            case 'quest_complete':
                return {
                    headerLabel: 'QUEST COMPLETE',
                    headerIcon: <TrophyIcon className="w-3.5 h-3.5 text-yellow-500" />,
                    renderActions: () => null // Actions handled inside special render
                };
            default:
                return {
                    headerLabel: 'AURA',
                    headerIcon: <BellIcon className="w-3.5 h-3.5 text-gray-500" />,
                    renderActions: () => null
                };
        }
    };
    
    const config = getConfig();
    const avatarId = notification.data?.senderAvatar || notification.data?.sender?.avatar;

    // --- Special Render for Quest Complete ---
    if (notification.type === 'quest_complete') {
        const { reward, multiplier, questType } = notification.data || {};
        const totalReward = Math.floor((reward || 0) * (multiplier || 1));
        const iconBg = getQuestColor(questType);

        return (
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={handleDragEnd}
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                onClick={onDismiss}
                className="group relative w-full pointer-events-auto cursor-pointer"
            >
                <div className="
                    relative overflow-hidden rounded-2xl 
                    bg-gradient-to-br from-[#1e293b] to-[#0f172a]
                    border border-yellow-500/20 ring-1 ring-yellow-500/10
                    shadow-[0_12px_40px_-10px_rgba(0,0,0,0.5)]
                ">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1 rounded bg-yellow-500/20 border border-yellow-500/30">
                                <TrophyIcon className="w-3.5 h-3.5 text-yellow-400" />
                            </div>
                            <span className="text-[10px] font-bold tracking-widest text-yellow-500 uppercase">
                                QUEST COMPLETE
                            </span>
                        </div>
                        
                        {/* Dismiss Button with Integrated Timer */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                            className="relative overflow-hidden rounded-full bg-white/5 hover:bg-white/10 transition-colors group border border-white/10"
                        >
                            {/* Timer Fill Animation */}
                            <motion.div 
                                className="absolute inset-0 bg-white/10"
                                initial={{ width: "100%" }}
                                animate={{ width: `${100 - progress}%` }}
                                transition={{ duration: 0.1, ease: "linear" }}
                            />
                            <div className="relative z-10 px-2.5 py-1 flex items-center gap-1">
                                <span className="text-[9px] font-bold text-gray-400 group-hover:text-white transition-colors uppercase tracking-tight">
                                    Dismiss
                                </span>
                                <CloseIcon className="w-2.5 h-2.5 text-gray-500 group-hover:text-white transition-colors" />
                            </div>
                        </button>
                    </div>

                    <div className="px-4 pb-4 flex items-center gap-4">
                        {/* Quest Icon */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 border-white/10 ${iconBg}`}>
                            {getQuestIcon(questType)}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-white truncate">{notification.message}</div>
                            <div className="text-xs text-gray-400 mt-0.5">Reward:</div>
                        </div>

                        {/* Reward Display */}
                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1">
                                <span className="text-xl font-black text-yellow-400 drop-shadow-md">+{totalReward}</span>
                                <CoinIcon className="w-5 h-5 text-yellow-400" />
                            </div>
                            {multiplier > 1 && (
                                <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-0.5 rounded text-[10px] font-bold text-yellow-300 border border-yellow-500/30">
                                    <StarIcon className="w-2.5 h-2.5 fill-yellow-300" /> {multiplier}x Bonus
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: -20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(8px)', transition: { duration: 0.2 } }}
            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={handleDragEnd}
            whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
            whileHover={{ scale: 1.01 }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onClick={handleGenericClick}
            className="group relative w-full pointer-events-auto cursor-pointer"
        >
            {/* iOS-style Platter Material with Luxury Styling */}
            <div className="
                relative overflow-hidden rounded-2xl 
                bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-2xl saturate-150
                border border-gray-200/50 dark:border-white/10 ring-1 ring-black/5 dark:ring-white/5
                shadow-[0_8px_30px_-5px_rgba(0,0,0,0.1)] dark:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.5)]
            ">
                
                {/* Header Row */}
                <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                    <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/10 dark:to-white/5 shadow-sm border border-black/5 dark:border-white/10">
                            {config.headerIcon}
                        </div>
                        <span className="text-[10px] font-bold tracking-[0.1em] text-gray-500 dark:text-gray-400/80 uppercase">
                            {config.headerLabel}
                        </span>
                    </div>
                    
                    {/* Dismiss Button with Integrated Timer */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                        className="relative overflow-hidden rounded-full bg-gray-100/50 dark:bg-white/5 hover:bg-gray-200/50 dark:hover:bg-white/10 transition-colors group border border-black/5 dark:border-white/5"
                    >
                        {/* Timer Fill Animation */}
                        <motion.div 
                            className="absolute inset-0 bg-gray-300/30 dark:bg-white/10"
                            initial={{ width: "100%" }}
                            animate={{ width: `${100 - progress}%` }}
                            transition={{ duration: 0.1, ease: "linear" }}
                        />
                        <div className="relative z-10 px-2.5 py-1 flex items-center gap-1">
                            <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors uppercase tracking-tight">
                                Dismiss
                            </span>
                            <CloseIcon className="w-2.5 h-2.5 text-gray-400 dark:text-gray-500 group-hover:text-gray-800 dark:group-hover:text-white transition-colors" />
                        </div>
                    </button>
                </div>

                {/* Content Body */}
                <div className="px-4 pb-4 flex gap-3.5 items-start">
                    {/* Leading Avatar (if applicable) */}
                    {avatarId && (
                        <div className="relative shrink-0 mt-0.5">
                            <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-100 dark:bg-black border border-gray-200/50 dark:border-white/10 shadow-sm">
                                <UserAvatar avatarId={avatarId} className="w-full h-full" />
                            </div>
                            {isStack && (
                                <div className="absolute -bottom-1 -right-1 bg-gray-900 text-white dark:bg-white dark:text-black text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white dark:border-[#0f172a]">
                                    {count}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                        <h4 className="text-[14px] font-bold text-gray-900 dark:text-white leading-snug truncate pr-2">
                            {notification.title}
                        </h4>
                        <p className="text-[13px] text-gray-600 dark:text-gray-300/90 leading-relaxed line-clamp-2 mt-0.5 font-medium">
                            {notification.message}
                        </p>
                    </div>
                </div>

                {/* Actions Row (if applicable) */}
                {config.renderActions && (
                    <div className="px-3 pb-3 pt-0 flex gap-2 justify-end" onClick={e => e.stopPropagation()}>
                        {config.renderActions()}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default NotificationBanner;

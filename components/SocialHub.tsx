
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../contexts/AuthContext';
import { useDirectMessages } from '../contexts/DirectMessageContext';
import { friendsService } from '../services/friends';
import { onlineService } from '../services/online';
import { useToast } from '../contexts/ToastContext';
import { Friendship } from '../types';
import { UserAvatar } from './Avatars';
import ChatPanel from './ChatPanel';
import { CloseIcon, SearchIcon, UserPlusIcon, UsersIcon, CheckIcon, MessageIcon, CopyIcon, UserMinusIcon } from './Icons';
import Tooltip from './Tooltip';

interface SocialHubProps {
    onClose: () => void;
    initialTargetId?: string | null;
}

type ViewState = 'list' | 'chat';

const SocialHub: React.FC<SocialHubProps> = ({ onClose, initialTargetId }) => {
    const auth = useContext(AuthContext);
    const dm = useDirectMessages();
    const toast = useToast();

    const [friends, setFriends] = useState<Friendship[]>([]);
    const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
    const [selectedFriendId, setSelectedFriendId] = useState<string | null>(initialTargetId || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [addFriendCode, setAddFriendCode] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [view, setView] = useState<ViewState>(initialTargetId ? 'chat' : 'list');
    const [friendStatuses, setFriendStatuses] = useState<{ [key: string]: 'ONLINE' | 'IN_GAME' | 'OFFLINE' | 'WAITING' }>({});

    // Fetch Friends on Mount
    useEffect(() => {
        loadFriends();
        
        // Listen for status updates
        const handleStatusUpdate = (data: { userId: string, status: 'ONLINE' | 'IN_GAME' | 'OFFLINE' | 'WAITING' }) => {
            setFriendStatuses(prev => ({ ...prev, [data.userId]: data.status }));
        };
        
        onlineService.onFriendStatus(handleStatusUpdate);
        onlineService.requestFriendStatuses(); // Initial status fetch

        return () => {
            onlineService.offFriendStatus();
        };
    }, []);

    // Load Chat on Initial Target
    useEffect(() => {
        if (initialTargetId) {
            dm.loadChat(initialTargetId);
        }
    }, [initialTargetId]);

    const loadFriends = async () => {
        try {
            const data = await friendsService.getFriends();
            setFriends(data.friends);
            setPendingRequests(data.pending.filter(f => f.receiverId === auth?.currentUser?.id));
        } catch (e) {
            console.error("Failed to load friends", e);
        }
    };

    const handleSendRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addFriendCode.trim()) return;
        setIsAdding(true);
        try {
            await friendsService.sendRequest(addFriendCode);
            toast.success("Friend request sent!");
            setAddFriendCode('');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsAdding(false);
        }
    };

    const handleAcceptRequest = async (requestId: string) => {
        try {
            await friendsService.respondToRequest(requestId, 'accept');
            toast.success("Friend added!");
            loadFriends(); // Reload list
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleDeclineRequest = async (requestId: string) => {
        try {
            await friendsService.respondToRequest(requestId, 'reject');
            toast.info("Request declined.");
            loadFriends();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleSelectFriend = (friendId: string) => {
        setSelectedFriendId(friendId);
        setView('chat');
        dm.loadChat(friendId); // Ensure history is loaded
        dm.markConversationAsRead(friendId);
    };

    const handleBackToList = () => {
        setView('list');
        setSelectedFriendId(null);
    };

    const copyMyCode = () => {
        if(auth?.currentUser?.friendCode) {
            navigator.clipboard.writeText(auth.currentUser.friendCode);
            toast.success("Friend Code copied!");
        }
    };

    // Filter and Sort Friends
    const filteredFriends = useMemo(() => {
        let list = friends.map(f => {
            const user = f.senderId === auth?.currentUser?.id ? f.receiver : f.sender;
            return {
                ...f,
                user: user!,
                status: friendStatuses[user!.id] || 'OFFLINE'
            };
        }).filter(f => f.user && f.user.displayName.toLowerCase().includes(searchQuery.toLowerCase()));

        // Sort: Unread > Online > In Game > Offline, then Alphabetical
        return list.sort((a, b) => {
            const unreadA = (dm.unreadCounts[a.user.id] || 0) > 0 ? 1 : 0;
            const unreadB = (dm.unreadCounts[b.user.id] || 0) > 0 ? 1 : 0;
            if (unreadA !== unreadB) return unreadB - unreadA;

            const statusWeight = { 'ONLINE': 3, 'WAITING': 2, 'IN_GAME': 1, 'OFFLINE': 0 };
            const weightA = statusWeight[a.status] || 0;
            const weightB = statusWeight[b.status] || 0;
            if (weightA !== weightB) return weightB - weightA;
            return a.user.displayName.localeCompare(b.user.displayName);
        });
    }, [friends, friendStatuses, searchQuery, auth?.currentUser?.id, dm.unreadCounts]);

    const selectedFriendUser = useMemo(() => {
        if (!selectedFriendId) return null;
        const friendship = friends.find(f => f.senderId === selectedFriendId || f.receiverId === selectedFriendId);
        if (!friendship) return null;
        return friendship.senderId === auth?.currentUser?.id ? friendship.receiver : friendship.sender;
    }, [selectedFriendId, friends, auth?.currentUser?.id]);

    const selectedFriendStatus = selectedFriendId ? (friendStatuses[selectedFriendId] || 'OFFLINE') : 'OFFLINE';

    return (
        <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div 
                className="w-full max-w-6xl h-[85vh] bg-[#0f172a] rounded-3xl shadow-2xl border border-white/10 flex overflow-hidden relative"
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
            >
                {/* Sidebar (Left) */}
                <div className={`
                    flex flex-col w-full md:w-80 bg-slate-900 border-r border-white/5 
                    ${view === 'chat' ? 'hidden md:flex' : 'flex'}
                `}>
                    {/* Header */}
                    <div className="p-5 border-b border-white/5 bg-slate-800/50">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <UsersIcon className="w-6 h-6 text-pink-500" /> Social Hub
                            </h2>
                            <button onClick={onClose} className="md:hidden p-2 text-gray-400 hover:text-white bg-white/5 rounded-full"><CloseIcon className="w-5 h-5" /></button>
                        </div>

                        {/* Friend Code Card - High Visibility */}
                        <div className="relative overflow-hidden p-4 rounded-xl bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border border-cyan-500/30 group">
                            <div className="absolute top-0 right-0 p-2 opacity-10"><UsersIcon className="w-16 h-16" /></div>
                            <div className="relative z-10">
                                <div className="text-[10px] font-bold text-cyan-200 uppercase tracking-widest mb-1">Your Friend Code</div>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="font-mono text-2xl font-black text-white tracking-wider">
                                        {auth?.currentUser?.friendCode || '...'}
                                    </div>
                                    <Tooltip text="Copy to Clipboard">
                                        <button 
                                            onClick={copyMyCode} 
                                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                                        >
                                            <CopyIcon className="w-4 h-4" />
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Add Friend */}
                    <div className="p-4 border-b border-white/5 space-y-3">
                        <form onSubmit={handleSendRequest} className="relative">
                            <input 
                                value={addFriendCode}
                                onChange={e => setAddFriendCode(e.target.value.toUpperCase())}
                                placeholder="Add Friend (Enter Code)"
                                className="w-full pl-10 pr-10 py-3 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/50 transition-all uppercase"
                                maxLength={8}
                            />
                            <UserPlusIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            {addFriendCode && (
                                <button 
                                    type="submit" 
                                    disabled={isAdding}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-pink-500 text-white rounded-lg hover:bg-pink-400 disabled:opacity-50 transition-colors"
                                >
                                    <CheckIcon className="w-4 h-4" />
                                </button>
                            )}
                        </form>
                        
                        <div className="relative">
                            <input 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search your friends..."
                                className="w-full pl-9 py-2 bg-transparent border-b border-white/10 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-all"
                            />
                            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        </div>
                    </div>

                    {/* Friend List & Requests */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4">
                        {/* Pending Requests Section */}
                        <AnimatePresence>
                            {pendingRequests.length > 0 && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="space-y-1 overflow-hidden"
                                >
                                    <div className="px-3 py-1 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Pending Requests</span>
                                        <span className="bg-orange-500 text-black text-[9px] font-bold px-1.5 rounded-full">{pendingRequests.length}</span>
                                    </div>
                                    {pendingRequests.map(req => (
                                        <div key={req.id} className="p-3 mx-1 rounded-xl bg-gradient-to-r from-orange-900/20 to-transparent border border-orange-500/20 flex flex-col gap-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full overflow-hidden bg-black border border-white/10 shrink-0">
                                                    <UserAvatar avatarId={req.sender?.avatar || 'avatar-1'} frameId={req.sender?.questData?.equippedFrame} className="w-full h-full" />
                                                </div>
                                                <span className="text-sm font-bold text-white truncate">{req.sender?.displayName}</span>
                                            </div>
                                            <div className="flex gap-2 w-full">
                                                <button onClick={() => handleAcceptRequest(req.id)} className="flex-1 py-1.5 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white text-xs font-bold rounded-lg transition-colors border border-green-600/30">Accept</button>
                                                <button onClick={() => handleDeclineRequest(req.id)} className="flex-1 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold rounded-lg transition-colors border border-red-600/30">Decline</button>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="h-px bg-white/5 mx-2 my-2"></div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Friends List */}
                        <div className="space-y-1">
                            {filteredFriends.length > 0 && (
                                <div className="px-3 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    Friends ({filteredFriends.length})
                                </div>
                            )}
                            
                            {filteredFriends.length === 0 ? (
                                <div className="text-center py-10 px-4">
                                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <UsersIcon className="w-6 h-6 text-gray-600" />
                                    </div>
                                    <p className="text-sm text-gray-400 font-medium">No friends yet.</p>
                                    <p className="text-xs text-gray-600 mt-1">Share your code to connect!</p>
                                </div>
                            ) : (
                                filteredFriends.map(f => {
                                    const user = f.user;
                                    const status = f.status;
                                    const isSelected = selectedFriendId === user.id;
                                    const unread = dm.unreadCounts[user.id] || 0;
                                    
                                    // Get last message snippet
                                    const messages = dm.messagesByPartner[user.id] || [];
                                    const lastMsg = messages[messages.length - 1];
                                    let snippet = '';
                                    if (lastMsg) {
                                        if (lastMsg.type === 'system') snippet = lastMsg.text; // e.g. "Sent a gift"
                                        else snippet = lastMsg.text;
                                    } else {
                                        // Default status text if no history
                                        snippet = status === 'ONLINE' ? 'Online' : 
                                                  status === 'IN_GAME' ? 'In a Match' : 
                                                  status === 'WAITING' ? 'In Lobby' : 'Offline';
                                    }

                                    return (
                                        <button 
                                            key={user.id}
                                            onClick={() => handleSelectFriend(user.id)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border group relative
                                                ${isSelected 
                                                ? 'bg-gradient-to-r from-blue-900/30 to-transparent border-blue-500/30' 
                                                : 'bg-transparent border-transparent hover:bg-white/5'
                                            }`}
                                        >
                                            <div className="relative">
                                                <div className={`w-10 h-10 rounded-full overflow-hidden border-2 bg-black ${isSelected ? 'border-blue-400' : 'border-white/10'}`}>
                                                    <UserAvatar avatarId={user.avatar} frameId={user.questData?.equippedFrame} className="w-full h-full" />
                                                </div>
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                                                    status === 'ONLINE' ? 'bg-green-500' : 
                                                    status === 'IN_GAME' ? 'bg-orange-500' : 
                                                    status === 'WAITING' ? 'bg-blue-500' : 'bg-gray-500'
                                                }`} />
                                            </div>
                                            
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <span className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>{user.displayName}</span>
                                                    {unread > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg shadow-red-500/20">{unread}</span>}
                                                </div>
                                                <div className={`text-[10px] truncate font-medium flex items-center gap-1.5 ${unread > 0 ? 'text-white font-bold' : 'text-gray-500'}`}>
                                                    {user.customStatus ? (
                                                        <span className="text-gray-400 italic">"{user.customStatus}"</span>
                                                    ) : (
                                                        <>
                                                            {lastMsg?.senderId === auth?.currentUser?.id && <span className="text-gray-600">You: </span>}
                                                            <span>{snippet}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content (Right) */}
                <div className={`
                    flex-1 flex-col bg-slate-950 relative
                    ${view === 'list' ? 'hidden md:flex' : 'flex'}
                `}>
                    {selectedFriendId && selectedFriendUser ? (
                        <ChatPanel 
                            channel="dm"
                            targetId={selectedFriendId}
                            targetUser={selectedFriendUser}
                            targetStatus={selectedFriendStatus}
                            title={selectedFriendUser.displayName}
                            currentUserId={auth?.currentUser?.id || ''}
                            onClose={handleBackToList}
                            className="h-full border-none bg-transparent"
                            placeholder={`Message ${selectedFriendUser.displayName}...`}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center relative overflow-hidden">
                            {/* Decorative Background */}
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px]"></div>

                            <div className="relative z-10">
                                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5 mx-auto">
                                    <MessageIcon className="w-10 h-10 opacity-20" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Select a Conversation</h3>
                                <p className="max-w-xs mx-auto text-sm text-gray-400 leading-relaxed">
                                    Choose a friend from the sidebar to chat, send challenges, or view their profile.
                                </p>
                                
                                <button onClick={onClose} className="md:block hidden mt-10 p-4 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white mx-auto border border-white/5">
                                    <CloseIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default SocialHub;

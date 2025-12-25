
import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { onlineService } from '../services/online';
import { AuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ShieldIcon, PlusIcon, SearchIcon, LogoutIcon } from './Icons';
import { Clan } from '../types';
import { UserAvatar } from './Avatars';

const ClanHub: React.FC = () => {
    const auth = useContext(AuthContext);
    const toast = useToast();
    const [clan, setClan] = useState<Clan | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTag, setSearchTag] = useState('');
    const [createData, setCreateData] = useState({ name: '', tag: '' });
    const [view, setView] = useState<'info' | 'create' | 'search'>('info');

    useEffect(() => {
        if (auth?.currentUser?.clanId) {
            fetchClan(auth.currentUser.clanId);
        }
    }, [auth?.currentUser]);

    const fetchClan = async (id: string) => {
        setIsLoading(true);
        try {
            const data = await onlineService.getClan(id);
            setClan(data);
            setView('info');
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!createData.name || !createData.tag) return toast.error("Name and Tag required");
        if (createData.tag.length > 4) return toast.error("Tag max 4 chars");
        
        setIsLoading(true);
        try {
            await onlineService.createClan(createData.name, createData.tag);
            toast.success("Clan created!");
            auth?.reloadUser?.();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!searchTag) return;
        setIsLoading(true);
        try {
            await onlineService.joinClan(searchTag.toUpperCase());
            toast.success("Joined Clan!");
            auth?.reloadUser?.();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeave = async () => {
        if (!confirm("Are you sure you want to leave your clan?")) return;
        try {
            await onlineService.leaveClan();
            setClan(null);
            auth?.reloadUser?.();
            toast.success("Left clan");
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-48"><div className="animate-spin w-8 h-8 border-2 border-cyan-500 rounded-full border-t-transparent"></div></div>;
    }

    if (clan) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="bg-gradient-to-br from-indigo-600/80 to-purple-600/80 dark:from-indigo-900/60 dark:to-purple-900/60 p-6 rounded-2xl border border-indigo-500/30 text-center relative overflow-hidden shadow-lg">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><ShieldIcon className="w-40 h-40" /></div>
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20 shadow-md backdrop-blur-sm relative z-10">
                        <ShieldIcon className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-1 tracking-tight relative z-10">
                        <span className="text-cyan-200 mr-2">[{clan.tag}]</span>
                        {clan.name}
                    </h2>
                    <p className="text-indigo-100 text-sm font-medium relative z-10">{clan.members.length} Members</p>
                </div>

                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest ml-1">Member Roster</h3>
                    <div className="space-y-2">
                        {clan.members.map(member => (
                            <div key={member.id} className="flex items-center gap-3 p-3 bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none">
                                <div className="w-10 h-10 rounded-full border border-gray-200 dark:border-white/10 overflow-hidden bg-gray-100 dark:bg-black/40">
                                    <UserAvatar avatarId={member.avatar} frameId={member.questData?.equippedFrame} className="w-full h-full" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-gray-900 dark:text-white text-sm">{member.displayName}</div>
                                    <div className="text-[10px] text-gray-500 font-mono">ELO {member.elo}</div>
                                </div>
                                {member.id === clan.ownerId && (
                                    <span className="text-[9px] bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded border border-yellow-200 dark:border-yellow-500/30 font-bold uppercase tracking-wider">Leader</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={handleLeave}
                    className="w-full py-4 rounded-xl border border-red-200 dark:border-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest"
                >
                    <LogoutIcon className="w-4 h-4" /> Leave Clan
                </button>
            </motion.div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {view === 'info' && (
                <>
                    <div className="text-center py-10 bg-white dark:bg-white/5 rounded-3xl border border-gray-200 dark:border-white/5 border-dashed">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200 dark:border-white/10">
                            <ShieldIcon className="w-10 h-10 text-gray-400 dark:text-gray-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">No Clan</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Join a squad or build your own dynasty.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setView('search')}
                            className="p-5 rounded-2xl border flex flex-col items-center gap-3 transition-all bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border-cyan-200 dark:border-cyan-500/20 hover:border-cyan-400 dark:hover:border-cyan-500/50 hover:shadow-lg group"
                        >
                            <div className="p-3 bg-cyan-100 dark:bg-cyan-500/20 rounded-full text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform"><SearchIcon className="w-6 h-6" /></div>
                            <span className="font-bold text-sm text-cyan-700 dark:text-cyan-100">Find Clan</span>
                        </button>
                        <button 
                            onClick={() => setView('create')}
                            className="p-5 rounded-2xl border flex flex-col items-center gap-3 transition-all bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-500/20 hover:border-purple-400 dark:hover:border-purple-500/50 hover:shadow-lg group"
                        >
                            <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-full text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform"><PlusIcon className="w-6 h-6" /></div>
                            <span className="font-bold text-sm text-purple-700 dark:text-purple-100">Create Clan</span>
                        </button>
                    </div>
                </>
            )}

            {view === 'search' && (
                <div className="space-y-4">
                    <button onClick={() => setView('info')} className="text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-2">&larr; Back</button>
                    <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-gray-200 dark:border-white/10">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Join by Tag</h3>
                        <input 
                            value={searchTag}
                            onChange={e => setSearchTag(e.target.value)}
                            placeholder="CLAN TAG (e.g. AURA)"
                            className="w-full p-4 bg-gray-50 dark:bg-black/40 rounded-xl border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-cyan-500 mb-4 font-mono uppercase text-center text-lg tracking-widest"
                            maxLength={4}
                        />
                        <button 
                            onClick={handleJoin}
                            disabled={!searchTag}
                            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-lg"
                        >
                            Join Clan
                        </button>
                    </div>
                </div>
            )}

            {view === 'create' && (
                <div className="space-y-4">
                    <button onClick={() => setView('info')} className="text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-2">&larr; Back</button>
                    <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-gray-200 dark:border-white/10 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Create New Clan</h3>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Clan Name</label>
                            <input 
                                value={createData.name}
                                onChange={e => setCreateData({ ...createData, name: e.target.value })}
                                placeholder="The Champions"
                                className="w-full p-3 bg-gray-50 dark:bg-black/40 rounded-xl border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-purple-500 mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Clan Tag (4 Chars)</label>
                            <input 
                                value={createData.tag}
                                onChange={e => setCreateData({ ...createData, tag: e.target.value.toUpperCase() })}
                                placeholder="CHMP"
                                className="w-full p-3 bg-gray-50 dark:bg-black/40 rounded-xl border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-purple-500 font-mono uppercase mt-1"
                                maxLength={4}
                            />
                        </div>
                        
                        <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 p-3 rounded-xl flex justify-center items-center gap-2">
                            <span className="text-yellow-600 dark:text-yellow-400 font-bold text-xs uppercase">Creation Cost:</span>
                            <span className="text-yellow-700 dark:text-yellow-100 font-bold font-mono">1000 Coins</span>
                        </div>

                        <button 
                            onClick={handleCreate}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg transition-all"
                        >
                            Establish Clan
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default ClanHub;

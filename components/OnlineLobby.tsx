
import React, { useState, useContext, useEffect } from 'react';
import { motion } from 'framer-motion';
import { onlineService } from '../services/online';
import { AppContext } from '../contexts/AppContext';
import { AuthContext } from '../contexts/AuthContext';
import { HomeIcon, LeaderboardIcon, EyeIcon, PlayIcon, PasteIcon, UsersIcon, CoinIcon, SwordIcon } from './Icons';
import { useToast } from '../contexts/ToastContext';
import { Room, User, Friendship, WagerTier } from '../types';
import { UserAvatar } from './Avatars';
import { getBadge, getRank } from '../utils/badgeData';
import Tooltip from './Tooltip';
import { friendsService } from '../services/friends';

const LOBBIES: { tier: WagerTier, name: string, ante: number, color: string }[] = [
    { tier: 'bronze', name: 'Bronze', ante: 50, color: 'from-orange-700 to-yellow-800' },
    { tier: 'silver', name: 'Silver', ante: 250, color: 'from-slate-600 to-gray-700' },
    { tier: 'gold', name: 'Gold', ante: 1000, color: 'from-yellow-600 to-amber-700' },
];

const OnlineLobby: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'play' | 'spectate' | 'leaderboard'>('play');
  const [gameIdInput, setGameIdInput] = useState('');
  const [isCreating, setIsCreating] = useState<WagerTier | null>(null);
  const [activeRooms, setActiveRooms] = useState<Room[]>([]);
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<User[]>([]);
  const [showFriendsOnly, setShowFriendsOnly] = useState(false);
  
  const app = useContext(AppContext);
  const auth = useContext(AuthContext);
  const toast = useToast();
  
  const userCoins = app?.coins ?? 0;

  useEffect(() => {
      if (activeTab === 'spectate') {
          onlineService.getRooms();
          onlineService.onRoomsList(setActiveRooms);
          return () => onlineService.offRoomsList();
      } else if (activeTab === 'leaderboard') {
          onlineService.getLeaderboard().then(setLeaderboard).catch(console.error);
          
          friendsService.getFriends().then(data => {
              const friends = data.friends.map((f: Friendship) => 
                  f.senderId === auth?.currentUser?.id ? f.receiver : f.sender
              ).filter((u): u is User => !!u);
              
              if (auth?.currentUser) friends.push(auth.currentUser);
              
              friends.sort((a, b) => b.elo - a.elo);
              setFriendsLeaderboard(friends);
          });
      }
  }, [activeTab, auth?.currentUser]);

  const handleJoinGame = async (id: string, asSpectator: boolean = false) => {
      // Joining a game is now free, ante is handled in confirmation
      if (!id || id.length < 6) {
          toast.error("Invalid Room Code");
          return;
      }
      try {
          await onlineService.joinRoom(id, { asSpectator });
          toast.success(asSpectator ? "Joined as spectator!" : "Joined room!");
      } catch (e: any) {
          toast.error(e.message);
      }
  }
  
  const handleCreateGame = async (tier: WagerTier, ante: number) => {
      if (userCoins < ante) {
          return toast.error(`You need at least ${ante} coins for this lobby.`);
      }
      setIsCreating(tier);
      try {
        await onlineService.createRoom({}, tier);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setIsCreating(null);
      }
  }

  const handlePaste = async () => {
      try {
          const text = await navigator.clipboard.readText();
          let code = text.trim();
          
          // Intelligent URL parsing
          if (code.includes('http') || code.includes('?')) {
              try {
                  // Ensure protocol for URL constructor
                  const urlStr = code.startsWith('http') ? code : `http://${code}`;
                  const url = new URL(urlStr);
                  const roomParam = url.searchParams.get('room');
                  const spectateParam = url.searchParams.get('spectate');
                  
                  if (roomParam) code = roomParam;
                  else if (spectateParam) code = spectateParam;
              } catch (e) {
                  // Fallback to raw text if not a valid URL structure
              }
          }
          
          // Clean and format
          const cleanedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
          
          if (cleanedCode) {
              setGameIdInput(cleanedCode);
              toast.success("Code pasted!");
          } else {
              toast.error("No valid code found in clipboard");
          }
      } catch (e) {
          toast.error("Failed to read clipboard");
      }
  }

  const currentList = showFriendsOnly ? friendsLeaderboard : leaderboard;

  return (
    <motion.div 
      className="w-full max-w-4xl p-6 bg-white/20 dark:bg-black/20 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 flex flex-col"
      style={{ height: 'calc(100vh - 150px)', maxHeight: '700px', minHeight: '500px' }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
        <div className="flex justify-between items-center mb-6 shrink-0">
            <h1 className="text-3xl font-bold">Online Hub</h1>
            <button onClick={app?.goHome} className="p-2 rounded-full bg-white/10 hover:bg-white/20"><HomeIcon className="w-6 h-6"/></button>
        </div>

        <div className="flex mb-6 bg-white/5 p-1 rounded-lg shrink-0 overflow-x-auto no-scrollbar">
            {(['play', 'spectate', 'leaderboard'] as const).map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === tab ? 'bg-cyan-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    {tab === 'play' && <PlayIcon className="w-4 h-4" />}
                    {tab === 'spectate' && <EyeIcon className="w-4 h-4" />}
                    {tab === 'leaderboard' && <LeaderboardIcon className="w-4 h-4" />}
                    <span className="capitalize">{tab}</span>
                </button>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar h-full min-h-0 p-1">
            {activeTab === 'play' && (
                <div className="flex flex-col md:flex-row gap-8 h-full">
                    {/* Left Side: Create Lobby */}
                    <div className="flex-1 space-y-6">
                        <h2 className="text-center md:text-left font-bold uppercase text-gray-500 tracking-wider">Choose a Lobby</h2>
                        <div className="space-y-4">
                            {LOBBIES.map(lobby => {
                                const canAfford = userCoins >= lobby.ante;
                                return (
                                    <button
                                        key={lobby.tier}
                                        onClick={() => handleCreateGame(lobby.tier, lobby.ante)}
                                        disabled={isCreating !== null || !canAfford}
                                        className={`w-full p-5 bg-gradient-to-br ${lobby.color} rounded-xl shadow-lg hover:shadow-cyan-500/30 transition-all flex items-center justify-between disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group relative overflow-hidden`}
                                    >
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                                        <div className="relative z-10 text-left">
                                            <div className="font-black text-white text-2xl tracking-tight">{lobby.name} League</div>
                                            <div className="flex flex-col gap-1 mt-1">
                                                <div className="text-xs font-bold text-yellow-300 flex items-center gap-1">
                                                    <CoinIcon className="w-3 h-3"/> PRIZE POT: {lobby.ante * 2}+
                                                </div>
                                                <div className={`text-xs font-bold ${canAfford ? 'text-gray-300' : 'text-red-300'}`}>
                                                    Entry: {lobby.ante} Coins
                                                </div>
                                            </div>
                                        </div>
                                        <div className="relative z-10 flex flex-col items-center justify-center p-3 rounded-full bg-black/30 border border-white/10 shadow-inner min-w-[70px]">
                                            <SwordIcon className="w-6 h-6 text-white"/>
                                            <span className="text-[10px] font-bold mt-1">{isCreating === lobby.tier ? '...' : 'BET'}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    
                    {/* Divider: Vertical on Desktop, Horizontal on Mobile */}
                    <div className="relative md:hidden py-2"><hr className="border-white/10" /><span className="absolute top-0 left-1/2 -translate-x-1/2 bg-gray-900 px-2 text-xs text-gray-500">OR</span></div>
                    <div className="hidden md:block w-px bg-white/10 my-4"></div>
                    
                    {/* Right Side: Join Friend */}
                    <div className="flex-1 space-y-6 flex flex-col justify-center">
                        <h2 className="text-center md:text-left font-bold uppercase text-gray-500 tracking-wider">Join a Friend</h2>
                        <div className="flex flex-col gap-3">
                            <div className="relative">
                                <input 
                                    value={gameIdInput}
                                    onChange={e => setGameIdInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                                    placeholder="CODE"
                                    className="w-full bg-white/5 border border-white/10 hover:border-white/30 rounded-xl px-4 py-5 font-mono text-center text-3xl md:text-4xl font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white/10 placeholder:text-white/10 uppercase transition-all"
                                    maxLength={6}
                                />
                                <button 
                                    onClick={handlePaste}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    title="Paste Code or Link"
                                >
                                    <PasteIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <button 
                                onClick={() => handleJoinGame(gameIdInput, false)}
                                disabled={gameIdInput.length < 6}
                                className="w-full py-4 bg-pink-500 rounded-xl font-bold text-lg hover:bg-pink-400 transition-colors shadow-lg hover:shadow-pink-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                JOIN GAME
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'spectate' && (
                <div className="space-y-3">
                    {activeRooms.length === 0 ? (
                        <p className="text-center text-gray-500 mt-10">No active games found.</p>
                    ) : (
                        activeRooms.map(room => (
                            <div key={room.id} className="p-4 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center hover:bg-white/10 transition-colors">
                                <div>
                                    <p className="font-bold text-sm">{room.gameSettings.boardSize}x{room.gameSettings.boardSize} {room.gameSettings.variant}</p>
                                    <p className="text-xs text-gray-400">
                                        {room.players.length} Players • {room.gameSettings.blitzMode ? 'Blitz ⚡' : 'Classic'}
                                    </p>
                                </div>
                                <button onClick={() => handleJoinGame(room.id, true)} className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 text-xs font-bold rounded-lg border border-cyan-500/30 hover:bg-cyan-500/30">
                                    Spectate
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'leaderboard' && (
                <>
                    <div className="flex gap-2 mb-4">
                        <button 
                            onClick={() => setShowFriendsOnly(false)} 
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${!showFriendsOnly ? 'bg-cyan-500 text-white' : 'bg-white/5 text-gray-400'}`}
                        >
                            Global
                        </button>
                        <button 
                            onClick={() => setShowFriendsOnly(true)} 
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 ${showFriendsOnly ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400'}`}
                        >
                            <UsersIcon className="w-3 h-3" /> Friends
                        </button>
                    </div>

                    <div className="space-y-2">
                        {currentList.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">No data available.</p>
                        ) : (
                            currentList.map((user, idx) => {
                                const rank = getRank(user.elo);
                                const isMe = user.id === auth?.currentUser?.id;
                                
                                // Status styling for high ranks
                                let frameClass = "border border-white/10";
                                let bgClass = isMe ? 'bg-cyan-500/10' : 'bg-white/5';
                                
                                if (rank.name === 'Grandmaster') {
                                    frameClass = "border-2 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]";
                                    bgClass = "bg-red-900/20";
                                } else if (rank.name === 'Master' || rank.name === 'Diamond') {
                                    frameClass = "border-2 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]";
                                    bgClass = "bg-purple-900/20";
                                } else if (rank.name === 'Gold') {
                                    frameClass = "border border-yellow-500";
                                }

                                return (
                                    <div key={user.id} className={`flex items-center gap-4 p-3 rounded-xl transition-all ${bgClass} ${frameClass}`}>
                                        <div className={`font-bold w-6 text-center ${idx < 3 ? 'text-yellow-400' : 'text-gray-500'}`}>#{idx + 1}</div>
                                        
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-black/40">
                                                <UserAvatar avatarId={user.avatar} frameId={user.questData?.equippedFrame} className="w-full h-full" />
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-sm truncate text-white">
                                                    {user.displayName} 
                                                    {isMe && <span className="text-gray-400 text-xs font-normal ml-1">(You)</span>}
                                                </p>
                                                {rank && <span className="text-sm" title={rank.name}>{rank.icon}</span>}
                                                {/* VIP/OG Tags based on hypothetical logic */}
                                                {user.coins > 5000 && <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-[9px] font-bold border border-yellow-500/30">VIP</span>}
                                            </div>
                                            {user.customStatus && (
                                                <p className="text-[10px] text-gray-400 italic truncate max-w-[200px]">
                                                    "{user.customStatus}"
                                                </p>
                                            )}
                                            <div className="flex gap-1 mt-0.5">
                                                {user.badges && user.badges.slice(0, 3).map(b => {
                                                    const badge = getBadge(b);
                                                    if (!badge) return null;
                                                    return (
                                                        <span key={b} className="text-sm cursor-help hover:scale-110 transition-transform block" title={badge.name}>
                                                            {badge.icon}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-mono font-bold text-cyan-400">{user.elo}</p>
                                            {rank && <p className={`text-[9px] font-bold uppercase ${rank.color}`}>{rank.name}</p>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}
        </div>
    </motion.div>
  );
};

export default OnlineLobby;

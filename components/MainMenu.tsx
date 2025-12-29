import React, { useContext, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { GameMode, GameSettings, GameVariant, Player, Difficulty } from '../types';
import GameSettingsEditor from './GameSettingsEditor';
import { CloseIcon, OIcon, XIcon, GridIcon, UserIcon, MapIcon, ShopIcon, TrophyIcon, SwordIcon, CalendarIcon } from './Icons';
import Modal from './Modal';
import { AuthContext } from '../contexts/AuthContext';
import { getPersonalizedGreeting } from '../utils/greeting';
import { useToast } from '../contexts/ToastContext';
import QuestBoard from './QuestBoard';
import { UserAvatar } from './Avatars';
import { progressService, SHOP_ITEMS } from '../services/progress';

interface MainMenuProps {
  onStartGame: (mode: GameMode, settings: GameSettings, names?: { [key in Player]?: string }) => void;
  onGoToOnlineLobby: () => void;
  onGoToCampaign: () => void;
  onGoToShop: () => void;
  onOpenDailyReward?: () => void;
}

const defaultGameSettings: GameSettings = {
  boardSize: 3,
  winLength: 3,
  obstacles: false,
  variant: GameVariant.CLASSIC,
  difficulty: Difficulty.MEDIUM,
  startingPlayer: 'random',
};

const MainMenu: React.FC<MainMenuProps> = ({ onStartGame, onGoToOnlineLobby, onGoToCampaign, onGoToShop, onOpenDailyReward }) => {
  const [settings, setSettings] = useState<GameSettings>(defaultGameSettings);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showQuestBoard, setShowQuestBoard] = useState(false);
  const [hasClaimable, setHasClaimable] = useState(progressService.hasClaimableQuests());
  
  const auth = useContext(AuthContext);
  const toast = useToast();
  
  const [playerXName, setPlayerXName] = useState(auth?.currentUser?.displayName || 'Player X');
  const [playerOName, setPlayerOName] = useState('Player O');

  const isAiDisabled = settings.boardSize > 4 || settings.obstacles || settings.variant !== GameVariant.CLASSIC;

  const cardVariants: Variants = {
    hover: { y: -3, transition: { type: 'spring', stiffness: 300 } },
    tap: { scale: 0.98 }
  };

  useEffect(() => {
      const handleUpdate = () => {
          setHasClaimable(progressService.hasClaimableQuests());
      };
      window.addEventListener('aura_progress_update', handleUpdate);
      // Initial check
      setHasClaimable(progressService.hasClaimableQuests());
      return () => window.removeEventListener('aura_progress_update', handleUpdate);
  }, []);

  const handleLocalPvpClick = () => {
      setPlayerXName(auth?.currentUser?.displayName || 'Player X');
      setShowNameModal(true);
  };

  const handleStartLocalPvp = () => {
      const pX = playerXName.trim();
      const pO = playerOName.trim();

      if (!pX || !pO) {
          toast.error("Player names cannot be empty.");
          return;
      }

      if (pX.length < 2 || pO.length < 2) {
          toast.error("Names must be at least 2 characters.");
          return;
      }

      if (pX.length > 15 || pO.length > 15) {
          toast.error("Names must be 15 characters or less.");
          return;
      }

      setShowNameModal(false);
      onStartGame(GameMode.LOCAL, settings, {
          [Player.X]: pX,
          [Player.O]: pO
      });
  };

  // Generate greeting using server provided lastVisit if available
  const greeting = useMemo(() => {
      if (!auth?.currentUser?.displayName) return 'Welcome to Aura';
      
      const lastVisit = auth.currentUser.questData?.lastVisit;
      return getPersonalizedGreeting(auth.currentUser.displayName, lastVisit);
  }, [auth?.currentUser]);

  return (
    <>
    <motion.div 
      className="w-full max-w-6xl flex flex-col lg:flex-row gap-4 h-full lg:h-[600px] px-2 md:px-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
        {/* Left Side: Identity & Modes */}
        <div className="flex-1 glass-panel rounded-3xl p-5 flex flex-col relative overflow-visible lg:overflow-hidden min-h-[350px] lg:min-h-0">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-pink-500 rounded-t-3xl"></div>
             
             <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4 sm:gap-0">
                 <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-1">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-500 dark:from-white dark:to-gray-400 dark:text-glow">Aura</span>
                    </h1>
                    <p className="text-cyan-600 dark:text-cyan-400 font-medium text-sm md:text-sm animate-fade-in">{greeting}</p>
                 </div>
                 
                 {/* Utility Buttons */}
                 <div className="flex gap-2 self-start">
                     <motion.button 
                        onClick={onOpenDailyReward}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="relative p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 flex flex-col items-center gap-0.5 min-w-[50px]"
                        title="Daily Rewards"
                     >
                         <CalendarIcon className="w-4 h-4" />
                         <span className="text-[8px] font-bold uppercase">Daily</span>
                     </motion.button>

                     <motion.button 
                        onClick={() => setShowQuestBoard(true)}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="relative p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 flex flex-col items-center gap-0.5 min-w-[50px]"
                     >
                         <TrophyIcon className="w-4 h-4" />
                         <span className="text-[8px] font-bold uppercase">Quests</span>
                         {hasClaimable && (
                             <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-gray-900 animate-pulse" />
                         )}
                     </motion.button>
                     <motion.button 
                        onClick={onGoToShop}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="relative p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 flex flex-col items-center gap-0.5 min-w-[50px]"
                     >
                         <ShopIcon className="w-4 h-4" />
                         <span className="text-[8px] font-bold uppercase">Shop</span>
                         {/* Simple visual cue for Daily Deal */}
                         <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-gray-900" />
                     </motion.button>
                 </div>
             </div>

             {/* Game Modes Grid */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 overflow-y-auto custom-scrollbar pr-1 pt-1 min-h-[300px]">
                {/* Campaign Mode - Featured Large */}
                <motion.button
                    variants={cardVariants} whileHover="hover" whileTap="tap"
                    onClick={onGoToCampaign}
                    className="col-span-1 sm:col-span-2 p-4 rounded-xl text-left bg-gradient-to-br from-orange-500/20 to-red-600/20 border border-orange-500/30 hover:border-orange-400 relative overflow-hidden group flex items-center gap-4"
                >
                    <div className="p-3 rounded-full bg-orange-500/20 border border-orange-500/30 hidden sm:block">
                        <MapIcon className="w-8 h-8 text-orange-400" />
                    </div>
                    <div>
                        <div className="font-bold text-xl sm:text-2xl text-white mb-0.5">Campaign Mode</div>
                        <div className="text-xs sm:text-sm text-orange-200/70">Defeat 10 bosses to earn rewards.</div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>

                {/* Solo vs AI */}
                <motion.button
                    variants={cardVariants} whileHover="hover" whileTap="tap"
                    onClick={() => onStartGame(GameMode.AI, isAiDisabled ? defaultGameSettings : settings)}
                    disabled={isAiDisabled}
                    className={`p-4 rounded-xl text-left border transition-all relative overflow-hidden group ${
                        isAiDisabled 
                        ? 'bg-gray-200/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 opacity-50 cursor-not-allowed' 
                        : 'bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border-cyan-500/20 hover:border-cyan-400'
                    }`}
                >
                    <div className="text-2xl sm:text-3xl mb-1">🤖</div>
                    <div className="font-bold text-base sm:text-lg text-gray-800 dark:text-white leading-tight">Solo AI</div>
                    <div className="text-xs text-gray-600 dark:text-cyan-200/70 mt-0.5">Quick Skirmish</div>
                </motion.button>

                {/* Online PvP */}
                <motion.button
                    variants={cardVariants} whileHover="hover" whileTap="tap"
                    onClick={onGoToOnlineLobby}
                    className="p-4 rounded-xl text-left bg-gradient-to-br from-purple-500/10 to-pink-600/10 border border-purple-500/20 hover:border-purple-400 relative overflow-hidden group"
                >
                    <div className="text-2xl sm:text-3xl mb-1">🌍</div>
                    <div className="font-bold text-base sm:text-lg text-gray-800 dark:text-white leading-tight">Online PvP</div>
                    <div className="text-xs text-gray-600 dark:text-purple-200/70 mt-0.5">Ranked & Blitz</div>
                </motion.button>

                {/* Local PvP */}
                <motion.button
                    variants={cardVariants} whileHover="hover" whileTap="tap"
                    onClick={handleLocalPvpClick}
                    className="col-span-1 sm:col-span-2 p-4 rounded-xl text-left bg-white/40 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30 relative overflow-hidden group flex items-center gap-4"
                >
                    <div className="text-2xl">👥</div>
                    <div>
                        <div className="font-bold text-base text-gray-800 dark:text-gray-200">Local Pass & Play</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Play on same device</div>
                    </div>
                </motion.button>
             </div>
        </div>

        {/* Right Side: Settings - Collapsible or stacked on mobile */}
        <div className="w-full lg:w-[420px] glass-panel rounded-3xl p-5 flex flex-col h-auto lg:h-auto min-h-[400px]">
             <div className="flex items-center gap-2 mb-3 opacity-90 border-b border-gray-200 dark:border-white/10 pb-2 shrink-0">
                <GridIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span className="font-bold tracking-wider text-sm uppercase text-gray-700 dark:text-gray-200">Quick Config</span>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2">
                 <GameSettingsEditor settings={settings} setSettings={setSettings} />
             </div>
        </div>

    </motion.div>

    <AnimatePresence>
        {showQuestBoard && (
            <QuestBoard onClose={() => setShowQuestBoard(false)} />
        )}

        {showNameModal && (
            <Modal onClose={() => setShowNameModal(false)} className="max-w-lg">
                 <div className="relative w-full px-2 pt-2 pb-1">
                     <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-400">
                                Local Match
                            </h2>
                            <p className="text-xs font-bold text-cyan-600 dark:text-cyan-400 tracking-widest uppercase">Setup Duel</p>
                        </div>
                        <button 
                            onClick={() => setShowNameModal(false)}
                            className="p-2 rounded-full bg-gray-200/50 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                        >
                            <CloseIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-center justify-center relative mb-8">
                        {/* Player 1 Card */}
                        <div className="flex-1 w-full bg-cyan-50/50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-500/30 rounded-2xl p-4 flex flex-col items-center gap-3 relative overflow-hidden group">
                             <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500"></div>
                             <div className="w-20 h-20 rounded-full border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] bg-gray-100 dark:bg-black overflow-hidden">
                                 <UserAvatar avatarId={auth?.currentUser?.avatar || 'avatar-1'} frameId={auth?.currentUser?.questData?.equippedFrame} className="w-full h-full" />
                             </div>
                             <div className="w-full">
                                 <div className="flex items-center justify-center gap-2 mb-2">
                                     <XIcon className="w-3 h-3 text-cyan-500" />
                                     <label className="text-xs font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">Player 1</label>
                                 </div>
                                 <div className="relative">
                                     <input 
                                        value={playerXName}
                                        onChange={(e) => setPlayerXName(e.target.value)}
                                        className="w-full bg-white/50 dark:bg-black/40 border border-cyan-200 dark:border-cyan-500/20 rounded-xl py-3 px-4 text-center font-bold text-gray-900 dark:text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20 text-sm"
                                        placeholder="Enter Name"
                                     />
                                     <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-cyan-500/50" />
                                 </div>
                             </div>
                        </div>

                        {/* VS Badge */}
                        <div className="shrink-0 z-10 -my-2 md:my-0">
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black flex items-center justify-center italic text-sm shadow-lg border-2 border-gray-200 dark:border-gray-600 relative">
                                <span className="relative z-10">VS</span>
                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/20 to-pink-500/20 animate-pulse"></div>
                            </div>
                        </div>

                        {/* Player 2 Card */}
                        <div className="flex-1 w-full bg-pink-50/50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-500/30 rounded-2xl p-4 flex flex-col items-center gap-3 relative overflow-hidden group">
                             <div className="absolute top-0 left-0 w-full h-1 bg-pink-500"></div>
                             <div className="w-20 h-20 rounded-full border-2 border-pink-400 shadow-[0_0_15px_rgba(244,114,182,0.3)] bg-gray-100 dark:bg-black overflow-hidden">
                                 <UserAvatar avatarId="avatar-2" className="w-full h-full" />
                             </div>
                             <div className="w-full">
                                 <div className="flex items-center justify-center gap-2 mb-2">
                                     <OIcon className="w-3 h-3 text-pink-500" />
                                     <label className="text-xs font-black text-pink-600 dark:text-pink-400 uppercase tracking-widest">Player 2</label>
                                 </div>
                                 <div className="relative">
                                     <input 
                                        value={playerOName}
                                        onChange={(e) => setPlayerOName(e.target.value)}
                                        className="w-full bg-white/50 dark:bg-black/40 border border-pink-200 dark:border-pink-500/20 rounded-xl py-3 px-4 text-center font-bold text-gray-900 dark:text-white focus:border-pink-400 focus:ring-1 focus:ring-pink-400/50 focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20 text-sm"
                                        placeholder="Enter Name"
                                     />
                                     <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-pink-500/50" />
                                 </div>
                             </div>
                        </div>
                    </div>

                    <motion.button 
                        onClick={handleStartLocalPvp}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-4 bg-gradient-to-r from-cyan-600 to-pink-600 rounded-xl font-black text-white text-lg uppercase tracking-widest shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all flex items-center justify-center gap-2 group"
                    >
                        <SwordIcon className="w-5 h-5 group-hover:rotate-45 transition-transform" />
                        Enter Arena
                    </motion.button>
                </div>
            </Modal>
        )}
    </AnimatePresence>
    </>
  );
};

export default MainMenu;
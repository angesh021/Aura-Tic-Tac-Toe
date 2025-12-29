
import { useState, useEffect, useCallback, useMemo, useContext, useRef } from 'react';
import { GameMode, Theme, MatchRecord, GameSettings, GameVariant, Room, Player, Difficulty, AppPreferences, CampaignLevel, ChatMessage, Notification } from './types';
import MainMenu from './components/MainMenu';
import { Game } from './components/Game';
import { AppContext } from './contexts/AppContext';
import History from './components/History';
import Replay from './components/Replay';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import AuthScreen from './components/AuthScreen';
import { ProfileScreen } from './components/ProfileScreen';
import Header from './components/Header';
import OnlineLobby from './components/OnlineLobby';
import PreGameSummary from './components/PreGameSummary';
import CampaignMap from './components/CampaignMap';
import Shop from './components/Shop';
import { onlineService } from './services/online';
import { getToken, getProfile } from './services/auth';
import * as historyService from './services/history';
import { ToastProvider, useToast } from './contexts/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import { AnimatePresence, motion } from 'framer-motion';
import { progressService, SHOP_ITEMS, BIOME_THEMES } from './services/progress';
import RejoinModal from './components/RejoinModal';
import WelcomeBonusModal from './components/WelcomeBonusModal';
import Modal from './components/Modal';
import { SwordIcon, CloseIcon } from './components/Icons';
import { friendsService } from './services/friends';
import NotFound from './components/NotFound';
import { ChatFocusContext, ChatFocusProvider } from './contexts/ChatFocusContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { SocialHubProvider, SocialHubContext } from './contexts/SocialHubContext';
import SocialHub from './components/SocialHub';
import { DirectMessageProvider, useDirectMessages } from './contexts/DirectMessageContext';
import SettingsModal from './components/SettingsModal';
import NotificationBannerStack from './components/NotificationBannerStack';
import ResetPasswordModal from './components/ResetPasswordModal';
import { useGameStore } from './stores/gameStore';
import GlobalWagerModal from './components/GlobalWagerModal';
import DailyRewardModal from './components/DailyRewardModal';
import GlobalTicker from './components/GlobalTicker';
import VerifyEmailModal from './components/VerifyEmailModal';

const defaultGameSettings: GameSettings = {
  boardSize: 3,
  winLength: 3,
  obstacles: false,
  variant: GameVariant.CLASSIC,
  difficulty: Difficulty.MEDIUM,
  startingPlayer: 'random',
  turnDuration: 30,
  powerUps: true
};

const defaultPreferences: AppPreferences = {
    lowPerformance: false,
    showCoordinates: false,
    haptics: true,
    notifyInGame: false,
    mutedConversations: {},
    snoozeUntil: null,
    notifyOnFriendRequest: true,
    notifyOnChat: true,
    notifyOnSystem: true,
    lastRoomId: null,
    streamerMode: false,
    reduceMotion: false,
    compactMode: false
};

type ProfileTab = 'overview' | 'customize';

function AppContent() {
  const [screen, setScreen] = useState('menu');
  const [localGameMode, setLocalGameMode] = useState<GameMode>(GameMode.AI);
  const [localGameSettings, setLocalGameSettings] = useState<GameSettings>(defaultGameSettings);
  const [localPlayerNames, setLocalPlayerNames] = useState<{ [key in Player]?: string }>({});
  const [campaignLevel, setCampaignLevel] = useState<CampaignLevel | undefined>(undefined);
  const [isJoining, setIsJoining] = useState(false);
  const [coins, setCoins] = useState(progressService.getCoins());
  const [pendingRejoinRoomId, setPendingRejoinRoomId] = useState<string | null>(null);
  const [showWelcomeBonus, setShowWelcomeBonus] = useState(false);
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [inviteData, setInviteData] = useState<{ hostName: string, roomId: string } | null>(null);
  const [profileStartTab, setProfileStartTab] = useState<ProfileTab>('overview');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  
  const [theme, setTheme] = useState<Theme>(Theme.DARK);

  // Customization State
  const [equippedTheme, setEquippedTheme] = useState('theme-default');
  const [equippedSkin, setEquippedSkin] = useState('skin-classic');

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gameKey, setGameKey] = useState(0);
  const [preferences, setPreferences] = useState<AppPreferences>(defaultPreferences);
  
  const auth = useContext(AuthContext);
  const toast = useToast();
  const chatFocus = useContext(ChatFocusContext);
  const notifications = useNotifications();
  const socialHub = useContext(SocialHubContext);
  const dm = useDirectMessages();
  const currentUser = auth?.currentUser;

  const [replayMatch, setReplayMatch] = useState<MatchRecord | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  
  const isOnlineGameActive = useGameStore(state => state.room && state.room.status !== 'confirming_wager');
  const activeRoomId = useGameStore(state => state.room?.id);
  const activeRoomStatus = useGameStore(state => state.room?.status);
  
  const hasPerformedInitialCheck = useRef(false);
  
  // Track if we've shown daily rewards this session to prevent loops
  const hasCheckedDailyReward = useRef(false);

  // Reset daily check when user changes (logs out/in)
  useEffect(() => {
      if (!currentUser) {
          hasCheckedDailyReward.current = false;
      }
  }, [currentUser?.id]); // Use ID dependency to detect user switch

  // Initialize from user profile on login
  useEffect(() => {
      if (currentUser) {
          setIsGuestMode(false); 
          if (currentUser.preferences) {
              setPreferences({ ...defaultPreferences, ...currentUser.preferences });
          }
          if (currentUser.theme) {
              setTheme(currentUser.theme);
          }
      }
  }, [currentUser]);

  // Effect to automatically close modals when entering a game room context
  useEffect(() => {
      if (activeRoomId && (activeRoomStatus === 'confirming_wager' || activeRoomStatus === 'playing')) {
          socialHub?.closeHub();
          setShowSettingsModal(false);
          setInviteData(null);
          setPendingRejoinRoomId(null);
          setShowWelcomeBonus(false);
          setShowDailyReward(false);
      }
  }, [activeRoomId, activeRoomStatus, socialHub]);

  useEffect(() => {
    const initConnection = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const spectateRoomId = urlParams.get('spectate');
        const roomParam = urlParams.get('room'); 
        const token = urlParams.get('resetToken');
        const mode = urlParams.get('mode');
        const vToken = urlParams.get('token');

        if (token) {
            setResetToken(token);
        }

        if (mode === 'verify' && vToken) {
            setVerifyToken(vToken);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        if (!currentUser && (spectateRoomId)) {
            setIsGuestMode(true);
        }

        if (currentUser || isGuestMode) {
            if (currentUser) {
                setEquippedTheme(currentUser.equippedTheme || 'theme-default');
                setEquippedSkin(currentUser.equippedSkin || 'skin-classic');
                
                // Initialize Progress Service & Check Rewards
                // IMPORTANT: Await init to ensure cache is hot before checking daily
                await progressService.init();
                setCoins(progressService.getCoins());
                
                // Only check rewards if we haven't already this session
                if (!hasCheckedDailyReward.current) {
                    if ((currentUser.questData as any)?.welcomeBonus === 'available') {
                        setShowWelcomeBonus(true);
                    } else if (progressService.hasDailyRewardAvailable()) {
                        setShowDailyReward(true);
                    }
                    hasCheckedDailyReward.current = true;
                }
            }

            const token = currentUser ? getToken() : undefined; 
            onlineService.connect(token || undefined);
            
            onlineService.onRoomUpdate((updatedRoom) => {
                useGameStore.getState().setRoom(updatedRoom);
            });
            
            onlineService.onInviteReceived((data) => {
                setInviteData(data);
            });
            
            const handleNewNotification = (notification: Notification) => {
                notifications.addNotification(notification);
            };
            onlineService.onNewNotification(handleNewNotification);

            onlineService.onWalletUpdate((data) => {
                progressService.setCoins(data.newBalance);
            });

            onlineService.onQuestUpdate((data) => {
                progressService.syncQuests(data.quests);
            });

            if (!hasPerformedInitialCheck.current) {
                const storedRoomId = currentUser?.preferences?.lastRoomId;

                if (spectateRoomId || roomParam) {
                    setIsJoining(true);
                    try {
                        await onlineService.waitForConnection();
                        
                        if (spectateRoomId) {
                            await onlineService.joinRoom(spectateRoomId, { asSpectator: true });
                            toast.success(`Joined room as spectator`);
                            window.history.replaceState({}, document.title, window.location.pathname);
                        } else if (roomParam && currentUser) {
                            await onlineService.joinRoom(roomParam); 
                            toast.success(`Joined room ${roomParam}`);
                            window.history.replaceState({}, document.title, window.location.pathname);
                        } else if (roomParam && !currentUser) {
                            toast.info("Sign in to join the game!");
                            setIsGuestMode(false);
                        }
                    } catch (err: any) {
                        console.error("Join error:", err);
                        toast.error(err.message || "Failed to join room");
                        if(isGuestMode) setIsGuestMode(false);
                    } finally {
                        setIsJoining(false);
                    }
                } else if (storedRoomId && currentUser) {
                    await onlineService.waitForConnection();
                    setPendingRejoinRoomId(storedRoomId);
                }
                hasPerformedInitialCheck.current = true;
            }

            return () => {
                onlineService.offNewNotification(handleNewNotification);
                onlineService.offWalletUpdate();
                onlineService.offQuestUpdate();
            };
        } else {
            onlineService.disconnect();
            useGameStore.getState().setRoom(null);
            hasPerformedInitialCheck.current = false;
        }
    };

    const cleanupPromise = initConnection();
    return () => { 
        onlineService.offRoomUpdate(); 
        onlineService.offInviteReceived();
        cleanupPromise.then(cleanup => cleanup && cleanup());
    }
  }, [currentUser, toast, notifications, isGuestMode]);

  useEffect(() => {
      const handleQuestComplete = (e: Event) => {
          const quest = (e as CustomEvent).detail;
          if (preferences.notifyOnSystem) {
            // Updated to use new notification system with custom type
            notifications.addNotification({
                type: 'quest_complete',
                title: 'Quest Complete!',
                message: quest.description,
                data: {
                    reward: quest.reward,
                    multiplier: quest.multiplier,
                    questType: quest.type,
                    description: quest.description
                }
            });
          }
      };
      window.addEventListener('aura_quest_completed', handleQuestComplete);
      return () => window.removeEventListener('aura_quest_completed', handleQuestComplete);
  }, [preferences.notifyOnSystem, notifications]);

  useEffect(() => {
      if (!currentUser) return;
      const handleMasteryUnlock = (data: { name: string, description: string, icon: string }) => {
          notifications.addNotification({
              type: 'system',
              title: 'Mastery Unlocked',
              message: `You unlocked the ${data.name} mastery!`,
              data: {}
          });
          auth?.reloadUser?.();
      };
      onlineService.onMasteryUnlocked(handleMasteryUnlock);
      return () => onlineService.offMasteryUnlocked(handleMasteryUnlock);
  }, [currentUser, toast, auth, notifications]);


  const handleAcceptInvite = async () => {
      if (!inviteData) return;
      setInviteData(null);
      setIsJoining(true);
      try {
          await onlineService.joinRoom(inviteData.roomId);
          toast.success("Joined match!");
      } catch (e: any) {
          toast.error("Failed to join match: " + e.message);
      } finally {
          setIsJoining(false);
      }
  };

  
  useEffect(() => {
      const handleUpdate = () => {
          setCoins(progressService.getCoins());
      };
      window.addEventListener('aura_progress_update', handleUpdate);
      return () => window.removeEventListener('aura_progress_update', handleUpdate);
  }, []);
  
  // Use useMemo to determine current active theme properties
  const currentBiome = useMemo(() => {
      if ((localGameMode === GameMode.CAMPAIGN || localGameMode === GameMode.TOWER) && campaignLevel && (screen === 'game' || screen === 'pre-game')) {
          return campaignLevel.biome || 'tower';
      }
      return null;
  }, [localGameMode, campaignLevel, screen]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === Theme.DARK);

    let colors = ['#22d3ee', '#f472b6']; // Default
    let bgGradient = undefined;

    // Check Biome Override
    if (currentBiome && BIOME_THEMES[currentBiome]) {
         const biome = BIOME_THEMES[currentBiome];
         colors = biome.colors;
         bgGradient = biome.bgGradient;
    } else {
        const activeThemeItem = SHOP_ITEMS.find(i => i.id === equippedTheme);
        if (activeThemeItem && activeThemeItem.colors) {
            colors = activeThemeItem.colors;
            if (activeThemeItem.bgGradient && theme === Theme.DARK) {
                 bgGradient = activeThemeItem.bgGradient;
            }
        }
    }

    document.body.style.setProperty('--color-brand-x', colors[0]);
    document.body.style.setProperty('--color-brand-o', colors[1]);
    
    if (bgGradient && (theme === Theme.DARK || currentBiome)) {
         document.body.style.setProperty('--app-bg-gradient', bgGradient);
    } else {
         document.body.style.removeProperty('--app-bg-gradient');
    }

  }, [theme, equippedTheme, currentBiome]);

  const updatePreferences = useCallback((updates: Partial<AppPreferences>) => {
      setPreferences(prev => {
          const next = { ...prev, ...updates };
          if (currentUser) {
              auth?.updateUser({ preferences: next }).catch(console.error);
          }
          return next;
      });
  }, [currentUser, auth]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT;
    setTheme(newTheme);
    if (currentUser) {
        auth?.updateUser({ theme: newTheme }).catch(() => {});
    }
  }, [currentUser, auth, theme]);

  const toggleSound = useCallback(() => { setSoundEnabled(prev => !prev); }, []);
  const refreshCoins = useCallback(() => { setCoins(progressService.getCoins()); }, []);
  
  const refreshUser = useCallback(async () => {
      if(currentUser) {
          const updated = await getProfile();
          setEquippedTheme(updated.equippedTheme);
          setEquippedSkin(updated.equippedSkin);
      }
  }, [currentUser]);

  const startLocalGame = (mode: GameMode, settings: GameSettings = defaultGameSettings, names?: { [key in Player]?: string }) => {
    setLocalGameMode(mode);
    setLocalGameSettings(settings);
    setLocalPlayerNames(names || {});
    setCampaignLevel(undefined);
    setScreen('pre-game');
  };
  
  const startCampaignLevel = (level: CampaignLevel) => {
      const mode = level.id > 1000 ? GameMode.TOWER : GameMode.CAMPAIGN;
      setLocalGameMode(mode);
      setLocalGameSettings(level.settings);
      setLocalPlayerNames({
          [Player.X]: currentUser?.displayName || 'Player X',
          [Player.O]: level.bossName
      });
      setCampaignLevel(level);
      setScreen('pre-game');
  };

  const handleConfirmStart = () => {
      setGameKey(prev => prev + 1); 
      setScreen('game');
  };

  const goToHistory = () => { setScreen('history'); };
  
  const goToProfile = (tab: ProfileTab = 'overview') => { 
      setProfileStartTab(tab);
      setScreen('profile'); 
  };

  const goToOnlineLobby = () => { setScreen('online-lobby'); };
  const goToCampaign = () => { setScreen('campaign'); };
  const goToShop = () => { setScreen('shop'); };

  const watchReplay = (match: MatchRecord) => {
    setReplayMatch(match);
    setScreen('replay');
  };

  const watchReplayById = async (matchId: string) => {
      try {
          const match = await historyService.getMatchById(matchId);
          setReplayMatch(match);
          setScreen('replay');
      } catch (e: any) {
          toast.error("Could not load replay: " + e.message);
      }
  };

  const goHome = () => {
    if (activeRoomId) {
        onlineService.leaveRoom(activeRoomId);
        useGameStore.getState().setRoom(null);
    }
    if (isGuestMode) {
        window.location.href = '/'; 
        return;
    }
    setScreen('menu');
    setReplayMatch(null);
    refreshCoins();
    auth?.reloadUser?.();
  };

  const handleConfirmRejoin = async () => {
      if (!pendingRejoinRoomId) return;
      setIsJoining(true);
      try {
          await onlineService.joinRoom(pendingRejoinRoomId);
          toast.success("Rejoined match!");
          setPendingRejoinRoomId(null);
      } catch (err: any) {
          toast.error("Match expired or invalid.");
          updatePreferences({ lastRoomId: null });
          setPendingRejoinRoomId(null);
      } finally {
          setIsJoining(false);
      }
  };

  const handleDeclineRejoin = () => {
      if (pendingRejoinRoomId) {
          updatePreferences({ lastRoomId: null });
          onlineService.leaveRoom(pendingRejoinRoomId);
      }
      setPendingRejoinRoomId(null);
      toast.info("Match abandoned.");
  };

  const handleClaimBonus = async () => {
      const success = await progressService.claimWelcomeBonus();
      if (success) {
          // Do not close welcome bonus modal here immediately
          // Let the modal animation finish and trigger onClose
          auth?.reloadUser?.(); 
      }
      return success;
  };

  const handleWelcomeClose = () => {
      setShowWelcomeBonus(false);
      // Check for daily reward immediately after the welcome bonus flow is completed
      if (progressService.hasDailyRewardAvailable()) {
          setTimeout(() => setShowDailyReward(true), 500);
      }
  };

  const contextValue = useMemo(() => ({
    theme, toggleTheme, goHome, soundEnabled, toggleSound, preferences, updatePreferences, coins, refreshCoins,
    equippedSkin, equippedTheme, refreshUser, watchReplayById
  }), [theme, toggleTheme, goHome, soundEnabled, toggleSound, preferences, updatePreferences, coins, refreshCoins, equippedSkin, equippedTheme, refreshUser]);

  const isGameActive = screen === 'game' || isOnlineGameActive;

  const renderScreen = () => {
    if (auth?.isLoading || isJoining) {
      return (
        <div className="flex items-center justify-center h-full">
           <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-cyan-400 rounded-full animate-spin"></div>
           </div>
        </div>
      );
    }
    
    if (!currentUser && !isGuestMode && !resetToken && !verifyToken) return <AuthScreen />;
    
    if (isOnlineGameActive) {
        return (
             <motion.div key="online-game" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="w-full h-full flex justify-center">
                <Game 
                    key={activeRoomId} 
                    userId={currentUser?.id || 'guest'}
                    gameMode={GameMode.ONLINE} 
                    gameSettings={defaultGameSettings} 
                    isGuest={isGuestMode}
                />
             </motion.div>
        );
    }

    if (isGuestMode && !isOnlineGameActive && !isJoining) {
        return <div className="text-white">Connecting to match...</div>;
    }

    if (resetToken && !currentUser) {
        return <div className="text-white">Resetting Password...</div>;
    }

    if (verifyToken && !currentUser) {
        return <div className="text-white">Verifying Email...</div>;
    }

    const screenVariants = {
        initial: { opacity: 0, scale: 0.95, y: 10 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 1.05, y: -10 }
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div 
                key={screen}
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="w-full h-full flex justify-center items-center"
            >
                {(() => {
                    switch(screen) {
                        case 'menu': return (
                            <MainMenu 
                                onStartGame={startLocalGame} 
                                onGoToOnlineLobby={goToOnlineLobby} 
                                onGoToCampaign={goToCampaign} 
                                onGoToShop={goToShop}
                                onOpenDailyReward={() => setShowDailyReward(true)} 
                            />
                        );
                        case 'pre-game': return <PreGameSummary mode={localGameMode} settings={localGameSettings} playerNames={localPlayerNames} onStart={handleConfirmStart} onCancel={() => setScreen(localGameMode === GameMode.CAMPAIGN || localGameMode === GameMode.TOWER ? 'campaign' : 'menu')} />;
                        case 'online-lobby': return <OnlineLobby />;
                        case 'campaign': return <CampaignMap onSelectLevel={startCampaignLevel} onBack={goHome} />;
                        case 'shop': return <Shop onClose={goHome} />;
                        case 'history': return <History onWatchReplay={watchReplay} onBack={goHome} />;
                        case 'replay': return <Replay match={replayMatch!} onBack={goToHistory} onHome={goHome} />;
                        case 'profile': return <ProfileScreen onBack={goHome} initialTab={profileStartTab} />;
                        case 'game': return <Game key={gameKey} userId={currentUser!.id} gameMode={localGameMode} gameSettings={localGameSettings} playerNames={localPlayerNames} campaignLevel={campaignLevel} onNextLevel={startCampaignLevel} />;
                        default: return <NotFound />;
                    }
                })()}
            </motion.div>
        </AnimatePresence>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      <main 
        // Mobile-first: min-h-screen allows scrolling naturally
        // Desktop: h-screen maintains the fixed app feel
        className="min-h-[100dvh] md:h-screen bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-gray-200 font-sans relative flex flex-col transition-all duration-500 md:overflow-hidden"
        style={{
            background: theme === Theme.DARK ? 'var(--app-bg-gradient, #0f172a)' : undefined
        }}
      >
        <div className="bg-noise"></div>
        {!preferences.lowPerformance && (
            <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
                <motion.div 
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0], opacity: theme === Theme.DARK ? [0.3, 0.5, 0.3] : [0.6, 0.8, 0.6] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-purple-300/40 dark:bg-purple-600/20 rounded-full blur-[120px]"
                />
                <motion.div 
                    animate={{ scale: [1, 1.1, 1], x: [0, 100, 0], opacity: theme === Theme.DARK ? [0.2, 0.4, 0.2] : [0.5, 0.7, 0.5] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-300/40 dark:bg-cyan-600/20 rounded-full blur-[100px]"
                />
            </div>
        )}
        
        {currentUser && <Header onGoToProfile={goToProfile} onGoToHistory={goToHistory} onOpenSettings={() => setShowSettingsModal(true)} />}
        
        {/* Main Content Area */}
        {/* Mobile: Standard block, scrolling via body. Desktop: Flex container with overflow handling. */}
        <div className="flex-1 w-full relative z-10 md:overflow-y-auto md:overflow-x-hidden custom-scrollbar flex flex-col">
            <div className={`flex-1 flex flex-col items-center justify-start p-4 ${currentUser ? 'pt-24 md:pt-28' : 'pt-4'} ${isGameActive ? 'pb-4' : 'pb-24'} md:pb-4 min-h-full`}>
               <div className="w-full max-w-7xl flex justify-center items-center my-auto">
                  <ErrorBoundary>{renderScreen()}</ErrorBoundary>
               </div>
            </div>
        </div>

        <NotificationBannerStack />
        <GlobalTicker />

        <AnimatePresence>
            <GlobalWagerModal currentUserId={currentUser?.id || 'guest'} onClose={goHome} />

            {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} />}
            
            {resetToken && (
                <ResetPasswordModal token={resetToken} onClose={() => setResetToken(null)} />
            )}

            {verifyToken && (
                <VerifyEmailModal token={verifyToken} onClose={() => setVerifyToken(null)} />
            )}

            {pendingRejoinRoomId && !isOnlineGameActive && !resetToken && !verifyToken && (
                <RejoinModal onConfirm={handleConfirmRejoin} onDecline={handleDeclineRejoin} />
            )}
            {showWelcomeBonus && !resetToken && !verifyToken && (
                <WelcomeBonusModal onClaim={handleClaimBonus} onClose={handleWelcomeClose} />
            )}
            {showDailyReward && !resetToken && !verifyToken && !showWelcomeBonus && (
                <DailyRewardModal onClose={() => setShowDailyReward(false)} />
            )}
            {inviteData && !resetToken && !verifyToken && (
                <Modal onClose={() => setInviteData(null)} className="max-w-sm">
                    <div className="text-center p-4">
                        <div className="w-20 h-20 mx-auto bg-cyan-500/20 rounded-full flex items-center justify-center border-2 border-cyan-500 mb-4 animate-pulse">
                            <SwordIcon className="w-10 h-10 text-cyan-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Challenge Received!</h2>
                        <p className="text-gray-400 mb-6">
                            <strong className="text-white">{inviteData.hostName}</strong> challenged you to a duel.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setInviteData(null)} 
                                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold"
                            >
                                Decline
                            </button>
                            <button 
                                onClick={handleAcceptInvite} 
                                className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg"
                            >
                                Accept
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
            {socialHub?.isHubOpen && !resetToken && !verifyToken && (
                <SocialHub onClose={socialHub.closeHub} initialTargetId={socialHub.initialTargetId} />
            )}
        </AnimatePresence>
      </main>
    </AppContext.Provider>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <DirectMessageProvider>
          <NotificationProvider>
            <SocialHubProvider>
              <ChatFocusProvider>
                <AppContent />
              </ChatFocusProvider>
            </SocialHubProvider>
          </NotificationProvider>
        </DirectMessageProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;

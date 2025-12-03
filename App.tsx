


import { useState, useEffect, useCallback, useMemo, useContext, useRef } from 'react';
// FIX: Add Notification type to imports
import { GameMode, Theme, MatchRecord, GameSettings, GameVariant, Room, Player, Difficulty, AppPreferences, CampaignLevel, ChatMessage, Notification } from './types';
import MainMenu from './components/MainMenu';
import Game from './components/Game';
import { AppContext } from './contexts/AppContext';
import History from './components/History';
import Replay from './components/Replay';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import AuthScreen from './components/AuthScreen';
import ProfileScreen from './components/ProfileScreen';
import Header from './components/Header';
import OnlineLobby from './components/OnlineLobby';
import PreGameSummary from './components/PreGameSummary';
import CampaignMap from './components/CampaignMap';
import Shop from './components/Shop';
import { onlineService } from './services/online';
import { getToken, getProfile } from './services/auth';
// FIX: Changed import to use namespace for historyService to resolve export error
import * as historyService from './services/history';
import { ToastProvider, useToast } from './contexts/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import { AnimatePresence, motion } from 'framer-motion';
import { progressService, SHOP_ITEMS } from './services/progress';
import RejoinModal from './components/RejoinModal';
import WelcomeBonusModal from './components/WelcomeBonusModal';
import Modal from './components/Modal'; // Need Modal for Invite
import { SwordIcon, CloseIcon } from './components/Icons'; // Icons
import { friendsService } from './services/friends';
import NotFound from './components/NotFound';
import { ChatFocusContext, ChatFocusProvider } from './contexts/ChatFocusContext';
import ChatNotification from './components/ChatNotification';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { SocialHubProvider, SocialHubContext } from './contexts/SocialHubContext';
import SocialHub from './components/SocialHub';
import { DirectMessageProvider, useDirectMessages } from './contexts/DirectMessageContext';

const defaultGameSettings: GameSettings = {
  boardSize: 3,
  winLength: 3,
  obstacles: false,
  variant: GameVariant.CLASSIC,
  difficulty: Difficulty.MEDIUM,
  startingPlayer: 'X',
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
    lastRoomId: null
};

// Define Profile Tab type for navigation
type ProfileTab = 'overview' | 'customize' | 'settings';

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
  const [inviteData, setInviteData] = useState<{ hostName: string, roomId: string } | null>(null);
  const [profileStartTab, setProfileStartTab] = useState<ProfileTab>('overview');
  
  const [theme, setTheme] = useState<Theme>(Theme.DARK);

  // Customization State
  const [equippedTheme, setEquippedTheme] = useState('theme-default');
  const [equippedSkin, setEquippedSkin] = useState('skin-classic');

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
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
  
  // Track if we've checked for rejoin/params so we don't do it again on re-renders (e.g. coin updates)
  const hasPerformedInitialCheck = useRef(false);

  // Initialize from user profile on login
  useEffect(() => {
      if (currentUser) {
          if (currentUser.preferences) {
              setPreferences({ ...defaultPreferences, ...currentUser.preferences });
          }
          if (currentUser.theme) {
              setTheme(currentUser.theme);
          }
      }
  }, [currentUser]);

  useEffect(() => {
    const initConnection = async () => {
        if (currentUser) {
            // Sync Customization
            setEquippedTheme(currentUser.equippedTheme || 'theme-default');
            setEquippedSkin(currentUser.equippedSkin || 'skin-classic');
            
            // Check for Welcome Bonus availability
            if ((currentUser.questData as any)?.welcomeBonus === 'available') {
                setShowWelcomeBonus(true);
            }

            // Initialize Socket
            const token = getToken(); 
            onlineService.connect(token || undefined);
            onlineService.onRoomUpdate(setRoom);
            
            // Invite Listener
            onlineService.onInviteReceived((data) => {
                setInviteData(data);
            });
            
            // FIX: Use a public method on onlineService to subscribe to 'newNotification' event.
            // Real-time notification listener
            const handleNewNotification = (notification: Notification) => {
                notifications.addNotification(notification);
            };
            onlineService.onNewNotification(handleNewNotification);

            // Listen for Wallet updates
            onlineService.onWalletUpdate((data) => {
                progressService.setCoins(data.newBalance);
            });

            // Friend Request Listeners (for real-time toast only)
            const handleFriendRequest = (data: any) => {
                 const now = Date.now();
                if (preferences.snoozeUntil && now < preferences.snoozeUntil) return;

                notifications.addNotification({
                    type: 'friend_request',
                    title: 'Friend Request',
                    message: `${data.sender.displayName} sent you a friend request.`,
                    data: {
                        senderId: data.sender.id,
                        requestId: data.requestId,
                        sender: data.sender
                    }
                });
                if (preferences.notifyOnFriendRequest) {
                    toast.info(`${data.sender.displayName} sent you a friend request!`);
                }
            };

            const handleFriendResponse = (data: any) => {
                 const now = Date.now();
                 if (preferences.snoozeUntil && now < preferences.snoozeUntil) return;

                 if (preferences.notifyOnSystem) {
                    if (data.type === 'accept') {
                        toast.success(data.message);
                    } else {
                        toast.info(data.message);
                    }
                 }
            };

            onlineService.onFriendRequestReceived(handleFriendRequest);
            onlineService.onFriendRequestResponse(handleFriendResponse);
            
            // Initialize Progress
            progressService.init().then(() => {
                setCoins(progressService.getCoins());
            });

            // Spectating Logic & Auto-Rejoin (Only run once per login session)
            if (!hasPerformedInitialCheck.current) {
                const urlParams = new URLSearchParams(window.location.search);
                const spectateRoomId = urlParams.get('spectate');
                const roomParam = urlParams.get('room'); 
                const storedRoomId = currentUser.preferences?.lastRoomId;

                if (spectateRoomId || roomParam) {
                    setIsJoining(true);
                    try {
                        await onlineService.waitForConnection();
                        
                        if (spectateRoomId) {
                            await onlineService.joinRoom(spectateRoomId, { asSpectator: true });
                            toast.success(`Joined room as spectator`);
                            window.history.replaceState({}, document.title, window.location.pathname);
                        } else if (roomParam) {
                            await onlineService.joinRoom(roomParam); 
                            toast.success(`Joined room ${roomParam}`);
                            window.history.replaceState({}, document.title, window.location.pathname);
                        }
                    } catch (err: any) {
                        console.error("Join error:", err);
                        toast.error(err.message || "Failed to join room");
                    } finally {
                        setIsJoining(false);
                    }
                } else if (storedRoomId) {
                    // Instead of auto-joining, set pending state to show modal
                    await onlineService.waitForConnection();
                    setPendingRejoinRoomId(storedRoomId);
                }
                hasPerformedInitialCheck.current = true;
            }

            // Cleanup function for this effect instance
            return () => {
                onlineService.offFriendRequestReceived(handleFriendRequest);
                onlineService.offFriendRequestResponse(handleFriendResponse);
                // FIX: Use the corresponding public 'off' method to unsubscribe from the 'newNotification' event.
                onlineService.offNewNotification(handleNewNotification);
                onlineService.offWalletUpdate();
            };
        } else {
            onlineService.disconnect();
            setRoom(null);
            hasPerformedInitialCheck.current = false;
        }
    };

    const cleanupPromise = initConnection();
    return () => { 
        onlineService.offRoomUpdate(); 
        onlineService.offInviteReceived();
        cleanupPromise.then(cleanup => cleanup && cleanup());
    }
  }, [currentUser, toast, notifications, preferences.notifyOnFriendRequest, preferences.notifyOnSystem]);

  // DM Notification Listener
  useEffect(() => {
    if (!currentUser || !toast || !socialHub || !dm) return;

    const handleDirectMessage = (msg: ChatMessage) => {
        // NOTE: dm.addMessage(msg) is now handled inside DirectMessageProvider itself listening to sockets.
        // We only use this listener to display TOASTS.

        // Then, decide whether to show a toast
        const messageText = msg.stickerId ? 'Sent a sticker' : (msg.replayData ? 'Shared a replay' : msg.text);

        const isInGame = screen === 'game' || screen === 'replay' || room;
        if (isInGame && !preferences.notifyInGame) return;

        const now = Date.now();
        if (preferences.snoozeUntil && now < preferences.snoozeUntil) return;

        const mutedUntil = preferences.mutedConversations?.[msg.senderId!];
        if (mutedUntil && now < mutedUntil) return;
        
        if (msg.senderId === currentUser.id || msg.type === 'system' || msg.senderId === chatFocus?.focusedChatId) return;
        
        // Add to persistent notification center
        notifications.addNotification({
            type: 'chat',
            title: `Message from ${msg.senderName}`,
            message: messageText,
            data: {
                senderId: msg.senderId,
                senderAvatar: msg.senderAvatar,
                // Pass full message for quick reply
                messageData: msg,
                sender: { id: msg.senderId!, displayName: msg.senderName!, avatar: msg.senderAvatar! }
            }
        });
        
        if (preferences.notifyOnChat) {
            // Show toast
            const toastId = toast.showToast(
                '', // Message is unused, we pass custom content
                'custom',
                6000,
                undefined,
                <ChatNotification
                    avatarId={msg.senderAvatar || 'avatar-1'}
                    name={msg.senderName || 'Unknown'}
                    message={messageText}
                    onClick={() => {
                        socialHub.openHub(msg.senderId);
                        toast.removeToast(toastId);
                    }}
                    onClose={() => toast.removeToast(toastId)}
                />
            );
        }
    };

    onlineService.onDirectMessage(handleDirectMessage);

    return () => {
        onlineService.offDirectMessage(handleDirectMessage);
    }
  }, [currentUser, toast, chatFocus?.focusedChatId, screen, room, preferences, socialHub, notifications, dm]);


  // Quest Completion Listener
  useEffect(() => {
      const handleQuestComplete = (e: Event) => {
          const detail = (e as CustomEvent).detail;
          if (preferences.notifyOnSystem) {
            toast.success(`Quest Completed: ${detail.description}`, 5000); 
          }
      };
      window.addEventListener('aura_quest_completed', handleQuestComplete);
      return () => window.removeEventListener('aura_quest_completed', handleQuestComplete);
  }, [toast, preferences.notifyOnSystem]);

  // Mastery Unlock Listener
  useEffect(() => {
      if (!currentUser) return;
      const handleMasteryUnlock = (data: { name: string, description: string, icon: string }) => {
          toast.info(`🏆 Mastery Unlocked: ${data.name}!`, 8000);
          auth?.reloadUser?.();
      };
      onlineService.onMasteryUnlocked(handleMasteryUnlock);
      return () => onlineService.offMasteryUnlocked(handleMasteryUnlock);
  }, [currentUser, toast, auth]);


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
      const handleUpdate = () => setCoins(progressService.getCoins());
      window.addEventListener('aura_progress_update', handleUpdate);
      return () => window.removeEventListener('aura_progress_update', handleUpdate);
  }, []);
  
  // Dynamic Theme Injection
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === Theme.DARK);

    // Apply Active Theme Colors
    const activeThemeItem = SHOP_ITEMS.find(i => i.id === equippedTheme);
    if (activeThemeItem && activeThemeItem.colors) {
        document.body.style.setProperty('--color-brand-x', activeThemeItem.colors[0]);
        document.body.style.setProperty('--color-brand-o', activeThemeItem.colors[1]);
        
        if (activeThemeItem.bgGradient && theme === Theme.DARK) {
             document.body.style.setProperty('--app-bg-gradient', activeThemeItem.bgGradient);
        } else {
             document.body.style.removeProperty('--app-bg-gradient');
        }
    } else {
        document.body.style.setProperty('--color-brand-x', '#22d3ee'); // Default Cyan
        document.body.style.setProperty('--color-brand-o', '#f472b6'); // Default Pink
        document.body.style.removeProperty('--app-bg-gradient');
    }

  }, [theme, equippedTheme]);

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
      setLocalGameMode(GameMode.CAMPAIGN);
      setLocalGameSettings(level.settings);
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
    if (room) {
        onlineService.leaveRoom(room.id);
        setRoom(null);
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
          // Update DB preference to null so it doesn't prompt again
          updatePreferences({ lastRoomId: null });
          setPendingRejoinRoomId(null);
      } finally {
          setIsJoining(false);
      }
  };

  const handleDeclineRejoin = () => {
      if (pendingRejoinRoomId) {
          // Explicitly clear the room ID from preferences on server
          updatePreferences({ lastRoomId: null });
          // Also try to leave socket room just in case
          onlineService.leaveRoom(pendingRejoinRoomId);
      }
      setPendingRejoinRoomId(null);
      toast.info("Match abandoned.");
  };

  const handleClaimBonus = async () => {
      const success = await progressService.claimWelcomeBonus();
      if (success) {
          auth?.reloadUser?.(); 
      }
      return success;
  };

  const contextValue = useMemo(() => ({
    theme, toggleTheme, goHome, soundEnabled, toggleSound, preferences, updatePreferences, coins, refreshCoins,
    equippedSkin, equippedTheme, refreshUser, watchReplayById
  }), [theme, toggleTheme, goHome, soundEnabled, toggleSound, preferences, updatePreferences, coins, refreshCoins, equippedSkin, equippedTheme, refreshUser]);

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
    if (!currentUser) return <AuthScreen />;
    
    if (room) {
        return (
             <motion.div key="online-game" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="w-full h-full flex justify-center">
                <Game key={room.id} userId={currentUser.id} gameMode={GameMode.ONLINE} gameSettings={room.gameSettings} onlineRoom={room} />
             </motion.div>
        );
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
                        case 'menu': return <MainMenu onStartGame={startLocalGame} onGoToOnlineLobby={goToOnlineLobby} onGoToCampaign={goToCampaign} onGoToShop={goToShop} />;
                        case 'pre-game': return <PreGameSummary mode={localGameMode} settings={localGameSettings} playerNames={localPlayerNames} onStart={handleConfirmStart} onCancel={() => setScreen(localGameMode === GameMode.CAMPAIGN ? 'campaign' : 'menu')} />;
                        case 'online-lobby': return <OnlineLobby />;
                        case 'campaign': return <CampaignMap onSelectLevel={startCampaignLevel} onBack={goHome} />;
                        case 'shop': return <Shop onClose={goHome} />;
                        case 'history': return <History onWatchReplay={watchReplay} onBack={goHome} />;
                        case 'replay': return <Replay match={replayMatch!} onBack={goToHistory} onHome={goHome} />;
                        case 'profile': return <ProfileScreen onBack={goHome} initialTab={profileStartTab} />;
                        case 'game': return <Game key={gameKey} userId={currentUser.id} gameMode={localGameMode} gameSettings={localGameSettings} playerNames={localPlayerNames} campaignLevel={campaignLevel} onNextLevel={startCampaignLevel} />;
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
        className="h-screen bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-gray-200 font-sans relative flex flex-col transition-all duration-500 overflow-hidden"
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
        
        {currentUser && <Header onGoToProfile={goToProfile} onGoToHistory={goToHistory} />}
        
        {/* Main Content Area */}
        <div className="flex-1 w-full relative z-10 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-start p-4 pt-28 pb-4 min-h-full">
               <div className="w-full max-w-7xl flex justify-center items-center my-auto">
                  <ErrorBoundary>{renderScreen()}</ErrorBoundary>
               </div>
            </div>
        </div>

        <AnimatePresence>
            {pendingRejoinRoomId && !room && (
                <RejoinModal onConfirm={handleConfirmRejoin} onDecline={handleDeclineRejoin} />
            )}
            {showWelcomeBonus && (
                <WelcomeBonusModal onClaim={handleClaimBonus} onClose={() => setShowWelcomeBonus(false)} />
            )}
            {inviteData && (
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
            {socialHub?.isHubOpen && (
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

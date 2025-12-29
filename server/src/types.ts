export enum GameMode {
  AI = 'AI',
  LOCAL = 'LOCAL',
  ONLINE = 'ONLINE',
  CAMPAIGN = 'CAMPAIGN',
  TOWER = 'TOWER'
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark'
}

export enum GameVariant {
  CLASSIC = 'Classic',
  MISERE = 'Misere'
}

export enum Difficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard',
  BOSS = 'Boss'
}

export enum Player {
  X = 'X',
  O = 'O'
}

export type PlayerRole = Player | 'spectator';

export type SquareValue = Player | 'OBSTACLE' | null;
export type BoardState = SquareValue[];

export type WinningLine = number[];

export interface GameSettings {
  boardSize: number;
  winLength: number;
  obstacles: boolean;
  variant: GameVariant;
  difficulty: Difficulty;
  startingPlayer?: 'X' | 'O' | 'random';
  turnDuration?: number;
  powerUps?: boolean;
  blitzMode?: boolean;
  blitzDuration?: number;
  winReason?: 'standard' | 'forfeit' | 'timeout' | 'disconnect';
}

export interface AppPreferences {
    lowPerformance: boolean;
    showCoordinates: boolean;
    haptics: boolean;
    notifyInGame: boolean;
    mutedConversations: Record<string, boolean>;
    snoozeUntil: number | null;
    notifyOnFriendRequest: boolean;
    notifyOnChat: boolean;
    notifyOnSystem: boolean;
    lastRoomId: string | null;
    streamerMode: boolean;
    reduceMotion: boolean;
    compactMode: boolean;
    mfaEnabled?: boolean;
    mfaBackupCodes?: string[];
}

export interface Quest {
    id: string;
    type: string;
    description: string;
    current: number;
    target: number;
    reward: number;
    completed: boolean;
    claimed: boolean;
    multiplier?: number;
}

export interface PendingGift {
    id: string;
    senderId: string;
    amount: number;
}

export interface Clan {
    id: string;
    name: string;
    tag: string;
    ownerId: string;
    members: User[];
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar: string; 
  theme: Theme;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  badges: string[]; // Array of Badge IDs
  
  // Customization
  equippedTheme: string;
  equippedSkin: string;
  bio?: string;
  customStatus?: string;
  showcasedBadges?: string[];
  preferences?: AppPreferences;

  // Progress
  xp: number;
  level: number;
  winStreak: number;
  coins: number;
  inventory: string[];
  campaignLevel: number;
  campaignProgress?: any;
  questData?: {
      lastGenerated: string;
      quests: Quest[];
      rerollsRemaining: number;
      welcomeBonus?: 'available' | 'claimed';
      pendingGifts?: PendingGift[];
      mfaEnabled?: boolean;
      mfaSecret?: string;
      mfaBackupCodes?: string[];
      preferences?: AppPreferences;
      // New Retention Fields
      lastDailyReward?: string; // ISO Date String
      dailyStreak?: number;
      prestigeLevel?: number;
      equippedFrame?: string; // Added Frame
      lastVisit?: string;
      lastPasswordChange?: string;
      lastWinAt?: string;
      towerFloor?: number; // Infinite Tower Progress
      securityRewards?: {
          email?: boolean;
          mfa?: boolean;
          password?: boolean;
      };
  };
  friendCode?: string;
  status?: 'ONLINE' | 'IN_GAME' | 'OFFLINE' | 'WAITING'; // WAITING means in lobby
  clanId?: string;
  clan?: Clan;
  isGuest?: boolean;
  // Security
  mfaEnabled?: boolean;
  emailVerified?: boolean;
  passwordHash?: string;
  verificationToken?: string | null;
  mfaSecret?: string | null;
}

export interface Move {
    player: Player;
    index: number;
    moveNumber?: number;
}

export interface MatchRecord {
    id: string;
    userId: string;
    gameMode: GameMode;
    winner: Player | 'draw';
    moves: Move[];
    date: number; // or Date string depending on usage, likely string from JSON or number from timestamp
    gameSettings: GameSettings;
    initialBoard?: BoardState;
    opponentName?: string;
    playerRole?: Player;
    winReason?: 'standard' | 'forfeit' | 'timeout' | 'disconnect';
    xpReport?: XpReport;
}

export interface CampaignLevel {
    id: number;
    name: string;
    description: string;
    bossName: string;
    bossAvatar: string;
    rewardCoins: number;
    settings: GameSettings;
    isUnlocked: boolean;
    isCompleted: boolean;
    stars: number;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    senderFrame?: string; // ADDED
    senderVerified?: boolean;
    text: string;
    timestamp: number;
    type: 'user' | 'system';
    channel?: 'game' | 'lobby' | 'dm';
    replyTo?: {
        id: string;
        senderName: string;
        text: string;
    };
    recipientId?: string;
    readBy?: Record<string, number>;
    deleted?: boolean;
    editedAt?: number;
    reactions?: Record<string, string[]>; // emoji -> userIds
    giftData?: { amount: number };
    inviteData?: { roomId: string, settings?: any };
    replayData?: any;
    stickerId?: string;
}

export interface Notification {
    id: string;
    userId?: string;
    type: 'chat' | 'friend_request' | 'match_result' | 'system' | 'gift' | 'quest_complete';
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    data?: any;
}

export interface PlayerSeat {
    user: User;
    role: PlayerRole;
    connected: boolean;
}

export type WagerTier = 'bronze' | 'silver' | 'gold';

export interface XpReport {
    total: number;
    base?: number;
    win?: number;
    flawless?: number;
    comeback?: number;
    efficiency?: number;
    elo?: number;
    coinChange?: number;
    firstWinBonus?: boolean;
}

export interface Room {
    id: string;
    status: 'waiting' | 'playing' | 'finished' | 'confirming_wager';
    players: PlayerSeat[];
    board: BoardState;
    currentPlayer: Player;
    winner: Player | 'draw' | null;
    winningLine: WinningLine | null;
    gameSettings: GameSettings;
    moves: Move[];
    chat: ChatMessage[];
    hostId: string;
    initialBoard: BoardState;
    lastMoveTime?: number;
    timeRemaining?: { [key in Player]: number };
    winReason?: 'standard' | 'forfeit' | 'timeout' | 'disconnect';
    isPaused?: boolean;
    pausedAt?: number;
    rematchRequested: { [key in Player]?: boolean };
    rematchOffer?: { from: PlayerRole, expiresAt: number }; // Added for rematch modal
    anteAmount: number;
    pot: number;
    wagerConfirmed: { [key in PlayerRole]?: boolean };
    participants?: { [key in Player]?: User };
    xpReport?: { [key in Player]?: XpReport };
    doubleDown?: { offering: PlayerRole, expiresAt: number };
    doubleDownUsed?: boolean;
    doubleDownAction?: 'accepted' | 'declined';
}

export type PowerUp = 'undo' | 'hint' | 'destroy' | 'wall' | 'double' | 'convert';

export type PowerUps = {
    [key in Player]: {
        [key in PowerUp]?: boolean;
    };
};

export interface MoveAnalysis {
    move: number;
    reason: string;
    score?: number;
}

export interface Friendship {
    id: string;
    senderId: string;
    receiverId: string;
    status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
    sender: User;
    receiver: User;
    createdAt: string;
}

export interface UserProgress {
    coins: number;
    inventory: string[];
    campaignLevel: number;
    campaignProgress: Record<number, { stars: number }>;
    quests: Quest[];
    lastQuestGeneration: string;
    rerollsRemaining: number;
    dailyStreak?: number;
    lastDailyReward?: string;
    prestigeLevel?: number;
    dailyShop?: string[];
}

export interface ShopItem {
    id: string;
    name?: string;
    type: 'avatar' | 'theme' | 'skin' | 'powerup' | 'frame';
    cost: number;
    assetId: string;
    owned: boolean;
    description?: string;
    colors?: string[];
    bgGradient?: string;
    isDailyDeal?: boolean;
    discountedCost?: number;
    unlockLevel?: number;
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    color?: string;
    border?: string;
}

export interface AuthContextType {
    currentUser: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<any>; 
    register: (email: string, password: string) => Promise<void>;
    logout: () => void;
    updateUser: (updates: Partial<User>) => Promise<void>;
    deleteAccount: () => Promise<void>;
}

export interface AppContextType {
    theme: Theme;
    toggleTheme: () => void;
    goHome: () => void;
    soundEnabled: boolean;
    toggleSound: () => void;
    preferences: AppPreferences;
    updatePreferences: (updates: Partial<AppPreferences>) => void;
    coins: number;
    refreshCoins: () => void;
    equippedSkin: string;
    equippedTheme: string;
    refreshUser: () => void;
    watchReplayById: (matchId: string) => void;
}

// Socket Events
export interface ClientToServerEvents {
    createRoom: (data: { settings: Partial<GameSettings>, wagerTier: WagerTier }, callback: (res: { success: boolean; roomId?: string; error?: string }) => void) => void;
    joinRoom: (roomId: string, options: { asSpectator?: boolean }, callback: (res: { success: boolean; error?: string }) => void) => void;
    leaveRoom: (roomId: string) => void;
    makeMove: (data: { roomId: string, index: number }, callback: (res: { success: boolean; error?: string }) => void) => void;
    sendChat: (data: { roomId: string, text: string, replyTo?: any }) => void;
    sendEmote: (data: { roomId: string, emoji: string }) => void;
    startGame: (roomId: string) => void;
    requestRematch: (roomId: string) => void;
    declineRematch: (roomId: string) => void;
    sendInvite: (friendId: string, roomId: string) => void;
    confirmWager: (roomId: string) => void;
    doubleDownRequest: (roomId: string) => void;
    doubleDownResponse: (roomId: string, accepted: boolean) => void;
    claimTimeout: (roomId: string) => void;
    joinLobby: () => void;
    leaveLobby: () => void;
    sendLobbyChat: (data: { text: string, replyTo?: any, stickerId?: string }) => void;
    sendDirectMessage: (data: { toUserId: string, text: string, replyTo?: any, replayData?: any, stickerId?: string }) => void;
    editMessage: (data: { channel: 'dm' | 'game', targetId: string, messageId: string, newText: string }) => void;
    deleteMessage: (data: { channel: 'dm' | 'game', targetId: string, messageId: string }) => void;
    sendReaction: (data: { channel: 'dm' | 'game', targetId: string, messageId: string, emoji: string }) => void;
    markConversationAsRead: (partnerId: string) => void;
    typing: (data: { channel: 'game' | 'lobby' | 'dm', roomId?: string, toUserId?: string }) => void;
    stopTyping: (data: { channel: 'game' | 'lobby' | 'dm', roomId?: string, toUserId?: string }) => void;
    requestFriendStatuses: () => void;
    getRooms: () => void;
}

export interface ServerToClientEvents {
    roomUpdate: (room: Room) => void;
    chatMessage: (msg: ChatMessage) => void;
    emote: (data: { senderId: string, emoji: string }) => void;
    gameReset: (room: Room) => void;
    rematchDeclined: () => void;
    inviteReceived: (data: { hostName: string, roomId: string }) => void;
    newNotification: (notification: Notification) => void;
    walletUpdate: (data: { newBalance: number }) => void;
    questUpdate: (data: { quests: Quest[] }) => void;
    masteryUnlocked: (data: { name: string, description: string, icon: string }) => void;
    roomsList: (rooms: Room[]) => void;
    friendStatus: (data: { userId: string, status: 'ONLINE' | 'IN_GAME' | 'OFFLINE' | 'WAITING' }) => void;
    lobbyChatMessage: (msg: ChatMessage) => void;
    directMessage: (msg: ChatMessage) => void;
    messageUpdated: (data: { channel: string, targetId: string, message: ChatMessage }) => void;
    messageDeleted: (data: { channel: string, targetId: string, messageId: string }) => void;
    reactionUpdate: (data: { channel: string, targetId: string, messageId: string, reactions: ChatMessage['reactions'] }) => void;
    messagesRead: (data: { conversationPartnerId: string, readByUserId: string, readAt: number, partnerId?: string }) => void;
    userTyping: (data: { userId: string, displayName: string, channel: string, roomId?: string }) => void;
    userStoppedTyping: (data: { userId: string, channel: string, roomId?: string }) => void;
    friendRequestReceived: (data: { requestId: string, sender: { id: string, displayName: string, avatar: string } }) => void;
    friendRequestResponse: (data: { message: string, type: 'accept' | 'reject' }) => void;
    rematchOffer: () => void; 
    globalBroadcast: (data: { message: string, type: 'jackpot' | 'rank_up' | 'drop' }) => void;
}
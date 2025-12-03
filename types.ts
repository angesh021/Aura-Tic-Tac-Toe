
import { Socket } from "socket-io-client";

export enum Player {
  X = 'X',
  O = 'O',
}

export type SquareValue = Player | 'OBSTACLE' | null;

export type BoardState = SquareValue[];

export type WinningLine = number[];

export enum GameMode {
  LOCAL = 'local',
  AI = 'ai',
  ONLINE = 'online',
  CAMPAIGN = 'campaign'
}

export enum GameVariant {
  CLASSIC = 'Classic',
  MISERE = 'Misère',
}

export enum Difficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard',
  BOSS = 'Boss'
}

export interface GameSettings {
  boardSize: number;
  winLength: number;
  obstacles: boolean;
  variant: GameVariant;
  difficulty: Difficulty;
  blitzMode?: boolean;
  blitzDuration?: number; // in seconds
  // New Settings
  startingPlayer?: 'X' | 'O' | 'random';
  turnDuration?: number; // in seconds, default 30
  powerUps?: boolean; // default true
  // Helper for persistence
  winReason?: 'standard' | 'forfeit' | 'timeout' | 'disconnect';
}

export interface AppPreferences {
    lowPerformance: boolean;
    showCoordinates: boolean;
    haptics: boolean;
    notifyInGame: boolean;
    mutedConversations?: { [key: string]: number };
    snoozeUntil?: number | null;
    // New Granular Settings
    notifyOnFriendRequest: boolean;
    notifyOnChat: boolean;
    notifyOnSystem: boolean;
    lastRoomId?: string | null;
}

export interface GameHistory {
    board: BoardState;
    currentPlayer: Player;
}

export type PowerUp = 'hint' | 'undo' | 'destroy' | 'wall' | 'double' | 'convert';

export interface PowerUps {
    [Player.X]: { [key in PowerUp]?: boolean };
    [Player.O]: { [key in PowerUp]?: boolean };
}

export interface Streaks {
    [GameMode.AI]: { [Player.X]: number };
    [GameMode.LOCAL]: { [Player.X]: number; [Player.O]: number; };
}

export enum Theme {
    LIGHT = 'light',
    DARK = 'dark'
}

export interface AppContextType {
    theme: Theme;
    toggleTheme: () => void;
    goHome: () => void;
    soundEnabled: boolean;
    toggleSound: () => void;
    preferences: AppPreferences;
    updatePreferences: (prefs: Partial<AppPreferences>) => void;
    coins: number;
    refreshCoins: () => void;
    equippedSkin: string;
    equippedTheme: string;
    refreshUser: () => void;
    watchReplayById: (matchId: string) => Promise<void>;
}

// Types for AI
export interface MoveAnalysis {
  move: number;
  reason: string;
}

// Types for Match History & Replays
export interface Move {
    id?: string; 
    player: Player;
    index: number;
    moveNumber?: number;
}

export interface XpReport {
  base: number;
  win: number;
  elo: number;
  efficiency: number;
  flawless: number;
  comeback: number;
  difficulty: number;
  gridSize: number;
  winLength: number;
  obstacles: number;
  variant: number;
  total: number;
  coinChange?: number;
}


export interface MatchRecord {
    id: string;
    gameMode: GameMode;
    winner: Player | 'draw' | null;
    date: string; // ISO string
    moves: Move[];
    gameSettings: GameSettings;
    initialBoard: BoardState;
    userId: string;
    user?: User;
    opponentName?: string; 
    playerRole?: Player;
    winReason?: 'standard' | 'forfeit' | 'timeout' | 'disconnect';
    xpReport?: XpReport;
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string; // emoji or icon name
}

export interface Clan {
    id: string;
    name: string;
    tag: string;
    ownerId: string;
    members: User[];
}

export interface PendingGift {
    id: string;
    senderId: string;
    senderName: string;
    amount: number;
    timestamp: number;
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
  };
  friendCode?: string;
  status?: 'ONLINE' | 'IN_GAME' | 'OFFLINE' | 'WAITING'; // WAITING means in lobby
  clanId?: string;
  clan?: Clan;
  isGuest?: boolean;
}

export interface RivalryStats {
    wins: number;
    losses: number;
    draws: number;
    lastMatch?: string; // Date
}

export interface Friendship {
    id: string;
    senderId: string;
    receiverId: string;
    status: 'PENDING' | 'ACCEPTED';
    sender?: User;
    receiver?: User;
    createdAt: string;
    senderLastGiftAt?: string;
    receiverLastGiftAt?: string;
    // Client-side populated
    rivalry?: RivalryStats;
}

export interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  deleteAccount: () => Promise<void>;
  changePassword?: (current: string, newPass: string) => Promise<void>;
  reloadUser?: () => Promise<void>;
}

// Types for Online Play
export type PlayerRole = Player.X | Player.O | 'spectator';

export interface PlayerSeat {
    user: User;
    role: PlayerRole;
    connected: boolean;
}

export type RoomStatus = 'waiting' | 'ready' | 'playing' | 'finished' | 'confirming_wager';

export interface Room {
    id: string;
    status: RoomStatus;
    players: PlayerSeat[];
    initialBoard: BoardState;
    board: BoardState;
    moves: Move[];
    chat: ChatMessage[];
    currentPlayer: Player;
    winner: Player | 'draw' | null;
    winningLine: WinningLine | null;
    gameSettings: GameSettings;
    hostId: string;
    rematchRequested: { [key in Player]?: boolean };
    // Blitz specific
    timeRemaining?: { [key in Player]: number }; 
    lastMoveTime?: number;
    winReason?: 'standard' | 'forfeit' | 'timeout' | 'disconnect';
    participants?: { [key in Player]?: User };
    // Pause Logic
    isPaused?: boolean;
    pausedAt?: number;
    // Wager System
    pot: number;
    wagerConfirmed: { [key in Player]?: boolean };
    anteAmount?: number;
    isAuraSurge?: boolean;
    doubleDown?: {
        offering: Player;
    };
    lastPotBonus?: {
        amount: number;
        reason: string;
        key: string;
    };
    xpReport?: { [key in Player]?: XpReport };
}

export interface ChatMessage {
    id: string;
    senderId?: string;
    senderName?: string;
    senderAvatar?: string;
    text: string;
    timestamp: number;
    type: 'user' | 'system';
    channel?: 'game' | 'lobby' | 'dm';
    recipientId?: string;
    replyTo?: {
        id: string;
        senderName: string;
        text: string;
    };
    reactions?: { [emoji: string]: string[] }; // emoji -> user displayNames
    editedAt?: number;
    deleted?: boolean;
    readBy?: { [userId: string]: number }; // userId -> timestamp
    replayData?: {
        matchId: string;
        winner: Player | 'draw' | null;
        opponentName: string;
        userRole: Player;
    };
    giftData?: {
        amount: number;
    };
    stickerId?: string;
}

export interface TriviaQuestion {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

export interface TriviaState {
    lastPlayed: string; // ISO date YYYY-MM-DD
}

export interface ServerToClientEvents {
    roomUpdate: (room: Room) => void;
    rematchOffer: (data: { from: Player }) => void;
    rematchDeclined: () => void;
    gameReset: (room: Room) => void;
    roomsList: (rooms: Room[]) => void; // For spectator lobby
    friendStatus: (data: { userId: string, status: 'ONLINE' | 'IN_GAME' | 'OFFLINE' | 'WAITING' }) => void;
    inviteReceived: (data: { hostName: string, roomId: string }) => void;
    emote: (data: { senderId: string, emoji: string }) => void;
    // New Chat Events
    chatMessage: (msg: ChatMessage) => void;
    lobbyChatMessage: (msg: ChatMessage) => void;
    directMessage: (msg: ChatMessage) => void;
    messageUpdated: (data: { channel: string, targetId: string, message: ChatMessage }) => void;
    messageDeleted: (data: { channel: string, targetId: string, messageId: string }) => void;
    reactionUpdate: (data: { channel: string, targetId: string, messageId: string, reactions: ChatMessage['reactions'] }) => void;
    messagesRead: (data: { conversationPartnerId: string, readByUserId: string, readAt: number }) => void;

    // Typing Events
    userTyping: (data: { userId: string, displayName: string, channel: 'game' | 'lobby' | 'dm', roomId?: string }) => void;
    userStoppedTyping: (data: { userId: string, channel: 'game' | 'lobby' | 'dm', roomId?: string }) => void;
    // Friend Request Events
    friendRequestReceived: (data: { requestId: string, sender: { id: string, displayName: string, avatar: string } }) => void;
    friendRequestResponse: (data: { message: string, type: 'accept' | 'reject' }) => void;
    // Notification event
    newNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    // Progression Events
    masteryUnlocked: (data: { name: string, description: string, icon: string }) => void;
    matchCancelled: (data: { reason: string }) => void;
    walletUpdate: (data: { newBalance: number }) => void;
}

export type WagerTier = 'bronze' | 'silver' | 'gold';

export interface ClientToServerEvents {
    createRoom: (
        data: { settings: Partial<GameSettings>, wagerTier: WagerTier },
        callback: (response: { success: boolean; roomId?: string; error?: string }) => void
    ) => void;
    joinRoom: (
        roomId: string,
        options: { asSpectator?: boolean },
        callback: (response: { success: boolean; error?: string }) => void
    ) => void;
    leaveRoom: (roomId: string) => void;
    makeMove: (
        data: { roomId: string; index: number },
        callback: (response: { success: boolean; error?: string }) => void
    ) => void;
    requestRematch: (roomId: string) => void;
    declineRematch: (roomId: string) => void;
    getRooms: () => void; // Request active rooms list
    startGame: (roomId: string) => void;
    sendInvite: (friendId: string, roomId: string) => void;
    sendEmote: (data: { roomId: string, emoji: string }) => void;
    // New Chat Events
    sendChat: (data: { roomId: string, text: string, replyTo?: any, stickerId?: string }) => void;
    joinLobby: () => void;
    leaveLobby: () => void;
    sendLobbyChat: (data: { text: string, replyTo?: any, stickerId?: string }) => void;
    sendDirectMessage: (data: { toUserId: string, text: string, replyTo?: any, replayData?: any, stickerId?: string }) => void;
    editMessage: (data: { channel: 'dm' | 'game', targetId: string, messageId: string, newText: string }) => void;
    deleteMessage: (data: { channel: 'dm' | 'game', targetId: string, messageId: string }) => void;
    sendReaction: (data: { channel: 'dm' | 'game', targetId: string, messageId: string, emoji: string }) => void;
    markConversationAsRead: (partnerId: string) => void;

    // Typing Events
    typing: (data: { channel: 'game' | 'lobby' | 'dm', roomId?: string, toUserId?: string }) => void;
    stopTyping: (data: { channel: 'game' | 'lobby' | 'dm', roomId?: string, toUserId?: string }) => void;
    requestFriendStatuses: () => void;
    // Wager System
    confirmWager: (roomId: string) => void;
    doubleDownRequest: (roomId: string) => void;
    doubleDownResponse: (roomId: string, accepted: boolean) => void;
    // Timeout
    claimTimeout: (roomId: string) => void;
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// --- New Types for Campaign & Progression ---

export interface Quest {
    id: string;
    description: string;
    target: number;
    current: number;
    reward: number;
    completed: boolean;
    claimed: boolean;
    type: 'win' | 'play' | 'destroy' | 'wall' | 'double' | 'convert';
    templateId?: string; // To track duplicates
}

export interface CampaignLevel {
    id: number;
    name: string;
    description: string;
    bossName: string;
    bossAvatar: string; // avatar-id
    settings: GameSettings;
    rewardCoins: number;
    isUnlocked: boolean;
    isCompleted: boolean;
    stars: number; // 0-3
}

export interface ShopItem {
    id: string;
    name: string;
    type: 'avatar' | 'theme' | 'skin' | 'powerup';
    cost?: number; // Optional for prestige items
    assetId: string; // e.g., 'avatar-5' or 'powerup-destroy'
    owned: boolean;
    description?: string;
    colors?: string[]; // For theme preview [X, O, BG]
    bgGradient?: string; // Global background gradient for the theme
}

export interface CampaignProgress {
    [levelId: string]: { stars: number };
}

export interface UserProgress {
    coins: number;
    inventory: string[]; // List of owned Item IDs
    campaignLevel: number; // Max level unlocked
    campaignProgress: CampaignProgress;
    quests: Quest[];
    lastQuestGeneration: string; // ISO Date
    rerollsRemaining: number;
}

export interface Notification {
    id: string;
    type: 'chat' | 'friend_request' | 'system' | 'gift' | 'match_result';
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    data?: {
        senderId?: string;
        senderAvatar?: string;
        requestId?: string;
        sender?: { id: string; displayName: string; avatar: string };
        messageData?: ChatMessage;
        matchId?: string;
        result?: 'win' | 'loss' | 'draw';
        opponentName?: string;
        eloChange?: number;
        coinChange?: number;
        // FIX: Add giftId and amount to data payload for gift notifications
        giftId?: string;
        amount?: number;
        senderName?: string;
    };
}

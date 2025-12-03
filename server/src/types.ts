

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
  blitzDuration?: number;
  // New Settings
  startingPlayer?: 'X' | 'O' | 'random';
  turnDuration?: number;
  powerUps?: boolean;
  // Store win reason here for persistence compatibility
  winReason?: 'standard' | 'forfeit' | 'timeout' | 'disconnect';
}

export interface Move {
    id?: string; 
    player: Player;
    index: number;
    moveNumber?: number;
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
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
    gameMode: string;
    winner: Player | 'draw' | null;
    userId: string;
    opponentName?: string;
    gameSettings: GameSettings;
    initialBoard: BoardState;
    playerRole: Player;
    moves: Move[];
    date?: string;
    winReason?: 'standard' | 'forfeit' | 'timeout' | 'disconnect';
    xpReport?: XpReport;
}

export interface Quest {
    id: string;
    description: string;
    target: number;
    current: number;
    reward: number;
    completed: boolean;
    claimed: boolean;
    type: 'win' | 'play' | 'destroy' | 'wall' | 'double' | 'convert';
    templateId?: string;
}

export interface PendingGift {
    id: string;
    senderId: string;
    senderName: string;
    amount: number;
    timestamp: number;
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
  theme: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  badges: string[];
  
  // Progress
  xp: number;
  level: number;
  winStreak: number;
  coins: number;
  campaignLevel: number;
  inventory: string[];
  questData?: any; 
  
  // New
  campaignProgress?: any;
  equippedTheme: string;
  equippedSkin: string;
  friendCode?: string;
  status?: 'ONLINE' | 'IN_GAME' | 'OFFLINE' | 'WAITING';
  clanId?: string;
  clan?: Clan;
  preferences?: any;
}

export interface Friendship {
    id: string;
    senderId: string;
    receiverId: string;
    status: 'PENDING' | 'ACCEPTED';
    sender?: User;
    receiver?: User;
    senderLastGiftAt?: string;
    receiverLastGiftAt?: string;
}

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
    reactions?: { [emoji: string]: string[] }; // emoji -> userIds
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

export type WagerTier = 'bronze' | 'silver' | 'gold';

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
    };
}

export type NotificationPayload = Omit<Notification, 'id' | 'timestamp' | 'read'>;

export interface ServerToClientEvents {
    roomUpdate: (room: Room) => void;
    rematchOffer: (data: { from: Player }) => void;
    rematchDeclined: () => void;
    gameReset: (room: Room) => void;
    roomsList: (rooms: Room[]) => void;
    friendStatus: (data: { userId: string, status: 'ONLINE' | 'IN_GAME' | 'OFFLINE' | 'WAITING' }) => void;
    inviteReceived: (data: { hostName: string, roomId: string }) => void;
    emote: (data: { senderId: string, emoji: string }) => void;
    
    // Chat Events
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
    friendRequestReceived: (data: { requestId: string, sender: { id: string, displayName: string, avatar: string } }) => void;
    friendRequestResponse: (data: { message: string, type: 'accept' | 'reject' }) => void;
    // Progression Events
    masteryUnlocked: (data: { name: string, description: string, icon: string }) => void;
    newNotification: (notification: NotificationPayload) => void;
    walletUpdate: (data: { newBalance: number }) => void;
    matchCancelled: (data: { reason: string }) => void;
}

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
    getRooms: () => void;
    startGame: (roomId: string) => void;
    sendInvite: (friendId: string, roomId: string) => void;
    sendEmote: (data: { roomId: string, emoji: string }) => void;

    // Chat Events
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
    claimTimeout: (roomId: string) => void;
}

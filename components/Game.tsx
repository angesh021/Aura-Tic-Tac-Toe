
import React, { useState, useEffect, useCallback, useMemo, useContext, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BoardState, GameMode, Player, Move, GameSettings, GameVariant, Room, PlayerSeat, PowerUps, PowerUp, CampaignLevel, Difficulty, User, ChatMessage, MatchRecord, PlayerRole } from '../types';
import { checkWinner, findWinningMove } from '../utils/gameLogic';
import { findBestMove } from '../services/ai';
import { saveMatch } from '../services/history';
import Board from './Board';
import { AppContext } from '../contexts/AppContext';
import { AuthContext } from '../contexts/AuthContext';
import { CloseIcon, CopyIcon, GridIcon, TrophyIcon, ObstacleIcon, SkullIcon, CheckIcon, ClockIcon, EyeIcon, LightningIcon, LinkIcon, UndoIcon, HintIcon, BombIcon, ShieldIcon, LogoutIcon, MapIcon, DoubleIcon, ConvertIcon, XIcon, OIcon, PauseIcon, CoinIcon, GiftIcon, UserIcon } from './Icons';
import { onlineService } from '../services/online';
import { UserAvatar } from './Avatars';
import Tooltip from './Tooltip';
import { useToast } from '../contexts/ToastContext';
import GameSummary from './GameSummary';
import { progressService, CAMPAIGN_LEVELS } from '../services/progress';
import { getRank } from '../utils/badgeData';
import { useSounds } from '../hooks/useSounds';
import { getAuraTaunt } from '../services/genai';
import Modal from './Modal';
import GameStartCountdown from './GameStartCountdown';
import EmojiBar from './EmojiBar';
import AuthScreen from './AuthScreen';
import { useGameStore } from '../stores/gameStore';

// --- Internal Components (Badge, PlayerInfoPanel, MobilePlayerInfo, WaitingRoom) omitted for brevity as they haven't changed ---
// Including simplified versions for context or assuming they are imported if moved to separate files.
// For this response, I'll include the necessary parts.

const Badge = ({ text, icon, color, tooltip }: { text: string, icon?: React.ReactNode, color: string, tooltip?: string }) => {
    const colorClasses: {[key: string]: string} = {
        blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        gray: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
        yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        red: 'bg-red-500/10 text-red-500 border-red-500/20',
        orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        pink: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    };
    
    const content = (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold whitespace-nowrap ${colorClasses[color] || colorClasses.gray}`}>
            {icon}
            <span>{text}</span>
        </div>
    );

    if (tooltip) {
        return <Tooltip text={tooltip}>{content}</Tooltip>;
    }
    return content;
};

const PlayerInfoPanel = ({ seat, fallbackName, role, isActive, label, avatarId, frameId, elo, currentEmote, onGift }: { seat?: PlayerSeat, fallbackName: string, role: Player, isActive: boolean, label: string, avatarId: string, frameId?: string, elo?: number, currentEmote?: string, onGift?: () => void }) => {
    const isConnected = seat ? seat.connected : true;
    const rank = elo !== undefined ? getRank(elo) : null;
    
    let statusText = "PLAYING";
    if (label === "YOU") statusText = "YOUR TURN";
    else if (label === "AURA AI" || label === "BOSS") statusText = "THINKING...";
    
    return (
        <div className={`relative p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center w-32 md:w-40 mt-8
            ${isActive 
                ? (role === Player.X ? 'bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]' : 'bg-pink-500/10 border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.15)]')
                : 'bg-white/5 border-white/5 opacity-80 grayscale-[0.5]'
            }
        `}>
            {isActive && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 animate-bounce w-max">
                    <div className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-lg border flex items-center justify-center gap-1
                        ${role === Player.X ? 'bg-cyan-500 text-gray-900 border-cyan-400' : 'bg-pink-500 text-white border-pink-400'}
                    `}>
                        {statusText}
                    </div>
                    <div className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] mx-auto -mt-[1px]
                        ${role === Player.X ? 'border-t-cyan-500' : 'border-t-pink-500'}
                    `}></div>
                </div>
            )}

            <div className={`absolute -top-3 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border
                ${role === Player.X ? 'bg-cyan-900 text-cyan-400 border-cyan-900' : 'bg-pink-900 text-pink-400 border-pink-900'}
            `}>
                {label}
            </div>

            <div className="relative mb-3 group">
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full p-1 border-2 ${role === Player.X ? 'border-cyan-500' : 'border-pink-500'} overflow-hidden`}>
                    <UserAvatar avatarId={avatarId} frameId={frameId} className="w-full h-full rounded-full" />
                </div>
                {!isConnected && (
                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <span className="text-[10px] font-bold text-red-500 uppercase">Offline</span>
                    </div>
                )}
                
                {onGift && (
                    <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer backdrop-blur-sm" onClick={onGift}>
                        <GiftIcon className="w-6 h-6 text-yellow-400 drop-shadow-md" />
                    </div>
                )}

                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center text-xs shadow-md">
                    {role === Player.X ? <XIcon className="w-3 h-3 text-cyan-400" /> : <OIcon className="w-3 h-3 text-pink-400" />}
                </div>
                
                <AnimatePresence>
                    {currentEmote && (
                        <motion.div 
                            initial={{ opacity: 0, y: 0, scale: 0.5 }}
                            animate={{ opacity: 1, y: -60, scale: 2 }}
                            exit={{ opacity: 0, y: -80, scale: 1.5 }}
                            transition={{ duration: 2, ease: "easeOut" }}
                            className="absolute top-0 left-1/2 -translate-x-1/2 text-5xl pointer-events-none z-50 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"
                        >
                            {currentEmote}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="text-center w-full">
                <div className="font-bold text-sm md:text-base truncate w-full px-1">{seat?.user.displayName || fallbackName}</div>
                {rank ? (
                    <div className="flex flex-col items-center mt-1">
                        <div className={`text-[10px] font-bold ${rank.color} flex items-center gap-1`}>
                            <span>{rank.icon}</span>
                            <span>{rank.name}</span>
                        </div>
                        <div className="text-[9px] font-mono text-gray-500">ELO {elo}</div>
                    </div>
                ) : (
                    elo !== undefined && <div className="text-[10px] font-mono text-gray-500">ELO {elo}</div>
                )}
            </div>
        </div>
    );
};

const MobilePlayerInfo = ({ player, isActive, seat, fallbackName, avatarId, frameId, blitzTime, label, currentEmote }: { player: Player, isActive: boolean, seat?: PlayerSeat, fallbackName: string, avatarId: string, frameId?: string, blitzTime?: string, label: string, currentEmote?: string }) => {
    let statusText = "PLAYING";
    if (label === "YOU") statusText = "YOUR TURN";
    else if (label === "AURA AI" || label === "BOSS") statusText = "THINKING...";

    return (
        <div className={`flex items-center gap-2 relative transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-60 grayscale'}`}>
            {isActive && (
                 <div className="absolute -top-5 left-0 w-full flex justify-center z-20">
                     <div className={`text-[8px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wider shadow-sm animate-pulse whitespace-nowrap ${player === Player.X ? 'bg-cyan-500 text-black' : 'bg-pink-500 text-white'}`}>
                        {statusText}
                     </div>
                 </div>
            )}
            <div className="relative">
                <div className={`relative w-8 h-8 rounded-full border ${player === Player.X ? 'border-cyan-500' : 'border-pink-500'} overflow-hidden bg-black/20`}>
                    <UserAvatar avatarId={avatarId} frameId={frameId} className="w-full h-full" />
                </div>
                <AnimatePresence>
                    {currentEmote && (
                        <motion.div 
                            initial={{ opacity: 0, y: 0, scale: 0.5 }}
                            animate={{ opacity: 1, y: 30, scale: 2 }} 
                            exit={{ opacity: 0, y: 40, scale: 1.5 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="absolute top-full left-1/2 -translate-x-1/2 text-4xl z-50 pointer-events-none drop-shadow-md"
                        >
                            {currentEmote}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <div className="flex flex-col">
                <span className={`text-xs font-bold max-w-[80px] truncate ${player === Player.X ? 'text-cyan-400' : 'text-pink-400'}`}>
                    {seat?.user.displayName || fallbackName}
                </span>
                {blitzTime && <span className="text-[10px] font-mono text-white">{blitzTime}</span>}
            </div>
        </div>
    );
};

const WaitingRoom = ({ roomId, settings, players, hostId, currentUserId, onStart, onCancel, isSpectator }: { roomId: string, settings: GameSettings, players: PlayerSeat[], hostId: string, currentUserId: string, onStart: () => void, onCancel: () => void, isSpectator: boolean }) => {
    const isHost = hostId === currentUserId;
    const activePlayers = players.filter(p => p.role !== 'spectator');
    const spectatorCount = players.filter(p => p.role === 'spectator').length;
    const readyToStart = activePlayers.length === 2;
    const toast = useToast();

    const copyToClipboard = (text: string, message: string) => {
        navigator.clipboard.writeText(text);
        toast.success(message);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg mx-auto p-8 bg-[#0f172a]/95 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
        >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"></div>

            <div className="mb-8 w-full">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-[0.25em] mb-4">Room Code</div>
                
                <motion.div 
                    onClick={() => copyToClipboard(roomId, "Room Code copied!")}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative group cursor-pointer mb-6"
                >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                    <div className="relative flex items-center justify-between bg-[#1e293b] border border-white/10 p-4 sm:p-5 rounded-xl hover:bg-[#253045] transition-colors">
                        <div className="flex-1 text-center pl-8">
                            <span className="text-5xl sm:text-6xl font-mono font-black text-white tracking-[0.15em] drop-shadow-sm">
                                {roomId}
                            </span>
                        </div>
                        <div className="p-3 bg-white/5 rounded-lg text-gray-400 group-hover:text-white group-hover:bg-white/10 transition-all border border-white/5 shrink-0">
                            <CopyIcon className="w-6 h-6" />
                        </div>
                    </div>
                </motion.div>

                <div className={`grid gap-3 w-full mb-6 ${!isSpectator ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {!isSpectator && (
                        <button 
                            onClick={() => copyToClipboard(`${window.location.origin}?room=${roomId}`, "Player Invite Link Copied!")}
                            className="flex items-center justify-center gap-2 p-3.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] group"
                        >
                            <LinkIcon className="w-5 h-5 group-hover:text-cyan-200" />
                            <span className="font-bold text-sm">Copy Player Link</span>
                        </button>
                    )}

                    <button 
                        onClick={() => copyToClipboard(`${window.location.origin}?spectate=${roomId}`, "Spectator Link Copied!")}
                        className={`flex items-center justify-center gap-2 p-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] group ${
                            isSpectator 
                            ? 'bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 text-yellow-300' 
                            : 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white'
                        }`}
                    >
                        <EyeIcon className="w-5 h-5 group-hover:text-white" />
                        <span className="font-bold text-sm">Copy Spectate Link</span>
                    </button>
                </div>

                <div className="flex gap-2 justify-center flex-wrap">
                    <span className="px-3 py-1 rounded-full bg-white/5 text-xs font-medium text-gray-400 border border-white/5">{settings.boardSize}x{settings.boardSize}</span>
                    <span className="px-3 py-1 rounded-full bg-white/5 text-xs font-medium text-gray-400 border border-white/5">Match {settings.winLength}</span>
                    {settings.blitzMode && <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold flex items-center gap-1"><ClockIcon className="w-3 h-3"/> Blitz</span>}
                </div>
                
                {spectatorCount > 0 && (
                    <div className="flex justify-center mt-3">
                        <div className="flex items-center gap-2 text-gray-400 text-xs font-medium bg-black/20 px-3 py-1 rounded-full border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
                            <EyeIcon className="w-3 h-3" />
                            <span>{spectatorCount} Watching</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="w-full space-y-3 mb-8">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                            <XIcon className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div className="text-left">
                            <div className="text-xs font-bold text-cyan-500 uppercase tracking-wider mb-0.5">Player 1</div>
                            <div className="font-bold text-white text-lg">{activePlayers.find(p => p.role === Player.X)?.user.displayName || 'Waiting...'}</div>
                        </div>
                    </div>
                    {activePlayers.find(p => p.role === Player.X) && <CheckIcon className="w-6 h-6 text-green-500" />}
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center border border-pink-500/30">
                            <OIcon className="w-6 h-6 text-pink-400" />
                        </div>
                        <div className="text-left">
                            <div className="text-xs font-bold text-pink-500 uppercase tracking-wider mb-0.5">Player 2</div>
                            <div className="font-bold text-white text-lg">{activePlayers.find(p => p.role === Player.O)?.user.displayName || 'Waiting...'}</div>
                        </div>
                    </div>
                    {activePlayers.find(p => p.role === Player.O) ? <CheckIcon className="w-6 h-6 text-green-500" /> : <div className="animate-pulse text-xs text-gray-500 font-medium">Scanning...</div>}
                </div>
            </div>

            {isSpectator && (
                <div className="mb-6 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm font-medium">
                    You are spectating this match.
                </div>
            )}

            <div className="flex gap-4 w-full">
                <button 
                    onClick={onCancel}
                    className="flex-1 py-4 rounded-2xl font-bold text-gray-400 hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                >
                    Leave
                </button>
                {isHost && (
                    <button 
                        onClick={onStart}
                        disabled={!readyToStart}
                        className={`flex-1 py-4 rounded-2xl font-bold text-white transition-all shadow-lg
                            ${readyToStart 
                                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/20' 
                                : 'bg-gray-800 cursor-not-allowed opacity-50 border border-white/5'
                            }
                        `}
                    >
                        {readyToStart ? 'Start Game' : 'Waiting...'}
                    </button>
                )}
                {!isHost && !isSpectator && (
                    <div className="flex-1 py-4 rounded-2xl font-bold text-white bg-gray-800 cursor-default opacity-80 flex items-center justify-center gap-3 border border-white/5">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Waiting for Host
                    </div>
                )}
            </div>
        </motion.div>
    );
};

interface GameProps {
  userId: string;
  gameMode: GameMode;
  gameSettings: GameSettings;
  playerNames?: { [key in Player]?: string };
  campaignLevel?: CampaignLevel;
  onNextLevel?: (level: CampaignLevel) => void;
  isGuest?: boolean;
}

const Game: React.FC<GameProps> = ({ userId, gameMode, gameSettings: initialSettings, playerNames, campaignLevel, onNextLevel, isGuest = false }) => {
  const isOnline = gameMode === GameMode.ONLINE;
  // Retrieve room data from store if online
  const storedRoom = useGameStore(state => state.room);
  const onlineRoom = isOnline ? storedRoom : null;
  
  // If online, use settings from the room, otherwise props
  const gameSettings = onlineRoom ? onlineRoom.gameSettings : initialSettings;

  const toast = useToast();
  const context = useContext(AppContext);
  const auth = useContext(AuthContext);
  const playSound = useSounds();

  const { boardSize, winLength, obstacles, variant, difficulty } = gameSettings;
  const TURN_DURATION = gameSettings.turnDuration || 30; 

  const cachedPlayers = useRef<{ [key in Player]?: User }>({});

  useEffect(() => {
      if (onlineRoom) {
          onlineRoom.players.forEach(p => {
              if (p.role === Player.X || p.role === Player.O) {
                  cachedPlayers.current[p.role] = p.user;
              }
          });
      }
  }, [onlineRoom]);

  const createInitialBoard = useCallback(() => {
    const board = Array(boardSize * boardSize).fill(null);
    if (obstacles) {
      let obstacleCount = Math.max(1, Math.floor(boardSize * boardSize / 10));
      while (obstacleCount > 0) {
        const index = Math.floor(Math.random() * board.length);
        if (board[index] === null) {
          board[index] = 'OBSTACLE';
          obstacleCount--;
        }
      }
    }
    return board;
  }, [boardSize, obstacles]);

  const getInitialPowerUps = useCallback(() => {
      if (gameSettings.powerUps === false) return { [Player.X]: {}, [Player.O]: {} };
      if (gameMode === GameMode.LOCAL) {
          const fullSet = { undo: true, hint: true, destroy: true, wall: true, double: true, convert: true };
          return { [Player.X]: { ...fullSet }, [Player.O]: { ...fullSet } };
      }
      const inv = auth?.currentUser?.inventory || [];
      const isGuestUser = auth?.currentUser?.isGuest || isGuest;
      const hasDestroy = inv.includes('powerup-destroy') || isGuestUser;
      const hasWall = inv.includes('powerup-wall') || isGuestUser;
      const hasDouble = inv.includes('powerup-double') || isGuestUser;
      const hasConvert = inv.includes('powerup-convert') || isGuestUser;

      const playerSet = { undo: true, hint: true, destroy: hasDestroy, wall: hasWall, double: hasDouble, convert: hasConvert };
      return { [Player.X]: playerSet, [Player.O]: playerSet };
  }, [gameMode, auth?.currentUser, gameSettings.powerUps, isGuest]);

  const [board, setBoard] = useState<BoardState>(isOnline && onlineRoom ? onlineRoom.board : createInitialBoard());
  
  const [currentPlayer, setCurrentPlayer] = useState<Player>(() => {
      if (isOnline && onlineRoom) return onlineRoom.currentPlayer;
      if (gameSettings.startingPlayer === 'O') return Player.O;
      if (gameSettings.startingPlayer === 'random') return Math.random() < 0.5 ? Player.X : Player.O;
      return Player.X;
  });

  const [winner, setWinner] = useState<Player | 'draw' | null>(isOnline && onlineRoom ? onlineRoom.winner : null);
  const [winningLine, setWinningLine] = useState<number[] | null>(isOnline && onlineRoom ? onlineRoom.winningLine : null);
  const [winReason, setWinReason] = useState<'standard' | 'forfeit' | 'timeout' | 'disconnect' | undefined>(isOnline && onlineRoom ? onlineRoom.winReason : undefined);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [moves, setMoves] = useState<Move[]>(isOnline && onlineRoom ? onlineRoom.moves : []);
  const [initialBoard, setInitialBoard] = useState<BoardState>(isOnline && onlineRoom ? onlineRoom.initialBoard : board);
  
  const [powerUps, setPowerUps] = useState<PowerUps>(getInitialPowerUps());
  const [activePowerUp, setActivePowerUp] = useState<PowerUp | null>(null);
  const [hintedSquare, setHintedSquare] = useState<number | null>(null);
  
  const [turnTimer, setTurnTimer] = useState(TURN_DURATION);
  const [blitzTimers, setBlitzTimers] = useState<{ [key in Player]: number }>({
      [Player.X]: gameSettings.blitzDuration || 180,
      [Player.O]: gameSettings.blitzDuration || 180
  });
  
  const [aiTaunt, setAiTaunt] = useState<string>("");
  const [usedTaunts, setUsedTaunts] = useState<string[]>([]);
  const lastTauntTimeRef = useRef<number>(0);
  const [savedMatch, setSavedMatch] = useState<MatchRecord | null>(null);

  const [emotes, setEmotes] = useState<{ [playerId: string]: string }>({});
  
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const prevStatusRef = useRef<string | null>(onlineRoom?.status || null);

  const mySeat = useMemo(() => onlineRoom?.players.find(p => p.user.id === userId), [onlineRoom, userId]);
  const isSpectator = !!(isOnline && (mySeat?.role === 'spectator' || auth?.currentUser?.isGuest || isGuest));
  const isMyTurnOnline = isOnline && onlineRoom && mySeat?.role === onlineRoom.currentPlayer && !onlineRoom.winner && onlineRoom.status === 'playing';
  const myRole = mySeat?.role;
  
  const spectatorCount = useMemo(() => {
      if (!isOnline || !onlineRoom) return 0;
      return onlineRoom.players.filter(p => p.role === 'spectator').length;
  }, [isOnline, onlineRoom]);

  const opponentSeat = useMemo(() => {
      if (!isOnline) return null;
      return onlineRoom?.players.find(p => p.role !== 'spectator' && p.user.id !== userId);
  }, [isOnline, onlineRoom, userId]);

  const opponentDisconnected = isOnline && opponentSeat && !opponentSeat.connected && !winner;
  const isPaused = isOnline && !!onlineRoom?.isPaused;

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const getPlayerName = useCallback((player: Player) => {
      if (isOnline && onlineRoom) {
           const seat = onlineRoom.players.find(p => p.role === player);
           if (seat) return seat.user.displayName;
           
           const participant = onlineRoom.participants?.[player];
           if (participant) return participant.displayName;

           const cached = cachedPlayers.current[player];
           if (cached) return cached.displayName;
           return `Waiting...`;
      }
      if (gameMode === GameMode.CAMPAIGN && campaignLevel && player === Player.O) {
          return campaignLevel.bossName;
      }
      if (gameMode === GameMode.AI) {
          if (player === Player.O) return "Aura (AI)";
          return auth?.currentUser?.displayName || `Player ${player}`;
      }
      return playerNames?.[player] || `Player ${player}`;
  }, [isOnline, onlineRoom, gameMode, playerNames, auth?.currentUser, campaignLevel]);

  const getPlayerAvatar = useCallback((player: Player) => {
      if (isOnline && onlineRoom) {
           const seat = onlineRoom.players.find(p => p.role === player);
           if (seat) return seat.user.avatar;
           
           const participant = onlineRoom.participants?.[player];
           if (participant) return participant.avatar;

           const cached = cachedPlayers.current[player];
           if (cached) return cached.avatar;
           return 'avatar-1';
      }
      if (gameMode === GameMode.CAMPAIGN && campaignLevel && player === Player.O) {
          return campaignLevel.bossAvatar;
      }
      if (gameMode === GameMode.AI || gameMode === GameMode.CAMPAIGN) {
          if (player === Player.O) return 'avatar-8'; 
          return auth?.currentUser?.avatar || 'avatar-1';
      }
      return player === Player.X ? 'avatar-1' : 'avatar-2'; 
  }, [isOnline, onlineRoom, gameMode, auth?.currentUser, campaignLevel]);

  const getPlayerFrame = useCallback((player: Player) => {
      if (isOnline && onlineRoom) {
           const seat = onlineRoom.players.find(p => p.role === player);
           if (seat) return seat.user.questData?.equippedFrame;
           
           const participant = onlineRoom.participants?.[player];
           if (participant) return participant.questData?.equippedFrame;

           const cached = cachedPlayers.current[player];
           if (cached) return cached.questData?.equippedFrame;
           return undefined;
      }
      // For local/AI modes, use the current user's frame if Player X
      if ((gameMode === GameMode.AI || gameMode === GameMode.CAMPAIGN) && player === Player.X) {
          return auth?.currentUser?.questData?.equippedFrame;
      }
      return undefined;
  }, [isOnline, onlineRoom, gameMode, auth?.currentUser]);

  const getPlayerLabel = useCallback((targetRole: Player) => {
      if (isOnline && onlineRoom) {
           const seat = onlineRoom.players.find(p => p.role === targetRole);
           if (seat && seat.user.id === userId) return "YOU";
           const participant = onlineRoom.participants?.[targetRole];
           if (participant && participant.id === userId) return "YOU";

           if (isSpectator) return targetRole === Player.X ? "PLAYER 1" : "PLAYER 2";
           return "OPPONENT";
      }
      if (gameMode === GameMode.CAMPAIGN) {
          return targetRole === Player.O ? "BOSS" : "YOU";
      }
      if (gameMode === GameMode.AI) {
          return targetRole === Player.O ? "AURA AI" : "YOU";
      }
      return targetRole === Player.X ? "PLAYER 1" : "PLAYER 2";
  }, [isOnline, onlineRoom, userId, isSpectator, gameMode]);

  const getPlayerElo = useCallback((player: Player) => {
      if (isOnline && onlineRoom) {
          const seat = onlineRoom.players.find(p => p.role === player);
          if (seat) return seat.user.elo;
          const participant = onlineRoom.participants?.[player];
          if (participant) return participant.elo;
          const cached = cachedPlayers.current[player];
          if (cached) return cached.elo;
          return undefined;
      }
      if (gameMode === GameMode.AI || gameMode === GameMode.CAMPAIGN) {
          if (player === Player.O) {
              const map: Record<string, number> = { [Difficulty.EASY]: 800, [Difficulty.MEDIUM]: 1200, [Difficulty.HARD]: 1600, [Difficulty.BOSS]: 2500 };
              return map[difficulty] || 1200;
          }
          return auth?.currentUser?.elo;
      }
      return undefined;
  }, [isOnline, onlineRoom, gameMode, difficulty, auth?.currentUser]);

  const getPlayerBadges = useCallback((player: Player) => {
      if (isOnline && onlineRoom) {
          const seat = onlineRoom.players.find(p => p.role === player);
          if (seat) return seat.user.badges;
          const participant = onlineRoom.participants?.[player];
          if (participant) return participant.badges;
          const cached = cachedPlayers.current[player];
          if (cached) return cached.badges;
          return undefined;
      }
      if (gameMode === GameMode.AI || gameMode === GameMode.CAMPAIGN) {
          if (player === Player.O) {
              if (difficulty === Difficulty.BOSS) return ['grandmaster', 'sniper', 'marathon'];
              if (difficulty === Difficulty.HARD) return ['veteran', 'first_win'];
              return ['rookie'];
          }
          return auth?.currentUser?.badges;
      }
      return undefined;
  }, [isOnline, onlineRoom, gameMode, difficulty, auth?.currentUser]);
  
  useEffect(() => {
    if (isOnline && onlineRoom) {
      setBoard(onlineRoom.board);
      setCurrentPlayer(onlineRoom.currentPlayer);
      setWinner(onlineRoom.winner);
      setWinningLine(onlineRoom.winningLine);
      setMoves(onlineRoom.moves);
      setInitialBoard(onlineRoom.initialBoard);
      if (onlineRoom.winReason) setWinReason(onlineRoom.winReason);
      if (onlineRoom.timeRemaining) setBlitzTimers(onlineRoom.timeRemaining);
      if (!gameSettings.blitzMode && onlineRoom.lastMoveTime && onlineRoom.status === 'playing' && !onlineRoom.isPaused) {
          const elapsed = Math.floor((Date.now() - onlineRoom.lastMoveTime) / 1000);
          setTurnTimer(Math.max(0, TURN_DURATION - elapsed));
      }
      if (prevStatusRef.current === 'confirming_wager' && onlineRoom.status === 'playing') {
          setShowCountdown(true);
      }
      prevStatusRef.current = onlineRoom.status;
    }
  }, [onlineRoom, isOnline, gameSettings.blitzMode, TURN_DURATION]);
  
  useEffect(() => {
      if (isOnline && gameSettings.blitzMode && !winner && onlineRoom?.status === 'playing' && !onlineRoom?.isPaused) {
          const interval = setInterval(() => {
             setBlitzTimers(prev => {
                 const newTime = { ...prev };
                 if (newTime[currentPlayer] > 0) {
                     newTime[currentPlayer] = Math.max(0, newTime[currentPlayer] - 1);
                 }
                 
                 // Trigger timeout if time runs out
                 if (newTime[currentPlayer] === 0 && !isSpectator && onlineRoom?.id) {
                     onlineService.claimTimeout(onlineRoom.id);
                 }
                 return newTime;
             });
          }, 1000);
          return () => clearInterval(interval);
      }
  }, [isOnline, gameSettings.blitzMode, winner, currentPlayer, onlineRoom?.status, onlineRoom?.isPaused, isSpectator, onlineRoom?.id]);

  useEffect(() => {
      const handleDeclined = () => toast.info("Opponent declined rematch.");
      const handleEmote = ({ senderId, emoji }: { senderId: string, emoji: string }) => {
          setEmotes(prev => ({ ...prev, [senderId]: emoji }));
          setTimeout(() => setEmotes(prev => {
              const newState = { ...prev };
              delete newState[senderId];
              return newState;
          }), 2000);
      };

      if (isOnline) {
          onlineService.onRematchDeclined(handleDeclined);
          onlineService.onEmote(handleEmote);
      }
      return () => {
          if (isOnline) {
              onlineService.cleanupRematchListeners();
              onlineService.offEmote();
          }
      };
  }, [isOnline, toast, onlineRoom?.id]);

  const handleSendEmote = (emoji: string) => {
      if (isOnline && onlineRoom) {
          onlineService.sendEmote(onlineRoom.id, emoji);
      }
  };

  const handleGameOver = useCallback(async (newWinner: Player | 'draw', reason: 'standard' | 'forfeit' | 'timeout' | 'disconnect' = 'standard') => {
    if (winner) return;
    setWinner(newWinner);
    setWinReason(reason);
    
    if (newWinner === 'draw') {
        playSound('draw');
    } else {
        playSound('win');
    }
    
    if (gameMode === GameMode.CAMPAIGN && campaignLevel) {
        if (newWinner === Player.X) {
            progressService.completeLevel(campaignLevel, moves.length + 1); 
            progressService.updateQuestProgress('win');
            toast.success(`Level Cleared!`);
        } else {
            toast.error("Level Failed. Try Again!");
        }
    } else if (!isOnline) {
         if (newWinner === Player.X) progressService.updateQuestProgress('win');
         progressService.updateQuestProgress('play');
    }

    if (gameMode !== GameMode.ONLINE) {
         try {
             const saved = await saveMatch({ 
                 gameMode, 
                 winner: newWinner, 
                 moves, 
                 gameSettings, 
                 initialBoard, 
                 playerRole: Player.X, 
                 opponentName: getPlayerName(Player.O),
                 winReason: reason
             });
             setSavedMatch(saved);
         } catch(e) { console.error("Failed to save match:", e); }
    }
  }, [winner, gameMode, campaignLevel, isOnline, moves, toast, gameSettings, initialBoard, getPlayerName, playSound]);
  
  const handleForfeit = useCallback(() => {
      if (winner) return;
      if (isOnline && onlineRoom) {
          onlineService.leaveRoom(onlineRoom.id);
          context?.goHome();
          return;
      }
      const winnerByForfeit = currentPlayer === Player.X ? Player.O : Player.X;
      handleGameOver(winnerByForfeit, 'forfeit');
      toast.info("Game forfeited.");
  }, [winner, isOnline, currentPlayer, handleGameOver, onlineRoom?.id, context]);
  
  const handleLeaveSpectate = useCallback(() => {
      if (isOnline && onlineRoom) {
          onlineService.leaveRoom(onlineRoom.id);
          context?.goHome();
      }
  }, [isOnline, onlineRoom?.id, context]);

  const handleCopySpectateLink = () => {
      const url = `${window.location.origin}?spectate=${onlineRoom?.id}`;
      navigator.clipboard.writeText(url);
      toast.success("Spectator link copied!");
  };

  // ... (handleUndo, handleHint, PowerUps ... kept as is) ...
  // Re-used logic for powerups
  const handleUndo = useCallback(() => {
      if (isOnline || moves.length === 0 || winner) return;
      if (!powerUps[currentPlayer]?.undo) {
          toast.error("No undo charges left!");
          return;
      }

      playSound('powerup');
      const performUndo = (count: number) => {
          setPowerUps(prev => ({
              ...prev,
              [currentPlayer]: { ...prev[currentPlayer], undo: false }
          }));

          const newBoard = [...board];
          for (let i = 0; i < count; i++) {
               const moveToRemove = moves[moves.length - 1 - i];
               if (moveToRemove) {
                   newBoard[moveToRemove.index] = null;
               }
          }

          setBoard(newBoard);
          const remainingMoves = moves.slice(0, -count);
          setMoves(remainingMoves);
          
          const nextPlayer = count % 2 === 0 ? currentPlayer : (currentPlayer === Player.X ? Player.O : Player.X);
          setCurrentPlayer(nextPlayer);
          setTurnTimer(TURN_DURATION);
      };

      if (gameMode === GameMode.AI || gameMode === GameMode.CAMPAIGN) {
          if (moves.length >= 2) {
              performUndo(2);
              toast.info("Rewind! Last round undone.");
          } else {
              toast.error("Can't undo yet!");
          }
      } else {
          performUndo(1);
          toast.info("Undo used! Last move reverted.");
      }
  }, [board, moves, winner, isOnline, currentPlayer, powerUps, toast, gameMode, TURN_DURATION, playSound]);

  const handleHint = useCallback(() => {
      if (isOnline || winner || !powerUps[currentPlayer]?.hint || isAiThinking) return;
      
      playSound('powerup');
      setPowerUps(prev => ({
          ...prev,
          [currentPlayer]: { ...prev[currentPlayer], hint: false }
      }));

      let hintIndex = findWinningMove(board, currentPlayer, { boardSize, winLength });
      if (hintIndex === null) {
          const opponent = currentPlayer === Player.X ? Player.O : Player.X;
          hintIndex = findWinningMove(board, opponent, { boardSize, winLength });
      }
      if (hintIndex === null) {
           const emptyIndices = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
           if (emptyIndices.length > 0) {
               const center = Math.floor((boardSize * boardSize) / 2);
               hintIndex = board[center] === null ? center : emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
           }
      }
      
      if (hintIndex !== null) {
          setHintedSquare(hintIndex);
          toast.info("Hint revealed!");
          setTimeout(() => setHintedSquare(null), 3000);
      } else {
          toast.error("No clear hints available.");
      }
  }, [board, currentPlayer, isOnline, winner, powerUps, isAiThinking, toast, boardSize, winLength, playSound]);

  const toggleDestroy = useCallback(() => {
      if (isOnline || winner || isAiThinking) return;
      if (!powerUps[currentPlayer]?.destroy) {
          toast.error("Unlock Destroyer in the Shop!");
          return;
      }
      if (activePowerUp === 'destroy') {
          setActivePowerUp(null);
      } else {
          setActivePowerUp('destroy');
          toast.info("Select an opponent's piece to DESTROY!");
      }
  }, [isOnline, winner, powerUps, currentPlayer, isAiThinking, activePowerUp, toast]);

  const toggleWall = useCallback(() => {
      if (isOnline || winner || isAiThinking) return;
      if (!powerUps[currentPlayer]?.wall) {
          toast.error("Unlock Fortify in the Shop!");
          return;
      }
      if (activePowerUp === 'wall') {
          setActivePowerUp(null);
      } else {
          setActivePowerUp('wall');
          toast.info("Select an empty square to place a WALL!");
      }
  }, [isOnline, winner, powerUps, currentPlayer, isAiThinking, activePowerUp, toast]);

  const toggleDouble = useCallback(() => {
      if (isOnline || winner || isAiThinking) return;
      if (!powerUps[currentPlayer]?.double) {
          toast.error("Unlock Double Strike in the Shop!");
          return;
      }
      if (activePowerUp === 'double') {
          setActivePowerUp(null);
      } else {
          setActivePowerUp('double');
          toast.info("Double Strike! Next move won't end your turn.");
      }
  }, [isOnline, winner, powerUps, currentPlayer, isAiThinking, activePowerUp, toast]);

  const toggleConvert = useCallback(() => {
      if (isOnline || winner || isAiThinking) return;
      if (!powerUps[currentPlayer]?.convert) {
          toast.error("Unlock Conversion in the Shop!");
          return;
      }
      if (activePowerUp === 'convert') {
          setActivePowerUp(null);
      } else {
          setActivePowerUp('convert');
          toast.info("Select an opponent's piece to CONVERT!");
      }
  }, [isOnline, winner, powerUps, currentPlayer, isAiThinking, activePowerUp, toast]);

  const handleSquareClick = useCallback(async (index: number) => {
    if (context?.preferences.haptics && navigator.vibrate) navigator.vibrate(10);
    playSound('click');

    if (isOnline && onlineRoom) {
      if (isMyTurnOnline && !opponentDisconnected && !isSpectator && !isPaused) {
        try { await onlineService.makeMove({ roomId: onlineRoom.id, index }); } 
        catch (error: any) { toast.error(error.message || "Failed to send move."); }
      }
      return;
    }
    
    if (winner || isAiThinking) return;

    // Handle Powerup Actions
    if (activePowerUp === 'destroy') {
        if (board[index] !== null && board[index] !== 'OBSTACLE' && board[index] !== currentPlayer) {
            playSound('powerup');
            const newBoard = [...board];
            newBoard[index] = null;
            setBoard(newBoard);
            setPowerUps(prev => ({...prev, [currentPlayer]: {...prev[currentPlayer], destroy: false}}));
            setActivePowerUp(null);
            setCurrentPlayer(currentPlayer === Player.X ? Player.O : Player.X);
            setTurnTimer(TURN_DURATION);
            toast.success("Piece destroyed!");
            progressService.updateQuestProgress('destroy');
        } else {
            toast.error("Select an opponent's piece!");
        }
        return;
    }

    if (activePowerUp === 'convert') {
        if (board[index] !== null && board[index] !== 'OBSTACLE' && board[index] !== currentPlayer) {
            playSound('powerup');
            const newBoard = [...board];
            newBoard[index] = currentPlayer; // Convert to own piece
            setBoard(newBoard);
            setPowerUps(prev => ({...prev, [currentPlayer]: {...prev[currentPlayer], convert: false}}));
            setActivePowerUp(null);
            
            // Count as a move in history? Maybe, but keeping it simple for now
            setCurrentPlayer(currentPlayer === Player.X ? Player.O : Player.X);
            setTurnTimer(TURN_DURATION);
            toast.success("Converted!");
            progressService.updateQuestProgress('convert');
        } else {
            toast.error("Select an opponent's piece!");
        }
        return;
    }

    if (activePowerUp === 'wall') {
        if (board[index] === null) {
            playSound('powerup');
            const newBoard = [...board];
            newBoard[index] = 'OBSTACLE';
            setBoard(newBoard);
            setPowerUps(prev => ({...prev, [currentPlayer]: {...prev[currentPlayer], wall: false}}));
            setActivePowerUp(null);
            setMoves([...moves, { player: currentPlayer, index }]); 
            setCurrentPlayer(currentPlayer === Player.X ? Player.O : Player.X);
            setTurnTimer(TURN_DURATION);
            toast.success("Wall placed!");
            progressService.updateQuestProgress('wall');
        } else {
            toast.error("Select an empty square!");
        }
        return;
    }

    // Standard Move
    if (board[index]) return;

    if (hintedSquare !== null) setHintedSquare(null);
    if ((gameMode === GameMode.AI || gameMode === GameMode.CAMPAIGN) && currentPlayer === Player.X) setAiTaunt(""); 

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);
    setMoves([...moves, { player: currentPlayer, index }]);
    
    // Play move sound based on player
    if (currentPlayer === Player.X) playSound('placeX');
    else playSound('placeO');

    if (activePowerUp === 'double') {
        // Double Move logic: Consume charge but do NOT switch player
        playSound('powerup');
        setPowerUps(prev => ({...prev, [currentPlayer]: {...prev[currentPlayer], double: false}}));
        setActivePowerUp(null);
        setTurnTimer(TURN_DURATION); // Reset timer for second move
        toast.success("Double Strike! Move again.");
        progressService.updateQuestProgress('double');
        
        // Check winner immediately after first move of double
        const winnerInfo = checkWinner(newBoard, boardSize, winLength);
        if (winnerInfo.winner) {
             // If won on first move, game over, next turn won't happen
        }
    } else {
        setCurrentPlayer(currentPlayer === Player.X ? Player.O : Player.X);
        setTurnTimer(TURN_DURATION);
    }

  }, [board, currentPlayer, winner, isAiThinking, moves, isOnline, isMyTurnOnline, onlineRoom?.id, opponentDisconnected, isSpectator, gameMode, context?.preferences.haptics, hintedSquare, activePowerUp, toast, isPaused, TURN_DURATION, playSound]);

  const resetGame = useCallback(() => {
    if (isOnline) return;
    
    const newBoard = createInitialBoard();
    setBoard(newBoard);
    setInitialBoard(newBoard);
    
    let nextStart = Player.X;
    if (gameSettings.startingPlayer === 'O') nextStart = Player.O;
    else if (gameSettings.startingPlayer === 'random') nextStart = Math.random() < 0.5 ? Player.X : Player.O;
    setCurrentPlayer(nextStart);

    setWinner(null);
    setWinningLine(null);
    setMoves([]);
    setTurnTimer(TURN_DURATION);
    setAiTaunt("");
    setUsedTaunts([]); 
    setWinReason(undefined);
    setSavedMatch(null);
    
    setPowerUps(getInitialPowerUps());
    setActivePowerUp(null);
    setHintedSquare(null);
  }, [createInitialBoard, isOnline, getInitialPowerUps, gameSettings.startingPlayer, TURN_DURATION]);

  const handleRematchRequest = () => {
     if (isOnline && onlineRoom && !isSpectator) onlineService.requestRematch(onlineRoom.id);
  }

  const handleDeclineRematch = () => {
      if (isOnline && onlineRoom && !isSpectator) {
          onlineService.declineRematch(onlineRoom.id);
          toast.info("Opponent declined rematch.");
      }
  }

  const handleDoubleDown = () => {
      if (isOnline && !isSpectator && onlineRoom) {
          onlineService.doubleDownRequest(onlineRoom.id);
      }
  };

  const handleRespondDoubleDown = (accepted: boolean) => {
      if (isOnline && !isSpectator && onlineRoom) {
          onlineService.doubleDownResponse(onlineRoom.id, accepted);
      }
  };

  const handleGiftClick = (targetRole: Player) => {
      // Logic for gifting players as spectator
      if (isGuest) {
          setShowLoginModal(true);
      } else {
          toast.info("Gifting feature coming to match view soon!");
      }
  };

  useEffect(() => {
    if (winner || isOnline) return;
    const winnerInfo = checkWinner(board, boardSize, winLength);
    if (winnerInfo.winner) {
      let finalWinner = winnerInfo.winner;
      if (variant === GameVariant.MISERE && winnerInfo.winner !== 'draw') {
        finalWinner = winnerInfo.winner === Player.X ? Player.O : Player.X;
      }
      setWinningLine(winnerInfo.line);
      handleGameOver(finalWinner, 'standard');
    }
  }, [board, winner, boardSize, winLength, variant, handleGameOver, isOnline]);

    useEffect(() => {
        if ((gameMode !== GameMode.AI && gameMode !== GameMode.CAMPAIGN) || currentPlayer !== Player.O || !!winner) return;
        const performAiMove = () => {
            setIsAiThinking(true);
            setTimeout(async () => {
                 const bestMoveAnalysis = await findBestMove(board, gameSettings, usedTaunts);
                 const now = Date.now();
                 
                 if (now - lastTauntTimeRef.current > 8000) {
                    getAuraTaunt(board, bestMoveAnalysis.move, true, gameSettings.difficulty).then(taunt => {
                        if (taunt) {
                            setAiTaunt(taunt);
                            setUsedTaunts(prev => [...prev, taunt]); 
                            lastTauntTimeRef.current = now;
                        } else {
                            setAiTaunt(bestMoveAnalysis.reason);
                            setUsedTaunts(prev => [...prev, bestMoveAnalysis.reason]); 
                            lastTauntTimeRef.current = now;
                        }
                    });
                 }

                 setIsAiThinking(false);
                 if (bestMoveAnalysis.move !== -1) handleSquareClick(bestMoveAnalysis.move);
            }, 700); 
        };
        performAiMove();
    }, [gameMode, currentPlayer, winner, board, gameSettings, handleSquareClick, usedTaunts]);

   useEffect(() => {
    if (isPaused) return;

    if (winner || ((gameMode === GameMode.AI || gameMode === GameMode.CAMPAIGN) && currentPlayer === Player.O) || (isOnline && gameSettings.blitzMode) || (isOnline && onlineRoom?.status !== 'playing')) return;
    
    const interval = setInterval(() => {
      setTurnTimer(t => {
        if (t <= 0) {
            if (!isOnline) {
                clearInterval(interval);
                handleGameOver(currentPlayer === Player.X ? Player.O : Player.X, 'timeout');
            } else if (onlineRoom && !isSpectator) {
                // Online timeout handling: 
                // Do not clear interval here; retry claim until server ends game
                onlineService.claimTimeout(onlineRoom.id);
            }
            return 0;
        }
        if (t <= 5 && t > 0) playSound('timerTick');
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentPlayer, winner, isAiThinking, gameMode, isOnline, handleGameOver, gameSettings.blitzMode, onlineRoom?.status, isPaused, playSound, onlineRoom?.id, isSpectator]);

    const nextLevel = useMemo(() => {
        if (gameMode !== GameMode.CAMPAIGN || !campaignLevel) return null;
        return CAMPAIGN_LEVELS.find(l => l.id === campaignLevel.id + 1);
    }, [gameMode, campaignLevel]);

    const getPlayerEmote = (playerId?: string) => {
        return playerId ? emotes[playerId] : undefined;
    };

    const handleCountdownComplete = useCallback(() => {
        setShowCountdown(false);
    }, []);

    if (winner) {
        let rematchStatus: 'none' | 'requested' | 'opponent_requested' = 'none';
        if (isOnline && onlineRoom && !isSpectator) {
            const xRole = myRole === Player.X ? Player.X : Player.O; 
            if(xRole){
                const myRequest = onlineRoom.rematchRequested?.[xRole];
                const opponentRole = xRole === Player.X ? Player.O : Player.X;
                const opponentRequest = onlineRoom.rematchRequested?.[opponentRole];
                if (myRequest) rematchStatus = 'requested';
                else if (opponentRequest) rematchStatus = 'opponent_requested';
            }
        }
        return (
            <GameSummary
                winner={winner}
                board={board}
                boardSize={boardSize}
                winningLine={winningLine}
                playerXName={getPlayerName(Player.X)}
                playerOName={getPlayerName(Player.O)}
                playerXAvatar={getPlayerAvatar(Player.X)}
                playerOAvatar={getPlayerAvatar(Player.O)}
                playerXElo={getPlayerElo(Player.X)}
                playerOElo={getPlayerElo(Player.O)}
                playerXBadges={getPlayerBadges(Player.X)}
                playerOBadges={getPlayerBadges(Player.O)}
                playerXFrame={getPlayerFrame(Player.X)} // Added
                playerOFrame={getPlayerFrame(Player.O)} // Added
                moveCount={moves.length}
                savedMatch={savedMatch}
                onPlayAgain={isOnline ? handleRematchRequest : resetGame}
                onDeclineRematch={handleDeclineRematch}
                onHome={() => context?.goHome()}
                isOnline={isOnline}
                isSpectator={isSpectator}
                rematchStatus={rematchStatus}
                userRole={gameMode === GameMode.AI || gameMode === GameMode.CAMPAIGN ? Player.X : myRole}
                nextLevel={nextLevel}
                onNextLevel={onNextLevel}
                winReason={winReason}
                difficulty={gameMode === GameMode.AI ? difficulty : undefined}
                xpReport={onlineRoom?.xpReport}
                pot={onlineRoom?.pot}
                ante={onlineRoom?.anteAmount}
                campaignLevel={campaignLevel}
            />
        );
    }

    if (isOnline && onlineRoom && ['waiting', 'ready'].includes(onlineRoom.status) && !onlineRoom.winner && !isPaused) {
        return <WaitingRoom 
                  roomId={onlineRoom.id} 
                  settings={onlineRoom.gameSettings} 
                  players={onlineRoom.players}
                  hostId={onlineRoom.hostId}
                  currentUserId={userId}
                  onStart={() => onlineService.startGame(onlineRoom.id)}
                  onCancel={() => context?.goHome()}
                  isSpectator={isSpectator}
               />;
    }

  const GameStatus = () => {
      if (isPaused) {
          return (
              <div className="px-6 py-3 rounded-xl backdrop-blur-md border shadow-sm text-center bg-yellow-500/20 border-yellow-500/30 animate-pulse">
                  <h2 className="text-sm md:text-xl font-bold tracking-tight text-yellow-400 flex items-center gap-2 justify-center">
                      <PauseIcon className="w-5 h-5" /> GAME PAUSED
                  </h2>
                  <div className="text-xs text-yellow-200/80 font-mono mt-1">Opponent Disconnected...</div>
              </div>
          );
      }

      let statusText = gameSettings.blitzMode ? "Blitz Mode" : `${getPlayerName(currentPlayer)}'s Turn`;
      if (activePowerUp === 'destroy') statusText = "Select Target!";
      else if (activePowerUp === 'wall') statusText = "Place Wall!";
      else if (activePowerUp === 'double') statusText = "Double Strike Ready!";
      else if (activePowerUp === 'convert') statusText = "Select Piece to Convert!";

      return (
      <div className={`px-6 py-3 rounded-xl backdrop-blur-md border shadow-sm text-center transition-all duration-300 relative
        ${activePowerUp ? 'bg-red-500/20 border-red-500/30' : 'bg-white/70 dark:bg-black/40 border-white/20 dark:border-white/10'}
      `}>
        {isOnline && onlineRoom && onlineRoom.pot > 0 && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-600 to-amber-700 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg border border-yellow-400/50 flex items-center gap-1.5 animate-pulse">
                <CoinIcon className="w-3 h-3 text-yellow-300" />
                <span>POT: {onlineRoom.pot}</span>
            </div>
        )}

        <h2 className={`text-sm md:text-xl font-bold tracking-tight whitespace-nowrap ${activePowerUp ? 'text-red-500 animate-pulse' : 'text-gray-800 dark:text-gray-200'}`}>
            {statusText}
        </h2>
        
        {!isOnline || (isOnline && !gameSettings.blitzMode) ? (
            <div className="mt-2 flex items-center gap-3 justify-center">
                <div className="h-2 w-32 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden relative">
                    <motion.div 
                        className={`h-full rounded-full ${turnTimer < 5 ? 'bg-red-500' : 'bg-cyan-500 dark:bg-cyan-400'}`}
                        initial={false}
                        animate={{ width: `${(turnTimer / TURN_DURATION) * 100}%` }}
                        transition={{ duration: turnTimer === TURN_DURATION ? 0.3 : 1, ease: "linear" }}
                    />
                </div>
                <span className={`text-xs font-mono font-bold w-6 text-left ${turnTimer < 10 ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
                    {formatTime(turnTimer)}
                </span>
            </div>
        ) : null}
    </div>
  )};

  const canDoubleDown = isOnline && !isSpectator && !onlineRoom?.doubleDown && onlineRoom?.status === 'playing' && (context?.coins || 0) >= (onlineRoom?.anteAmount || 0);

  const handleCloseClick = () => {
      setShowForfeitConfirm(true);
  };

  const onConfirmClose = () => {
      setShowForfeitConfirm(false);
      if (isSpectator) {
          handleLeaveSpectate();
      } else {
          handleForfeit();
      }
  };

  return (
    <motion.div 
      className="flex flex-col h-full w-full max-w-6xl mx-auto relative"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
       {isGuest && (
           <div className="w-full flex justify-center py-2 shrink-0 z-30">
               <div className="bg-blue-600/90 text-white px-6 py-2 rounded-full shadow-lg border border-blue-400/50 backdrop-blur-sm text-sm font-bold flex items-center gap-2">
                   <EyeIcon className="w-4 h-4" /> You are spectating as a Guest
               </div>
           </div>
       )}

       <AnimatePresence>
           {isPaused && (
               <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 rounded-3xl"
               >
                   <div className="bg-gray-900 p-8 rounded-3xl border border-white/10 shadow-2xl max-w-sm w-full">
                       <div className="w-16 h-16 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
                           <PauseIcon className="w-8 h-8 text-yellow-500" />
                       </div>
                       <h2 className="text-2xl font-bold text-white mb-2">Game Paused</h2>
                       <p className="text-gray-400 text-sm mb-6">Your opponent has disconnected. Waiting for them to return...</p>
                       <div className="flex justify-center">
                           <div className="flex gap-2">
                                <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                                <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                           </div>
                       </div>
                   </div>
               </motion.div>
           )}
       </AnimatePresence>

       <AnimatePresence>
           {isOnline && onlineRoom?.doubleDown && onlineRoom.doubleDown.offering !== myRole && (
               <Modal onClose={() => {}} className="max-w-sm">
                   <div className="text-center p-2">
                       <div className="w-16 h-16 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center border-2 border-yellow-500 mb-4 shadow-[0_0_20px_rgba(234,179,8,0.4)] animate-bounce">
                           <CoinIcon className="w-8 h-8 text-yellow-400" />
                       </div>
                       <h2 className="text-2xl font-black text-white mb-2">DOUBLE DOWN!</h2>
                       <p className="text-gray-400 text-sm mb-4">
                           Your opponent wants to double the stakes.
                       </p>
                       <div className="bg-black/30 p-3 rounded-xl border border-white/10 mb-6">
                           <div className="flex justify-between text-sm mb-1">
                               <span className="text-gray-400">Current Pot:</span>
                               <span className="text-white font-bold">{onlineRoom.pot}</span>
                           </div>
                           <div className="flex justify-between text-sm mb-1">
                               <span className="text-gray-400">New Pot:</span>
                               <span className="text-yellow-400 font-bold">{onlineRoom.pot + (onlineRoom.anteAmount * 2)}</span>
                           </div>
                           <div className="border-t border-white/10 my-2"></div>
                           <div className="flex justify-between text-sm">
                               <span className="text-gray-400">Cost to You:</span>
                               <span className="text-red-400 font-bold">-{onlineRoom.anteAmount}</span>
                           </div>
                       </div>
                       <div className="flex gap-3">
                           <button onClick={() => handleRespondDoubleDown(false)} className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-gray-300 font-bold transition-colors">Decline</button>
                           <button 
                               onClick={() => handleRespondDoubleDown(true)} 
                               className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 rounded-xl text-white font-bold shadow-lg transition-all"
                               disabled={!((context?.coins || 0) >= onlineRoom.anteAmount)}
                           >
                               {(context?.coins || 0) >= onlineRoom.anteAmount ? "ACCEPT" : "No Funds"}
                           </button>
                       </div>
                   </div>
               </Modal>
           )}
       </AnimatePresence>

       <AnimatePresence>
            {showForfeitConfirm && (
                <Modal onClose={() => setShowForfeitConfirm(false)} className="max-w-sm">
                   <div className="text-center p-4">
                       <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                           {isSpectator ? <LogoutIcon className="w-8 h-8 text-red-500" /> : <CloseIcon className="w-8 h-8 text-red-500" />}
                       </div>
                       <h2 className="text-xl font-bold text-white mb-2">{isSpectator ? "Leave Spectating?" : "Forfeit Match?"}</h2>
                       <p className="text-gray-400 text-sm mb-6">
                           {isSpectator 
                                ? "Are you sure you want to stop watching?" 
                                : isOnline 
                                    ? "Leaving now will result in a loss and you will forfeit your wager."
                                    : "Are you sure you want to end the game?"}
                       </p>
                       <div className="flex gap-3">
                           <button onClick={() => setShowForfeitConfirm(false)} className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-gray-300 font-bold transition-colors">Cancel</button>
                           <button onClick={onConfirmClose} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg transition-all">
                               {isSpectator ? "Leave" : "Forfeit"}
                           </button>
                       </div>
                   </div>
               </Modal>
            )}
       </AnimatePresence>

       <div className="shrink-0 flex justify-between items-center gap-4 px-2 py-2 w-full z-20 relative">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full mask-gradient-right">
                <Badge text={isOnline ? "Online" : (gameMode === GameMode.CAMPAIGN ? "Campaign" : "Local")} icon={isSpectator ? <EyeIcon className="w-3 h-3"/> : (gameMode === GameMode.CAMPAIGN ? <MapIcon className="w-3 h-3" /> : null)} color="blue" />
                {isOnline && (
                    <Badge 
                        text={spectatorCount > 0 ? `${spectatorCount} Live` : '0'} 
                        icon={<EyeIcon className={`w-3 h-3 ${spectatorCount > 0 ? 'text-red-500 animate-pulse' : ''}`} />} 
                        color={spectatorCount > 0 ? 'red' : 'gray'} 
                        tooltip="Spectators Watching" 
                    />
                )}
                <Badge text={`${boardSize}x${boardSize}`} icon={<GridIcon className="w-3 h-3 text-gray-500 dark:text-gray-400"/>} color="gray" />
                <Badge text={`Match ${winLength}`} icon={<TrophyIcon className="w-3 h-3 text-yellow-500"/>} color="gray" />
                {(gameMode === GameMode.AI || gameMode === GameMode.CAMPAIGN) && <Badge text={difficulty} icon={<LightningIcon className="w-3 h-3"/>} color={difficulty === Difficulty.BOSS ? 'red' : 'purple'} />}
                {obstacles && <Badge text="" icon={<ObstacleIcon className="w-3 h-3"/>} color="orange" tooltip="Obstacles" />}
                {variant === GameVariant.MISERE && <Badge text="" icon={<SkullIcon className="w-3 h-3"/>} color="pink" tooltip="Misère Mode" />}
                {gameSettings.blitzMode && <Badge text="Blitz" icon={<ClockIcon className="w-3 h-3"/>} color="red" />}
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {isGuest && (
                    <button onClick={() => setShowLoginModal(true)} className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-colors shadow-lg">
                        Sign In
                    </button>
                )}
                {isOnline && !isSpectator && (
                    <Tooltip text="Copy Spectator Link">
                        <button onClick={handleCopySpectateLink} className="p-2 rounded-full bg-gray-200/50 dark:bg-white/5 border border-gray-300 dark:border-white/10 hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all group">
                            <LinkIcon className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:text-cyan-500" />
                        </button>
                    </Tooltip>
                )}
                <button onClick={handleCloseClick} className="p-2 rounded-full bg-gray-200/50 dark:bg-white/5 border border-gray-300 dark:border-white/10 hover:bg-red-500/20 hover:border-red-500/50 transition-all group" aria-label="Forfeit/Close">
                    {isSpectator ? <LogoutIcon className="w-4 h-4 text-red-500" /> : <CloseIcon className="w-4 h-4 text-red-500" />}
                </button>
            </div>
       </div>
      
      <div className="md:hidden shrink-0 flex justify-between items-center px-4 py-2 bg-white/10 dark:bg-white/5 rounded-xl mx-2 mb-2 border border-white/10 relative z-10">
          <MobilePlayerInfo 
            player={Player.X} 
            isActive={currentPlayer === Player.X} 
            seat={isOnline && onlineRoom ? onlineRoom.players.find(p => p.role === Player.X) : undefined}
            fallbackName={getPlayerName(Player.X)}
            avatarId={getPlayerAvatar(Player.X)}
            frameId={getPlayerFrame(Player.X)}
            blitzTime={gameSettings.blitzMode ? formatTime(blitzTimers[Player.X]) : undefined}
            label={getPlayerLabel(Player.X)}
            currentEmote={getPlayerEmote(isOnline && onlineRoom ? onlineRoom.players.find(p => p.role === Player.X)?.user.id : undefined)}
          />
          
          <div className="text-center px-2">
             <span className={`text-xs font-bold uppercase tracking-widest ${activePowerUp ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}>
                 {activePowerUp ? 'ACTIVE' : 'VS'}
             </span>
             {!gameSettings.blitzMode && (
                 <div className="text-[10px] font-mono text-cyan-400">{formatTime(turnTimer)}</div>
             )}
          </div>

          <MobilePlayerInfo 
            player={Player.O} 
            isActive={currentPlayer === Player.O} 
            seat={isOnline && onlineRoom ? onlineRoom.players.find(p => p.role === Player.O) : undefined}
            fallbackName={getPlayerName(Player.O)}
            avatarId={getPlayerAvatar(Player.O)}
            frameId={getPlayerFrame(Player.O)}
            blitzTime={gameSettings.blitzMode ? formatTime(blitzTimers[Player.O]) : undefined}
            label={getPlayerLabel(Player.O)}
            currentEmote={getPlayerEmote(isOnline && onlineRoom ? onlineRoom.players.find(p => p.role === Player.O)?.user.id : undefined)}
          />
      </div>

      <div className="flex-1 min-w-0 flex items-center justify-center w-full gap-4 md:gap-12 relative">
        
        <div className="hidden md:block relative shrink-0 p-2">
            <PlayerInfoPanel 
                seat={isOnline && onlineRoom ? onlineRoom.players.find(p => p.role === Player.X) : undefined} 
                fallbackName={getPlayerName(Player.X)} 
                role={Player.X} 
                isActive={currentPlayer === Player.X} 
                label={getPlayerLabel(Player.X)}
                avatarId={getPlayerAvatar(Player.X)}
                frameId={getPlayerFrame(Player.X)}
                elo={getPlayerElo(Player.X)}
                currentEmote={getPlayerEmote(isOnline && onlineRoom ? onlineRoom.players.find(p => p.role === Player.X)?.user.id : undefined)}
                onGift={isSpectator ? () => handleGiftClick(Player.X) : undefined}
            />
             {gameSettings.blitzMode && (
                <div className={`absolute -bottom-10 left-1/2 -translate-x-1/2 font-mono text-xl font-bold px-3 py-1 rounded-lg border ${currentPlayer === Player.X ? 'bg-white/10 border-white/20 text-white shadow-lg shadow-white/10' : 'text-gray-500 border-transparent'}`}>
                    {formatTime(blitzTimers[Player.X])}
                </div>
            )}
            
            {isOnline && !isSpectator && myRole === Player.X && (
                 <div className="absolute top-full left-1/2 -translate-x-1/2 mt-6 z-50">
                     <EmojiBar onEmojiSelect={handleSendEmote} disabled={false} variant="row" />
                 </div>
            )}
        </div>
        
        <div className="flex flex-col items-center justify-center h-full w-full max-h-full">
             <div className="hidden md:flex items-start gap-3 mb-4 shrink-0 z-30">
                 <GameStatus />

                 {isOnline && !isSpectator && onlineRoom?.status === 'playing' && (
                     <div className="flex flex-col items-center justify-start pt-1">
                        <Tooltip text={onlineRoom?.doubleDown ? "Waiting for response..." : (canDoubleDown ? `Double Stakes (-${onlineRoom?.anteAmount})` : "Insufficent Funds")}>
                            <button 
                                onClick={handleDoubleDown}
                                disabled={!canDoubleDown || !!onlineRoom?.doubleDown}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all shadow-lg backdrop-blur-md h-[72px] w-[72px]
                                    ${onlineRoom?.doubleDown 
                                        ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-300 animate-pulse cursor-wait'
                                        : canDoubleDown
                                            ? 'bg-black/40 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                                            : 'bg-black/20 border-white/5 text-gray-600 cursor-not-allowed'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-0.5">
                                    <span className="text-lg font-black italic">2</span>
                                    <XIcon className="w-3 h-3 stroke-[3]" />
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-widest mt-0.5">Stake</span>
                            </button>
                        </Tooltip>
                     </div>
                 )}
             </div>

            <div className="w-full h-full flex items-center justify-center p-2 overflow-hidden">
                <div className="w-full h-full flex items-center justify-center">
                    <div className="relative aspect-square max-h-full max-w-full flex items-center justify-center">
                        <Board 
                            squares={board} 
                            boardSize={boardSize} 
                            onSquareClick={handleSquareClick} 
                            winningLine={winningLine} 
                            disabled={!!winner || isAiThinking || (isOnline && (!isMyTurnOnline || opponentDisconnected || isSpectator || isPaused)) || showCountdown}
                            hintedSquare={hintedSquare}
                            skin={context?.equippedSkin}
                        />
                    </div>
                </div>
            </div>
        </div>

        <div className="hidden md:block relative shrink-0 p-2">
             <PlayerInfoPanel 
                seat={isOnline && onlineRoom ? onlineRoom.players.find(p => p.role === Player.O) : undefined} 
                fallbackName={getPlayerName(Player.O)} 
                role={Player.O} 
                isActive={currentPlayer === Player.O} 
                label={getPlayerLabel(Player.O)}
                avatarId={getPlayerAvatar(Player.O)}
                frameId={getPlayerFrame(Player.O)}
                elo={getPlayerElo(Player.O)}
                currentEmote={getPlayerEmote(isOnline && onlineRoom ? onlineRoom.players.find(p => p.role === Player.O)?.user.id : undefined)}
                onGift={isSpectator ? () => handleGiftClick(Player.O) : undefined}
            />
             {gameSettings.blitzMode && (
                <div className={`absolute -bottom-10 left-1/2 -translate-x-1/2 font-mono text-xl font-bold px-3 py-1 rounded-lg border ${currentPlayer === Player.O ? 'bg-white/10 border-white/20 text-white shadow-lg shadow-white/10' : 'text-gray-500 border-transparent'}`}>
                    {formatTime(blitzTimers[Player.O])}
                </div>
            )}
            <AnimatePresence>
                {(gameMode === GameMode.AI || gameMode === GameMode.CAMPAIGN) && aiTaunt && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8, y: -10 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }} 
                        exit={{ opacity: 0, scale: 0.8, y: -10 }}
                        className="absolute top-full mt-4 right-0 w-48 z-50 pointer-events-none flex flex-col items-end"
                    >
                         <div className="bg-white/90 dark:bg-black/80 backdrop-blur-xl text-gray-800 dark:text-white p-3 rounded-2xl shadow-xl border border-cyan-500/30 relative text-right">
                            <div className="absolute -top-1.5 right-10 w-3 h-3 bg-white/90 dark:bg-black/80 border-t border-l border-cyan-500/30 transform rotate-45"></div>
                            
                            <div className="flex items-start justify-end gap-2">
                                <p className="text-xs font-bold leading-snug break-words whitespace-normal">{aiTaunt}</p>
                                <span className="text-lg shrink-0 -mt-1">💬</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {isOnline && !isSpectator && myRole === Player.O && (
                 <div className="absolute top-full left-1/2 -translate-x-1/2 mt-6 z-50">
                     <EmojiBar onEmojiSelect={handleSendEmote} disabled={false} variant="row" />
                 </div>
            )}
        </div>
      </div>

      <div className="shrink-0 w-full flex justify-center pb-4 pt-2 z-20 safe-area-pb px-4">
          {!isOnline && !isSpectator && gameSettings.powerUps !== false && (
            <div className="flex items-center justify-center gap-3 md:gap-4 bg-black/40 backdrop-blur-md p-2 md:p-3 rounded-2xl border border-white/10 shadow-lg">
                <Tooltip text={gameMode === GameMode.AI || gameMode === GameMode.CAMPAIGN ? "Rewind 1 round" : "Undo last move"} position="top">
                    <button onClick={handleUndo} disabled={moves.length === 0 || !!winner || !powerUps[currentPlayer]?.undo || isAiThinking || !!activePowerUp} className="powerup-btn"><UndoIcon className="w-5 h-5 md:w-6 md:h-6" /></button>
                </Tooltip>
                <Tooltip text="Reveal best move" position="top">
                    <button onClick={handleHint} disabled={!!winner || !powerUps[currentPlayer]?.hint || isAiThinking || !!activePowerUp} className="powerup-btn"><HintIcon className="w-5 h-5 md:w-6 md:h-6" /></button>
                </Tooltip>
                <div className="w-px h-6 bg-white/10"></div>
                <Tooltip text={powerUps[currentPlayer]?.destroy ? "Destroy piece (1 Use)" : "Locked (Buy in Shop)"} position="top">
                    <button 
                        onClick={toggleDestroy} 
                        disabled={!!winner || isAiThinking || (!!activePowerUp && activePowerUp !== 'destroy')} 
                        className={`powerup-btn relative ${activePowerUp === 'destroy' ? 'active' : ''} ${!powerUps[currentPlayer]?.destroy ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                    >
                        <BombIcon className="w-5 h-5 md:w-6 md:h-6" />
                        {!powerUps[currentPlayer]?.destroy && (
                            <div className="absolute -top-1 -right-1"><div className="w-3 h-3 rounded-full bg-red-500 border border-white"></div></div>
                        )}
                    </button>
                </Tooltip>
                <Tooltip text={powerUps[currentPlayer]?.wall ? "Place Wall (1 Use)" : "Locked (Buy in Shop)"} position="top">
                    <button 
                        onClick={toggleWall} 
                        disabled={!!winner || isAiThinking || (!!activePowerUp && activePowerUp !== 'wall')} 
                        className={`powerup-btn relative ${activePowerUp === 'wall' ? 'active' : ''} ${!powerUps[currentPlayer]?.wall ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                    >
                        <ShieldIcon className="w-5 h-5 md:w-6 md:h-6" />
                        {!powerUps[currentPlayer]?.wall && (
                            <div className="absolute -top-1 -right-1"><div className="w-3 h-3 rounded-full bg-red-500 border border-white"></div></div>
                        )}
                    </button>
                </Tooltip>
                <Tooltip text={powerUps[currentPlayer]?.double ? "Double Strike (1 Use)" : "Locked (Buy in Shop)"} position="top">
                    <button 
                        onClick={toggleDouble} 
                        disabled={!!winner || isAiThinking || (!!activePowerUp && activePowerUp !== 'double')} 
                        className={`powerup-btn relative ${activePowerUp === 'double' ? 'active' : ''} ${!powerUps[currentPlayer]?.double ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                    >
                        <DoubleIcon className="w-5 h-5 md:w-6 md:h-6" />
                        {!powerUps[currentPlayer]?.double && (
                            <div className="absolute -top-1 -right-1"><div className="w-3 h-3 rounded-full bg-red-500 border border-white"></div></div>
                        )}
                    </button>
                </Tooltip>
                <Tooltip text={powerUps[currentPlayer]?.convert ? "Conversion (1 Use)" : "Locked (Buy in Shop)"} position="top">
                    <button 
                        onClick={toggleConvert} 
                        disabled={!!winner || isAiThinking || (!!activePowerUp && activePowerUp !== 'convert')} 
                        className={`powerup-btn relative ${activePowerUp === 'convert' ? 'active' : ''} ${!powerUps[currentPlayer]?.convert ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                    >
                        <ConvertIcon className="w-5 h-5 md:w-6 md:h-6" />
                        {!powerUps[currentPlayer]?.convert && (
                            <div className="absolute -top-1 -right-1"><div className="w-3 h-3 rounded-full bg-red-500 border border-white"></div></div>
                        )}
                    </button>
                </Tooltip>
            </div>
          )}
          
          {isOnline && onlineRoom && !isSpectator && !isGuest && (
              <div className="max-w-full overflow-x-auto no-scrollbar rounded-2xl shadow-lg md:hidden">
                  <EmojiBar onEmojiSelect={handleSendEmote} disabled={false} />
              </div>
          )}
          
          {isSpectator && !isGuest && (
              <div className="max-w-full overflow-x-auto no-scrollbar rounded-2xl shadow-lg">
                  <EmojiBar onEmojiSelect={handleSendEmote} disabled={false} />
              </div>
          )}
      </div>

      {showCountdown && (
          <GameStartCountdown 
              potAmount={onlineRoom?.pot} 
              onComplete={handleCountdownComplete} 
          />
      )}

      <AnimatePresence>
          {showLoginModal && (
              <Modal onClose={() => setShowLoginModal(false)}>
                  <div className="p-4">
                      <div className="flex justify-between items-center mb-6">
                          <h2 className="text-xl font-bold text-white">Sign In Required</h2>
                          <button onClick={() => setShowLoginModal(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><CloseIcon className="w-5 h-5 text-gray-400" /></button>
                      </div>
                      <p className="text-gray-400 mb-6">You must be logged in to send gifts to players.</p>
                      <AuthScreen /> 
                  </div>
              </Modal>
          )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Game;
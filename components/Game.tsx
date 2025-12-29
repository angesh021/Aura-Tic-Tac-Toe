
import React, { useState, useEffect, useCallback, useMemo, useContext, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BoardState, GameMode, Player, Move, GameSettings, GameVariant, MatchRecord, PlayerRole, CampaignLevel, Difficulty } from '../types';
import { checkWinner, findWinningMove } from '../utils/gameLogic';
import { findBestMove } from '../services/ai';
import { saveMatch } from '../services/history';
import Board from './Board';
import { AppContext } from '../contexts/AppContext';
import { AuthContext } from '../contexts/AuthContext';
import { CloseIcon, GridIcon, TrophyIcon, ObstacleIcon, SkullIcon, ClockIcon, EyeIcon, LightningIcon, LinkIcon, LogoutIcon, MapIcon, CoinIcon, PauseIcon } from './Icons';
import { onlineService } from '../services/online';
import Tooltip from './Tooltip';
import { useToast } from '../contexts/ToastContext';
import GameSummary from './GameSummary';
import { progressService, CAMPAIGN_LEVELS, generateTowerLevel } from '../services/progress';
import { getRank } from '../utils/badgeData';
import { useSounds } from '../hooks/useSounds';
import { getAuraTaunt } from '../services/genai';
import Modal from './Modal';
import GameStartCountdown from './GameStartCountdown';
import EmojiBar from './EmojiBar';
import { useGameStore } from '../stores/gameStore';
import Login from './Login';
import Register from './Register';
import RematchModal from './RematchModal';

// Sub-components
import Badge from './game/Badge';
import PowerUpBar from './game/PowerUpBar';
import PlayerInfoPanel from './game/PlayerInfoPanel';
import MobilePlayerInfo from './game/MobilePlayerInfo';
import WaitingRoom from './game/WaitingRoom';
import GameInfoDisplay from './game/GameInfoDisplay';
import GameStatus from './game/GameStatus';
import { formatTime } from './game/utils';

interface GameProps {
  userId: string;
  gameMode: GameMode;
  gameSettings: GameSettings;
  playerNames?: { [key in Player]?: string };
  campaignLevel?: CampaignLevel;
  onNextLevel?: (level: CampaignLevel) => void;
  isGuest?: boolean;
}

export const Game: React.FC<GameProps> = ({ userId, gameMode, gameSettings: initialSettings, playerNames, campaignLevel, onNextLevel, isGuest = false }) => {
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

  const cachedPlayers = useRef<{ [key in Player]?: any }>({}); // Using any to avoid importing User type in hook for now, refined below
  
  // Track powerup usage for quest progress
  const powerupsUsedRef = useRef<Record<string, number>>({});

  const isSinglePlayer = gameMode === GameMode.AI || gameMode === GameMode.CAMPAIGN || gameMode === GameMode.TOWER;

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
  
  const [powerUps, setPowerUps] = useState<any>(getInitialPowerUps());
  const [activePowerUp, setActivePowerUp] = useState<any | null>(null);
  const [hintedSquare, setHintedSquare] = useState<number | null>(null);
  
  const [turnTimer, setTurnTimer] = useState(TURN_DURATION);
  const [blitzTimers, setBlitzTimers] = useState<{ [key in Player]: number }>({
      [Player.X]: gameSettings.blitzDuration || 180,
      [Player.O]: gameSettings.blitzDuration || 180
  });
  const [doubleDownTimer, setDoubleDownTimer] = useState(30);
  
  const [aiTaunt, setAiTaunt] = useState<string>("");
  const [usedTaunts, setUsedTaunts] = useState<string[]>([]);
  const lastTauntTimeRef = useRef<number>(0);
  const [savedMatch, setSavedMatch] = useState<MatchRecord | null>(null);

  const [emotes, setEmotes] = useState<{ [playerId: string]: string }>({});
  
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  
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
      if ((gameMode === GameMode.CAMPAIGN || gameMode === GameMode.TOWER) && campaignLevel) {
          if (player === Player.O) return campaignLevel.bossName;
          return auth?.currentUser?.displayName || `Player ${player}`;
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
      if ((gameMode === GameMode.CAMPAIGN || gameMode === GameMode.TOWER) && campaignLevel && player === Player.O) {
          return campaignLevel.bossAvatar;
      }
      if (isSinglePlayer) {
          if (player === Player.O) return 'avatar-8'; 
          return auth?.currentUser?.avatar || 'avatar-1';
      }
      return player === Player.X ? 'avatar-1' : 'avatar-2'; 
  }, [isOnline, onlineRoom, gameMode, auth?.currentUser, campaignLevel, isSinglePlayer]);

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
      if (isSinglePlayer) {
          if (player === Player.X) return auth?.currentUser?.questData?.equippedFrame;
          // Boss/AI Frame logic
          if (player === Player.O) {
              if (difficulty === Difficulty.BOSS) return 'frame-godlike';
              if (difficulty === Difficulty.HARD) return 'frame-fire';
              if (gameMode === GameMode.CAMPAIGN) return 'frame-status';
          }
      }
      return undefined;
  }, [isOnline, onlineRoom, gameMode, auth?.currentUser, isSinglePlayer, difficulty]);

  const getPlayerLabel = useCallback((targetRole: Player) => {
      if (isOnline && onlineRoom) {
           const seat = onlineRoom.players.find(p => p.role === targetRole);
           if (seat && seat.user.id === userId) return "YOU";
           const participant = onlineRoom.participants?.[targetRole];
           if (participant && participant.id === userId) return "YOU";

           if (isSpectator) return targetRole === Player.X ? "PLAYER 1" : "PLAYER 2";
           return "OPPONENT";
      }
      if (gameMode === GameMode.CAMPAIGN || gameMode === GameMode.TOWER) {
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
      if (isSinglePlayer) {
          if (player === Player.O) {
              const map: Record<string, number> = { 'Easy': 800, 'Medium': 1200, 'Hard': 1600, 'Boss': 2500 };
              return map[difficulty] || 1200;
          }
          return auth?.currentUser?.elo;
      }
      return undefined;
  }, [isOnline, onlineRoom, gameMode, difficulty, auth?.currentUser, isSinglePlayer]);

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
      if (isSinglePlayer) {
          if (player === Player.O) {
              if (difficulty === 'Boss') return ['grandmaster', 'sniper', 'marathon'];
              if (difficulty === 'Hard') return ['veteran', 'first_win'];
              return ['rookie'];
          }
          return auth?.currentUser?.badges;
      }
      return undefined;
  }, [isOnline, onlineRoom, gameMode, difficulty, auth?.currentUser, isSinglePlayer]);

  const getPlayerLevel = useCallback((player: Player) => {
      if (isOnline && onlineRoom) {
          const seat = onlineRoom.players.find(p => p.role === player);
          if (seat) return seat.user.level;
          const participant = onlineRoom.participants?.[player];
          if (participant) return participant.level;
          const cached = cachedPlayers.current[player];
          if (cached) return cached.level;
          return undefined;
      }
      if (isSinglePlayer) {
          if (player === Player.O) {
              const map: Record<string, number> = { 'Easy': 5, 'Medium': 15, 'Hard': 40, 'Boss': 99 };
              return map[difficulty] || 10;
          }
          return auth?.currentUser?.level;
      }
      return undefined;
  }, [isOnline, onlineRoom, gameMode, difficulty, auth?.currentUser, isSinglePlayer]);
  
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
  
  // Close login modal automatically if user signs in
  useEffect(() => {
      if (!isGuest && showLoginModal) {
          setShowLoginModal(false);
      }
  }, [isGuest, showLoginModal]);

  // Game Timer (Blitz/Turn)
  useEffect(() => {
      if (isOnline && onlineRoom?.doubleDown) return; // Pause game timer during double down
      if (isPaused) return;

      if (isOnline && gameSettings.blitzMode && !winner && onlineRoom?.status === 'playing') {
          const interval = setInterval(() => {
             setBlitzTimers(prev => {
                 const newTime = { ...prev };
                 if (newTime[currentPlayer] > 0) {
                     newTime[currentPlayer] = Math.max(0, newTime[currentPlayer] - 1);
                 }
                 if (newTime[currentPlayer] === 0 && !isSpectator && onlineRoom?.id) {
                     onlineService.claimTimeout(onlineRoom.id);
                 }
                 return newTime;
             });
          }, 1000);
          return () => clearInterval(interval);
      }
  }, [isOnline, gameSettings.blitzMode, winner, currentPlayer, onlineRoom?.status, onlineRoom?.isPaused, onlineRoom?.doubleDown, isSpectator, onlineRoom?.id, isPaused]);

  // Double Down Countdown Timer
  useEffect(() => {
      if (onlineRoom?.doubleDown && !winner) {
          const expiresAt = onlineRoom.doubleDown.expiresAt;
          const interval = setInterval(() => {
              const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
              setDoubleDownTimer(Math.max(0, remaining));
              if (remaining <= 0) {
                  // Timer expired, cleanup handled by backend claimTimeout or auto-close modal
                  clearInterval(interval);
              }
          }, 1000);
          return () => clearInterval(interval);
      } else {
          setDoubleDownTimer(30);
      }
  }, [onlineRoom?.doubleDown, winner]);

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

  const trackPowerup = (type: string) => {
      powerupsUsedRef.current[type] = (powerupsUsedRef.current[type] || 0) + 1;
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
    
    if ((gameMode === GameMode.CAMPAIGN || gameMode === GameMode.TOWER) && campaignLevel) {
        if (newWinner === Player.X) {
            progressService.completeLevel(campaignLevel, moves.length + 1); 
            progressService.updateQuestProgress('win', 1, true);
            toast.success(gameMode === GameMode.TOWER ? "Floor Cleared!" : `Level Cleared!`);
        } else {
            toast.error(gameMode === GameMode.TOWER ? "Floor Failed." : "Level Failed. Try Again!");
        }
    } else if (!isOnline) {
         if (newWinner === Player.X) progressService.updateQuestProgress('win', 1, true);
         progressService.updateQuestProgress('play', 1, true);
    }

    if (gameMode !== GameMode.ONLINE) {
         try {
             const savePayload = { 
                 gameMode, 
                 winner: newWinner, 
                 moves, 
                 gameSettings, 
                 initialBoard, 
                 playerRole: Player.X, 
                 opponentName: getPlayerName(Player.O),
                 winReason: reason,
                 powerupsUsed: powerupsUsedRef.current,
                 difficulty: gameSettings.difficulty 
             };

             const saved = await saveMatch(savePayload);
             setSavedMatch(saved);
             
             if ((saved as any).quests) {
                 progressService.syncQuests((saved as any).quests);
             }
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

  const handleUndo = useCallback(() => {
      if (isOnline || moves.length === 0 || winner) return;
      if (!powerUps[currentPlayer]?.undo) {
          toast.error("No undo charges left!");
          return;
      }

      playSound('powerup');
      trackPowerup('undo');
      
      const performUndo = (count: number) => {
          setPowerUps((prev: any) => ({
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

      if (isSinglePlayer) {
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
  }, [board, moves, winner, isOnline, currentPlayer, powerUps, toast, isSinglePlayer, TURN_DURATION, playSound]);

  const handleHint = useCallback(() => {
      if (isOnline || winner || !powerUps[currentPlayer]?.hint || isAiThinking) return;
      
      playSound('powerup');
      trackPowerup('hint');

      setPowerUps((prev: any) => ({
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
      if (isMyTurnOnline && !opponentDisconnected && !isSpectator && !isPaused && !onlineRoom.doubleDown) {
        try { await onlineService.makeMove({ roomId: onlineRoom.id, index }); } 
        catch (error: any) { toast.error(error.message || "Failed to send move."); }
      }
      return;
    }
    
    if (winner || isAiThinking) return;

    if (activePowerUp === 'destroy') {
        if (board[index] !== null && board[index] !== 'OBSTACLE' && board[index] !== currentPlayer) {
            playSound('powerup');
            trackPowerup('destroy');
            const newBoard = [...board];
            newBoard[index] = null;
            setBoard(newBoard);
            setPowerUps((prev: any) => ({...prev, [currentPlayer]: {...prev[currentPlayer], destroy: false}}));
            setActivePowerUp(null);
            setCurrentPlayer(currentPlayer === Player.X ? Player.O : Player.X);
            setTurnTimer(TURN_DURATION);
            toast.success("Piece destroyed!");
            progressService.updateQuestProgress('destroy', 1, true);
        } else {
            toast.error("Select an opponent's piece!");
        }
        return;
    }

    if (activePowerUp === 'convert') {
        if (board[index] !== null && board[index] !== 'OBSTACLE' && board[index] !== currentPlayer) {
            playSound('powerup');
            trackPowerup('convert');
            const newBoard = [...board];
            newBoard[index] = currentPlayer;
            setBoard(newBoard);
            setPowerUps((prev: any) => ({...prev, [currentPlayer]: {...prev[currentPlayer], convert: false}}));
            setActivePowerUp(null);
            setCurrentPlayer(currentPlayer === Player.X ? Player.O : Player.X);
            setTurnTimer(TURN_DURATION);
            toast.success("Converted!");
            progressService.updateQuestProgress('convert', 1, true);
        } else {
            toast.error("Select an opponent's piece!");
        }
        return;
    }

    if (activePowerUp === 'wall') {
        if (board[index] === null) {
            playSound('powerup');
            trackPowerup('wall');
            const newBoard = [...board];
            newBoard[index] = 'OBSTACLE';
            setBoard(newBoard);
            setPowerUps((prev: any) => ({...prev, [currentPlayer]: {...prev[currentPlayer], wall: false}}));
            setActivePowerUp(null);
            setMoves([...moves, { player: currentPlayer, index, moveNumber: moves.length + 1 }]); 
            setCurrentPlayer(currentPlayer === Player.X ? Player.O : Player.X);
            setTurnTimer(TURN_DURATION);
            toast.success("Wall placed!");
            progressService.updateQuestProgress('wall', 1, true);
        } else {
            toast.error("Select an empty square!");
        }
        return;
    }

    if (board[index]) return;

    if (hintedSquare !== null) setHintedSquare(null);
    if (isSinglePlayer && currentPlayer === Player.X) setAiTaunt(""); 

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);
    setMoves([...moves, { player: currentPlayer, index, moveNumber: moves.length + 1 }]);
    
    if (currentPlayer === Player.X) playSound('placeX');
    else playSound('placeO');

    if (activePowerUp === 'double') {
        playSound('powerup');
        trackPowerup('double');
        setPowerUps((prev: any) => ({...prev, [currentPlayer]: {...prev[currentPlayer], double: false}}));
        setActivePowerUp(null);
        setTurnTimer(TURN_DURATION);
        toast.success("Double Strike! Move again.");
        progressService.updateQuestProgress('double', 1, true);
        
        const winnerInfo = checkWinner(newBoard, boardSize, winLength);
        if (winnerInfo.winner) {
             // Let next effect handle win
        }
    } else {
        setCurrentPlayer(currentPlayer === Player.X ? Player.O : Player.X);
        setTurnTimer(TURN_DURATION);
    }

  }, [board, currentPlayer, winner, isAiThinking, moves, isOnline, isMyTurnOnline, onlineRoom?.id, opponentDisconnected, isSpectator, isSinglePlayer, context?.preferences.haptics, hintedSquare, activePowerUp, toast, isPaused, TURN_DURATION, playSound, onlineRoom?.doubleDown]);

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
    powerupsUsedRef.current = {};
  }, [createInitialBoard, isOnline, getInitialPowerUps, gameSettings.startingPlayer, TURN_DURATION]);

  const handleRematchRequest = () => {
     if (isOnline && onlineRoom && !isSpectator) onlineService.requestRematch(onlineRoom.id);
  }

  const handleDeclineRematch = () => {
      if (isOnline && onlineRoom && !isSpectator) {
          onlineService.declineRematch(onlineRoom.id);
          // Toast handled by socket event if needed, but manual toast is fine too
      }
  }

  const handleDoubleDown = () => {
      if (isOnline && !isSpectator && onlineRoom && !onlineRoom.doubleDownUsed) {
          onlineService.doubleDownRequest(onlineRoom.id);
      }
  };

  const handleRespondDoubleDown = (accepted: boolean) => {
      if (isOnline && !isSpectator && onlineRoom) {
          onlineService.doubleDownResponse(onlineRoom.id, accepted);
      }
  };

  const handleGiftClick = (targetRole: Player) => {
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
        if (!isSinglePlayer || currentPlayer !== Player.O || !!winner) return;
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
    }, [isSinglePlayer, currentPlayer, winner, board, gameSettings, handleSquareClick, usedTaunts]);

   useEffect(() => {
    if (isPaused) return;
    if (isOnline && onlineRoom?.doubleDown) return; // Pause timer if double down pending

    if (winner || (isSinglePlayer && currentPlayer === Player.O) || (isOnline && gameSettings.blitzMode) || (isOnline && onlineRoom?.status !== 'playing')) return;
    
    const interval = setInterval(() => {
      setTurnTimer(t => {
        if (t <= 0) {
            if (!isOnline) {
                clearInterval(interval);
                handleGameOver(currentPlayer === Player.X ? Player.O : Player.X, 'timeout');
            } else if (onlineRoom && !isSpectator) {
                onlineService.claimTimeout(onlineRoom.id);
            }
            return 0;
        }
        if (t <= 5 && t > 0) playSound('timerTick');
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentPlayer, winner, isAiThinking, isSinglePlayer, isOnline, handleGameOver, gameSettings.blitzMode, onlineRoom?.status, isPaused, playSound, onlineRoom?.id, isSpectator, onlineRoom?.doubleDown]);

    const nextLevel = useMemo(() => {
        if (gameMode === GameMode.TOWER && campaignLevel) {
            return generateTowerLevel(campaignLevel.id - 1000 + 1); // Extract floor
        }
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
            const offer = onlineRoom.rematchOffer;
            if (offer) {
                if (offer.from === myRole) rematchStatus = 'requested';
                else rematchStatus = 'opponent_requested';
            }
        }
        return (
            <>
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
                playerXLevel={getPlayerLevel(Player.X)}
                playerOLevel={getPlayerLevel(Player.O)}
                playerXFrame={getPlayerFrame(Player.X)}
                playerOFrame={getPlayerFrame(Player.O)}
                moveCount={moves.length}
                savedMatch={savedMatch}
                onPlayAgain={isOnline ? handleRematchRequest : resetGame}
                onDeclineRematch={handleDeclineRematch}
                onHome={() => context?.goHome()}
                isOnline={isOnline}
                isSpectator={isSpectator}
                rematchStatus={rematchStatus}
                userRole={isSinglePlayer ? Player.X : myRole}
                nextLevel={nextLevel}
                onNextLevel={onNextLevel}
                winReason={winReason}
                difficulty={gameMode === GameMode.AI ? difficulty : undefined}
                xpReport={onlineRoom?.xpReport}
                pot={onlineRoom?.pot}
                ante={onlineRoom?.anteAmount}
                campaignLevel={campaignLevel}
                gameSettings={gameSettings}
            />
            {isOnline && onlineRoom?.rematchOffer && !isSpectator && myRole && (
                <AnimatePresence>
                    <RematchModal 
                        offer={onlineRoom.rematchOffer} 
                        myRole={myRole} 
                        onAccept={handleRematchRequest} 
                        onDecline={handleDeclineRematch}
                    />
                </AnimatePresence>
            )}
            </>
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

  const canDoubleDown = isOnline && !isSpectator && isMyTurnOnline && !onlineRoom?.doubleDown && !onlineRoom?.doubleDownUsed && (context?.coins || 0) >= (onlineRoom?.anteAmount || 0);

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
           {isPaused && !onlineRoom?.doubleDown && (
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

       {/* Double Down Receiver Modal */}
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
                           <div className="flex justify-between text-sm mb-4">
                               <span className="text-gray-400">Cost to You:</span>
                               <span className="text-red-400 font-bold">-{onlineRoom.anteAmount}</span>
                           </div>
                           
                           {/* Decision Timer */}
                           <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                <motion.div 
                                    className="h-full bg-yellow-500"
                                    initial={{ width: '100%' }}
                                    animate={{ width: '0%' }}
                                    transition={{ duration: 30, ease: 'linear' }}
                                />
                           </div>
                           <div className="text-xs text-yellow-500 font-mono mt-1 font-bold text-right">{doubleDownTimer}s</div>
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

       {/* Double Down Sender Modal */}
       <AnimatePresence>
           {isOnline && onlineRoom?.doubleDown && onlineRoom.doubleDown.offering === myRole && (
               <Modal onClose={() => {}} className="max-w-sm">
                   <div className="text-center p-6">
                       <div className="w-16 h-16 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center border-2 border-yellow-500 mb-4 animate-pulse">
                           <CoinIcon className="w-8 h-8 text-yellow-400" />
                       </div>
                       <h2 className="text-xl font-bold text-white mb-2">Double Down Sent</h2>
                       <p className="text-gray-400 text-sm mb-4">
                           Waiting for opponent response...
                       </p>
                       <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden mb-2">
                            <motion.div 
                                className="h-full bg-yellow-500"
                                initial={{ width: '100%' }}
                                animate={{ width: '0%' }}
                                transition={{ duration: 30, ease: 'linear' }}
                            />
                       </div>
                       <div className="text-xs text-yellow-500 font-mono text-right">{doubleDownTimer}s</div>
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
                <Badge text={isOnline ? "Online" : (gameMode === GameMode.CAMPAIGN || gameMode === GameMode.TOWER ? (gameMode === GameMode.TOWER ? "Tower" : "Campaign") : "Local")} icon={isSpectator ? <EyeIcon className="w-3 h-3"/> : (gameMode === GameMode.CAMPAIGN || gameMode === GameMode.TOWER ? <MapIcon className="w-3 h-3" /> : null)} color="blue" />
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
                {(gameMode === GameMode.AI || gameMode === GameMode.CAMPAIGN || gameMode === GameMode.TOWER) && <Badge text={difficulty} icon={<LightningIcon className="w-3 h-3"/>} color={difficulty === Difficulty.BOSS ? 'red' : 'purple'} />}
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
      
      {/* Mobile Player Info Row */}
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

      <AnimatePresence>
         {aiTaunt && !winner && (
             <div className="md:hidden absolute top-28 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full flex justify-center">
                 <motion.div
                     initial={{ opacity: 0, y: 10, scale: 0.9 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.9 }}
                     className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-[90vw] text-center"
                 >
                     <span className="text-xs font-bold">"{aiTaunt}"</span>
                 </motion.div>
             </div>
         )}
      </AnimatePresence>

      <div className="flex-1 min-w-0 flex flex-col md:flex-row items-center justify-center w-full gap-4 md:gap-12 relative overflow-visible">
        
        <div className="hidden md:flex flex-col items-center relative shrink-0 p-2">
            <div className="relative">
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

                {/* Double Down Button for Player X - Moved to Side */}
                {isOnline && !isSpectator && myRole === Player.X && onlineRoom?.status === 'playing' && (
                    <motion.button
                        onClick={handleDoubleDown}
                        disabled={!canDoubleDown || !!onlineRoom?.doubleDown || !!onlineRoom?.doubleDownUsed}
                        initial={{ opacity: 0, x: -20, scale: 0.8 }}
                        animate={canDoubleDown && !onlineRoom?.doubleDown ? { 
                            opacity: 1, x: 0, scale: [1, 1.05, 1],
                            boxShadow: ["0 0 0px rgba(234, 179, 8, 0)", "0 0 15px rgba(234, 179, 8, 0.5)", "0 0 0px rgba(234, 179, 8, 0)"]
                        } : { opacity: 1, x: 0, scale: 1 }}
                        transition={{ 
                            opacity: { duration: 0.3 },
                            scale: { duration: 2, repeat: Infinity },
                            boxShadow: { duration: 2, repeat: Infinity }
                        }}
                        className={`absolute top-1/2 -translate-y-1/2 left-full ml-4 z-50 group flex items-center gap-3 px-4 py-2 rounded-xl border-2 transition-all min-w-max
                            ${!canDoubleDown || !!onlineRoom?.doubleDown || !!onlineRoom?.doubleDownUsed
                                ? 'bg-gray-800/90 border-gray-700 text-gray-500 cursor-not-allowed grayscale'
                                : 'bg-gradient-to-br from-yellow-500 to-orange-600 border-yellow-300 text-white shadow-xl hover:shadow-yellow-500/20'
                            }
                        `}
                    >
                        <div className={`p-1.5 rounded-full ${!canDoubleDown ? 'bg-gray-700' : 'bg-white/20'}`}>
                            <CoinIcon className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-[9px] uppercase font-bold tracking-wider opacity-90">
                                {onlineRoom?.doubleDownUsed 
                                    ? (onlineRoom.doubleDownAction === 'declined' ? "Declined" : "Doubled") 
                                    : (onlineRoom?.doubleDown ? `Waiting` : "Double Down")
                                }
                            </span>
                            <span className="text-xs font-black font-mono">
                                {onlineRoom?.anteAmount} <span className="text-[8px]">COINS</span>
                            </span>
                        </div>
                    </motion.button>
                )}
            </div>

            {isSinglePlayer && (
                <PowerUpBar 
                    powerUps={powerUps[Player.X]} 
                    onAction={(type) => {
                        if(type === 'undo') handleUndo();
                        else if(type === 'hint') handleHint();
                        else if(type === 'destroy') toggleDestroy();
                        else if(type === 'wall') toggleWall();
                        else if(type === 'double') toggleDouble();
                        else if(type === 'convert') toggleConvert();
                    }}
                    activePowerUp={activePowerUp}
                />
            )}

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
        
        {/* Central Game Area */}
        <div className="flex flex-col items-center justify-start md:justify-center h-full w-full max-h-full overflow-hidden py-2">
             
             {/* Info & Status Header */}
             <div className="shrink-0 w-full z-30 mb-2 relative flex flex-col items-center">
                 {/* Desktop: Horizontal Layout */}
                 <div className="hidden md:flex w-full items-center justify-center relative min-h-[60px]">
                     
                     {/* Game Status (Centered) */}
                     <div className="flex items-end justify-center gap-3 relative z-20">
                         <GameStatus 
                            isPaused={isPaused} 
                            pauseReason={onlineRoom?.doubleDown ? 'double_down' : 'disconnect'}
                            isOnline={isOnline} 
                            gameSettings={gameSettings} 
                            currentPlayerName={getPlayerName(currentPlayer)} 
                            activePowerUp={activePowerUp} 
                            pot={onlineRoom?.pot} 
                            turnTimer={turnTimer} 
                            turnDuration={TURN_DURATION} 
                         />
                     </div>

                     {/* Game Info (Left) */}
                     <div className="absolute left-0 top-1/2 translate-x-4 -translate-y-1/2 z-10">
                         <GameInfoDisplay 
                            gameMode={gameMode} 
                            settings={gameSettings} 
                            campaignLevel={campaignLevel} 
                            pot={onlineRoom?.pot}
                            className="hidden md:block" 
                         />
                     </div>
                 </div>

                 {/* Mobile Fallback: GameInfoDisplay is handled internally for visibility, 
                     but we ensure GameStatus renders if needed (it renders internally based on props). 
                     Since we only modified the desktop layout wrapper, the mobile view logic remains implicitly handled 
                     by the responsive classes inside GameStatus and MobilePlayerInfo.
                 */}
             </div>

             {/* Board Container - Centered */}
             <div className="flex-1 flex items-center justify-center w-full min-h-0 relative z-40">
                 <div className="max-h-full max-w-full aspect-square flex items-center justify-center">
                     <Board 
                        squares={board}
                        boardSize={boardSize}
                        onSquareClick={handleSquareClick}
                        winningLine={winningLine}
                        disabled={!!winner || (isOnline && !isMyTurnOnline)}
                        hintedSquare={hintedSquare}
                        skin={auth?.currentUser?.equippedSkin}
                     />
                 </div>
                 
                 <AnimatePresence>
                     {showCountdown && (
                         <GameStartCountdown onComplete={handleCountdownComplete} potAmount={onlineRoom?.pot} />
                     )}
                 </AnimatePresence>
             </div>
        </div>

        <div className="hidden md:flex flex-col items-center relative shrink-0 p-2">
            <div className="relative">
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

                {/* Double Down Button for Player O - Moved to Side */}
                {isOnline && !isSpectator && myRole === Player.O && onlineRoom?.status === 'playing' && (
                    <motion.button
                        onClick={handleDoubleDown}
                        disabled={!canDoubleDown || !!onlineRoom?.doubleDown || !!onlineRoom?.doubleDownUsed}
                        initial={{ opacity: 0, x: 20, scale: 0.8 }}
                        animate={canDoubleDown && !onlineRoom?.doubleDown ? { 
                            opacity: 1, x: 0, scale: [1, 1.05, 1],
                            boxShadow: ["0 0 0px rgba(234, 179, 8, 0)", "0 0 15px rgba(234, 179, 8, 0.5)", "0 0 0px rgba(234, 179, 8, 0)"]
                        } : { opacity: 1, x: 0, scale: 1 }}
                        transition={{ 
                            opacity: { duration: 0.3 },
                            scale: { duration: 2, repeat: Infinity },
                            boxShadow: { duration: 2, repeat: Infinity }
                        }}
                        className={`absolute top-1/2 -translate-y-1/2 right-full mr-4 z-50 group flex items-center gap-3 px-4 py-2 rounded-xl border-2 transition-all min-w-max
                            ${!canDoubleDown || !!onlineRoom?.doubleDown || !!onlineRoom?.doubleDownUsed
                                ? 'bg-gray-800/90 border-gray-700 text-gray-500 cursor-not-allowed grayscale'
                                : 'bg-gradient-to-br from-yellow-500 to-orange-600 border-yellow-300 text-white shadow-xl hover:shadow-yellow-500/20'
                            }
                        `}
                    >
                        <div className={`p-1.5 rounded-full ${!canDoubleDown ? 'bg-gray-700' : 'bg-white/20'}`}>
                            <CoinIcon className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-[9px] uppercase font-bold tracking-wider opacity-90">
                                {onlineRoom?.doubleDownUsed 
                                    ? (onlineRoom.doubleDownAction === 'declined' ? "Declined" : "Doubled") 
                                    : (onlineRoom?.doubleDown ? `Waiting` : "Double Down")
                                }
                            </span>
                            <span className="text-xs font-black font-mono">
                                {onlineRoom?.anteAmount} <span className="text-[8px]">COINS</span>
                            </span>
                        </div>
                    </motion.button>
                )}
            </div>
            
            <AnimatePresence>
                {aiTaunt && !winner && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-48 md:w-56 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-3 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 text-center"
                    >
                        <div className="text-xs font-bold leading-relaxed">"{aiTaunt}"</div>
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-gray-800 border-t border-l border-gray-200 dark:border-gray-700 transform rotate-45"></div>
                    </motion.div>
                )}
            </AnimatePresence>

             {gameSettings.blitzMode && (
                <div className={`absolute -bottom-10 left-1/2 -translate-x-1/2 font-mono text-xl font-bold px-3 py-1 rounded-lg border ${currentPlayer === Player.O ? 'bg-white/10 border-white/20 text-white shadow-lg shadow-white/10' : 'text-gray-500 border-transparent'}`}>
                    {formatTime(blitzTimers[Player.O])}
                </div>
            )}
            
            {isOnline && !isSpectator && myRole === Player.O && (
                 <div className="absolute top-full left-1/2 -translate-x-1/2 mt-6 z-50">
                     <EmojiBar onEmojiSelect={handleSendEmote} disabled={false} variant="row" />
                 </div>
            )}
        </div>

      </div>

      {isSinglePlayer && (
        <div className="md:hidden w-full px-8 mb-4">
             <PowerUpBar 
                powerUps={powerUps[Player.X]} 
                onAction={(type) => {
                    if(type === 'undo') handleUndo();
                    else if(type === 'hint') handleHint();
                    else if(type === 'destroy') toggleDestroy();
                    else if(type === 'wall') toggleWall();
                    else if(type === 'double') toggleDouble();
                    else if(type === 'convert') toggleConvert();
                }}
                activePowerUp={activePowerUp}
            />
        </div>
      )}

      {/* Login Modal for Guests */}
      <AnimatePresence>
        {showLoginModal && (
            <Modal onClose={() => setShowLoginModal(false)} className="max-w-md">
                 <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Sign In to Play</h2>
                    <p className="text-gray-400 text-sm">Create an account to join the action.</p>
                 </div>
                 
                 <AnimatePresence mode="wait">
                    {authView === 'login' ? (
                        <motion.div key="login" initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}}>
                            <Login onSwitchToRegister={() => setAuthView('register')} />
                        </motion.div>
                    ) : (
                        <motion.div key="register" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:20}}>
                            <Register onSwitchToLogin={() => setAuthView('login')} />
                        </motion.div>
                    )}
                 </AnimatePresence>
            </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

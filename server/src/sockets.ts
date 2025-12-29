import { Server, Socket } from 'socket.io';
import { prisma } from './db';
import { verifyToken } from './auth';
import { 
    ClientToServerEvents, 
    ServerToClientEvents, 
    Player, 
    GameSettings, 
    Room, 
    PlayerSeat, 
    ChatMessage, 
    WagerTier,
    SquareValue,
    User,
    MatchRecord
} from './types';
import { checkWinner, calculateElo, calculateDrawElo, checkBadges, countThreats, MASTERY_CHALLENGES, calculateLevelProgress, processMatchQuests } from './gameLogic';
import { socketService } from './socketService';
import { notificationService } from './services/notification';
import { exclude, getQuestData } from './utils/routeHelpers';

const rooms = new Map<string, Room>();

const rateLimits = new Map<string, number[]>();
const isRateLimited = (userId: string, limit = 20, windowMs = 5000): boolean => {
    const now = Date.now();
    let timestamps = rateLimits.get(userId) || [];
    timestamps = timestamps.filter(t => now - t < windowMs);
    timestamps.push(now);
    rateLimits.set(userId, timestamps);
    return timestamps.length > limit;
};

const sanitizeChatText = (text: string): string => {
    return text ? text.trim().substring(0, 500) : "";
};

const broadcastRoomUpdate = (io: Server, roomId: string) => {
    const room = rooms.get(roomId);
    if (room) {
        io.to(roomId).emit('roomUpdate', room);
    }
};

const getDefaultSettings = (): GameSettings => ({
    boardSize: 3,
    winLength: 3,
    obstacles: false,
    variant: 'Classic' as any,
    difficulty: 'Medium' as any,
    blitzMode: false,
    powerUps: true,
    turnDuration: 30,
    startingPlayer: 'random'
});

const updateLastRoomId = async (userId: string, roomId: string | null) => {
    try {
        if (userId.startsWith('guest_')) return; 
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { preferences: true } });
        if (user) {
            const prefs = (user.preferences as Record<string, any>) || {};
            await prisma.user.update({
                where: { id: userId },
                data: { preferences: { ...prefs, lastRoomId: roomId } }
            });
        }
    } catch (e) {
        console.error(`Failed to update lastRoomId for user ${userId}:`, e);
    }
};

// Helper to get fresh user data
const getFreshUser = async (userId: string, isGuest: boolean, initialUser: any) => {
    if (isGuest) return initialUser;
    try {
        const fresh = await prisma.user.findUnique({ where: { id: userId } });
        return fresh || initialUser;
    } catch (e) {
        return initialUser;
    }
};

export const initializeSocketServer = (io: Server<ClientToServerEvents, ServerToClientEvents>) => {
    socketService.init(io);

    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        
        if (token) {
            try {
                const decoded = verifyToken(token);
                (socket as any).user = { ...decoded, isGuest: false };
                socketService.addSocket(decoded.userId, socket.id);
                return next();
            } catch (err) {
                return next(new Error("Invalid token"));
            }
        }

        const guestId = `guest_${Math.random().toString(36).substr(2, 9)}`;
        (socket as any).user = {
            userId: guestId,
            email: '',
            isGuest: true,
            displayName: `Spectator ${Math.floor(Math.random() * 1000)}`
        };
        next();
    });

    io.on('connection', async (socket) => {
        const socketUser = (socket as any).user;
        const userId = socketUser.userId;
        const isGuest = socketUser.isGuest;

        let user: any;

        if (!isGuest) {
            try {
                user = await prisma.user.findUnique({ where: { id: userId } });
                if (!user) {
                    socket.disconnect();
                    return;
                }
            } catch (dbError) {
                console.error(`Socket connection DB error for user ${userId}:`, dbError);
                socket.disconnect();
                return;
            }

            socket.join(userId);

            const friends = await prisma.friendship.findMany({
                where: { OR: [{ senderId: userId }, { receiverId: userId }], status: 'ACCEPTED' }
            });
            friends.forEach((f: any) => {
                const fid = f.senderId === userId ? f.receiverId : f.senderId;
                socketService.emitToUser(fid, 'friendStatus', { userId, status: 'ONLINE' });
            });
        } else {
            user = {
                id: userId,
                displayName: socketUser.displayName,
                avatar: 'avatar-1',
                coins: 0,
                elo: 0,
                badges: [],
                isGuest: true,
                emailVerified: false
            };
        }

        socket.on('createRoom', async ({ settings, wagerTier }, callback) => {
            if (isGuest) return callback({ success: false, error: "Guests cannot create rooms." });
            if (isRateLimited(userId)) return callback({ success: false, error: "Rate limit exceeded" });

            // Refresh user data to ensure latest stats/inventory/frames
            user = await getFreshUser(userId, isGuest, user);

            const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            let ante = 0;
            if (wagerTier === 'bronze') ante = 50;
            if (wagerTier === 'silver') ante = 250;
            if (wagerTier === 'gold') ante = 1000;

            if (user.coins < ante) {
                return callback({ success: false, error: "Insufficient funds" });
            }

            const finalSettings = { ...getDefaultSettings(), ...settings };
            let initialPlayer = Player.X;
            if (finalSettings.startingPlayer === 'O') initialPlayer = Player.O;
            else if (finalSettings.startingPlayer === 'random') initialPlayer = Math.random() < 0.5 ? Player.X : Player.O;

            const room: Room = {
                id: roomId,
                status: 'waiting',
                players: [{ user: user as any, role: Player.X, connected: true }],
                initialBoard: Array((settings.boardSize || 3) ** 2).fill(null),
                board: Array((settings.boardSize || 3) ** 2).fill(null),
                moves: [],
                chat: [],
                currentPlayer: initialPlayer,
                winner: null,
                winningLine: null,
                gameSettings: finalSettings,
                hostId: userId,
                rematchRequested: {},
                anteAmount: ante,
                pot: 0, 
                wagerConfirmed: {},
                participants: { [Player.X]: user as any }
            };

            if (room.gameSettings.obstacles) {
                const size = room.gameSettings.boardSize;
                let obstacleCount = Math.max(1, Math.floor(size * size / 10));
                while (obstacleCount > 0) {
                    const idx = Math.floor(Math.random() * room.board.length);
                    if (room.board[idx] === null) {
                        room.board[idx] = 'OBSTACLE';
                        room.initialBoard[idx] = 'OBSTACLE';
                        obstacleCount--;
                    }
                }
            }

            rooms.set(roomId, room);
            await updateLastRoomId(userId, roomId);
            await socket.join(roomId);
            broadcastRoomUpdate(io, roomId);
            
            callback({ success: true, roomId });
        });

        socket.on('joinRoom', async (roomId, options, callback) => {
            const room = rooms.get(roomId);
            if (!room) return callback({ success: false, error: "Room not found" });

            const isSpectator = options?.asSpectator;

            // Refresh user data for joiner
            if (!isGuest) {
                user = await getFreshUser(userId, isGuest, user);
            }

            const existingRoom = Array.from(rooms.values()).find(r => 
                r.id !== roomId && 
                r.players.some(p => p.user.id === userId && p.role !== 'spectator' && p.connected) &&
                (r.status === 'playing' || r.status === 'confirming_wager')
            );

            if (existingRoom && !isSpectator) {
                return callback({ success: false, error: "You are already in an active match!" });
            }

            if (!isSpectator) {
                if (isGuest) return callback({ success: false, error: "Guests must sign in to play." });

                const existingSeat = room.players.find(p => p.user.id === userId);
                if (existingSeat) {
                    // Update user info in seat on rejoin to refresh frame/avatar
                    existingSeat.user = user as any;
                    existingSeat.connected = true;
                    await updateLastRoomId(userId, roomId);
                    await socket.join(roomId);
                    broadcastRoomUpdate(io, roomId);
                    return callback({ success: true });
                }

                if (room.players.filter(p => p.role !== 'spectator').length >= 2) {
                    return callback({ success: false, error: "Room full" });
                }

                if (room.anteAmount && room.anteAmount > 0) {
                    if (user.coins < room.anteAmount) return callback({ success: false, error: "Insufficient funds for ante" });
                }

                room.players.push({ user: user as any, role: Player.O, connected: true });
                room.participants![Player.O] = user as any;
                room.status = 'confirming_wager'; 
                
                await updateLastRoomId(userId, roomId);
            } else {
                room.players.push({ user: user as any, role: 'spectator', connected: true });
            }

            await socket.join(roomId);
            broadcastRoomUpdate(io, roomId);
            callback({ success: true });
        });

        socket.on('confirmWager', async (roomId) => {
            if (isGuest) return;
            const room = rooms.get(roomId);
            if (!room) return;
            
            const playerSeat = room.players.find(p => p.user.id === userId);
            if (!playerSeat || (playerSeat.role !== Player.X && playerSeat.role !== Player.O)) return;
            
            const role = playerSeat.role;

            if (room.wagerConfirmed[role]) return;

            const dbUser = await prisma.user.findUnique({ where: { id: userId } });
            if (!dbUser || dbUser.coins < (room.anteAmount || 0)) {
                return;
            }

            try {
                const updatedUser = await prisma.user.update({
                    where: { id: userId },
                    data: { coins: { decrement: room.anteAmount || 0 } }
                });

                room.wagerConfirmed[role] = true;
                room.pot += (room.anteAmount || 0); 

                socketService.emitToUser(userId, 'walletUpdate', { newBalance: updatedUser.coins });

                if (room.wagerConfirmed[Player.X] && room.wagerConfirmed[Player.O]) {
                    broadcastRoomUpdate(io, roomId);

                    setTimeout(() => {
                        const currentRoom = rooms.get(roomId);
                        if (currentRoom && 
                            currentRoom.status === 'confirming_wager' &&
                            currentRoom.wagerConfirmed[Player.X] && 
                            currentRoom.wagerConfirmed[Player.O]
                        ) {
                            currentRoom.status = 'playing';
                            currentRoom.lastMoveTime = Date.now();
                            if (currentRoom.gameSettings.blitzMode) {
                                currentRoom.timeRemaining = {
                                    [Player.X]: currentRoom.gameSettings.blitzDuration || 180,
                                    [Player.O]: currentRoom.gameSettings.blitzDuration || 180
                                };
                            }
                            broadcastRoomUpdate(io, roomId);
                        }
                    }, 3000);
                } else {
                    broadcastRoomUpdate(io, roomId);
                }

            } catch (e) {
                console.error("Wager confirmation failed", e);
            }
        });

        socket.on('makeMove', async ({ roomId, index }, callback) => {
            if (isGuest) return callback({ success: false, error: "Guests cannot play." });
            const room = rooms.get(roomId);
            if (!room || room.status !== 'playing' || room.isPaused) {
                if (room) socket.emit('roomUpdate', room);
                return callback({ success: false, error: "Invalid game state" });
            }

            const player = room.players.find(p => p.user.id === userId);
            if (!player || player.role !== room.currentPlayer) return callback({ success: false, error: "Not your turn" });

            if (index < 0 || index >= room.board.length || room.board[index] !== null) return callback({ success: false, error: "Invalid move" });

            if (room.gameSettings.blitzMode && room.timeRemaining && room.lastMoveTime) {
                const elapsed = (Date.now() - room.lastMoveTime) / 1000;
                room.timeRemaining[room.currentPlayer] = Math.max(0, room.timeRemaining[room.currentPlayer] - elapsed);
            }

            room.board[index] = player.role;
            room.moves.push({ player: player.role, index, moveNumber: room.moves.length });
            
            const result = checkWinner(room.board, room.gameSettings.boardSize, room.gameSettings.winLength);
            
            if (result.winner) {
                room.winner = result.winner;
                room.winningLine = result.line;
                room.status = 'finished';
                
                broadcastRoomUpdate(io, roomId);
                handleGameEnd(room, io).catch(err => console.error("Game End Error", err));
            } else {
                room.currentPlayer = room.currentPlayer === Player.X ? Player.O : Player.X;
                room.lastMoveTime = Date.now();
                broadcastRoomUpdate(io, roomId);
            }

            callback({ success: true });
        });

        socket.on('claimTimeout', async (roomId) => {
            if (isGuest) return;
            const room = rooms.get(roomId);
            
            if (room && (room.status !== 'playing' || room.winner || room.isPaused)) {
                socket.emit('roomUpdate', room);
                return;
            }

            if (!room) return;

            const now = Date.now();
            
            if (room.rematchOffer) {
                if (now > room.rematchOffer.expiresAt) {
                    room.rematchOffer = undefined;
                    room.rematchRequested = {};
                    io.to(roomId).emit('rematchDeclined');
                    broadcastRoomUpdate(io, roomId);
                }
                return;
            }

            if (room.doubleDown) {
                if (now > room.doubleDown.expiresAt) {
                    room.doubleDown = undefined;
                    room.isPaused = false;
                    
                    if (room.pausedAt && room.lastMoveTime) {
                        const pauseDuration = Date.now() - room.pausedAt;
                        room.lastMoveTime += pauseDuration;
                        room.pausedAt = undefined;
                    }
                    room.doubleDownUsed = true;
                    room.doubleDownAction = 'declined';
                    broadcastRoomUpdate(io, roomId);
                }
                return;
            }

            const lastMove = room.lastMoveTime || now;
            let isTimeout = false;

            if (room.gameSettings.blitzMode) {
                const timeBank = room.timeRemaining?.[room.currentPlayer] || 0;
                const elapsedSeconds = (now - lastMove) / 1000;
                if (timeBank - elapsedSeconds <= 1.5) {
                    isTimeout = true;
                }
            } else {
                const turnDurationMs = (room.gameSettings.turnDuration || 30) * 1000;
                if (now - lastMove >= turnDurationMs + 1500) {
                    isTimeout = true;
                }
            }

            if (isTimeout) {
                room.winner = room.currentPlayer === Player.X ? Player.O : Player.X;
                room.winReason = 'timeout';
                room.status = 'finished';
                
                broadcastRoomUpdate(io, roomId);
                handleGameEnd(room, io).catch(err => console.error("Game End Timeout Error", err));
            }
        });

        socket.on('sendChat', async ({ roomId, text, replyTo }) => {
            if (isGuest) return; 
            if (isRateLimited(userId)) return;
            const sanitized = sanitizeChatText(text);
            if (!sanitized) return;
            
            const room = rooms.get(roomId);
            if (room) {
                const qData = getQuestData(user);
                const message: ChatMessage = {
                    id: Math.random().toString(36).substr(2, 9),
                    senderId: userId,
                    senderName: user.displayName,
                    senderAvatar: user.avatar,
                    senderFrame: qData.equippedFrame, // Include frame
                    senderVerified: user.emailVerified,
                    text: sanitized,
                    timestamp: Date.now(),
                    type: 'user',
                    channel: 'game',
                    replyTo
                };
                room.chat.push(message);
                io.to(roomId).emit('chatMessage', message);
            }
        });

        socket.on('sendEmote', ({ roomId, emoji }) => {
            if (isRateLimited(userId)) return;
            if (!emoji || emoji.length > 10) return;
            io.to(roomId).emit('emote', { senderId: userId, emoji });
        });

        socket.on('sendInvite', async (friendId, roomId) => {
            if (isGuest) return;
            if (isRateLimited(userId)) return;
            
            const friendRoom = Array.from(rooms.values()).find(r => 
                r.players.some(p => p.user.id === friendId && p.role !== 'spectator' && p.connected) &&
                (r.status === 'playing' || r.status === 'confirming_wager')
            );

            if (friendRoom) {
                return;
            }

            const room = rooms.get(roomId);
            const settings = room?.gameSettings;

            socketService.emitToUser(friendId, 'inviteReceived', { hostName: user.displayName, roomId });
            
            const dbMessage = await socketService.persistChatMessage({
                senderId: userId,
                receiverId: friendId,
                text: "⚔️ Duel Challenge!",
                type: 'system',
                inviteData: { roomId, settings }
            });

            if (dbMessage) {
                socketService.emitToUser(friendId, 'directMessage', dbMessage);
                socketService.emitToUser(userId, 'directMessage', dbMessage);
            }
        });

        socket.on('leaveRoom', async (roomId) => {
            const room = rooms.get(roomId);
            if (room) {
                const playerIndex = room.players.findIndex(p => p.user.id === userId);
                if (playerIndex !== -1) {
                    const player = room.players[playerIndex];
                    
                    if (room.status === 'confirming_wager' && player.role !== 'spectator' && !isGuest) {
                        if (room.wagerConfirmed[player.role]) {
                             try {
                                await prisma.user.update({
                                    where: { id: userId },
                                    data: { coins: { increment: room.anteAmount || 0 } }
                                });
                                socketService.emitToUser(userId, 'walletUpdate', { newBalance: (await prisma.user.findUnique({where:{id:userId}}))?.coins });
                                room.pot = Math.max(0, room.pot - (room.anteAmount || 0));
                                room.wagerConfirmed[player.role] = false;
                             } catch(e) { console.error("Refund failed during leaveRoom", e); }
                        }
                    }

                    if (player.role === 'spectator') {
                        room.players.splice(playerIndex, 1);
                    } else {
                        player.connected = false;
                        if (room.status === 'playing' && !room.winner) {
                            room.isPaused = true; 
                            room.pausedAt = Date.now();
                        }
                    }
                }
                
                await updateLastRoomId(userId, null);

                socket.leave(roomId);
                broadcastRoomUpdate(io, roomId);
                
                if (room.players.every(p => !p.connected && p.role !== 'spectator')) {
                    if(room.players.filter(p=>p.role === 'spectator').length === 0) {
                        rooms.delete(roomId);
                    }
                }
            }
        });

        socket.on('sendDirectMessage', async ({ toUserId, text, replyTo, replayData, stickerId }) => {
          if (isGuest) return;
          if (isRateLimited(userId)) return;

          const sanitized = sanitizeChatText(text);

          const dbMessage = await socketService.persistChatMessage({
            senderId: userId,
            receiverId: toUserId,
            text: sanitized,
            type: 'user',
            replyTo,
            replayData,
            stickerId,
          });

          if (dbMessage) {
            socketService.emitToUser(toUserId, 'directMessage', dbMessage);
            socketService.emitToUser(userId, 'directMessage', dbMessage);

            await notificationService.send(
              toUserId,
              'chat',
              user.displayName,
              sanitized || (stickerId ? 'Sent a sticker' : 'Sent a message'),
              {
                senderId: userId,
                senderAvatar: user.avatar,
                messageData: dbMessage,
                sender: {
                  id: user.id,
                  displayName: user.displayName,
                  avatar: user.avatar,
                  questData: getQuestData(user) // Send frame data in notification
                },
              }
            );
          }
        });

        socket.on('markConversationAsRead', async (partnerId) => {
            if (isGuest) return;
            const readAt = Date.now();
            
            socketService.emitToUser(partnerId, 'messagesRead', { conversationPartnerId: userId, readByUserId: userId, readAt, partnerId: userId });
            socketService.emitToUser(userId, 'messagesRead', { conversationPartnerId: partnerId, readByUserId: userId, readAt, partnerId });

            await socketService.markMessagesAsRead(userId, partnerId);
        });

        socket.on('typing', ({ channel, roomId, toUserId }) => {
            if (isGuest) return;
            if (channel === 'game' && roomId) socket.to(roomId).emit('userTyping', { userId, displayName: user.displayName, channel, roomId });
            if (channel === 'dm' && toUserId) socketService.emitToUser(toUserId, 'userTyping', { userId, displayName: user.displayName, channel });
        });

        socket.on('stopTyping', ({ channel, roomId, toUserId }) => {
            if (isGuest) return;
            if (channel === 'game' && roomId) socket.to(roomId).emit('userStoppedTyping', { userId, channel, roomId });
            if (channel === 'dm' && toUserId) socketService.emitToUser(toUserId, 'userStoppedTyping', { userId, channel });
        });

        socket.on('requestFriendStatuses', async () => {
            if (isGuest) return;
            const friends = await prisma.friendship.findMany({
                where: { OR: [{ senderId: userId }, { receiverId: userId }], status: 'ACCEPTED' }
            });
            friends.forEach((f: any) => {
                const fid = f.senderId === userId ? f.receiverId : f.senderId;
                const isOnline = socketService.isUserOnline(fid);
                const inGame = Array.from(rooms.values()).some(r => r.players.some(p => p.user.id === fid && p.role !== 'spectator' && p.connected));
                const status = inGame ? 'IN_GAME' : (isOnline ? 'ONLINE' : 'OFFLINE'); 
                
                socket.emit('friendStatus', { userId: fid, status });
            });
        });

        socket.on('disconnect', () => {
            if (!isGuest) {
                socketService.removeSocket(userId, socket.id);
            }
        });
        
        socket.on('getRooms', () => {
            const list = Array.from(rooms.values()).filter(r => r.status === 'playing' || r.status === 'waiting');
            socket.emit('roomsList', list);
        });
        
        socket.on('requestRematch', async (roomId) => {
            if (isGuest) return;
            const room = rooms.get(roomId);
            if (room && room.winner) {
                const playerSeat = room.players.find(p => p.user.id === userId);
                if (!playerSeat) return;
                const role = playerSeat.role;
                if (!role || (role !== Player.X && role !== Player.O)) return;

                if (room.rematchOffer && room.rematchOffer.from !== role) {
                    const pX = room.players.find(p => p.role === Player.X);
                    const pO = room.players.find(p => p.role === Player.O);
                    const ante = room.anteAmount || 0;

                    if (ante > 0 && pX && pO) {
                        try {
                            const [uX, uO] = await prisma.$transaction([
                                prisma.user.update({ where: { id: pX.user.id }, data: { coins: { decrement: ante } } }),
                                prisma.user.update({ where: { id: pO.user.id }, data: { coins: { decrement: ante } } })
                            ]);
                            
                            socketService.emitToUser(pX.user.id, 'walletUpdate', { newBalance: uX.coins });
                            socketService.emitToUser(pO.user.id, 'walletUpdate', { newBalance: uO.coins });
                        } catch (e) {
                            console.error("Rematch deduction failed", e);
                        }
                    }

                    room.board = Array(room.gameSettings.boardSize ** 2).fill(null);
                    room.moves = [];
                    room.winner = null;
                    room.winningLine = null;
                    room.currentPlayer = room.winner === 'draw' ? (Math.random() < 0.5 ? Player.X : Player.O) : (room.winner === Player.X ? Player.O : Player.X);
                    room.status = 'playing';
                    room.rematchRequested = {};
                    room.rematchOffer = undefined; 
                    
                    room.pot = ante * 2; 
                    
                    room.doubleDownUsed = false;
                    room.doubleDown = undefined;
                    delete room.doubleDownAction;
                    
                    room.lastMoveTime = Date.now();
                    room.isPaused = false;
                    room.pausedAt = undefined;
                    
                    if (room.gameSettings.blitzMode) {
                        room.timeRemaining = {
                            [Player.X]: room.gameSettings.blitzDuration || 180,
                            [Player.O]: room.gameSettings.blitzDuration || 180
                        };
                    }

                    broadcastRoomUpdate(io, roomId);
                    io.to(roomId).emit('gameReset', room);
                } else if (!room.rematchOffer) {
                    room.rematchOffer = {
                        from: role,
                        expiresAt: Date.now() + 30000 // 30 seconds
                    };
                    room.rematchRequested[role] = true;
                    broadcastRoomUpdate(io, roomId);

                    setTimeout(() => {
                        const currentRoom = rooms.get(roomId);
                        if (currentRoom && currentRoom.rematchOffer && Date.now() > currentRoom.rematchOffer.expiresAt) {
                            currentRoom.rematchOffer = undefined;
                            currentRoom.rematchRequested = {};
                            io.to(roomId).emit('rematchDeclined');
                            broadcastRoomUpdate(io, roomId);
                        }
                    }, 31000);
                }
            }
        });

        socket.on('declineRematch', (roomId) => {
            if (isGuest) return;
            const room = rooms.get(roomId);
            if (room && room.rematchOffer) {
                room.rematchOffer = undefined;
                room.rematchRequested = {};
                io.to(roomId).emit('rematchDeclined');
                broadcastRoomUpdate(io, roomId);
            }
        });

        socket.on('doubleDownRequest', (roomId) => {
            if (isGuest) return;
            const room = rooms.get(roomId);
            if (!room || room.doubleDownUsed) return;
            const playerRole = room.players.find(p => p.user.id === userId)?.role;
            if (!playerRole || playerRole === 'spectator') return;

            room.isPaused = true;
            room.pausedAt = Date.now();
            room.doubleDown = { offering: playerRole, expiresAt: Date.now() + 30000 };
            
            broadcastRoomUpdate(io, roomId);
            
            setTimeout(() => {
                const currentRoom = rooms.get(roomId);
                if (currentRoom && currentRoom.doubleDown) {
                    currentRoom.doubleDown = undefined;
                    currentRoom.isPaused = false;
                    if (currentRoom.pausedAt && currentRoom.lastMoveTime) {
                        const pauseDuration = Date.now() - currentRoom.pausedAt;
                        currentRoom.lastMoveTime += pauseDuration;
                        currentRoom.pausedAt = undefined;
                    }
                    currentRoom.doubleDownUsed = true; 
                    currentRoom.doubleDownAction = 'declined';
                    broadcastRoomUpdate(io, roomId);
                }
            }, 30000);
        });

        socket.on('doubleDownResponse', async (roomId, accepted) => {
            if (isGuest) return;
            const room = rooms.get(roomId);
            if (!room || !room.doubleDown) return;
            const playerRole = room.players.find(p => p.user.id === userId)?.role;
            if (!playerRole || playerRole === room.doubleDown.offering) return;

            if (room.pausedAt && room.lastMoveTime) {
                const pauseDuration = Date.now() - room.pausedAt;
                room.lastMoveTime += pauseDuration; 
            }
            room.isPaused = false;
            room.pausedAt = undefined;

            if (accepted) {
                const pX = room.players.find(p => p.role === Player.X);
                const pO = room.players.find(p => p.role === Player.O);
                if (pX && pO && room.anteAmount) {
                    try {
                        const [uX, uO] = await prisma.$transaction([
                            prisma.user.update({ where: { id: pX.user.id }, data: { coins: { decrement: room.anteAmount } } }),
                            prisma.user.update({ where: { id: pO.user.id }, data: { coins: { decrement: room.anteAmount } } })
                        ]);
                        socketService.emitToUser(pX.user.id, 'walletUpdate', { newBalance: uX.coins });
                        socketService.emitToUser(pO.user.id, 'walletUpdate', { newBalance: uO.coins });
                        room.pot += (room.anteAmount * 2);
                        room.doubleDown = undefined; 
                        room.doubleDownUsed = true;
                        room.doubleDownAction = 'accepted';
                    } catch (e) {
                        console.error("Double down transaction failed", e);
                    }
                }
            } else {
                room.doubleDown = undefined; 
                room.doubleDownUsed = true;
                room.doubleDownAction = 'declined';
            }
            broadcastRoomUpdate(io, roomId);
        });

    });
};

async function handleGameEnd(room: Room, io: Server) {
    if (!room.winner) return;

    const pX = room.players.find(p => p.role === Player.X);
    const pO = room.players.find(p => p.role === Player.O);
    if (!pX || !pO) return;

    const winnerSeat = room.winner === 'draw' ? null : (room.winner === Player.X ? pX : pO);
    const loserSeat = room.winner === 'draw' ? null : (room.winner === Player.X ? pO : pX);

    let pXCoinChange = 0;
    let pOCoinChange = 0;

    const { winnerNew, loserNew } = calculateElo(
        winnerSeat ? winnerSeat.user.elo : pX.user.elo, 
        loserSeat ? loserSeat.user.elo : pO.user.elo
    );
    
    let pXNewElo = pX.user.elo;
    let pONewElo = pO.user.elo;

    if (room.winner === 'draw') {
        const drawResult = calculateDrawElo(pX.user.elo, pO.user.elo);
        pXNewElo = drawResult.p1New;
        pONewElo = drawResult.p2New;
    } else if (winnerSeat && loserSeat) {
        if (room.winner === Player.X) {
            pXNewElo = winnerNew;
            pONewElo = loserNew;
        } else {
            pONewElo = winnerNew;
            pXNewElo = loserNew;
        }
    }

    if (room.pot > 0) {
        if (room.winner === 'draw') {
            const split = Math.floor(room.pot / 2);
            pXCoinChange = split;
            pOCoinChange = split;
        } else if (winnerSeat) {
            if (winnerSeat.role === Player.X) {
                pXCoinChange = room.pot;
            } else {
                pOCoinChange = room.pot;
            }
        }
    }

    const pXXP = 10 + (room.winner === Player.X ? 25 : 0);
    const pOXP = 10 + (room.winner === Player.O ? 25 : 0);

    const dbUserX = await prisma.user.findUnique({ where: { id: pX.user.id }, select: { level: true, xp: true, questData: true } });
    const dbUserO = await prisma.user.findUnique({ where: { id: pO.user.id }, select: { level: true, xp: true, questData: true } });

    if (!dbUserX || !dbUserO) return;

    const pXProgress = calculateLevelProgress(dbUserX.level, dbUserX.xp, pXXP);
    const pOProgress = calculateLevelProgress(dbUserO.level, dbUserO.xp, pOXP);

    const oldEloX = pX.user.elo;
    const oldEloO = pO.user.elo;

    const txOps: any[] = [];

    const qDataX = getQuestData(dbUserX);
    if(qDataX.quests) {
        qDataX.quests = processMatchQuests(qDataX.quests, {
            winner: room.winner!,
            playerRole: Player.X,
            gameMode: 'ONLINE' as any,
            difficulty: room.gameSettings.difficulty,
            moveCount: room.moves.length
        });
    }

    const qDataO = getQuestData(dbUserO);
    if(qDataO.quests) {
        qDataO.quests = processMatchQuests(qDataO.quests, {
            winner: room.winner!,
            playerRole: Player.O,
            gameMode: 'ONLINE' as any,
            difficulty: room.gameSettings.difficulty,
            moveCount: room.moves.length
        });
    }

    txOps.push(prisma.user.update({
        where: { id: pX.user.id },
        data: { 
            elo: pXNewElo, 
            wins: { increment: room.winner === Player.X ? 1 : 0 }, 
            losses: { increment: room.winner === Player.O ? 1 : 0 }, 
            draws: { increment: room.winner === 'draw' ? 1 : 0 },
            coins: { increment: pXCoinChange },
            xp: pXProgress.newXp,
            level: pXProgress.newLevel,
            questData: qDataX 
        }
    }));

    txOps.push(prisma.user.update({
        where: { id: pO.user.id },
        data: { 
            elo: pONewElo, 
            wins: { increment: room.winner === Player.O ? 1 : 0 }, 
            losses: { increment: room.winner === Player.X ? 1 : 0 }, 
            draws: { increment: room.winner === 'draw' ? 1 : 0 },
            coins: { increment: pOCoinChange },
            xp: pOProgress.newXp,
            level: pOProgress.newLevel,
            questData: qDataO
        }
    }));

    txOps.push(prisma.match.create({
        data: {
            userId: pX.user.id,
            gameMode: 'ONLINE',
            winner: room.winner,
            opponentName: pO.user.displayName,
            gameSettings: { ...room.gameSettings, winReason: room.winReason },
            initialBoard: room.initialBoard,
            playerRole: Player.X,
            winReason: room.winReason || 'standard',
            moves: { create: room.moves.map(m => ({ player: m.player, index: m.index, moveNumber: m.moveNumber })) }
        }
    }));

    txOps.push(prisma.match.create({
        data: {
            userId: pO.user.id,
            gameMode: 'ONLINE',
            winner: room.winner,
            opponentName: pX.user.displayName,
            gameSettings: { ...room.gameSettings, winReason: room.winReason },
            initialBoard: room.initialBoard,
            playerRole: Player.O,
            winReason: room.winReason || 'standard',
            moves: { create: room.moves.map(m => ({ player: m.player, index: m.index, moveNumber: m.moveNumber })) }
        }
    }));

    try {
        const results = await prisma.$transaction(txOps);
        
        const userX = results[0] as User;
        const userO = results[1] as User;
        const matchX = results[2] as MatchRecord;
        const matchO = results[3] as MatchRecord;

        socketService.emitToUser(pX.user.id, 'walletUpdate', { newBalance: userX.coins });
        socketService.emitToUser(pO.user.id, 'walletUpdate', { newBalance: userO.coins });
        
        socketService.emitToUser(pX.user.id, 'questUpdate', { quests: qDataX.quests });
        socketService.emitToUser(pO.user.id, 'questUpdate', { quests: qDataO.quests });

        pX.user.elo = pXNewElo;
        pO.user.elo = pONewElo;
        
        const reportX = { total: pXXP, elo: pXNewElo - oldEloX, coinChange: pXCoinChange };
        const reportO = { total: pOXP, elo: pONewElo - oldEloO, coinChange: pOCoinChange };
        
        room.xpReport = {
            [Player.X]: reportX as any,
            [Player.O]: reportO as any
        };

        broadcastRoomUpdate(io, room.id);

        const ante = room.anteAmount || 0;
        let pXNet = 0;
        let pONet = 0;

        if (room.winner === Player.X) {
            pXNet = room.pot - ante;
            pONet = -ante;
        } else if (room.winner === Player.O) {
            pONet = room.pot - ante;
            pXNet = -ante;
        } else {
            pXNet = Math.floor(room.pot / 2) - ante;
            pONet = Math.floor(room.pot / 2) - ante;
        }

        const resultText = room.winner === 'draw' 
            ? "Match ended in a DRAW." 
            : `Match Result: ${room.winner === Player.X ? pX.user.displayName : pO.user.displayName} WON.`;

        await socketService.persistChatMessage({
            senderId: pX.user.id,
            receiverId: pO.user.id,
            text: resultText,
            type: 'system',
            replayData: {
                matchId: matchX.id,
                winner: room.winner,
                opponentName: pO.user.displayName,
                userRole: Player.X
            }
        });

        await notificationService.send(
            pX.user.id,
            'match_result',
            room.winner === 'draw' ? 'Match Draw' : (room.winner === Player.X ? 'Victory!' : 'Defeat'),
            room.winner === 'draw' 
                ? `Draw against ${pO.user.displayName}.`
                : (room.winner === Player.X 
                    ? `You defeated ${pO.user.displayName} and won ${pXNet} coins!` 
                    : `You lost to ${pO.user.displayName}. Lost ${ante} coins.`),
            {
                matchId: matchX.id,
                result: room.winner === 'draw' ? 'draw' : (room.winner === Player.X ? 'win' : 'loss'),
                opponentName: pO.user.displayName,
                eloChange: pXNewElo - oldEloX,
                coinChange: pXNet,
                sender: { id: pO.user.id, displayName: pO.user.displayName, avatar: pO.user.avatar, questData: getQuestData(pO.user) }
            }
        );

        await notificationService.send(
            pO.user.id,
            'match_result',
            room.winner === 'draw' ? 'Match Draw' : (room.winner === Player.O ? 'Victory!' : 'Defeat'),
            room.winner === 'draw' 
                ? `Draw against ${pX.user.displayName}.`
                : (room.winner === Player.O 
                    ? `You defeated ${pX.user.displayName} and won ${pONet} coins!` 
                    : `You lost to ${pX.user.displayName}. Lost ${ante} coins.`),
            {
                matchId: matchO.id,
                result: room.winner === 'draw' ? 'draw' : (room.winner === Player.O ? 'win' : 'loss'),
                opponentName: pX.user.displayName,
                eloChange: pONewElo - oldEloO,
                coinChange: pONet,
                sender: { id: pX.user.id, displayName: pX.user.displayName, avatar: pX.user.avatar, questData: getQuestData(pX.user) }
            }
        );
        
        await updateLastRoomId(pX.user.id, null);
        await updateLastRoomId(pO.user.id, null);

    } catch (e) {
        console.error("Game End DB Transaction Failed:", e);
    }
}
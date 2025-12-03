
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
    SquareValue
} from './types';
import { checkWinner, calculateElo, calculateDrawElo, checkBadges, countThreats, MASTERY_CHALLENGES } from './gameLogic';
import { socketService } from './socketService';
import { notificationService } from './services/notification';

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
    turnDuration: 30
});

// Helper to update user's active room in DB preferences
const updateLastRoomId = async (userId: string, roomId: string | null) => {
    try {
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

export const initializeSocketServer = (io: Server<ClientToServerEvents, ServerToClientEvents>) => {
    socketService.init(io);

    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error("Authentication required"));
        try {
            const decoded = verifyToken(token);
            (socket as any).user = decoded;
            socketService.addSocket(decoded.userId, socket.id);
            next();
        } catch (err) {
            next(new Error("Invalid token"));
        }
    });

    io.on('connection', async (socket) => {
        const userId = (socket as any).user.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        
        if (!user) {
            socket.disconnect();
            return;
        }

        // Join personal room for DMs/notifications
        socket.join(userId);

        // Notify friends online
        const friends = await prisma.friendship.findMany({
            where: { OR: [{ senderId: userId }, { receiverId: userId }], status: 'ACCEPTED' }
        });
        friends.forEach(f => {
            const fid = f.senderId === userId ? f.receiverId : f.senderId;
            socketService.emitToUser(fid, 'friendStatus', { userId, status: 'ONLINE' });
        });

        socket.on('createRoom', async ({ settings, wagerTier }, callback) => {
            if (isRateLimited(userId)) return callback({ success: false, error: "Rate limit exceeded" });

            const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            // Validate Wager
            let ante = 0;
            if (wagerTier === 'bronze') ante = 50;
            if (wagerTier === 'silver') ante = 250;
            if (wagerTier === 'gold') ante = 1000;

            if (user.coins < ante) {
                return callback({ success: false, error: "Insufficient funds" });
            }

            const room: Room = {
                id: roomId,
                status: 'waiting',
                players: [{ user: user as any, role: Player.X, connected: true }],
                initialBoard: Array((settings.boardSize || 3) ** 2).fill(null),
                board: Array((settings.boardSize || 3) ** 2).fill(null),
                moves: [],
                chat: [],
                currentPlayer: Player.X,
                winner: null,
                winningLine: null,
                gameSettings: { ...getDefaultSettings(), ...settings },
                hostId: userId,
                rematchRequested: {},
                anteAmount: ante,
                pot: 0, // Pot fills when wager confirmed
                wagerConfirmed: {},
                participants: { [Player.X]: user as any }
            };

            if (room.gameSettings.obstacles) {
                // Add obstacles logic if needed on creation or start
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
            
            // Update Persistence
            await updateLastRoomId(userId, roomId);

            // FIX: Await join to ensure socket is in room before broadcast
            await socket.join(roomId);
            
            // IMPORTANT: Broadcast state so creator's client switches to Game view
            broadcastRoomUpdate(io, roomId);
            
            callback({ success: true, roomId });
        });

        socket.on('joinRoom', async (roomId, options, callback) => {
            const room = rooms.get(roomId);
            if (!room) return callback({ success: false, error: "Room not found" });

            const isSpectator = options?.asSpectator;

            if (!isSpectator) {
                // Reconnection logic
                const existingSeat = room.players.find(p => p.user.id === userId);
                if (existingSeat) {
                    existingSeat.connected = true;
                    // Persist room ID again just in case
                    await updateLastRoomId(userId, roomId);
                    await socket.join(roomId);
                    broadcastRoomUpdate(io, roomId);
                    return callback({ success: true });
                }

                // Join as new player
                if (room.players.filter(p => p.role !== 'spectator').length >= 2) {
                    return callback({ success: false, error: "Room full" });
                }

                if (room.anteAmount && room.anteAmount > 0) {
                    if (user.coins < room.anteAmount) return callback({ success: false, error: "Insufficient funds for ante" });
                }

                room.players.push({ user: user as any, role: Player.O, connected: true });
                room.participants![Player.O] = user as any;
                room.status = 'confirming_wager'; // Move to wager confirmation
                
                // Update Persistence
                await updateLastRoomId(userId, roomId);
            } else {
                room.players.push({ user: user as any, role: 'spectator', connected: true });
            }

            await socket.join(roomId);
            broadcastRoomUpdate(io, roomId);
            callback({ success: true });
        });

        socket.on('confirmWager', async (roomId) => {
            const room = rooms.get(roomId);
            if (!room) return;
            
            const playerSeat = room.players.find(p => p.user.id === userId);
            if (!playerSeat || (playerSeat.role !== Player.X && playerSeat.role !== Player.O)) return;
            
            const role = playerSeat.role;

            // If already confirmed, ignore
            if (room.wagerConfirmed[role]) return;

            // Check Balance
            const dbUser = await prisma.user.findUnique({ where: { id: userId } });
            if (!dbUser || dbUser.coins < (room.anteAmount || 0)) {
                // Could emit error here if needed
                return;
            }

            try {
                // Deduct Coins Immediately
                const updatedUser = await prisma.user.update({
                    where: { id: userId },
                    data: { coins: { decrement: room.anteAmount || 0 } }
                });

                // Update Room State
                room.wagerConfirmed[role] = true;
                room.pot += (room.anteAmount || 0); // Increment pot immediately for visual feedback

                // Notify User of Wallet Change
                socketService.emitToUser(userId, 'walletUpdate', { newBalance: updatedUser.coins });

                // Check if Both Confirmed -> Start Game
                if (room.wagerConfirmed[Player.X] && room.wagerConfirmed[Player.O]) {
                    room.status = 'playing';
                    room.lastMoveTime = Date.now();
                    if (room.gameSettings.blitzMode) {
                        room.timeRemaining = {
                            [Player.X]: room.gameSettings.blitzDuration || 180,
                            [Player.O]: room.gameSettings.blitzDuration || 180
                        };
                    }
                }

                broadcastRoomUpdate(io, roomId);

            } catch (e) {
                console.error("Wager confirmation failed", e);
            }
        });

        socket.on('makeMove', async ({ roomId, index }, callback) => {
            const room = rooms.get(roomId);
            if (!room || room.status !== 'playing' || room.isPaused) return callback({ success: false, error: "Invalid game state" });

            const player = room.players.find(p => p.user.id === userId);
            if (!player || player.role !== room.currentPlayer) return callback({ success: false, error: "Not your turn" });

            if (index < 0 || index >= room.board.length || room.board[index] !== null) return callback({ success: false, error: "Invalid move" });

            // Update Blitz Timer: Deduct time spent by current player before switching
            if (room.gameSettings.blitzMode && room.timeRemaining && room.lastMoveTime) {
                const elapsed = (Date.now() - room.lastMoveTime) / 1000;
                room.timeRemaining[room.currentPlayer] = Math.max(0, room.timeRemaining[room.currentPlayer] - elapsed);
            }

            // Update Board
            room.board[index] = player.role;
            room.moves.push({ player: player.role, index, moveNumber: room.moves.length });
            
            // Check Win
            const result = checkWinner(room.board, room.gameSettings.boardSize, room.gameSettings.winLength);
            
            if (result.winner) {
                room.winner = result.winner;
                room.winningLine = result.line;
                room.status = 'finished';
                
                await handleGameEnd(room);
            } else {
                room.currentPlayer = room.currentPlayer === Player.X ? Player.O : Player.X;
                room.lastMoveTime = Date.now();
            }

            broadcastRoomUpdate(io, roomId);
            callback({ success: true });
        });

        socket.on('claimTimeout', async (roomId) => {
            const room = rooms.get(roomId);
            if (!room || room.status !== 'playing' || room.winner || room.isPaused) return;

            const now = Date.now();
            const lastMove = room.lastMoveTime || now;
            let isTimeout = false;

            if (room.gameSettings.blitzMode) {
                const timeBank = room.timeRemaining?.[room.currentPlayer] || 0;
                const elapsedSeconds = (now - lastMove) / 1000;
                // 1.5s grace period for latency
                if (timeBank - elapsedSeconds <= 1.5) {
                    isTimeout = true;
                }
            } else {
                const turnDurationMs = (room.gameSettings.turnDuration || 30) * 1000;
                // 1.5s grace period for latency
                if (now - lastMove >= turnDurationMs + 1500) {
                    isTimeout = true;
                }
            }

            if (isTimeout) {
                room.winner = room.currentPlayer === Player.X ? Player.O : Player.X;
                room.winReason = 'timeout';
                room.status = 'finished';
                
                await handleGameEnd(room);
                broadcastRoomUpdate(io, roomId);
            }
        });

        socket.on('sendChat', async ({ roomId, text, replyTo }) => {
            if (isRateLimited(userId)) return;
            const sanitized = sanitizeChatText(text);
            if (!sanitized) return;
            
            const room = rooms.get(roomId);
            if (room) {
                const message: ChatMessage = {
                    id: Math.random().toString(36).substr(2, 9),
                    senderId: userId,
                    senderName: user.displayName,
                    senderAvatar: user.avatar,
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

        socket.on('leaveRoom', async (roomId) => {
            const room = rooms.get(roomId);
            if (room) {
                const playerIndex = room.players.findIndex(p => p.user.id === userId);
                if (playerIndex !== -1) {
                    const player = room.players[playerIndex];
                    
                    // Refund logic: If player leaves during wager confirmation and had already locked in
                    if (room.status === 'confirming_wager' && player.role !== 'spectator') {
                        if (room.wagerConfirmed[player.role]) {
                             try {
                                await prisma.user.update({
                                    where: { id: userId },
                                    data: { coins: { increment: room.anteAmount || 0 } }
                                });
                                // Notify user of refund
                                socketService.emitToUser(userId, 'walletUpdate', { newBalance: (await prisma.user.findUnique({where:{id:userId}}))?.coins });
                                
                                // Decrease pot and reset confirm flag
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
                            // Pause game logic
                            room.isPaused = true; 
                            room.pausedAt = Date.now();
                        }
                    }
                }
                
                // Clear active room ID from DB since user explicitly left
                await updateLastRoomId(userId, null);

                socket.leave(roomId);
                broadcastRoomUpdate(io, roomId);
                
                // Cleanup empty rooms
                if (room.players.every(p => !p.connected && p.role !== 'spectator')) {
                    if(room.players.filter(p=>p.role === 'spectator').length === 0) {
                        rooms.delete(roomId);
                    }
                }
            }
        });

        // Chat & DM Handlers
        socket.on('sendDirectMessage', async ({ toUserId, text, replyTo, replayData, stickerId }) => {
            if (isRateLimited(userId)) return;
            const sanitized = sanitizeChatText(text);
            
            // Logic handled by socketService persistence mostly, here we just proxy/persist
            await socketService.sendSystemInteraction(userId, user.displayName, user.avatar, toUserId, sanitized || (stickerId ? 'Sent a sticker' : (replayData ? 'Shared a replay' : '')), undefined);
            
            // Manual emit if not handled by helper perfectly for custom types
            const msg: ChatMessage = {
                id: Math.random().toString(36).substr(2, 9),
                senderId: userId,
                senderName: user.displayName,
                senderAvatar: user.avatar,
                text: sanitized,
                timestamp: Date.now(),
                type: 'user',
                channel: 'dm',
                recipientId: toUserId,
                replyTo,
                replayData,
                stickerId
            };
            
            // We rely on socketService.sendSystemInteraction for persistence, but real-time emit:
            io.to(toUserId).emit('directMessage', msg);
            socket.emit('directMessage', msg); // Echo back
        });

        socket.on('markConversationAsRead', (partnerId) => {
            const readAt = Date.now();
            // Emit to partner so they see read receipt
            socketService.emitToUser(partnerId, 'messagesRead', { conversationPartnerId: userId, readByUserId: userId, readAt, partnerId: userId });
            // Emit to self (other devices)
            socketService.emitToUser(userId, 'messagesRead', { conversationPartnerId: partnerId, readByUserId: userId, readAt, partnerId });
        });

        socket.on('typing', ({ channel, roomId, toUserId }) => {
            if (channel === 'game' && roomId) socket.to(roomId).emit('userTyping', { userId, displayName: user.displayName, channel, roomId });
            if (channel === 'dm' && toUserId) socketService.emitToUser(toUserId, 'userTyping', { userId, displayName: user.displayName, channel });
        });

        socket.on('stopTyping', ({ channel, roomId, toUserId }) => {
            if (channel === 'game' && roomId) socket.to(roomId).emit('userStoppedTyping', { userId, channel, roomId });
            if (channel === 'dm' && toUserId) socketService.emitToUser(toUserId, 'userStoppedTyping', { userId, channel });
        });

        socket.on('requestFriendStatuses', async () => {
            const friends = await prisma.friendship.findMany({
                where: { OR: [{ senderId: userId }, { receiverId: userId }], status: 'ACCEPTED' }
            });
            friends.forEach(f => {
                const fid = f.senderId === userId ? f.receiverId : f.senderId;
                const isOnline = socketService.isUserOnline(fid);
                // Basic status check - expand for IN_GAME if needed by checking rooms
                const status = isOnline ? 'ONLINE' : 'OFFLINE'; 
                socket.emit('friendStatus', { userId: fid, status });
            });
        });

        socket.on('disconnect', () => {
            socketService.removeSocket(userId, socket.id);
            if (!socketService.isUserOnline(userId)) {
                friends.forEach(f => {
                    const fid = f.senderId === userId ? f.receiverId : f.senderId;
                    socketService.emitToUser(fid, 'friendStatus', { userId, status: 'OFFLINE' });
                });
            }
        });
        
        socket.on('getRooms', () => {
            const list = Array.from(rooms.values()).filter(r => r.status === 'playing' || r.status === 'waiting');
            socket.emit('roomsList', list);
        });
        
        socket.on('requestRematch', (roomId) => {
            const room = rooms.get(roomId);
            if (room && room.winner) {
                const role = room.players.find(p => p.user.id === userId)?.role;
                if(role && (role === Player.X || role === Player.O)) {
                    room.rematchRequested[role] = true;
                    broadcastRoomUpdate(io, roomId);
                    
                    if (room.rematchRequested[Player.X] && room.rematchRequested[Player.O]) {
                        // Start Rematch
                        room.board = Array(room.gameSettings.boardSize ** 2).fill(null);
                        room.moves = [];
                        room.winner = null;
                        room.winningLine = null;
                        room.currentPlayer = room.winner === 'draw' ? (Math.random() < 0.5 ? Player.X : Player.O) : (room.winner === Player.X ? Player.O : Player.X);
                        room.status = 'playing';
                        room.rematchRequested = {};
                        // Assuming free play rematch for now
                        room.pot = 0; 
                        broadcastRoomUpdate(io, roomId);
                        io.to(roomId).emit('gameReset', room);
                    }
                }
            }
        });

        socket.on('doubleDownRequest', (roomId) => {
            const room = rooms.get(roomId);
            if (!room) return;
            const playerRole = room.players.find(p => p.user.id === userId)?.role;
            if (!playerRole || playerRole === 'spectator') return;

            room.doubleDown = { offering: playerRole };
            broadcastRoomUpdate(io, roomId);
        });

        socket.on('doubleDownResponse', async (roomId, accepted) => {
            const room = rooms.get(roomId);
            if (!room || !room.doubleDown) return;
            const playerRole = room.players.find(p => p.user.id === userId)?.role;
            // Only the person who was NOT offering can respond
            if (!playerRole || playerRole === room.doubleDown.offering) return;

            if (accepted) {
                // Deduct ante from BOTH players again
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
                        room.doubleDown = undefined; // Clear state
                    } catch (e) {
                        console.error("Double down transaction failed", e);
                    }
                }
            } else {
                room.doubleDown = undefined; // Rejected
            }
            broadcastRoomUpdate(io, roomId);
        });

    });
};

async function handleGameEnd(room: Room) {
    if (!room.winner) return;

    const pX = room.players.find(p => p.role === Player.X);
    const pO = room.players.find(p => p.role === Player.O);
    if (!pX || !pO) return;

    const winnerSeat = room.winner === 'draw' ? null : (room.winner === Player.X ? pX : pO);
    const loserSeat = room.winner === 'draw' ? null : (room.winner === Player.X ? pO : pX);

    // Calculate Coin Changes
    let pXCoinChange = 0;
    let pOCoinChange = 0;

    // 1. Distribute Pot
    if (room.pot > 0) {
        if (room.winner === 'draw') {
            const split = Math.floor(room.pot / 2);
            await prisma.user.update({ where: { id: pX.user.id }, data: { coins: { increment: split } } });
            await prisma.user.update({ where: { id: pO.user.id }, data: { coins: { increment: split } } });
            // Notify wallets
            socketService.emitToUser(pX.user.id, 'walletUpdate', { newBalance: (await prisma.user.findUnique({where:{id:pX.user.id}}))?.coins });
            socketService.emitToUser(pO.user.id, 'walletUpdate', { newBalance: (await prisma.user.findUnique({where:{id:pO.user.id}}))?.coins });
            pXCoinChange = split;
            pOCoinChange = split;
        } else if (winnerSeat) {
            const updatedWinner = await prisma.user.update({ where: { id: winnerSeat.user.id }, data: { coins: { increment: room.pot } } });
            socketService.emitToUser(winnerSeat.user.id, 'walletUpdate', { newBalance: updatedWinner.coins });
            if (winnerSeat.role === Player.X) pXCoinChange = room.pot;
            else pOCoinChange = room.pot;
        }
    }

    // 2. ELO Calculation
    const { winnerNew, loserNew } = calculateElo(
        winnerSeat ? winnerSeat.user.elo : pX.user.elo, 
        loserSeat ? loserSeat.user.elo : pO.user.elo
    );
    
    // In draw, calculate changes
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

    // 3. Update DB
    await prisma.user.update({ where: { id: pX.user.id }, data: { elo: pXNewElo, wins: { increment: room.winner === Player.X ? 1 : 0 }, losses: { increment: room.winner === Player.O ? 1 : 0 }, draws: { increment: room.winner === 'draw' ? 1 : 0 } } });
    await prisma.user.update({ where: { id: pO.user.id }, data: { elo: pONewElo, wins: { increment: room.winner === Player.O ? 1 : 0 }, losses: { increment: room.winner === Player.X ? 1 : 0 }, draws: { increment: room.winner === 'draw' ? 1 : 0 } } });

    // 4. Update Room State references for UI
    pX.user.elo = pXNewElo;
    pO.user.elo = pONewElo;
    
    // Generate XP Reports with Coin Change
    const reportX = { 
        total: 10 + (room.winner === Player.X ? 25 : 0), 
        elo: pXNewElo - pX.user.elo,
        coinChange: pXCoinChange
    };
    const reportO = { 
        total: 10 + (room.winner === Player.O ? 25 : 0), 
        elo: pONewElo - pO.user.elo,
        coinChange: pOCoinChange
    };
    
    room.xpReport = {
        [Player.X]: reportX as any,
        [Player.O]: reportO as any
    };
    
    // Clean up persistent room ID when game ends
    await updateLastRoomId(pX.user.id, null);
    await updateLastRoomId(pO.user.id, null);
}

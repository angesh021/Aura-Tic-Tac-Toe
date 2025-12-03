
import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents, ChatMessage } from './types';
import { prisma } from './db';

class SocketService {
    private io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;
    private playerSockets = new Map<string, Set<string>>();

    init(io: Server<ClientToServerEvents, ServerToClientEvents>) {
        this.io = io;
    }

    addSocket(userId: string, socketId: string) {
        if (!this.playerSockets.has(userId)) {
            this.playerSockets.set(userId, new Set());
        }
        this.playerSockets.get(userId)!.add(socketId);
    }

    removeSocket(userId: string, socketId: string) {
        const userSockets = this.playerSockets.get(userId);
        if (userSockets) {
            userSockets.delete(socketId);
            if (userSockets.size === 0) {
                this.playerSockets.delete(userId);
            }
        }
    }

    isUserOnline(userId: string): boolean {
        return this.playerSockets.has(userId);
    }

    getSocketIds(userId: string): string[] {
        return Array.from(this.playerSockets.get(userId) || []);
    }

    // Persists a system message to the DB so it appears in DM history
    async sendSystemInteraction(senderId: string, senderName: string, senderAvatar: string, receiverId: string, text: string, giftData?: { amount: number }) {
        try {
            // Find or Create Conversation
            let conversation = await prisma.conversation.findFirst({
                where: {
                    participants: {
                        every: { id: { in: [senderId, receiverId] } }
                    }
                }
            });

            if (!conversation) {
                conversation = await prisma.conversation.create({
                    data: {
                        participants: { connect: [{ id: senderId }, { id: receiverId }] }
                    }
                });
            }

            const dbMessage = await prisma.chatMessage.create({
                data: {
                    conversationId: conversation.id,
                    senderId,
                    text,
                    timestamp: new Date(),
                    giftData,
                    type: 'system' // Use a 'system' type or infer based on giftData
                }
            });

            const clientMessage: ChatMessage = {
                id: dbMessage.id,
                senderId,
                senderName,
                senderAvatar,
                text,
                timestamp: dbMessage.timestamp.getTime(),
                type: 'system',
                channel: 'dm',
                recipientId: receiverId,
                giftData
            };

            if (this.io) {
                // Send to Receiver
                const recipientSockets = this.getSocketIds(receiverId);
                recipientSockets.forEach(sid => this.io!.to(sid).emit('directMessage', clientMessage));

                // Send to Sender
                const senderSockets = this.getSocketIds(senderId);
                senderSockets.forEach(sid => this.io!.to(sid).emit('directMessage', clientMessage));
            }
        } catch (e) {
            console.error("Failed to persist system interaction", e);
        }
    }

    emitToUser(userId: string, event: keyof ServerToClientEvents, data: any) {
        if (!this.io) return;
        const sockets = this.getSocketIds(userId);
        sockets.forEach(sid => {
            // @ts-ignore
            this.io!.to(sid).emit(event, data);
        });
    }
}

export const socketService = new SocketService();

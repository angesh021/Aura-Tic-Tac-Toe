
import { Server } from 'socket.io';
import { prisma } from './db';
import { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  ChatMessage
} from './types';
import { logger } from './logger';

function makePairKey(a: string, b: string) {
  return [a, b].sort().join('|');
}

class SocketService {
  private io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;
  private userSockets = new Map<string, string[]>(); // userId -> socketId[]

  init(io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;
  }

  addSocket(userId: string, socketId: string) {
    if (userId.startsWith('guest_')) return;
    const sockets = this.userSockets.get(userId) || [];
    if (!sockets.includes(socketId)) {
      sockets.push(socketId);
      this.userSockets.set(userId, sockets);
    }
  }

  removeSocket(userId: string, socketId: string) {
    if (userId.startsWith('guest_')) return;
    const sockets = this.userSockets.get(userId) || [];
    const newSockets = sockets.filter(id => id !== socketId);
    if (newSockets.length > 0) {
      this.userSockets.set(userId, newSockets);
    } else {
      this.userSockets.delete(userId);
    }
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  emitToUser<T extends keyof ServerToClientEvents>(
    userId: string,
    event: T,
    ...args: Parameters<ServerToClientEvents[T]>
  ) {
    if (!this.io) return;
    const socketIds = this.userSockets.get(userId);
    if (socketIds && socketIds.length > 0) {
      this.io.to(socketIds).emit(event, ...args as any);
    }
  }

  broadcast<T extends keyof ServerToClientEvents>(
    event: T,
    ...args: Parameters<ServerToClientEvents[T]>
  ) {
    if (!this.io) return;
    this.io.emit(event, ...args as any);
  }

  /**
   * Persist a DM between two users and return a ChatMessage
   * with a proper recipientId field for the client.
   */
  async persistChatMessage(data: {
    senderId: string;
    receiverId: string;
    text: string;
    type: 'user' | 'system';
    replyTo?: any;
    inviteData?: any;
    giftData?: any;
    replayData?: any;
    stickerId?: string;
  }): Promise<ChatMessage | null> {
    try {
      const pairKey = makePairKey(data.senderId, data.receiverId);
      logger.info(
        `[PERSIST_MSG] Sender=${data.senderId}, Receiver=${data.receiverId}, PairKey=${pairKey}`
      );

      // Always use canonical pairKey so both A→B and B→A
      // hit the exact same Conversation row.
      let conversation = await prisma.conversation.findUnique({
        where: { pairKey },
      });

      if (!conversation) {
        logger.info(
          `[PERSIST_MSG] No conversation for ${pairKey}, creating a new one`
        );
        conversation = await prisma.conversation.create({
          data: {
            pairKey,
            participants: {
              connect: [
                { id: data.senderId },
                { id: data.receiverId },
              ],
            },
          },
        });
      } else {
        logger.info(
          `[PERSIST_MSG] Using existing conversation ${conversation.id} for ${pairKey}`
        );
      }

      const message = await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: data.senderId,
          text: data.text,
          type: data.type,
          replyTo: data.replyTo,
          inviteData: data.inviteData,
          giftData: data.giftData,
          replayData: data.replayData,
          stickerId: data.stickerId,
        },
        // IMPORTANT: Include questData to access the frame
        include: { sender: { select: { displayName: true, avatar: true, emailVerified: true, questData: true } } },
      });

      logger.info(
        `[PERSIST_MSG] Stored message ${message.id} in conversation ${conversation.id}`
      );

      // Safe access to questData
      const qData = (message.sender.questData as any) || {};

      const clientMessage: ChatMessage = {
        id: message.id,
        senderId: message.senderId,
        recipientId: data.receiverId, // <- critical: always set
        text: message.text,
        timestamp: message.timestamp.getTime(),
        type: message.type as 'user' | 'system',
        channel: 'dm',
        senderName: message.sender.displayName,
        senderAvatar: message.sender.avatar,
        senderFrame: qData.equippedFrame, // Send Frame
        senderVerified: message.sender.emailVerified,
        readBy: message.readBy as any,
        deleted: message.deleted,
        editedAt: message.editedAt
          ? message.editedAt.getTime()
          : undefined,
        reactions: message.reactions as any,
        replyTo: message.replyTo as any,
        inviteData: message.inviteData as any,
        giftData: message.giftData as any,
        replayData: message.replayData as any,
        stickerId: message.stickerId as any,
      };

      return clientMessage;
    } catch (e) {
      logger.error('Failed to persist chat message', e);
      return null;
    }
  }

  /**
   * Mark all messages from partnerId → readerId as read.
   */
  async markMessagesAsRead(readerId: string, partnerId: string) {
    try {
      const pairKey = makePairKey(readerId, partnerId);

      const conversation = await prisma.conversation.findUnique({
        where: { pairKey },
      });

      if (!conversation) return;

      const readAt = Date.now();
      await prisma.chatMessage.updateMany({
        where: {
          conversationId: conversation.id,
          senderId: partnerId,
          readBy: {
            not: { path: [readerId], isSet: true },
          },
        },
        data: {
          readBy: {
            upsert: {
              [readerId]: readAt,
            },
          },
        },
      });
    } catch (e) {
      logger.error('Failed to mark messages as read', e);
    }
  }
}

export const socketService = new SocketService();

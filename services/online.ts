


import { io, Socket } from 'socket.io-client';
import { Room, GameSettings, ClientToServerEvents, ServerToClientEvents, User, ChatMessage, Clan, Notification, WagerTier } from '../types';
import { SERVER_URL, API_URL } from '../utils/config';
import { getToken } from './auth';

class OnlineService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

  connect(token?: string) {
    if (this.socket && this.socket.connected) {
      return;
    }
    const authData = token ? { token } : {};
    
    this.socket = io(SERVER_URL, {
      auth: authData,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to game server at', SERVER_URL);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  waitForConnection(): Promise<void> {
      return new Promise((resolve) => {
          if (this.socket?.connected) {
              return resolve();
          }
          this.socket?.once('connect', () => {
              resolve();
          });
          if (!this.socket) {
              resolve(); 
          }
      });
  }

  private getHeaders() {
      return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` };
  }

  async getLeaderboard(): Promise<User[]> {
      const res = await fetch(`${API_URL}/leaderboard`);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
  }

  async getConversations(): Promise<any[]> {
        try {
            const res = await fetch(`${API_URL}/chats`, { headers: this.getHeaders() });
            if (!res.ok) throw new Error('Failed to fetch chats');
            return await res.json();
        } catch (e) {
            return [];
        }
  }

  async getChatHistory(partnerId: string, cursor?: string | null): Promise<{ messages: ChatMessage[], nextCursor: string | null }> {
      try {
          const url = new URL(`${API_URL}/chats/${partnerId}/messages`);
          if (cursor) url.searchParams.append('cursor', cursor);
          
          const res = await fetch(url.toString(), { headers: this.getHeaders() });
          if (!res.ok) throw new Error('Failed to fetch history');
          return await res.json();
      } catch (e) {
          console.error(e);
          return { messages: [], nextCursor: null };
      }
  }

  // --- Clan Methods ---
  async createClan(name: string, tag: string): Promise<Clan> {
      try {
          const res = await fetch(`${API_URL}/clans/create`, {
              method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ name, tag })
          });
          if (!res.ok) {
              const data = await res.json();
              throw new Error(data.message || "Failed to create clan");
          }
          return res.json();
      } catch (error: any) {
          if (error instanceof TypeError) throw new Error('📡 Connection lost.');
          throw error;
      }
  }

  async joinClan(tag: string): Promise<void> {
      try {
          const res = await fetch(`${API_URL}/clans/join`, {
              method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ tag })
          });
          if (!res.ok) {
              const data = await res.json();
              throw new Error(data.message || "Failed to join clan");
          }
      } catch (error: any) {
          if (error instanceof TypeError) throw new Error('📡 Connection lost.');
          throw error;
      }
  }

  async getClan(id: string): Promise<Clan> {
      const res = await fetch(`${API_URL}/clans/${id}`, { headers: this.getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch clan");
      return res.json();
  }

  async leaveClan(): Promise<void> {
      const res = await fetch(`${API_URL}/clans/leave`, { method: 'POST', headers: this.getHeaders() });
      if (!res.ok) throw new Error("Failed to leave clan");
  }

  // --- Emitters ---
  createRoom(settings: Partial<GameSettings>, wagerTier: WagerTier): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!this.socket || !this.socket.connected) {
            return reject(new Error("📡 Not connected to server."));
        }
        this.socket.emit('createRoom', { settings, wagerTier }, (response) => {
            if (response.success && response.roomId) {
                // Room persisted on server DB for user prefs, no localStorage needed
                resolve(response.roomId);
            } else {
                reject(new Error(response.error || "Failed to create room."));
            }
        });
    });
  }

  joinRoom(roomId: string, options: { asSpectator?: boolean } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
         if (!this.socket || !this.socket.connected) {
            return reject(new Error("📡 Not connected to server."));
        }
        this.socket.emit('joinRoom', roomId, options, (response) => {
             if (response.success) {
                resolve();
             } else {
                 reject(new Error(response.error || "Failed to join room."));
             }
        });
    });
  }

  startGame(roomId: string) {
      this.socket?.emit('startGame', roomId);
  }

  getRooms() {
      this.socket?.emit('getRooms');
  }

  leaveRoom(roomId: string) {
      // Remove persistent state on server via socket event logic if needed,
      // but primarily we just tell the server we are leaving.
      this.socket?.emit('leaveRoom', roomId);
  }

  makeMove(data: { roomId: string, index: number }): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!this.socket) {
            return reject('Not connected.');
        }

        this.socket.emit('makeMove', data, (response) => {
            if (response.success) {
                resolve();
            } else {
                reject(new Error(response.error || 'Error making move.'));
            }
        });
    });
  }

  requestRematch(roomId: string) {
    this.socket?.emit('requestRematch', roomId);
  }

  declineRematch(roomId: string) {
    this.socket?.emit('declineRematch', roomId);
  }

  sendInvite(friendId: string, roomId: string) {
      this.socket?.emit('sendInvite', friendId, roomId);
  }

  sendChat(roomId: string, text: string, replyTo?: any) {
      this.socket?.emit('sendChat', { roomId, text, replyTo });
  }

  sendEmote(roomId: string, emoji: string) {
      this.socket?.emit('sendEmote', { roomId, emoji });
  }

  confirmWager(roomId: string) {
    this.socket?.emit('confirmWager', roomId);
  }

  doubleDownRequest(roomId: string) {
    this.socket?.emit('doubleDownRequest', roomId);
  }

  doubleDownResponse(roomId: string, accepted: boolean) {
    this.socket?.emit('doubleDownResponse', roomId, accepted);
  }

  claimTimeout(roomId: string) {
      this.socket?.emit('claimTimeout', roomId);
  }

  // --- New Chat Methods ---
  joinLobby() {
      this.socket?.emit('joinLobby');
  }

  leaveLobby() {
      this.socket?.emit('leaveLobby');
  }

  sendLobbyChat(text: string) {
      this.socket?.emit('sendLobbyChat', { text });
  }

  sendDirectMessage(toUserId: string, text: string, replyTo?: any, replayData?: any) {
      this.socket?.emit('sendDirectMessage', { toUserId, text, replyTo, replayData });
  }
  
  editMessage(data: { channel: 'dm' | 'game', targetId: string, messageId: string, newText: string }) {
      this.socket?.emit('editMessage', data);
  }

  deleteMessage(data: { channel: 'dm' | 'game', targetId: string, messageId: string }) {
      this.socket?.emit('deleteMessage', data);
  }

  sendReaction(data: { channel: 'dm' | 'game', targetId: string, messageId: string, emoji: string }) {
      this.socket?.emit('sendReaction', data);
  }

  markConversationAsRead(partnerId: string) {
      this.socket?.emit('markConversationAsRead', partnerId);
  }

  // --- Typing Methods ---
  sendTyping(data: { channel: 'game' | 'lobby' | 'dm', roomId?: string, toUserId?: string }) {
      this.socket?.emit('typing', data);
  }

  sendStopTyping(data: { channel: 'game' | 'lobby' | 'dm', roomId?: string, toUserId?: string }) {
      this.socket?.emit('stopTyping', data);
  }

  requestFriendStatuses() {
      this.socket?.emit('requestFriendStatuses');
  }

  // --- Listeners ---
  onRoomUpdate(callback: (room: Room) => void) {
    this.socket?.on('roomUpdate', callback);
  }
  
  offRoomUpdate() {
      this.socket?.off('roomUpdate');
  }

  onRoomsList(callback: (rooms: Room[]) => void) {
      this.socket?.on('roomsList', callback);
  }

  offRoomsList() {
      this.socket?.off('roomsList');
  }

  onGameReset(callback: (room: Room) => void) {
      this.socket?.on('gameReset', callback);
  }

  onRematchDeclined(callback: () => void) {
      this.socket?.on('rematchDeclined', callback);
  }

  onFriendStatus(callback: (data: { userId: string, status: 'ONLINE' | 'IN_GAME' | 'OFFLINE' | 'WAITING' }) => void) {
      this.socket?.on('friendStatus', callback);
  }

  offFriendStatus() {
      this.socket?.off('friendStatus');
  }

  onInviteReceived(callback: (data: { hostName: string, roomId: string }) => void) {
      this.socket?.on('inviteReceived', callback);
  }

  offInviteReceived() {
      this.socket?.off('inviteReceived');
  }

  onChatMessage(callback: (msg: ChatMessage) => void) {
      this.socket?.on('chatMessage', callback);
  }

  offChatMessage() {
      this.socket?.off('chatMessage');
  }
  
  onMessageUpdated(callback: (data: { channel: string, targetId: string, message: ChatMessage }) => void) {
      this.socket?.on('messageUpdated', callback);
  }

  offMessageUpdated() {
      this.socket?.off('messageUpdated');
  }

  onMessageDeleted(callback: (data: { channel: string, targetId: string, messageId: string }) => void) {
      this.socket?.on('messageDeleted', callback);
  }

  offMessageDeleted() {
      this.socket?.off('messageDeleted');
  }

  onReactionUpdate(callback: (data: { channel: string, targetId: string, messageId: string, reactions: ChatMessage['reactions'] }) => void) {
      this.socket?.on('reactionUpdate', callback);
  }

  offReactionUpdate() {
      this.socket?.off('reactionUpdate');
  }

  onEmote(callback: (data: { senderId: string, emoji: string }) => void) {
      this.socket?.on('emote', callback);
  }

  offEmote() {
      this.socket?.off('emote');
  }

  onLobbyChatMessage(callback: (msg: ChatMessage) => void) {
      this.socket?.on('lobbyChatMessage', callback);
  }

  offLobbyChatMessage() {
      this.socket?.off('lobbyChatMessage');
  }

  onDirectMessage(callback: (msg: ChatMessage) => void) {
      this.socket?.on('directMessage', callback);
  }

  offDirectMessage(callback?: (msg: ChatMessage) => void) {
      if (callback) {
          this.socket?.off('directMessage', callback);
      } else {
          this.socket?.off('directMessage');
      }
  }

  onMessagesRead(callback: (data: { conversationPartnerId: string, readByUserId: string, readAt: number, partnerId?: string }) => void) {
      this.socket?.on('messagesRead', callback);
  }

  offMessagesRead(callback?: (data: any) => void) {
      if (callback) {
          this.socket?.off('messagesRead', callback);
      } else {
          this.socket?.off('messagesRead');
      }
  }

  onUserTyping(callback: (data: { userId: string, displayName: string, channel: string, roomId?: string }) => void) {
      this.socket?.on('userTyping', callback);
  }

  offUserTyping() {
      this.socket?.off('userTyping');
  }

  onUserStoppedTyping(callback: (data: { userId: string, channel: string, roomId?: string }) => void) {
      this.socket?.on('userStoppedTyping', callback);
  }

  offUserStoppedTyping() {
      this.socket?.off('userStoppedTyping');
  }

  // Enhanced Friend Request Listeners with callback removal support
  onFriendRequestReceived(callback: (data: { requestId: string, sender: { id: string, displayName: string, avatar: string } }) => void) {
      this.socket?.on('friendRequestReceived', callback);
  }

  offFriendRequestReceived(callback?: (data: any) => void) {
      if (callback) {
          this.socket?.off('friendRequestReceived', callback);
      } else {
          this.socket?.off('friendRequestReceived');
      }
  }

  onFriendRequestResponse(callback: (data: { message: string, type: 'accept' | 'reject' }) => void) {
      this.socket?.on('friendRequestResponse', callback);
  }

  offFriendRequestResponse(callback?: (data: any) => void) {
      if (callback) {
          this.socket?.off('friendRequestResponse', callback);
      } else {
          this.socket?.off('friendRequestResponse');
      }
  }
  
  onNewNotification(callback: (notification: Notification) => void) {
    this.socket?.on('newNotification', callback);
  }

  offNewNotification(callback?: (notification: Notification) => void) {
    if (callback) {
        this.socket?.off('newNotification', callback);
    } else {
        this.socket?.off('newNotification');
    }
  }
  
  onMasteryUnlocked(callback: (data: { name: string; description: string; icon: string; }) => void) {
    this.socket?.on('masteryUnlocked', callback);
  }

  offMasteryUnlocked(callback?: (data: { name: string; description: string; icon: string; }) => void) {
    if (callback) {
      this.socket?.off('masteryUnlocked', callback);
    } else {
      this.socket?.off('masteryUnlocked');
    }
  }

  onWalletUpdate(callback: (data: { newBalance: number }) => void) {
      this.socket?.on('walletUpdate', callback);
  }

  offWalletUpdate(callback?: (data: { newBalance: number }) => void) {
      if (callback) {
          this.socket?.off('walletUpdate', callback);
      } else {
          this.socket?.off('walletUpdate');
      }
  }

  cleanupRematchListeners() {
      this.socket?.off('rematchOffer');
      this.socket?.off('gameReset');
      this.socket?.off('rematchDeclined');
  }
}

export const onlineService = new OnlineService();

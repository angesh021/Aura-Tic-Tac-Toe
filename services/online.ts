
import { io, Socket } from 'socket.io-client';
import { Room, GameSettings, ClientToServerEvents, ServerToClientEvents, User, ChatMessage, Clan, Notification, WagerTier, Quest } from '../types';
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

  // Shared Helper for Friendly Errors
  private async handleResponse(res: Response) {
      const data = await res.json().catch(() => ({}));
      if (res.ok) return data;
      if (res.status === 404) throw new Error("Couldn't find that resource 🔍");
      if (res.status === 429) throw new Error("Slow down! 🐎 Too many requests.");
      if (res.status >= 500) throw new Error("Server error 🤒. Try again later.");
      throw new Error(data.message || "Something went wrong 😵");
  }

  async getLeaderboard(): Promise<User[]> {
      const res = await fetch(`${API_URL}/leaderboard`);
      return this.handleResponse(res);
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
          return this.handleResponse(res);
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
          return this.handleResponse(res);
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
          return this.handleResponse(res);
      } catch (error: any) {
          if (error instanceof TypeError) throw new Error('📡 Connection lost.');
          throw error;
      }
  }

  async getClan(id: string): Promise<Clan> {
      const res = await fetch(`${API_URL}/clans/${id}`, { headers: this.getHeaders() });
      return this.handleResponse(res);
  }

  async leaveClan(): Promise<void> {
      const res = await fetch(`${API_URL}/clans/leave`, { method: 'POST', headers: this.getHeaders() });
      return this.handleResponse(res);
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

  sendLobbyChat(data: { text: string, replyTo?: any, stickerId?: string }) {
      this.socket?.emit('sendLobbyChat', data);
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
  
  offRoomUpdate(callback?: (room: Room) => void) {
      if (callback) this.socket?.off('roomUpdate', callback);
      else this.socket?.off('roomUpdate');
  }

  onRoomsList(callback: (rooms: Room[]) => void) {
      this.socket?.on('roomsList', callback);
  }

  offRoomsList(callback?: (rooms: Room[]) => void) {
      if (callback) this.socket?.off('roomsList', callback);
      else this.socket?.off('roomsList');
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

  offFriendStatus(callback?: (data: any) => void) {
      if (callback) this.socket?.off('friendStatus', callback);
      else this.socket?.off('friendStatus');
  }

  onInviteReceived(callback: (data: { hostName: string, roomId: string }) => void) {
      this.socket?.on('inviteReceived', callback);
  }

  offInviteReceived(callback?: (data: any) => void) {
      if (callback) this.socket?.off('inviteReceived', callback);
      else this.socket?.off('inviteReceived');
  }

  onChatMessage(callback: (msg: ChatMessage) => void) {
      this.socket?.on('chatMessage', callback);
  }

  offChatMessage(callback?: (msg: ChatMessage) => void) {
      if (callback) this.socket?.off('chatMessage', callback);
      else this.socket?.off('chatMessage');
  }
  
  onMessageUpdated(callback: (data: { channel: string, targetId: string, message: ChatMessage }) => void) {
      this.socket?.on('messageUpdated', callback);
  }

  offMessageUpdated(callback?: (data: any) => void) {
      if (callback) this.socket?.off('messageUpdated', callback);
      else this.socket?.off('messageUpdated');
  }

  onMessageDeleted(callback: (data: { channel: string, targetId: string, messageId: string }) => void) {
      this.socket?.on('messageDeleted', callback);
  }

  offMessageDeleted(callback?: (data: any) => void) {
      if (callback) this.socket?.off('messageDeleted', callback);
      else this.socket?.off('messageDeleted');
  }

  onReactionUpdate(callback: (data: { channel: string, targetId: string, messageId: string, reactions: ChatMessage['reactions'] }) => void) {
      this.socket?.on('reactionUpdate', callback);
  }

  offReactionUpdate(callback?: (data: any) => void) {
      if (callback) this.socket?.off('reactionUpdate', callback);
      else this.socket?.off('reactionUpdate');
  }

  onEmote(callback: (data: { senderId: string, emoji: string }) => void) {
      this.socket?.on('emote', callback);
  }

  offEmote(callback?: (data: any) => void) {
      if (callback) this.socket?.off('emote', callback);
      else this.socket?.off('emote');
  }

  onLobbyChatMessage(callback: (msg: ChatMessage) => void) {
      this.socket?.on('lobbyChatMessage', callback);
  }

  offLobbyChatMessage(callback?: (msg: ChatMessage) => void) {
      if (callback) this.socket?.off('lobbyChatMessage', callback);
      else this.socket?.off('lobbyChatMessage');
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

  offUserTyping(callback?: (data: any) => void) {
      if (callback) this.socket?.off('userTyping', callback);
      else this.socket?.off('userTyping');
  }

  onUserStoppedTyping(callback: (data: { userId: string, channel: string, roomId?: string }) => void) {
      this.socket?.on('userStoppedTyping', callback);
  }

  offUserStoppedTyping(callback?: (data: any) => void) {
      if (callback) this.socket?.off('userStoppedTyping', callback);
      else this.socket?.off('userStoppedTyping');
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

  onQuestUpdate(callback: (data: { quests: Quest[] }) => void) {
      this.socket?.on('questUpdate', callback);
  }

  offQuestUpdate(callback?: (data: { quests: Quest[] }) => void) {
      if (callback) {
          this.socket?.off('questUpdate', callback);
      } else {
          this.socket?.off('questUpdate');
      }
  }

  onGlobalBroadcast(callback: (data: { message: string, type: 'jackpot' | 'rank_up' | 'drop' }) => void) {
      this.socket?.on('globalBroadcast', callback);
  }

  offGlobalBroadcast(callback?: (data: any) => void) {
      if (callback) this.socket?.off('globalBroadcast', callback);
      else this.socket?.off('globalBroadcast');
  }

  cleanupRematchListeners() {
      this.socket?.off('rematchOffer');
      this.socket?.off('gameReset');
      this.socket?.off('rematchDeclined');
  }
}

export const onlineService = new OnlineService();

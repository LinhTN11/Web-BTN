import { io, Socket } from 'socket.io-client';
import { Message, ChatUser } from './chatService';

type MessageCallback = (message: Message) => void;
type UserOnlineCallback = (userId: string) => void;
type UserOfflineCallback = (userId: string) => void;
type TypingCallback = (data: { userId: string, isTyping: boolean }) => void;

class SocketService {
  private socket: Socket | null = null;
  private messageCallbacks: MessageCallback[] = [];
  private userOnlineCallbacks: UserOnlineCallback[] = [];
  private userOfflineCallbacks: UserOfflineCallback[] = [];
  private typingCallbacks: TypingCallback[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastToken: string = '';

  connect(token: string) {
    this.lastToken = token;
    if (!this.socket || this.socket.disconnected) {
      this.socket = io(process.env.REACT_APP_API_URL || 'http://localhost:8000', {
        auth: { token },
        transports: ['websocket'], // Chỉ sử dụng websocket để giảm overhead
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 10000
      });
      this.socket.on('connect', () => {
        console.log('Socket connected');
        this.startHeartbeat();
        if (this.lastToken) {
          this.socket?.emit('rejoin', { token: this.lastToken });
        }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
        this.startHeartbeat();
      });

      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('Reconnection attempt:', attemptNumber);
      });

      this.socket.on('connect_error', (error: Error) => {
        console.error('Socket connection error:', error);
      });      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        if (reason === 'transport close' || 
            reason === 'transport error' || 
            reason === 'ping timeout') {
          console.log('Temporary disconnect, socket will try to reconnect...');
          setTimeout(() => {
            if (!this.socket?.connected) {
              console.log('Force reconnecting socket after disconnect...');
              this.forceReconnect(this.lastToken);
            }
          }, 2000);
        } else {
          console.log('Permanent disconnect:', reason);
        }
      });      this.socket.on('reconnect_failed', () => {
        console.error('Socket failed to reconnect after all attempts');
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('Socket reconnection error:', error);
      });

      // Message events
      this.socket.on('newMessage', (message: Message) => {
        console.log('Received new message:', message, 'Current user:', this.socket?.id, 'Auth:', this.socket?.auth);
        // Gọi callback để cập nhật UI ngay lập tức
        this.messageCallbacks.forEach(callback => callback(message));
      });

      this.socket.on('messageConfirmed', (message: Message) => {
        console.log('Message confirmed:', message, 'Current user:', this.socket?.id, 'Auth:', this.socket?.auth);
        this.messageCallbacks.forEach(callback => callback(message));
      });

      this.socket.on('messageError', (error: { error: string }) => {
        console.error('Message error:', error);
      });      // User status events
      this.socket.on('userOnline', (userId: string) => {
        this.userOnlineCallbacks.forEach(callback => callback(userId));
      });

      this.socket.on('userOffline', (userId: string) => {
        this.userOfflineCallbacks.forEach(callback => callback(userId));
      });

      // Typing events
      this.socket.on('userTyping', (data: { userId: string, isTyping: boolean }) => {
        this.typingCallbacks.forEach(callback => callback(data));
      });

      this.socket.on('ping', () => {
        // Khi nhận được ping từ server, gửi lại pong để giữ kết nối
        this.socket?.emit('pong');
        // Reset lại heartbeat để đảm bảo không bị timeout
        this.startHeartbeat();
      });
    }
    return this.socket;
  }  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  forceReconnect(token: string) {
    console.log('Force reconnecting socket...');
    this.disconnect();
    return this.connect(token);
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }
  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat');
      } else {
        this.stopHeartbeat();
      }
    }, 30000); // Tăng interval lên 30s để giảm tải server
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  sendMessage(receiverId: string, content: string, messageType: string = 'text') {
    if (this.socket) {
      this.socket.emit('sendMessage', { receiverId, content, messageType });
    }
  }
  onMessage(callback: MessageCallback) {
    this.messageCallbacks.push(callback);
    return () => this.removeMessageCallback(callback);
  }

  onUserOnline(callback: UserOnlineCallback) {
    this.userOnlineCallbacks.push(callback);
    return () => this.removeUserOnlineCallback(callback);
  }

  onUserOffline(callback: UserOfflineCallback) {
    this.userOfflineCallbacks.push(callback);
    return () => this.removeUserOfflineCallback(callback);
  }

  // Keep for backward compatibility
  onUserStatus(callback: UserOnlineCallback) {
    return this.onUserOnline(callback);
  }

  onTyping(callback: TypingCallback) {
    this.typingCallbacks.push(callback);
    return () => this.removeTypingCallback(callback);
  }

  sendTypingStatus(receiverId: string, isTyping: boolean) {
    if (this.socket) {
      this.socket.emit('typing', { receiverId, isTyping });
    }
  }

  markAsRead(senderId: string) {
    if (this.socket) {
      this.socket.emit('markAsRead', { senderId });
    }
  }

  off(event: string) {
    if (this.socket) {
      this.socket.off(event);
    }
  }

  getSocket() {
    return this.socket;
  }
  private removeMessageCallback(callback: MessageCallback) {
    this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
  }

  private removeUserOnlineCallback(callback: UserOnlineCallback) {
    this.userOnlineCallbacks = this.userOnlineCallbacks.filter(cb => cb !== callback);
  }

  private removeUserOfflineCallback(callback: UserOfflineCallback) {
    this.userOfflineCallbacks = this.userOfflineCallbacks.filter(cb => cb !== callback);
  }

  private removeTypingCallback(callback: TypingCallback) {
    this.typingCallbacks = this.typingCallbacks.filter(cb => cb !== callback);
  }
}

export const socketService = new SocketService();
export default socketService;
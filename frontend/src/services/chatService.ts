import api from './api';
import { Message as BaseMessage, User, MessageUser } from '../types';

export interface Message extends BaseMessage {
  // Any additional chat-specific message properties can go here
  status?: 'sending' | 'sent' | 'error';
}

export interface ChatUser {
  _id: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export const chatService = {  getMessages: async (userId: string): Promise<Message[]> => {
    try {
      const response = await api.get(`/v1/chat/conversation/${userId}`);
      // Ensure we're getting the correct data structure
      const messages = Array.isArray(response.data) ? response.data : 
                      (response.data.data?.messages || response.data.messages || []);
      
      // Ensure each message has the correct structure
      return messages.map((msg: any): Message => ({
        _id: msg._id || '',
        content: typeof msg.content === 'string' ? msg.content : String(msg.content || ''),
        sender: typeof msg.sender === 'object' 
          ? {
              _id: msg.sender._id || '',
              username: msg.sender.username || 'Unknown',
              avatar: msg.sender.avatar
            }
          : { _id: String(msg.sender || ''), username: 'Unknown' },
        receiver: typeof msg.receiver === 'object'
          ? {
              _id: msg.receiver._id || '',
              username: msg.receiver.username || 'Unknown',
              avatar: msg.receiver.avatar
            }
          : { _id: String(msg.receiver || ''), username: 'Unknown' },
        messageType: msg.messageType === 'image' ? 'image' : 'text',
        timestamp: new Date(msg.timestamp || Date.now()),
        isRead: Boolean(msg.isRead || msg.read),
        readAt: msg.readAt ? new Date(msg.readAt) : undefined,
        status: msg.status
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  },

  sendMessage: async (receiverId: string, content: string, messageType: string = 'text'): Promise<Message> => {
    const response = await api.post('/v1/chat/send', {
      receiverId,
      content,
      messageType
    });
    return response.data;
  },

  markAsRead: async (senderId: string): Promise<void> => {
    await api.post('/v1/chat/read', { senderId });
  },
  getActiveUsers: async (): Promise<ChatUser[]> => {
    try {
      const response = await api.get('/v1/chat/users');
      // Handle different response structures
      const users = Array.isArray(response.data) ? response.data : 
                   (response.data.data?.users || response.data.users || []);
      
      return users.map((user: any): ChatUser => ({
        _id: user._id || '',
        username: user.username || 'Unknown',
        avatar: user.avatar,
        isOnline: !!user.isOnline,
        lastSeen: user.lastSeen ? new Date(user.lastSeen) : undefined
      }));
    } catch (error) {
      console.error('Error fetching active users:', error);
      return [];
    }
  },

  getConversations: async (): Promise<{
    user: ChatUser;
    lastMessage: Message | null;
    unreadCount: number;
  }[]> => {
    const response = await api.get('/v1/chat/conversations');
    return response.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get('/v1/chat/unread-count');
    return response.data.unreadCount;
  },

  // Add new function to get user by ID
  getUserById: async (userId: string): Promise<ChatUser | null> => {
    try {
      const response = await api.get(`/v1/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }
};

export default chatService;
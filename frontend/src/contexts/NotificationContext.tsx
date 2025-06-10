import React, { createContext, useContext, useEffect, useState } from 'react';
import { notificationService, TaskNotification } from '../services/notificationService';
import { socketService } from '../services/socketService';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: TaskNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((newNotifications) => {
      setNotifications(newNotifications);
    });

    // Load initial notifications
    setNotifications(notificationService.getNotifications());

    return unsubscribe;
  }, []);  // Listen for socket notifications
  useEffect(() => {
    if (user) {
      console.log('🔔 Setting up socket notification listener for user:', user._id, 'role:', user.role);      const unsubscribe = socketService.onNotification((notification: TaskNotification) => {
        console.log('🔔 Received notification via socket in context:', notification);
        console.log('🔔 Current user:', user._id, 'user role:', user.role);
        console.log('🔔 Notification assignedTo:', notification.assignedTo);
        console.log('🔔 Notification type:', notification.type);
        console.log('🔔 ID comparison:', {
          userId: user._id,
          assignedTo: notification.assignedTo,
          match: notification.assignedTo === user._id,
          userIdType: typeof user._id,
          assignedToType: typeof notification.assignedTo
        });
        
        // Only process notification if it's meant for this user
        if (notification.assignedTo === user._id) {
          console.log('🔔 Notification is for this user, adding to service...');
          notificationService.addNotification({
            type: notification.type,
            taskId: notification.taskId,
            taskTitle: notification.taskTitle,
            message: notification.message,
            assignedTo: notification.assignedTo
          });
          console.log('🔔 Notification added to service successfully');
        } else {
          console.log('🔔 Notification is not for this user, ignoring');
          console.log('🔔 IDs do not match:', user._id, '!==', notification.assignedTo);
        }
      });

      return unsubscribe;
    } else {
      console.log('🔔 No user available for socket notification listener');
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    notificationService.markAsRead(id);
  };

  const markAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const clearAll = () => {
    notificationService.clearAll();
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

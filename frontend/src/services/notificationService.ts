export interface TaskNotification {
  id: string;
  type: 'task_assigned' | 'task_received' | 'task_completed' | 'task_failed' | 'task_overdue' | 'task_created' | 'task_status_updated';
  taskId: string;
  taskTitle: string;
  message: string;
  timestamp: Date;
  read: boolean;
  assignedTo?: string;
}

export class NotificationService {
  private notifications: TaskNotification[] = [];
  private listeners: ((notifications: TaskNotification[]) => void)[] = [];
  addNotification(notif: Omit<TaskNotification, 'id' | 'timestamp' | 'read'>) {
    // Check for duplicate notifications
    const isDuplicate = this.notifications.some(existing => 
      existing.taskId === notif.taskId && 
      existing.type === notif.type &&
      existing.assignedTo === notif.assignedTo &&
      Math.abs(new Date().getTime() - existing.timestamp.getTime()) < 5000 // Within 5 seconds
    );

    if (isDuplicate) {
      console.log('🔔 Duplicate notification detected, skipping:', notif);
      return;
    }

    const newNotification: TaskNotification = {
      ...notif,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    };
    
    console.log('🔔 Adding new unique notification:', newNotification);
    this.notifications.unshift(newNotification);
    this.notifyListeners();
  }

  getNotifications(): TaskNotification[] {
    return this.notifications;
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  markAsRead(id: string) {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.notifyListeners();
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.notifyListeners();
  }

  clearAll() {
    this.notifications = [];
    this.notifyListeners();
  }

  subscribe(listener: (notifications: TaskNotification[]) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.notifications));
  }

  // For testing purposes
  simulateTaskUpdate(taskId: string, status: string, taskTitle: string, assignedTo?: string) {
    switch (status) {
      case 'assigned':
        this.addNotification({
          type: 'task_assigned',
          taskId,
          taskTitle,
          message: `Task "${taskTitle}" đã được giao cho bạn`,
          assignedTo,
        });
        break;
      case 'received':
        this.addNotification({
          type: 'task_received',
          taskId,
          taskTitle,
          message: `Task "${taskTitle}" đã được nhận`,
          assignedTo,
        });
        break;
      case 'completed':
        this.addNotification({
          type: 'task_completed',
          taskId,
          taskTitle,
          message: `Task "${taskTitle}" đã hoàn thành`,
          assignedTo,
        });
        break;
      case 'failed':
        this.addNotification({
          type: 'task_failed',
          taskId,
          taskTitle,
          message: `Task "${taskTitle}" đã thất bại`,
          assignedTo,
        });
        break;
      case 'overdue':
        this.addNotification({
          type: 'task_overdue',
          taskId,
          taskTitle,
          message: `Task "${taskTitle}" đã quá hạn`,
          assignedTo,
        });
        break;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;

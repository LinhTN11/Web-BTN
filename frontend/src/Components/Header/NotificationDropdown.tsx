import React, { useState } from 'react';
import { Badge, Dropdown, List, Typography, Button, Empty } from 'antd';
import { BellOutlined, CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, WarningOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import { TaskNotification } from '../../services/notificationService';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import './NotificationDropdown.css';

const { Text } = Typography;

const NotificationDropdown: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const { user } = useAuth();
  const handleNotificationClick = (notification: TaskNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  const handleClearAll = () => {
    clearAll();
  };
  const getNotificationIcon = (type: string) => {
    const iconProps = { className: `notification-icon-${type.replace('task_', '')}` };
    switch (type) {
      case 'task_assigned':
        return <ClockCircleOutlined {...iconProps} />;
      case 'task_received':
        return <CheckCircleOutlined {...iconProps} />;
      case 'task_completed':
        return <CheckCircleOutlined {...iconProps} />;
      case 'task_failed':
        return <ExclamationCircleOutlined {...iconProps} />;
      case 'task_overdue':
        return <WarningOutlined {...iconProps} />;
      case 'task_created':
        return <CheckCircleOutlined {...iconProps} />;
      case 'task_status_updated':
        return <ClockCircleOutlined {...iconProps} />;
      default:
        return <BellOutlined />;
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return timestamp.toLocaleDateString('vi-VN');
  };

  const getNotificationText = (notification: TaskNotification) => {
    switch (notification.type) {
      case 'task_assigned':
        return `Bạn được giao task: "${notification.taskTitle}"`;
      case 'task_received':
        return `Task "${notification.taskTitle}" đã được ${notification.assignedTo} nhận`;
      case 'task_completed':
        return `Task "${notification.taskTitle}" đã hoàn thành`;
      case 'task_failed':
        return `Task "${notification.taskTitle}" không hoàn thành`;
      case 'task_overdue':
        return `Task "${notification.taskTitle}" đã quá hạn`;
      default:
        return `Task "${notification.taskTitle}" có cập nhật`;
    }
  };

  // Filter notifications based on user role
  const filteredNotifications = notifications.filter(notification => {
    if (user?.role === 'admin') {
      // Admin sees all notifications except task_assigned
      return notification.type !== 'task_assigned';
    } else {
      // Regular users only see task_assigned notifications
      return notification.type === 'task_assigned';
    }
  });

  const dropdownContent = (
    <div className="notification-dropdown">
      <div className="notification-header">
        <h4>Thông báo</h4>        {filteredNotifications.length > 0 && (
          <div className="notification-actions">            <Button 
              type="link" 
              size="small" 
              onClick={handleMarkAllRead}
              className="notification-mark-read-btn"
              icon={<CheckOutlined />}
            >
              Đọc tất cả
            </Button>
            <Button 
              type="link" 
              size="small" 
              onClick={handleClearAll}
              className="notification-clear-btn"
              icon={<DeleteOutlined />}
            >
              Xóa tất cả
            </Button>
          </div>
        )}
      </div>
      
      {filteredNotifications.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Không có thông báo mới"
          style={{ padding: '40px 20px' }}
        />
      ) : (        <List
          className="notification-list"
          dataSource={filteredNotifications.slice(0, 10)} // Show max 10 notifications
          renderItem={(notification) => (
            <List.Item
              className={`notification-item ${notification.read ? 'read' : 'unread'}`}
              onClick={() => handleNotificationClick(notification)}
              style={{ cursor: 'pointer' }}
            >
              <List.Item.Meta
                avatar={getNotificationIcon(notification.type)}
                title={
                  <div>
                    <Text 
                      className="notification-text"
                      style={{ 
                        fontWeight: notification.read ? 'normal' : 'bold'
                      }}
                    >
                      {getNotificationText(notification)}
                    </Text>
                    <div className="notification-time">
                      {formatTime(notification.timestamp)}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Dropdown
      overlay={dropdownContent}
      trigger={['click']}
      placement="bottomRight"
      visible={visible}
      onVisibleChange={setVisible}
      overlayClassName="notification-dropdown-overlay"
    >
      <div className="notification-bell">
        <Badge count={filteredNotifications.filter(n => !n.read).length} size="small">
          <BellOutlined />
        </Badge>
      </div>
    </Dropdown>
  );
};

export default NotificationDropdown;

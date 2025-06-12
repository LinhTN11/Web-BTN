import React from 'react';
import { Button, Space, Card, Typography, Divider } from 'antd';
import { notificationService } from '../../services/notificationService';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { socketService } from '../../services/socketService';

const { Title, Text } = Typography;

const NotificationTest: React.FC = () => {
  const { user } = useAuth();
  const { notifications, unreadCount } = useNotifications();

  const debugSystem = () => {
    console.log('=== NOTIFICATION SYSTEM DEBUG ===');
    console.log('Current user:', user);
    console.log('Socket connected:', socketService.isConnected());
    console.log('Current notifications:', notifications);
    console.log('Unread count:', unreadCount);
    console.log('Socket service:', socketService);

    // Test socket connection
    const socket = socketService.getSocket();
    if (socket) {
      console.log('Socket instance:', socket);
      console.log('Socket ID:', socket.id);
      console.log('Socket connected:', socket.connected);
    } else {
      console.log('No socket instance available');
    }
  };
  const testTaskAssigned = () => {
    notificationService.addNotification({
      type: 'task_assigned',
      taskId: 'test-1',
      taskTitle: 'Hoàn thành báo cáo tháng',
      message: 'Task "Hoàn thành báo cáo tháng" đã được giao cho bạn',
      assignedTo: user?.username || 'TestUser'
    });
  };
  const testTaskCompleted = () => {
    notificationService.addNotification({
      type: 'task_completed',
      taskId: 'test-2',
      taskTitle: 'Thiết kế giao diện mới',
      message: 'Task "Thiết kế giao diện mới" đã hoàn thành',
      assignedTo: user?.username || 'TestUser'
    });
  };
  const testTaskFailed = () => {
    notificationService.addNotification({
      type: 'task_failed',
      taskId: 'test-3',
      taskTitle: 'Kiểm tra hệ thống',
      message: 'Task "Kiểm tra hệ thống" đã thất bại',
      assignedTo: user?.username || 'TestUser'
    });
  };
  const testTaskOverdue = () => {
    notificationService.addNotification({
      type: 'task_overdue',
      taskId: 'test-4',
      taskTitle: 'Cập nhật tài liệu',
      message: 'Task "Cập nhật tài liệu" đã quá hạn',
      assignedTo: user?.username || 'TestUser'
    });
  };
  const testTaskReceived = () => {
    notificationService.addNotification({
      type: 'task_received',
      taskId: 'test-5',
      taskTitle: 'Phân tích dữ liệu',
      message: 'Task "Phân tích dữ liệu" đã được nhận',
      assignedTo: user?.username || 'TestUser'
    });
  };
  const testBackendNotification = async () => {
    try {
      console.log('Testing backend notification...');
      
      // Create a test task that should trigger notification
      const response = await fetch('http://localhost:8000/v1/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },        body: JSON.stringify({
          title: 'Test Notification Task',
          description: 'This is a test task to check notification system',
          assignedTo: user?._id,
          priority: 'medium',
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
      });

      const result = await response.json();
      console.log('Task creation response:', result);
      
      if (result.success) {
        console.log('Task created successfully, should receive notification shortly...');
      } else {
        console.error('Failed to create task:', result.message);
      }
    } catch (error) {
      console.error('Error testing backend notification:', error);
    }
  };
  const testDirectSocket = () => {
    console.log('Testing direct socket communication...');
    const socket = socketService.getSocket();
    
    if (socket) {
      console.log('Socket available, testing notification listener...');
      
      // Manually emit a test notification event
      socket.emit('test', 'Hello from frontend');
      
      // Test if we can receive notifications
      const testNotification = {
        id: Date.now().toString(),
        type: 'task_assigned',
        taskId: 'test-socket-1',
        taskTitle: 'Socket Test Task',
        message: 'This is a direct socket test notification',
        timestamp: new Date(),
        read: false,
        assignedTo: user?._id
      };
      
      console.log('Manually triggering taskNotification event with:', testNotification);
      
      // Manually trigger the notification event to test if our listener works
      socket.emit('taskNotification', testNotification);
      
      // Also test by calling the onNotification callback directly
      const callbacks = (socketService as any).notificationCallbacks;
      console.log('Current notification callbacks:', callbacks.length);
      
      if (callbacks.length > 0) {
        console.log('Manually calling notification callbacks...');
        callbacks.forEach((callback: any, index: number) => {
          console.log(`Calling callback ${index}...`);
          callback(testNotification);
        });
      } else {
        console.log('No notification callbacks registered!');
      }
    } else {
      console.log('No socket available for testing');
    }
  };
  const testNotificationEndpoint = async () => {
    try {
      console.log('🧪 Testing notification endpoint...');
      
      const response = await fetch('http://localhost:8000/v1/tasks/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          targetUserId: user?._id,
          message: `Test notification for ${user?.username} at ${new Date().toLocaleTimeString()}`
        })
      });

      const result = await response.json();
      console.log('🧪 Test notification response:', result);
      
      if (result.success) {
        console.log('✅ Test notification sent successfully');
        console.log('🏠 Socket rooms:', result.rooms);
        console.log('👥 Connected sockets:', result.sockets);
      } else {
        console.error('❌ Test notification failed:', result.message);
      }
    } catch (error) {
      console.error('❌ Error testing notification:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <Title level={3}>Notification System Test & Debug</Title>
      
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ marginBottom: '8px' }}>
          <Text strong>Current User: </Text>
          <Text>{user?.username} (ID: {user?._id})</Text>
        </div>
        <div style={{ marginBottom: '8px' }}>
          <Text strong>Socket Status: </Text>
          <Text>{socketService.isConnected() ? 'Connected' : 'Disconnected'}</Text>
        </div>
        <div style={{ marginBottom: '8px' }}>
          <Text strong>Notifications Count: </Text>
          <Text>{notifications.length}</Text>
        </div>
        <div style={{ marginBottom: '8px' }}>
          <Text strong>Unread Count: </Text>
          <Text>{unreadCount}</Text>
        </div>
        <Button onClick={debugSystem} type="primary">
          Debug System (Check Console)
        </Button>
      </Card>

      <Divider />
      
      <Title level={4}>Test Notifications</Title>
      
      <Card style={{ margin: '20px', maxWidth: '600px' }}>
        <Text type="secondary">
          Nhấn các nút bên dưới để test các loại thông báo khác nhau. 
          Kiểm tra icon chuông trên header để xem thông báo.
        </Text>
        
        <Divider />
        
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>Thông báo cho User (khi được giao task):</Text>
          <Button type="primary" onClick={testTaskAssigned}>
            🔔 Task được giao
          </Button>
          
          <Divider />
          
          <Text strong>Thông báo cho Admin (về trạng thái task):</Text>
          <Space wrap>
            <Button type="default" onClick={testTaskReceived}>
              ✅ Task được nhận
            </Button>
            <Button type="default" onClick={testTaskCompleted}>
              🎉 Task hoàn thành
            </Button>
            <Button type="default" onClick={testTaskFailed}>
              ❌ Task thất bại
            </Button>
            <Button type="default" onClick={testTaskOverdue}>
              ⏰ Task quá hạn
            </Button>
          </Space>
        </Space>
      </Card>

      <Divider />

      <Card style={{ margin: '20px', maxWidth: '600px' }}>
        <Text type="secondary">
          Nhấn nút bên dưới để test thông báo từ backend bằng cách tạo một task mới.
        </Text>
          <Divider />
          <Button type="dashed" onClick={testBackendNotification}>
          📬 Test thông báo từ backend
        </Button>
      </Card>

      <Card style={{ margin: '20px', maxWidth: '600px' }}>
        <Text type="secondary">
          Test notification endpoint trực tiếp (không tạo task).
        </Text>
        
        <Divider />
          <Button type="primary" onClick={testNotificationEndpoint}>
          🧪 Test Notification Endpoint
        </Button>
      </Card>

      <Divider />

      <Card style={{ margin: '20px', maxWidth: '600px' }}>
        <Text type="secondary">
          Nhấn nút bên dưới để test giao tiếp socket trực tiếp (bỏ qua backend).
        </Text>
        
        <Divider />          <Button type="dashed" onClick={testDirectSocket}>
          🔌 Test giao tiếp socket
        </Button>
      </Card>

      <Divider />

      <Card style={{ margin: '20px', maxWidth: '600px' }}>
        <Text type="secondary">
          Nhấn nút bên dưới để test gửi thông báo trực tiếp qua endpoint.
        </Text>
        
        <Divider />          <Button type="dashed" onClick={testNotificationEndpoint}>
          📡 Test thông báo qua endpoint
        </Button>
      </Card>
    </div>
  );
};

export default NotificationTest;

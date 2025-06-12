import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Avatar, List, Tag, Space, message } from 'antd';
import { 
  UserOutlined, 
  MessageOutlined, 
  TeamOutlined, 
  ClockCircleOutlined,
  CheckCircleOutlined 
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { userAPI } from '../../services/api';
import { User } from '../../types';
import './Dashboard.css';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const { user, getUsers, refreshUsers } = useAuth();
  const [loading, setLoading] = useState(true);
  const users = getUsers();

  useEffect(() => {
    // Only allow admin to access dashboard
    if (user?.role !== 'admin') {
      message.error('Bạn không có quyền truy cập trang này');
      return;
    }

    const initDashboard = async () => {
      try {
        setLoading(true);
        // Refresh users data if needed
        await refreshUsers();
      } catch (error) {
        console.error('Error loading dashboard:', error);
        message.error('Không thể tải dữ liệu bảng điều khiển');
      } finally {
        setLoading(false);
      }
    };

    initDashboard();
  }, [user, refreshUsers]);
  const onlineUsers = users.filter(u => u.isOnline);
  const totalUsers = users.length;

  // If user is not admin, show access denied message
  if (user?.role !== 'admin') {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <Title level={2}>Không có quyền truy cập</Title>
          <Text type="secondary">Bạn không có quyền truy cập trang này. Chỉ admin mới có thể xem Dashboard.</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <Title level={2}>Trang chủ</Title>
        <Text type="secondary">Chào mừng bạn trở lại, {user?.username}!</Text>
      </div>

      <Row gutter={[24, 24]} className="stats-row">
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="Tổng người dùng"
              value={totalUsers}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="Đang online"
              value={onlineUsers.length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="Tin nhắn hôm nay"
              value={0}
              prefix={<MessageOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="Hoạt động"
              value={onlineUsers.length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} className="content-row">
        <Col xs={24} lg={12}>
          <Card title="Người dùng đang online" className="online-users-card">
            <List
              loading={loading}
              dataSource={onlineUsers}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        icon={<UserOutlined />} 
                        src={item.avatar}
                        size="default"
                      />
                    }
                    title={                      <Space>
                        {item.username}
                        <Tag color="green">Online</Tag>
                      </Space>
                    }
                    description={item.email}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Hoạt động gần đây" className="activity-card">
            <List
              dataSource={[
                {
                  title: `${user?.username} đã đăng nhập`,
                  description: 'Vừa xong',
                  avatar: <UserOutlined />
                }
              ]}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={item.avatar} />}
                    title={item.title}
                    description={item.description}
                  />
                </List.Item>
              )}            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;

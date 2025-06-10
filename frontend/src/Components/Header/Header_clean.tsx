import React from 'react';
import { Layout, Avatar, Dropdown, Typography } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import type { MenuProps } from 'antd';
import './Header.css';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

interface HeaderProps {
  username?: string;
  avatar?: string;
}

const Header: React.FC<HeaderProps> = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
    }
  };

  const items: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Thông tin cá nhân',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: handleLogout,
    },
  ];

  return (
    <AntHeader className="header">      
      <div className="header-left"></div>      
      <div className="header-right">
        <Dropdown 
          menu={{ items }} 
          placement="bottomRight" 
          arrow
          trigger={['click']}
          overlayStyle={{ zIndex: 1200 }}
        >
          <div className="user-info">
            <Avatar 
              size="default" 
              icon={<UserOutlined />}
              src={user?.avatar}
              className="user-avatar"
            />
            <Text className="username">{user?.username}</Text>
          </div>
        </Dropdown>
      </div>
    </AntHeader>
  );
};

export default Header;

import React from 'react';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  MessageOutlined,
  TeamOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BookOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface SidebarProps {
  collapsed: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onCollapse?: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  collapsed, 
  mobileOpen = false, 
  onMobileClose,
  onCollapse 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const menuItems = [
    ...(user?.role === 'admin' ? [{
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    }] : []),
    {
      key: '/chat',
      icon: <MessageOutlined />,
      label: 'Chat',
    },
    ...(user?.role === 'admin' ? [{
      key: '/users',
      icon: <TeamOutlined />,
      label: 'Users',
    }] : []),
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      key: '/tasks',
      icon: <BookOutlined />,
      label: 'Tasks',
    },
  ];
  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    // Close mobile menu after navigation
    if (onMobileClose) {
      onMobileClose();
    }
  };
  const handleCollapse = () => {
    if (onCollapse) {
      onCollapse(!collapsed);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="mobile-overlay" 
          onClick={onMobileClose}
        />
      )}
      
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}
        width={240}
        collapsedWidth={80}
      >
        <div className="logo-container">
          <img 
            src="/logo-evine.png" 
            alt="Evine" 
            className="sidebar-logo"
          />
          {!collapsed && <span className="logo-text">Evine</span>}
        </div>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className="sidebar-menu"
        />

        {/* Collapse button */}
        <div className="collapse-button" onClick={handleCollapse}>
          {collapsed ? (
            <MenuUnfoldOutlined style={{ fontSize: '16px' }} />
          ) : (
            <MenuFoldOutlined style={{ fontSize: '16px' }} />
          )}
        </div>
      </Sider>
    </>
  );
};

export default Sidebar;
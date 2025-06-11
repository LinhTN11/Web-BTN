import React from 'react';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  MessageOutlined,
  TeamOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BookOutlined,
  PlusCircleOutlined,
  PieChartOutlined,
  ClockCircleOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const { Sider } = Layout;

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
  const { user } = useAuth();  const menuItems = [
    ...(user?.role === 'admin' ? [{
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    }] : []),    ...(user?.role === 'admin' ? [{
      key: '/statistics',
      icon: <PieChartOutlined />,
      label: 'Statistics',
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
    
    ...(user?.role === 'admin' ? [{
      key: '/create-task',
      icon: <PlusCircleOutlined />,
      label: 'Assigned tasks',
    }] : []),
    {
      key: '/tasks',
      icon: <BookOutlined />,
      label: 'Tasks',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      key: '/timekeeping',
      icon: <ClockCircleOutlined />,
      label: 'Chấm công',
    },
    ...(user?.role === 'admin' ? [{
      key: '/admin/timekeeping-history',
      icon: <HistoryOutlined />,
      label: 'Lịch sử Chấm công',
    }] : []),
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
        trigger={null} // Disable default trigger
        collapsible={false} // Disable built-in collapsible behavior
        collapsed={collapsed}
        className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}
        width={240}
        collapsedWidth={80}
        onCollapse={() => {}} // Prevent any automatic collapse
      >
        <div className="logo-container">
          <img 
            src="/logo-evine.png" 
            alt="Evine" 
            className="sidebar-logo"
          />
          {!collapsed && <span className="logo-text">Evine</span>}
        </div>        <div className="sidebar-content">
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            className="sidebar-menu"
            inlineCollapsed={collapsed}
            triggerSubMenuAction="click" // Only click, not hover
          />
        </div>

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
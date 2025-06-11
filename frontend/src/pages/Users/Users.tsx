import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Avatar, 
  Tag, 
  Space, 
  Popconfirm, 
  message, 
  Typography,
  Input
} from 'antd';
import { 
  UserOutlined, 
  DeleteOutlined, 
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { userAPI } from '../../services/api';
import { User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import type { ColumnsType } from 'antd/es/table';
import './Users.css';

const { Title } = Typography;
const { Search } = Input;

const Users: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [editingEmailUserId, setEditingEmailUserId] = useState<string | null>(null);
  const [tempEmail, setTempEmail] = useState('');
  const { user: currentUser, getUsers, refreshUsers, updateUserInList, removeUserFromList } = useAuth();
  const users = getUsers();

  useEffect(() => {
    const initUsers = async () => {
      try {
        setLoading(true);
        await refreshUsers();
      } catch (error) {
        message.error('Không thể tải danh sách người dùng');
      } finally {
        setLoading(false);
      }
    };

    initUsers();
  }, []);

  const handleDeleteUser = async (userId: string) => {
    try {
      await userAPI.deleteUser(userId);
      removeUserFromList(userId);
      message.success('Xóa người dùng thành công');
    } catch (error) {
      message.error('Không thể xóa người dùng');
    }
  };

  const handleEmailClick = (user: User) => {
    if (currentUser?.role !== 'admin') return;
    setEditingEmailUserId(user._id);
    setTempEmail(user.email);
  };

  const handleEmailSave = async (userId: string) => {
    if (!tempEmail.trim()) {
      message.error('Email không được để trống');
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(tempEmail)) {
      message.error('Email không hợp lệ');
      return false;
    }

    try {
      const updatedUser = await userAPI.updateUser(userId, { email: tempEmail });
      updateUserInList(userId, { email: tempEmail });
      setEditingEmailUserId(null);
      setTempEmail('');
      message.success('Cập nhật email thành công');
      return true;
    } catch (error) {
      message.error('Không thể cập nhật email');
      return false;
    }
  };

  const handleEmailCancel = () => {
    setEditingEmailUserId(null);
    setTempEmail('');
  };

  const handleEmailKeyPress = async (e: React.KeyboardEvent, userId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleEmailSave(userId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleEmailCancel();
    }
  };

  const handleEmailBlur = async (userId: string) => {
    const originalUser = users.find(u => u._id === userId);
    if (originalUser && tempEmail !== originalUser.email && tempEmail.trim()) {
      const success = await handleEmailSave(userId);
      if (!success) {
        setTimeout(() => {
          const input = document.querySelector(`input[data-user-id="${userId}"]`) as HTMLInputElement;
          if (input) {
            input.focus();
          }
        }, 100);
      }
    } else {
      handleEmailCancel();
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchText.toLowerCase()) ||
    user.email.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns: ColumnsType<User> = [
    {
      title: 'Avatar',
      dataIndex: 'avatar',
      key: 'avatar',
      width: 50,
      render: (avatar: string) => (
        <Avatar 
          size="small" 
          icon={<UserOutlined />} 
          src={avatar}
          className="user-avatar"
        />
      ),
    },
    {
      title: 'Tên đăng nhập',
      dataIndex: 'username',
      key: 'username',
      width: 100,
      sorter: (a, b) => a.username.localeCompare(b.username),
      render: (username: string) => (
        <span className="compact-text">{username}</span>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 160,
      sorter: (a, b) => a.email.localeCompare(b.email),
      render: (email: string, record: User) => {
        if (editingEmailUserId === record._id && currentUser?.role === 'admin') {
          return (
            <Input
              value={tempEmail}
              onChange={(e) => setTempEmail(e.target.value)}
              onBlur={() => handleEmailBlur(record._id)}
              onKeyDown={(e) => handleEmailKeyPress(e, record._id)}
              data-user-id={record._id}
              size="small"
              style={{ 
                width: '100%', 
                border: '1px solid #1890ff',
                borderRadius: '4px',
                boxShadow: '0 0 4px rgba(24, 144, 255, 0.2)'
              }}
              placeholder="Nhập email..."
              autoFocus
            />
          );
        }
        
        return (
          <span
            onClick={() => handleEmailClick(record)}
            style={{
              cursor: currentUser?.role === 'admin' ? 'pointer' : 'default',
              padding: '2px 4px',
              borderRadius: '2px',
              transition: 'background-color 0.2s',
              display: 'block'
            }}
            className={`compact-text ${currentUser?.role === 'admin' ? 'editable-email' : ''}`}
            title={currentUser?.role === 'admin' ? 'Click để chỉnh sửa email • Enter để lưu • Esc để hủy' : ''}
          >
            {email}
          </span>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isOnline',
      key: 'isOnline',
      width: 70,
      render: (isOnline: boolean) => (
        <Tag 
          icon={isOnline ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={isOnline ? 'success' : 'default'}
          className="compact-tag"
        >
          {isOnline ? 'Online' : 'Offline'}
        </Tag>
      ),
      filters: [
        { text: 'Online', value: true },
        { text: 'Offline', value: false },
      ],
      onFilter: (value, record) => record.isOnline === value,
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      width: 60,
      render: (role: string) => (
        <Tag 
          color={role === 'admin' ? 'red' : 'blue'}
          className="compact-tag"
        >
          {role === 'admin' ? 'Admin' : 'User'}
        </Tag>
      ),
      filters: [
        { text: 'Admin', value: 'admin' },
        { text: 'User', value: 'user' },
      ],
      onFilter: (value, record) => record.role === value,
    },
    {
      title: 'Hoạt động',
      dataIndex: 'lastActive',
      key: 'lastActive',
      width: 80,
      render: (lastActive: string) => {
        if (!lastActive) return <span className="compact-text">-</span>;
        return (
          <span className="compact-text">
            {new Date(lastActive).toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit'
            })}
          </span>
        );
      },
      sorter: (a, b) => {
        if (!a.lastActive) return 1;
        if (!b.lastActive) return -1;
        return new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime();
      },
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 60,
      render: (_, record: User) => (
        <Space size="small">
          {currentUser?.role === 'admin' && record._id !== currentUser._id && (
            <Popconfirm
              title="Xóa người dùng"
              description="Bạn có chắc chắn muốn xóa người dùng này?"
              onConfirm={() => handleDeleteUser(record._id)}
              okText="Xóa"
              cancelText="Hủy"
              okType="danger"
            >
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />}
                size="small"
                title="Xóa người dùng"
                className="compact-button"
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="users-page">
      <div className="users-header">
        <Title level={3} className="compact-title">Quản lý người dùng</Title>
        <div className="users-actions">
          <Search
            placeholder="Tìm kiếm theo tên hoặc email"
            allowClear
            enterButton={<SearchOutlined />}
            size="small"
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 220 }}
          />
        </div>
      </div>

      <Card className="users-card compact-card">
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="_id"
          loading={loading}
          size="small"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            position: ['bottomLeft'],
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} của ${total} người dùng`,
            size: "small"
          }}
          className="users-table compact-table"
          rowClassName={() => 'table-row compact-row'}
          bordered={false}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
};

export default Users;
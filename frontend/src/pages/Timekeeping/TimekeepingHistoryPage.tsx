import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Typography,
  Select,
  DatePicker,
  Tag,
  message,
  Spin,
  Alert,
  Button,
  Form,
} from 'antd';
import type { TableProps } from 'antd';
import dayjs from 'dayjs';
import timekeepingService from '../../services/timekeepingService';
import { userAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { PopulatedTimekeeping } from '../../types/timekeeping';
import { User } from '../../types';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const TimekeepingHistoryPage: React.FC = () => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [history, setHistory] = useState<PopulatedTimekeeping[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    userId?: string;
    startDate?: string;
    endDate?: string;
  }>({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const fetchUsers = useCallback(async () => {
    try {
      const userList = await userAPI.getAllUsers();
      setUsers(userList);
    } catch (error) {
      message.error('Không thể tải danh sách nhân viên.');
    }
  }, []);

  const fetchHistory = useCallback(async (params: any) => {
    setLoading(true);
    try {
      const response = await timekeepingService.getAllTimekeepingHistory(params);
      setHistory(response.data);
      setPagination(prev => {
        if (prev.total === response.pagination.totalRecords && prev.current === response.pagination.currentPage) {
          return prev;
        }
        return { ...prev, total: response.pagination.totalRecords, current: response.pagination.currentPage };
      });
    } catch (error) {
      message.error('Không thể tải lịch sử chấm công.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user, fetchUsers]);

  useEffect(() => {
    if (user?.role === 'admin') {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters,
      };
      fetchHistory(params);
    }
  }, [user, pagination, filters, fetchHistory]);

  const handleTableChange: TableProps<PopulatedTimekeeping>['onChange'] = (newPagination) => {
    setPagination(prev => ({
      ...prev,
      current: newPagination.current || 1,
      pageSize: newPagination.pageSize || 10,
    }));
  };

  const handleFilterSubmit = (values: any) => {
    const { userId, dateRange } = values;
    setPagination(prev => ({ ...prev, current: 1 }));
    setFilters({
      userId,
      startDate: dateRange ? dateRange[0].format('YYYY-MM-DD') : undefined,
      endDate: dateRange ? dateRange[1].format('YYYY-MM-DD') : undefined,
    });
  };

  const handleResetFilters = () => {
    form.resetFields();
    setPagination(prev => ({ ...prev, current: 1 }));
    setFilters({});
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'on_time': return <Tag color="success">Đúng giờ</Tag>;
      case 'late': return <Tag color="warning">Đi muộn</Tag>;
      case 'early_leave': return <Tag color="orange">Về sớm</Tag>;
      case 'absent': return <Tag color="error">Vắng</Tag>;
      case 'half_day': return <Tag color="blue">Nửa ngày</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  const columns: TableProps<PopulatedTimekeeping>['columns'] = [
    {
      title: 'Nhân viên',
      dataIndex: ['userId', 'username'],
      key: 'employee',
    },
    {
      title: 'Email',
      dataIndex: ['userId', 'email'],
      key: 'email',
    },
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Check-in',
      dataIndex: 'checkIn',
      key: 'checkIn',
      render: (checkIn: string) => checkIn ? dayjs(checkIn).format('HH:mm:ss') : '-',
    },
    {
      title: 'Check-out',
      dataIndex: 'checkOut',
      key: 'checkOut',
      render: (checkOut: string) => checkOut ? dayjs(checkOut).format('HH:mm:ss') : '-',
    },
    {
      title: 'Giờ làm',
      dataIndex: 'workingHours',
      key: 'workingHours',
      render: (hours: number) => hours?.toFixed(2) || '0.00',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: getStatusTag,
    },
  ];

  if (user?.role !== 'admin') {
    return <Alert message="Truy cập bị từ chối" description="Bạn không có quyền xem trang này." type="error" showIcon />;
  }

  return (
    <Spin spinning={loading}>
      <Card>
        <Title level={3}>Lịch sử Chấm công Nhân viên</Title>
        <Form
          form={form}
          onFinish={handleFilterSubmit}
          layout="inline"
          style={{ marginBottom: 24 }}
        >
          <Form.Item name="userId">
            <Select
              placeholder="Chọn nhân viên"
              style={{ width: 200 }}
              allowClear
              showSearch
              filterOption={(input, option) =>
                String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {users.map(u => <Option key={u._id} value={u._id}>{u.username}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="dateRange">
            <RangePicker />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Tìm kiếm
            </Button>
          </Form.Item>
          <Form.Item>
            <Button onClick={handleResetFilters}>
              Xóa bộ lọc
            </Button>
          </Form.Item>
        </Form>
        <Table
          columns={columns}
          dataSource={history}
          rowKey="_id"
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </Spin>
  );
};

export default TimekeepingHistoryPage;

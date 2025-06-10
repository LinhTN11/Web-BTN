import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, DatePicker, Card, Typography, message, Spin } from 'antd';
import { FileTextOutlined, SendOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { userAPI } from '../../services/api';
import TaskService from '../../services/taskService';
import { User } from '../../types'; // User import might need attention later
import { CreateTaskInput } from '../Tasks/TaskDisplayPage';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const AdminCreateTaskPage: React.FC = () => {
  const [form] = Form.useForm();
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) return;
      setLoadingUsers(true);
      try {
        const fetchedUsers = await userAPI.getAllUsers();
        setUsers(fetchedUsers || []);
      } catch (error) {
        console.error('Lỗi khi tải danh sách người dùng:', error);
        message.error('Không thể tải danh sách người dùng để giao việc.');
      }
      setLoadingUsers(false);
    };

    fetchUsers();
  }, [token]);

  const handleCreateTask = async (values: any) => {
    if (!token) {
      message.error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
      return;
    }
    setSubmitting(true);
    const taskData: CreateTaskInput = {
      title: values.title,
      description: values.description,
      assignedTo: values.assignedTo,
      deadline: values.deadline.toISOString(),
    };

    try {
      const response = await TaskService.createTask(taskData, token);
      if (response.success) {
        message.success('Tạo công việc thành công!');
        form.resetFields();
      } else {
        message.error(response.message || 'Tạo công việc thất bại.');
      }
    } catch (error: any) {
      console.error('Lỗi khi tạo công việc:', error);
      message.error(error.message || 'Đã xảy ra lỗi trong quá trình tạo công việc.');
    }
    setSubmitting(false);
  };

  return (
    <Card>
      <Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>Tạo Công Việc Mới</Title>
      {loadingUsers ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <p>Đang tải dữ liệu người dùng...</p>
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTask}
          initialValues={{
            deadline: dayjs().add(1, 'day') 
          }}
        >
          <Form.Item
            name="title"
            label="Tiêu Đề Công Việc"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề công việc!' }]}
          >
            <Input prefix={<FileTextOutlined />} placeholder="Nhập tiêu đề công việc" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô Tả Công Việc"
            rules={[{ required: true, message: 'Vui lòng nhập mô tả công việc!' }]}
          >
            <Input.TextArea rows={4} placeholder="Nhập mô tả công việc" />
          </Form.Item>

          <Form.Item
            name="assignedTo"
            label="Giao Cho"
            rules={[{ required: true, message: 'Vui lòng chọn người dùng để giao việc!' }]}
          >
            <Select
              showSearch
              placeholder="Chọn một người dùng"
              optionFilterProp="children"
              filterOption={(input, option) =>
                option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
              }
            >
              {users.map(user => (
                <Option key={user._id} value={user._id}>
                  {user.username} ({user.email})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="deadline"
            label="Hạn Chót"
            rules={[{ required: true, message: 'Vui lòng chọn hạn chót!' }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" showTime />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right' }}>
            <Button type="primary" htmlType="submit" loading={submitting} icon={<SendOutlined />}>
              Tạo Công Việc
            </Button>
          </Form.Item>
        </Form>
      )}
    </Card>
  );
};

export default AdminCreateTaskPage;

import React, { useEffect, useState } from "react";
import TaskDisplayPage, { Task } from "../../Components/Tasks/TaskDisplayPage";
import TaskService from "../../services/taskService";
import { useAuth } from "../../contexts/AuthContext";
import { message, Input, Modal, Form, DatePicker, Select, Row, Col } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Option } from "antd/es/mentions";
import { User } from '../../types';
import { userAPI } from '../../services/api';

// Define status order for sorting
const statusOrder = {
  todo: 0,
  in_progress: 1,
  overdue: 2,
  done: 3,
  failed: 4
};

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm] = Form.useForm();
  const { user, token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);

  const fetchUsers = async () => {
    try {
      if (!token || user?.role !== 'admin') return; // Chỉ fetch users khi là admin
      const response = await userAPI.getAllUsers();
      setUsers(response);
    } catch (error) {
      console.error("Error fetching users:", error);
      message.error("Không thể tải danh sách người dùng.");
    }
  };

  const fetchTasks = async () => {
    try {
      if (!user?._id || !token) return;

      const response = user.role === 'admin' 
        ? await TaskService.getAllTasksForAdmin(token)
        : await TaskService.getTasksByUserId(user._id, token);

      if (response.success) {
        const tasksWithDates = response.data.map(task => ({
          ...task,
          deadline: new Date(task.deadline),
          createdAt: new Date(task.createdAt),
          receivedAt: task.receivedAt ? new Date(task.receivedAt) : undefined
        }));
        setTasks(tasksWithDates);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      message.error("Không thể tải danh sách công việc.");
    }
  };

  useEffect(() => {
    console.log("editingTask state changed:", editingTask);
    console.log("Modal should be open:", !!editingTask);
  }, [editingTask]);

  useEffect(() => {
    fetchTasks();
    // Chỉ fetch users khi user là admin
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user, token]);

  const handleEdit = (task: Task) => {
    console.log("Editing task:", task);
    
    // Set editing task trước để modal hiện
    setEditingTask(task);
    
    try {
      const deadlineDate = task.deadline instanceof Date ? task.deadline : new Date(task.deadline);
      const deadlineValue = dayjs(deadlineDate);
      
      if (!deadlineValue.isValid()) {
        console.warn("Deadline không hợp lệ:", task.deadline);
        editForm.setFieldsValue({
          title: task.title,
          description: task.description,
          deadline: dayjs(),
          assignedTo: task.assignedTo
        });
        message.warning("Deadline không hợp lệ, đã đặt về ngày hiện tại.");
        return;
      }
  
      editForm.setFieldsValue({
        title: task.title,
        description: task.description,
        deadline: deadlineValue,
        assignedTo: task.assignedTo
      });
    } catch (error) {
      console.error("Error in handleEdit:", error);
      editForm.setFieldsValue({
        title: task.title,
        description: task.description,
        deadline: dayjs(),
        assignedTo: task.assignedTo
      });
    }
  };

  const handleUpdateTask = async () => {
    try {
      if (!editingTask) return;
      const values = await editForm.validateFields();
      const updatedTask = {
        title: values.title,
        description: values.description,
        deadline: values.deadline.toISOString(),
        assignedTo: values.assignedTo
      };

      await TaskService.updateTask(editingTask._id, updatedTask, token);
      message.success("Cập nhật thành công!");
      setEditingTask(null);
      fetchTasks();
    } catch (error) {
      message.error("Cập nhật thất bại.");
    }
  };

  const filteredAndSortedTasks = tasks
    .filter(task => task.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const statusComparison = statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
      return statusComparison === 0 ? a.deadline.getTime() - b.deadline.getTime() : statusComparison;
    });

  
return (
  <div style={{ padding: 32 }}>
  <div style={{ marginBottom: 32 }}>
    <Input
      placeholder="Tìm kiếm theo tiêu đề..."
      prefix={<SearchOutlined />}
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      style={{
        maxWidth: 400,
        borderRadius: 8,
        padding: '6px 12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        border: '1px solid #d9d9d9',
      }}
    />
  </div>

  <div
    style={{
      display: 'flex',
      gap: 24,
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
    }}
  >
    {filteredAndSortedTasks.map((t) => (
      <TaskDisplayPage
        key={t._id}
        task={t}
        token={token}
        onTaskUpdated={fetchTasks}
        onEdit={handleEdit}
      />
    ))}
  </div>

  {editingTask && (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(228, 208, 208, 0.1)',
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <div
      style={{
        backgroundColor: '#fff',
        padding: '32px',
        borderRadius: '16px',
        width: '500px',
        maxWidth: '90%',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)', 
        transition: 'all 0.3s ease-in-out',
        transform: 'translateY(0)', 
      }}
    >
      <h3 style={{ marginBottom: '20px', fontSize: '20px', color: '#333' }}>
        Chỉnh sửa công việc - {editingTask.title}
      </h3>
      <Form form={editForm} layout="vertical">
        <Form.Item name="title" label="Tiêu đề" style={{ marginBottom: '16px' }}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Mô tả" style={{ marginBottom: '16px' }}>
          <Input.TextArea rows={3} />
        </Form.Item>
        
        {/* Chỉ hiển thị trường "Giao Cho" khi user là admin */}
        {user?.role === 'admin' && (
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
        )}
        
        <Form.Item name="deadline" label="Hạn chót" style={{ marginBottom: '0' }}>
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
      </Form>
      <div style={{ marginTop: '24px', textAlign: 'right' }}>
        <button
          onClick={() => setEditingTask(null)}
          style={{
            marginRight: '12px',
            padding: '8px 16px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Huỷ
        </button>
        <button
          onClick={handleUpdateTask}
          style={{
            backgroundColor: '#1890ff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Lưu
        </button>
      </div>
    </div>
  </div>
)}

  </div>
);
};

export default TasksPage;
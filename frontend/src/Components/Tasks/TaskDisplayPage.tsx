import React, { useState, useEffect } from "react";
import { Card, Typography, Button, Space, Input, message, Tag, Avatar } from "antd";
import TaskService from "../../services/taskService";
import { useAuth } from "../../contexts/AuthContext";
import { ClockCircleOutlined, CheckCircleOutlined, LoadingOutlined, UserOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export interface Task {
  _id: string;
  title: string;
  description: string;
  assignedTo: {
    _id: string;
    username: string;
    avatar?: string;
  };
  assignedBy: string;
  deadline: Date;
  createdAt: Date;
  status: "todo" | "in_progress" | "done";
  receivedAt?: Date;
  proofUrl?: string;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  assignedTo: string;
  deadline: string;
}

interface TaskDisplayPageProps {
  task: Task;
  token: string | null;
  onTaskUpdated: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'todo':
      return '#ff4d4f';
    case 'in_progress':
      return '#1890ff';
    case 'done':
      return '#52c41a';
    default:
      return '#d9d9d9';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'todo':
      return 'Chưa làm';
    case 'in_progress':
      return 'Đang làm';
    case 'done':
      return 'Hoàn thành';
    default:
      return status;
  }
};

const TaskDisplayPage: React.FC<TaskDisplayPageProps> = ({ task, token, onTaskUpdated }) => {
  const { user, token: authToken } = useAuth();
  const [currentTask, setCurrentTask] = useState<Task>(task);
  const [status, setStatus] = useState(task.status);
  const [receivedAt, setReceivedAt] = useState<Date | null>(task.receivedAt || null);
  const [driveLink, setDriveLink] = useState<string>(task.proofUrl || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isAssignedUser = user?._id === task.assignedTo._id;

  const handleReceive = async () => {
    if (status === "todo") {
      const now = new Date().toISOString();
      try {
        await TaskService.updateTask(task._id, { status: "in_progress", receivedAt: new Date(now) }, authToken);
        setStatus("in_progress");
        setReceivedAt(new Date(now));
        onTaskUpdated();
      } catch (error) {
        message.error("Không thể cập nhật trạng thái task.");
      }
    }
  };

  const handleComplete = async () => {
    if (status === "in_progress" && driveLink) {
      try {
        await TaskService.updateTask(task._id, { 
          status: "done",
          proofUrl: driveLink 
        }, authToken);
        setStatus("done");
        onTaskUpdated();
        message.success("Đã hoàn thành task và lưu link Google Drive.");
      } catch (error) {
        message.error("Không thể hoàn thành task.");
      }
    } else if (!driveLink) {
      message.warning("Vui lòng nhập link Google Drive trước khi hoàn thành.");
    }
  };

  const handleDriveLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDriveLink(e.target.value);
  };

  const isGoogleDriveLink = (url: string): boolean => {
    return url.includes('drive.google.com');
  };

  const handleSubmitDriveLink = async () => {
    if (!driveLink) {
      message.warning("Vui lòng nhập link Google Drive.");
      return;
    }

    if (!isGoogleDriveLink(driveLink)) {
      message.error("Vui lòng nhập link Google Drive hợp lệ.");
      return;
    }

    setIsSubmitting(true);
    try {
      await TaskService.updateTask(task._id, { proofUrl: driveLink }, authToken);
      message.success("Đã lưu link Google Drive.");
      onTaskUpdated();
    } catch (error) {
      message.error("Không thể lưu link Google Drive.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardStyle = {
    width: 300,
    marginBottom: 16,
    borderRadius: 8,
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease',
    ':hover': {
      boxShadow: '0 6px 12px rgba(0,0,0,0.15)',
      transform: 'translateY(-2px)'
    }
  };

  const titleStyle = {
    fontSize: '18px',
    marginBottom: '12px',
    color: '#1a1a1a',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const
  };

  const descriptionStyle = {
    color: '#595959',
    fontSize: '14px',
    marginBottom: '16px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical' as const
  };

  const dateStyle = {
    fontSize: '13px',
    color: '#8c8c8c',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  };

  const buttonStyle = {
    width: '100%',
    marginTop: '8px'
  };

  const assignedUserStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    color: '#666'
  };

  return (
    <Card style={cardStyle} bodyStyle={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Tag color={getStatusColor(status)} style={{ float: 'right', marginTop: '4px' }}>
          {getStatusText(status)}
        </Tag>
        <Title level={4} style={titleStyle}>{currentTask.title}</Title>
        <div style={assignedUserStyle}>
          <Avatar 
            size="small" 
            icon={<UserOutlined />} 
            src={currentTask.assignedTo.avatar}
          />
          <span>Giao cho: {currentTask.assignedTo.username}</span>
        </div>
        <Paragraph style={descriptionStyle}>{currentTask.description}</Paragraph>
      </div>

      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={dateStyle}>
          <ClockCircleOutlined />
          <span>Deadline: {currentTask.deadline.toLocaleDateString('vi-VN')}</span>
        </div>
        
        {receivedAt && (
          <div style={dateStyle}>
            <CheckCircleOutlined />
            <span>Đã nhận: {receivedAt.toLocaleDateString('vi-VN')}</span>
          </div>
        )}

        {!isAdmin && isAssignedUser && status === "todo" && (
          <Button 
            type="primary" 
            onClick={handleReceive} 
            style={buttonStyle}
          >
            Nhận task
          </Button>
        )}

        {!isAdmin && isAssignedUser && status === "in_progress" && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input
              placeholder="Nhập link Google Drive"
              value={driveLink}
              onChange={handleDriveLinkChange}
              style={{ borderRadius: '6px' }}
            />
            <Button 
              type="primary"
              onClick={handleSubmitDriveLink}
              loading={isSubmitting}
              disabled={!driveLink || !isGoogleDriveLink(driveLink)}
              style={buttonStyle}
              icon={isSubmitting ? <LoadingOutlined /> : null}
            >
              Lưu link
            </Button>
            <Button 
              type="primary"
              onClick={handleComplete}
              disabled={!driveLink}
              style={{ ...buttonStyle, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Hoàn thành
            </Button>
          </Space>
        )}

        {status === "done" && driveLink && (
          <Button 
            type="link" 
            href={driveLink} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ padding: 0, height: 'auto' }}
          >
            Xem minh chứng
          </Button>
        )}
      </Space>
    </Card>
  );
};

export default TaskDisplayPage;

import React, { useState, useEffect } from "react";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Card, Typography, Button, Space, Input, message, Tag, Avatar, Tooltip, Popconfirm } from "antd";
import TaskService from "../../services/taskService";
import { useAuth } from "../../contexts/AuthContext";
import { ClockCircleOutlined, CheckCircleOutlined, LoadingOutlined, UserOutlined, WarningOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

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
  status: "todo" | "in_progress" | "done" | "failed" | "overdue";
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
  onEdit?: (task: Task) => void;
}


const getStatusColor = (status: string) => {
  switch (status) {
    case 'todo':
      return '#ff4d4f';
    case 'in_progress':
      return '#1890ff';
    case 'done':
      return '#52c41a';
    case 'failed':
      return '#262626';
    case 'overdue':
      return '#faad14';
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
    case 'failed':
      return 'Không hoàn thành';
    case 'overdue':
      return 'Quá hạn';
    default:
      return status;
  }
};

const TaskDisplayPage: React.FC<TaskDisplayPageProps> = ({ task, token, onTaskUpdated, onEdit }) => {
  const { user, token: authToken } = useAuth();
  const [currentTask, setCurrentTask] = useState<Task>(task);
  const [status, setStatus] = useState(task.status);
  const [receivedAt, setReceivedAt] = useState<Date | null>(task.receivedAt || null);
  const [driveLink, setDriveLink] = useState<string>(task.proofUrl || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isAssignedUser = user?._id === task.assignedTo._id;
  const isOverdue = new Date() > new Date(task.deadline);
  const wasCompletedLate = status === 'done' && receivedAt && new Date(receivedAt) > new Date(task.deadline);

  const [hasCheckedOverdue, setHasCheckedOverdue] = useState(false);

useEffect(() => {
  const handleOverdueTask = async () => {
    if (!hasCheckedOverdue && isOverdue) {
      if (status === 'todo') {
        await TaskService.updateTask(task._id, { status: 'failed' }, authToken);
        setStatus('failed');
        onTaskUpdated();
      } else if (status === 'in_progress') {
        await TaskService.updateTask(task._id, { status: 'overdue' }, authToken);
        setStatus('overdue');
        onTaskUpdated();
      }
      setHasCheckedOverdue(true);
    }
  };

  handleOverdueTask();
}, [isOverdue, hasCheckedOverdue, status, authToken, onTaskUpdated]);


  const handleReceive = async () => {
    if (status === "todo" && !isOverdue) {
      const now = new Date().toISOString();
      try {
        await TaskService.updateTask(task._id, { status: "in_progress", receivedAt: new Date(now) }, authToken);
        setStatus("in_progress");
        setReceivedAt(new Date(now));
        onTaskUpdated();
      } catch (error) {
        message.error("Không thể cập nhật trạng thái task.");
      }
    } else if (isOverdue) {
      message.error("Không thể nhận task đã quá hạn.");
    }
  };

  const handleComplete = async () => {
    if ((status === "in_progress" || status === "overdue") && driveLink) {
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
    borderRadius: 12,
    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
    transition: 'all 0.3s ease',
    position: 'relative' as const,
    minHeight: '300px',
    border: '1px solid #f0f0f0',
    ':hover': {
      boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
      transform: 'translateY(-2px)',
      borderColor: '#e6f7ff'
    }
  };

  const titleStyle = {
    fontSize: '18px',
    marginBottom: '12px',
    color: '#262626',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    lineHeight: '1.4'
  };

  const descriptionStyle = {
    color: '#595959',
    fontSize: '14px',
    marginBottom: '16px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical' as const,
    lineHeight: '1.6'
  };

  const dateStyle = {
    fontSize: '13px',
    color: '#8c8c8c',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 0'
  };

  const buttonStyle = {
    width: '100%',
    marginTop: '8px',
    height: '36px',
    borderRadius: '6px',
    fontWeight: 500
  };

  const assignedUserStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    color: '#666',
    padding: '4px 0'
  };

  const handleDelete = async () => {
    try {
      await TaskService.deleteTask(task._id, authToken);
      message.success("Đã xoá task.");
      onTaskUpdated();
    } catch (error) {
      message.error("Không thể xoá task.");
    }
  };
  



  return (
    
    <Card 
      styles={{
        body: {
          padding: '20px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column' as const
        }
      }}
      style={cardStyle}
    >
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ 
            float: 'right', 
            marginTop: '4px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginLeft: '12px'
          }}>
            <Tag color={getStatusColor(status)} style={{ 
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500
            }}>
              {getStatusText(status)}
            </Tag>
            {wasCompletedLate && (
              <Tooltip title="Hoàn thành sau thời hạn">
                <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: '16px' }} />
              </Tooltip>
            )}
          </div>
          {isOverdue && status !== 'done' && status !== 'failed' && (
            <Tag icon={<WarningOutlined />} color="warning" style={{ 
              float: 'right', 
              marginTop: '4px', 
              marginRight: '8px',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500
            }}>
              Quá hạn
            </Tag>
          )}
          <Title level={4} style={titleStyle}>{currentTask.title}</Title>
          <div style={assignedUserStyle}>
            <Avatar 
              size="small" 
              icon={<UserOutlined />} 
              src={currentTask.assignedTo.avatar}
              style={{ border: '1px solid #f0f0f0' }}
            />
            <span style={{ fontSize: '13px' }}>Giao cho: {currentTask.assignedTo.username}</span>
          </div>
          <Paragraph style={descriptionStyle}>{currentTask.description}</Paragraph>
        </div>

        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={dateStyle}>
            <ClockCircleOutlined style={{ fontSize: '14px', color: '#bfbfbf' }} />
            <span>Deadline: {new Date(currentTask.deadline).toLocaleDateString('vi-VN')}</span>
          </div>
          
          {receivedAt && (
            <div style={dateStyle}>
              <CheckCircleOutlined style={{ fontSize: '14px', color: '#bfbfbf' }} />
              <span>Đã nhận: {new Date(receivedAt).toLocaleDateString('vi-VN')}</span>
            </div>
          )}

          {!isAdmin && isAssignedUser && status === "todo" && !isOverdue && (
            <Button 
              type="primary" 
              onClick={handleReceive} 
              style={buttonStyle}
            >
              Nhận task
            </Button>
          )}

          {!isAdmin && isAssignedUser && (status === "in_progress" || status === "overdue") && (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                placeholder="Nhập link Google Drive"
                value={driveLink}
                onChange={handleDriveLinkChange}
                style={{ 
                  borderRadius: '6px',
                  height: '36px'
                }}
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

          {(status === "done" || status === "failed") && driveLink && (
            <Button 
              type="link" 
              href={driveLink} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                padding: '4px 0', 
                height: 'auto',
                fontSize: '13px'
              }}
            >
              Xem minh chứng
            </Button>
          )}
        </Space>
      </div>

      {isAdmin && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: 8,
          marginTop: 'auto',
          borderTop: '1px solid #f0f0f0',
          paddingTop: '16px'
        }}>
          <Button 
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              if (onEdit) {
                onEdit(currentTask);
              }
            }}
            style={{ 
              backgroundColor: '#1890ff', 
              borderColor: '#1890ff',
              borderRadius: '6px',
              height: '32px',
              padding: '4px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            Sửa
          </Button>

          <Popconfirm
            title="Bạn có chắc chắn muốn xoá task này?"
            onConfirm={handleDelete}
            okText="Xoá"
            cancelText="Huỷ"
          >
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              style={{ 
                border: 'none', 
                padding: '4px 8px',
                borderRadius: '6px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fff1f0',
                color: '#ff4d4f'
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget;
                target.style.backgroundColor = '#ffccc7';
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget;
                target.style.backgroundColor = '#fff1f0';
              }}
            />
          </Popconfirm>
        </div>
      )}
    </Card>
  );
};

export default TaskDisplayPage;
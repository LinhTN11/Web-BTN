import React, { useState, useEffect } from "react";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Card, Typography, Button, Space, Input, message, Tag, Avatar, Tooltip, Popconfirm } from "antd";
import TaskService from "../../services/taskService";
import { useAuth } from "../../contexts/AuthContext";
import { notificationService } from "../../services/notificationService";
import { ClockCircleOutlined, CheckCircleOutlined, LoadingOutlined, UserOutlined, WarningOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import '../../pages/Tasks/Tasks.css';

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
  const [isSubmitting, setIsSubmitting] = useState(false);  const isAdmin = user?.role === 'admin';
  const isAssignedUser = user?._id === task.assignedTo._id;
  const isOverdue = new Date() > new Date(task.deadline);
  const wasCompletedLate = status === 'done' && receivedAt && new Date(receivedAt) > new Date(task.deadline);

  const [hasCheckedOverdue, setHasCheckedOverdue] = useState(false);

  // Update local state when props change
  useEffect(() => {
    setCurrentTask(task);
    setStatus(task.status);
    setReceivedAt(task.receivedAt || null);
    setDriveLink(task.proofUrl || '');
  }, [task]);

useEffect(() => {
  const handleOverdueTask = async () => {
    if (!hasCheckedOverdue && isOverdue) {
      if (status === 'todo') {
        const response = await TaskService.updateTask(task._id, { status: 'failed' }, authToken);
        if (response.success) {
          setStatus('failed');
          setCurrentTask(prev => ({ ...prev, status: 'failed' }));
            // Send notification to admin about task failure
          notificationService.addNotification({
            type: 'task_failed',
            taskId: task._id,
            taskTitle: task.title,
            message: `Task "${task.title}" đã thất bại`,
            assignedTo: task.assignedTo.username
          });
          
          onTaskUpdated();
        }
      } else if (status === 'in_progress') {
        const response = await TaskService.updateTask(task._id, { status: 'overdue' }, authToken);
        if (response.success) {
          setStatus('overdue');
          setCurrentTask(prev => ({ ...prev, status: 'overdue' }));
            // Send notification to admin about task being overdue
          notificationService.addNotification({
            type: 'task_overdue',
            taskId: task._id,
            taskTitle: task.title,
            message: `Task "${task.title}" đã quá hạn`,
            assignedTo: task.assignedTo.username
          });
          
          onTaskUpdated();
        }
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
        const response = await TaskService.updateTask(task._id, { status: "in_progress", receivedAt: new Date(now) }, authToken);
        if (response.success) {
          setStatus("in_progress");
          setReceivedAt(new Date(now));
          // Update current task with new data
          setCurrentTask(prev => ({
            ...prev,
            status: "in_progress",
            receivedAt: new Date(now)
          }));
            // Send notification to admin about task being received
          notificationService.addNotification({
            type: 'task_received',
            taskId: task._id,
            taskTitle: task.title,
            message: `Task "${task.title}" đã được nhận`,
            assignedTo: user?.username
          });
          
          onTaskUpdated();
        }
      } catch (error) {
        message.error("Không thể cập nhật trạng thái task.");
      }
    } else if (isOverdue) {
      message.error("Không thể nhận task đã quá hạn.");
    }
  };  const handleComplete = async () => {
    if ((status === "in_progress" || status === "overdue") && driveLink) {
      if (!isValidLink(driveLink)) {
        message.error("Vui lòng nhập link hợp lệ.");
        return;
      }

      setIsSubmitting(true);
      try {
        const response = await TaskService.updateTask(task._id, { 
          status: "done",
          proofUrl: driveLink 
        }, authToken);
        if (response.success) {
          setStatus("done");
          // Update current task with new data
          setCurrentTask(prev => ({
            ...prev,
            status: "done",
            proofUrl: driveLink
          }));
            // Send notification to admin about task completion
          notificationService.addNotification({
            type: 'task_completed',
            taskId: task._id,
            taskTitle: task.title,
            message: `Task "${task.title}" đã hoàn thành`,
            assignedTo: user?.username
          });
          
          onTaskUpdated();
          message.success("Đã hoàn thành task và lưu link minh chứng.");
        }
      } catch (error) {
        message.error("Không thể hoàn thành task.");
      } finally {
        setIsSubmitting(false);
      }
    } else if (!driveLink) {
      message.warning("Vui lòng nhập link minh chứng trước khi hoàn thành.");
    }
  };
  const handleDriveLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDriveLink(e.target.value);
  };  const isValidLink = (url: string): boolean => {
    if (!url || url.trim() === '') return false;
    const trimmedUrl = url.trim();
    // Kiểm tra xem có phải là URL hợp lệ không
    try {
      new URL(trimmedUrl);
      return true;
    } catch {
      // Nếu không có protocol, thử thêm https://
      try {
        new URL('https://' + trimmedUrl);
        return true;
      } catch {
        return false;
      }
    }
  };
  const cardStyle = {
    width: '100%',
    marginBottom: 12,
    borderRadius: 6,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    transition: 'all 0.2s ease',
    position: 'relative' as const,
    minHeight: '240px',
    border: `2px solid ${getStatusColor(status)}`,
    cursor: 'pointer',
    background: '#fff'
  };
  const titleStyle = {
    fontSize: '14px',
    marginBottom: '8px',
    color: '#262626',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    lineHeight: '1.3',
    fontWeight: 600
  };

  const descriptionStyle = {
    color: '#595959',
    fontSize: '12px',
    marginBottom: '8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    lineHeight: '1.4'
  };

  const dateStyle = {
    fontSize: '11px',
    color: '#8c8c8c',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 0',
    marginBottom: '6px'
  };

  const buttonStyle = {
    width: '100%',
    marginTop: '4px',
    height: '24px',
    borderRadius: '4px',
    fontWeight: 500,
    fontSize: '11px'
  };

  const assignedUserStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
    color: '#666',
    fontSize: '11px'
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
      className="task-card-compact"
      styles={{
        body: {
          padding: '12px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column' as const
        }
      }}
      style={cardStyle}
    >      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: '8px' }}>
          <div style={{ 
            float: 'right', 
            marginTop: '2px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            marginLeft: '8px'
          }}>
            <Tag color={getStatusColor(status)} className="task-status-tag-compact">
              {getStatusText(status)}
            </Tag>
            {wasCompletedLate && (
              <Tooltip title="Hoàn thành sau thời hạn">
                <ExclamationCircleOutlined className="task-late-icon-compact" />
              </Tooltip>
            )}
          </div>
          {isOverdue && status !== 'done' && status !== 'failed' && (
            <Tag icon={<WarningOutlined />} color="warning" className="task-overdue-tag-compact">
              Quá hạn
            </Tag>
          )}
          <Title level={5} style={titleStyle}>{currentTask.title}</Title>
          <div style={assignedUserStyle}>
            <Avatar 
              size={20}
              icon={<UserOutlined />} 
              src={currentTask.assignedTo.avatar}
              style={{ border: '1px solid #f0f0f0', fontSize: '10px' }}
            />
            <span>Giao cho: {currentTask.assignedTo.username}</span>
          </div>
          <Paragraph style={descriptionStyle}>{currentTask.description}</Paragraph>
        </div>        <Space direction="vertical" style={{ width: '100%', gap: '4px' }}>
          <div style={dateStyle}>
            <ClockCircleOutlined style={{ fontSize: '10px', color: '#bfbfbf' }} />
            <span>Deadline: {new Date(currentTask.deadline).toLocaleDateString('vi-VN')}</span>
          </div>
          
          {receivedAt && (
            <div style={dateStyle}>
              <CheckCircleOutlined style={{ fontSize: '10px', color: '#bfbfbf' }} />
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
          )}          {!isAdmin && isAssignedUser && (status === "in_progress" || status === "overdue") && (
            <Space direction="vertical" style={{ width: '100%', gap: '4px' }}>
              <Input
                placeholder="Nhập link minh chứng"
                value={driveLink}
                onChange={handleDriveLinkChange}
                className="task-input-compact"
              />
              <Button 
                type="primary"
                onClick={handleComplete}
                disabled={!driveLink || !isValidLink(driveLink)}
                loading={isSubmitting}
                style={{ ...buttonStyle, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                icon={isSubmitting ? <LoadingOutlined /> : null}
                title={!driveLink ? "Vui lòng nhập link minh chứng" : 
                       !isValidLink(driveLink) ? "Link không hợp lệ" : 
                       "Click để hoàn thành task"}
              >
                Hoàn thành
              </Button>
              {driveLink && !isValidLink(driveLink) && (
                <div style={{ fontSize: '11px', color: '#ff4d4f' }}>
                  Vui lòng nhập link hợp lệ (ví dụ: https://example.com)
                </div>
              )}
            </Space>
          )}

          {(status === "done" || status === "failed") && driveLink && (
            <Button 
              type="link" 
              href={driveLink} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                padding: '2px 0', 
                height: '20px',
                fontSize: '11px'
              }}
            >
              Xem minh chứng
            </Button>
          )}
        </Space>
      </div>      {isAdmin && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: 4,
          marginTop: 'auto',
          borderTop: '1px solid #f0f0f0',
          paddingTop: '8px'
        }}>
          <Button 
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              if (onEdit) {
                onEdit(currentTask);
              }
            }}
            className="task-admin-button-compact"
            style={{ 
              backgroundColor: '#1890ff', 
              borderColor: '#1890ff'
            }}
          >
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
              className="task-admin-button-compact"
              style={{ 
                backgroundColor: '#fff1f0',
                color: '#ff4d4f'
              }}
            />
          </Popconfirm>
        </div>
      )}
    </Card>
  );
};

export default TaskDisplayPage;
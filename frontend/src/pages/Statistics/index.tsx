import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Spin, message, Typography } from 'antd';
import { Pie } from '@ant-design/charts';
import TaskService from '../../services/taskService';
import { useAuth } from '../../contexts/AuthContext';
import { Task } from '../../Components/Tasks/TaskDisplayPage';

const { Title } = Typography;

const StatisticsPage: React.FC = () => {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!token) {
        message.error('Bạn cần đăng nhập để xem thống kê.');
        setLoading(false);
        return;
      }
      try {
        const response = await TaskService.getAllTasksForAdmin(token);
        if (response.success && response.data) {
          setTasks(response.data);
        } else {
          message.error(response.message || 'Không thể tải dữ liệu công việc.');
        }
      } catch (error) {
        console.error('Lỗi khi tải công việc:', error);
        message.error('Đã xảy ra lỗi khi tải dữ liệu công việc.');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [token]);

  const now = new Date();
  const statusCounts = {
    done: tasks.filter(task => task.status === 'done').length,
    failed: tasks.filter(task => task.status !== 'done' && new Date(task.deadline) < now).length,
    in_progress: tasks.filter(task => task.status === 'in_progress' && new Date(task.deadline) >= now).length,
    todo: tasks.filter(task => task.status === 'todo' && new Date(task.deadline) >= now).length,
  };

  const totalTasks = tasks.length;

  const pieData = [
    { type: 'Hoàn thành', value: statusCounts.done },
    { type: 'Thất bại', value: statusCounts.failed },
    { type: 'Đang làm', value: statusCounts.in_progress },
    { type: 'Chưa làm', value: statusCounts.todo },
  ].filter(item => item.value > 0);

  const pieConfig = {
    appendPadding: 10,
    data: pieData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      layout: 'inner',
      offset: '-50%',
      content: (data: { value: number }) => `${data.value}`,
      style: {
        textAlign: 'center',
        fontSize: 14,
      },
    },
    interactions: [{ type: 'element-selected' }, { type: 'element-active' }],
    legend: {
        layout: 'horizontal' as const,
        position: 'bottom' as const
    }
  };

  if (loading) {
    return <Spin size="large" style={{ display: 'block', marginTop: '50px' }} />;
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Thống kê công việc</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic title="Tổng số" value={totalTasks} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card>
            <Statistic title="Hoàn thành" value={statusCounts.done} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
            <Card>
                <Statistic title="Đang làm" value={statusCounts.in_progress} />
            </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card>
            <Statistic title="Chưa làm" value={statusCounts.todo} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card>
            <Statistic title="Thất bại" value={statusCounts.failed} />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: '24px' }}>
        <Title level={4}>Biểu đồ trạng thái công việc</Title>
        {pieData.length > 0 ? (
            <Pie {...pieConfig} />
        ) : (
            <p>Không có dữ liệu để hiển thị.</p>
        )}
      </Card>
    </div>
  );
};

export default StatisticsPage;

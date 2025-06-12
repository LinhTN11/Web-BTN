import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Spin, message } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend 
} from 'recharts';
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
        message.error('You need to login to view statistics.');
        setLoading(false);
        return;
      }
      try {
        const response = await TaskService.getAllTasksForAdmin(token);
        if (response.success && response.data) {
          setTasks(response.data);
        } else {
          message.error(response.message || 'Unable to load task data.');
        }
      } catch (error) {
        console.error('Error loading tasks:', error);
        message.error('An error occurred while loading task data.');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [token]);  const now = new Date();
  const statusCounts = {
    done: tasks.filter(task => task.status === 'done').length,
    failed: tasks.filter(task => task.status === 'failed' || (task.status !== 'done' && new Date(task.deadline) < now)).length,
    in_progress: tasks.filter(task => task.status === 'in_progress' || task.status === 'overdue').length,
    todo: tasks.filter(task => task.status === 'todo' && new Date(task.deadline) >= now).length,
  };

  const totalTasks = tasks.length;  // Professional modern color palette
  const modernColors = {
    completed: '#10B981',    // Emerald Green - Success
    inProgress: '#3B82F6',   // Blue - In Progress  
    todo: '#F59E0B',         // Amber - Pending
    failed: '#EF4444'        // Red - Error/Failed
  };

  // Data for pie chart - Professional modern colors
  const pieData = [
    { name: 'Completed', value: statusCounts.done, color: modernColors.completed },
    { name: 'Failed', value: statusCounts.failed, color: modernColors.failed },
    { name: 'In Progress', value: statusCounts.in_progress, color: modernColors.inProgress },
    { name: 'To Do', value: statusCounts.todo, color: modernColors.todo },
  ].filter(item => item.value > 0);

  // Data for bar chart - Professional modern colors
  const barData = [
    { status: 'Completed', count: statusCounts.done, fill: modernColors.completed },
    { status: 'In Progress', count: statusCounts.in_progress, fill: modernColors.inProgress },
    { status: 'To Do', count: statusCounts.todo, fill: modernColors.todo },
    { status: 'Failed', count: statusCounts.failed, fill: modernColors.failed },
  ];if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" />
      </div>
    );
  }  return (
    <div style={{ 
      padding: '24px'
    }}>
      <Title level={2} style={{ 
        marginBottom: '32px', 
        color: '#2c3e50',
        textAlign: 'center',
        fontWeight: 300
      }}>
        Task Statistics
      </Title>
        {/* Summary Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>        <Col xs={24} sm={12} md={6}>
          <Card style={{ 
            borderRadius: '16px', 
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            border: 'none'
          }}>            <Statistic 
              title="Total Tasks" 
              value={totalTasks}
              valueStyle={{ color: '#6366F1', fontSize: '28px', fontWeight: 'bold' }}
              prefix={<ClockCircleOutlined style={{ color: '#6366F1' }} />}
            />
          </Card>
        </Col>        <Col xs={24} sm={12} md={6}>
          <Card style={{ 
            borderRadius: '16px', 
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            border: 'none'
          }}>            <Statistic 
              title="Completed" 
              value={statusCounts.done} 
              valueStyle={{ color: '#10B981', fontSize: '28px', fontWeight: 'bold' }}
              prefix={<CheckCircleOutlined style={{ color: '#10B981' }} />}
            />
          </Card>
        </Col>        <Col xs={24} sm={12} md={6}>
          <Card style={{ 
            borderRadius: '16px', 
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            border: 'none'
          }}>            <Statistic 
              title="In Progress" 
              value={statusCounts.in_progress} 
              valueStyle={{ color: '#3B82F6', fontSize: '28px', fontWeight: 'bold' }}
              prefix={<ExclamationCircleOutlined style={{ color: '#3B82F6' }} />}
            />
          </Card>
        </Col>        <Col xs={24} sm={12} md={6}>
          <Card style={{ 
            borderRadius: '16px', 
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            border: 'none'
          }}>            <Statistic 
              title="Failed" 
              value={statusCounts.failed} 
              valueStyle={{ color: '#EF4444', fontSize: '28px', fontWeight: 'bold' }}
              prefix={<CloseCircleOutlined style={{ color: '#EF4444' }} />}
            />
          </Card>
        </Col>
      </Row>      {/* Charts */}
      <Row gutter={[24, 24]}>
        {/* Pie Chart */}        <Col xs={24} lg={12}>
          <Card style={{ 
            borderRadius: '16px', 
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            border: 'none'
          }}>
            <Title level={4} style={{ 
              color: '#2c3e50', 
              marginBottom: '24px',
              textAlign: 'center',
              fontWeight: 400
            }}>
              Task Status Distribution
            </Title>            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    innerRadius={30}
                    fill="#8884d8"
                    dataKey="value"
                    stroke="#fff"
                    strokeWidth={3}
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        style={{ 
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                          cursor: 'pointer'
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{
                      paddingTop: '24px',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                color: '#8c8c8c',
                fontSize: '16px'
              }}>
                <ClockCircleOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                <p>No data available to display.</p>
              </div>
            )}
          </Card>
        </Col>        {/* Bar Chart */}        <Col xs={24} lg={12}>
          <Card style={{ 
            borderRadius: '16px', 
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            border: 'none'
          }}>
            <Title level={4} style={{ 
              color: '#2c3e50', 
              marginBottom: '24px',
              textAlign: 'center',
              fontWeight: 400
            }}>
              Task Status Breakdown
            </Title>            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="completedBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="inProgressBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="todoBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#D97706" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="failedBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#DC2626" stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.6} />
                <XAxis 
                  dataKey="status" 
                  tick={{ fontSize: 12, fill: '#6B7280', fontWeight: '500' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6B7280', fontWeight: '500' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={{ stroke: '#E5E7EB' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                />
                <Bar 
                  dataKey="count" 
                  radius={[6, 6, 0, 0]}
                  fill="#8884d8"
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StatisticsPage;

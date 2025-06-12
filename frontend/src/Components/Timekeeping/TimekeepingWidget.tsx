import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Statistic,
  Badge,
  Calendar,
  Typography,
  Space,
  message,
  Spin,
} from 'antd';
import {
  ClockCircleOutlined,
  LoginOutlined,
  LogoutOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/vi';
import duration from 'dayjs/plugin/duration';
import timekeepingService from '../../services/timekeepingService';
import { useAuth } from '../../contexts/AuthContext';

dayjs.locale('vi');
dayjs.extend(duration);

// Local interface to match frontend needs, allowing for nulls
interface Timekeeping {
  _id: string;
  userId: string;
  date: string | Date;
  checkIn?: string | Date | null;
  checkOut?: string | Date | null;
  status?: 'on_time' | 'late' | 'early_leave' | 'absent' | 'day_off' | 'half_day';
  workingHours?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface TimekeepingState {
  todayRecord: Timekeeping | null;
  monthlyHistory: Timekeeping[];
  loading: boolean;
  checking: boolean;
}

const TimekeepingWidget: React.FC = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [state, setState] = useState<TimekeepingState>({
    todayRecord: null,
    monthlyHistory: [],
    loading: true,
    checking: false,
  });

  const fetchTimekeepingData = useCallback(async (date: Dayjs) => {
    if (!user?._id) return;

    setState(prevState => ({ ...prevState, loading: true }));
    try {
      const history = await timekeepingService.getTimekeepingHistory(user._id, date.month() + 1, date.year());
      
      const todayStr = dayjs().format('YYYY-MM-DD');
      const todayData = history.find(record => dayjs(record.date).format('YYYY-MM-DD') === todayStr) || null;

      setState(prevState => ({
        ...prevState,
        monthlyHistory: history,
        todayRecord: todayData,
        loading: false,
      }));
    } catch (error) {
      message.error('Không thể tải dữ liệu chấm công.');
      setState(prevState => ({ ...prevState, loading: false }));
    }
  }, [user?._id]);

  useEffect(() => {
    fetchTimekeepingData(currentDate);
  }, [fetchTimekeepingData, currentDate]);

  const handleCheckInOut = async () => {
    setState(prevState => ({ ...prevState, checking: true }));
    try {
      if (!state.todayRecord || !state.todayRecord.checkIn) {
        await timekeepingService.checkIn();
        message.success('Check-in thành công!');
      } else {
        await timekeepingService.checkOut();
        message.success('Check-out thành công!');
      }
      await fetchTimekeepingData(currentDate);
    } catch (error: any) {
      message.error(error.message || 'Đã có lỗi xảy ra.');
    } finally {
      setState(prevState => ({ ...prevState, checking: false }));
    }
  };

  const calculateWorkingTime = () => {
    if (!state.todayRecord?.checkIn || !state.todayRecord?.checkOut) {
      return '--:--';
    }
    const checkInTime = dayjs(state.todayRecord.checkIn);
    const checkOutTime = dayjs(state.todayRecord.checkOut);
    const diff = checkOutTime.diff(checkInTime);
    return dayjs.duration(diff).format('HH:mm:ss');
  };

  const getStatusInfo = () => {
    if (!state.todayRecord) {
      return { badgeStatus: 'default' as const, text: 'Chưa chấm công', icon: <LoginOutlined /> };
    }
    switch (state.todayRecord.status) {
      case 'on_time':
        return { badgeStatus: 'success' as const, text: 'Đúng giờ', icon: <CheckCircleOutlined /> };
      case 'late':
        return { badgeStatus: 'warning' as const, text: 'Đi muộn', icon: <CheckCircleOutlined /> };
      case 'early_leave':
        return { badgeStatus: 'warning' as const, text: 'Về sớm', icon: <CheckCircleOutlined /> };
      case 'half_day':
        return { badgeStatus: 'processing' as const, text: 'Nửa ngày', icon: <CheckCircleOutlined /> };
      case 'absent':
        return { badgeStatus: 'error' as const, text: 'Vắng', icon: <LoginOutlined /> };
      default:
        return { badgeStatus: 'default' as const, text: 'Chưa có trạng thái', icon: <LoginOutlined /> };
    }
  };
  
  const getButtonConfig = () => {
    if (!state.todayRecord || !state.todayRecord.checkIn) {
      return { text: 'Check-in', disabled: false };
    }
    if (!state.todayRecord.checkOut) {
      return { text: 'Check-out', disabled: false };
    }
    return { text: 'Đã hoàn thành', disabled: true };
  };

  const dateCellRender = (value: Dayjs) => {
    const record = state.monthlyHistory.find(
      r => dayjs(r.date).format('YYYY-MM-DD') === value.format('YYYY-MM-DD')
    );
    if (record) {
      let status: 'success' | 'warning' | 'error' | 'default' = 'default';
      if (record.status === 'on_time') status = 'success';
      if (record.status === 'late' || record.status === 'early_leave') status = 'warning';
      if (record.status === 'absent') status = 'error';
      return <Badge status={status} />;
    }
    return null;
  };

  const getMonthlyStats = () => {
    const workDays = state.monthlyHistory.filter(r => r.checkIn).length;
    const lateDays = state.monthlyHistory.filter(r => r.status === 'late').length;
    return { workDays, lateDays };
  };

  const statusInfo = getStatusInfo();
  const buttonConfig = getButtonConfig();
  const { workDays, lateDays } = getMonthlyStats();

  if (state.loading) {
    return <Spin size="large" style={{ display: 'block', marginTop: 50 }} />;
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card 
            title="Chấm công hôm nay" 
            style={{ height: '100%', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <Typography.Title level={4} style={{ marginBottom: 8 }}>
                  {dayjs().format('dddd, DD/MM/YYYY')}
                </Typography.Title>
                <Badge status={statusInfo.badgeStatus} text={statusInfo.text} />
              </div>
              
              <Row gutter={16} align="middle" justify="center">
                <Col span={8}>
                  <Statistic
                    title="Giờ vào"
                    value={state.todayRecord?.checkIn ? dayjs(state.todayRecord.checkIn).format('HH:mm') : '--:--'}
                    prefix={<ClockCircleOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Giờ ra"
                    value={state.todayRecord?.checkOut ? dayjs(state.todayRecord.checkOut).format('HH:mm') : '--:--'}
                    prefix={<ClockCircleOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Thời gian làm việc"
                    value={calculateWorkingTime()}
                    prefix={<ClockCircleOutlined />}
                  />
                </Col>
              </Row>

              <Button
                type="primary"
                size="large"
                onClick={handleCheckInOut}
                loading={state.checking}
                disabled={buttonConfig.disabled}
                icon={buttonConfig.text === 'Check-in' ? <LoginOutlined /> : (buttonConfig.text === 'Check-out' ? <LogoutOutlined /> : <CheckCircleOutlined />)}
                style={{
                  marginTop: 16,
                  width: '100%',
                  height: 48,
                  fontSize: 16,
                }}
              >
                {buttonConfig.text}
              </Button>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card 
            title={`Thống kê tháng ${currentDate.format('MM/YYYY')}`}
            style={{ height: '100%', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={12}>
                <Statistic
                  title="Ngày đi làm"
                  value={workDays}
                  suffix={`/ ${currentDate.daysInMonth()}`}
                />
              </Col>
              <Col xs={12}>
                <Statistic
                  title="Đi muộn"
                  value={lateDays}
                />
              </Col>
              <Col span={24}>
                <div style={{ marginTop: 16, border: '1px solid #f0f0f0', borderRadius: '2px' }}>
                  <Calendar
                    fullscreen={false}
                    value={currentDate}
                    onPanelChange={(date) => setCurrentDate(date)}
                    cellRender={dateCellRender}
                  />
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TimekeepingWidget;
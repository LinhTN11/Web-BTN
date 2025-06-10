import React from 'react';
import { Row, Col, Card, Typography } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import TimekeepingWidget from '../../Components/Timekeeping/TimekeepingWidget';

const { Title } = Typography;

const TimekeepingPage: React.FC = () => {
  return (
    <div className="timekeeping-page" style={{ padding: '24px' }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Title level={4} style={{ marginBottom: 0, display: 'flex', alignItems: 'center' }}>
              <ClockCircleOutlined style={{ marginRight: 8 }} />
              Chấm công hằng ngày
            </Title>
          </Card>
        </Col>
        
        <Col span={24}>
          <TimekeepingWidget />
        </Col>
      </Row>
    </div>
  );
};

export default TimekeepingPage;

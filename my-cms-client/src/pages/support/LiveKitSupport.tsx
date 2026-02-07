import { useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Divider, Form, Input, Row, Space, Typography, message } from 'antd';
import api from '../../services/api';

const { Title, Text } = Typography;

const LiveKitSupport = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [meetUrl, setMeetUrl] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const iframeTitle = useMemo(() => {
    if (!roomName) {
      return 'LiveKit 客服會話';
    }

    return `LiveKit 客服會話：${roomName}`;
  }, [roomName]);

  const buildMeetUrl = (serverUrl: string, token: string) => {
    const url = new URL('https://meet.livekit.io/');
    url.searchParams.set('url', serverUrl);
    url.searchParams.set('token', token);
    return url.toString();
  };

  const handleConnect = async (values: { roomName: string; participantName?: string }) => {
    setLoading(true);
    try {
      const response = await api.createLiveKitToken({
        roomName: values.roomName.trim(),
        participantName: values.participantName?.trim()
      });
      const { token, serverUrl, roomName: resolvedRoom, participantName: resolvedName } = response.data;
      setRoomName(resolvedRoom);
      setParticipantName(resolvedName);
      setMeetUrl(buildMeetUrl(serverUrl, token));
      messageApi.success('已建立客服房間連線，請允許瀏覽器使用麥克風與鏡頭。');
    } catch (error) {
      console.error(error);
      const detailMessage =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
          ? (error as { response: { data: { detail: string } } }).response.data.detail
          : null;
      messageApi.error(detailMessage ?? '無法建立 LiveKit 房間連線，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setMeetUrl(null);
    setRoomName(null);
    setParticipantName(null);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {contextHolder}
      <div>
        <Title level={3} style={{ marginBottom: 0 }}>線上客服（LiveKit）</Title>
        <Text type="secondary">透過 LiveKit 建立即時視訊客服房間，可在下方輸入房間名稱並啟動客服會話。</Text>
      </div>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={10}>
          <Card title="客服房間設定">
            <Alert
              type="info"
              showIcon
              message="請先在後端 appsettings.json 設定 LiveKit ApiKey、ApiSecret 與 Url。"
              style={{ marginBottom: 16 }}
            />
            <Form
              form={form}
              layout="vertical"
              initialValues={{ roomName: 'customer-support' }}
              onFinish={handleConnect}
            >
              <Form.Item
                label="房間名稱"
                name="roomName"
                rules={[{ required: true, message: '請輸入房間名稱' }]}
              >
                <Input placeholder="例如：customer-support" />
              </Form.Item>
              <Form.Item label="客服人員顯示名稱" name="participantName">
                <Input placeholder="例如：客服 Jenny" />
              </Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  啟動客服
                </Button>
                <Button onClick={handleDisconnect} disabled={!meetUrl}>
                  結束會話
                </Button>
              </Space>
            </Form>
            <Divider />
            <Space direction="vertical" size={4}>
              <Text type="secondary">目前房間：</Text>
              <Text>{roomName ?? '尚未啟動'}</Text>
              <Text type="secondary">客服名稱：</Text>
              <Text>{participantName ?? '尚未啟動'}</Text>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="即時客服畫面">
            {meetUrl ? (
              <>
                <Space style={{ marginBottom: 12 }}>
                  <Button type="link" href={meetUrl} target="_blank" rel="noreferrer">
                    新分頁開啟
                  </Button>
                </Space>
                <iframe
                  title={iframeTitle}
                  src={meetUrl}
                  style={{ width: '100%', height: 540, border: '1px solid #f0f0f0', borderRadius: 8 }}
                  allow="camera; microphone; fullscreen; speaker; display-capture"
                />
              </>
            ) : (
              <Alert
                type="warning"
                showIcon
                message="尚未啟動客服會話"
                description="請先在左側設定房間名稱並點擊「啟動客服」。"
              />
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default LiveKitSupport;

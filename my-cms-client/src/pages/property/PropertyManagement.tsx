import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PrinterOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tabs,
  message,
} from 'antd';
import api, { type PropertyArea, type PropertyCategory, type PropertyCheckInHistoryItem, type PropertyDashboardSummary } from '../../services/api';

const categoryOptions: Array<{ label: string; value: PropertyCategory }> = [
  { label: '機電保修', value: 1 },
  { label: '弱電保修', value: 2 },
  { label: '消防安檢', value: 3 },
  { label: '清潔區域', value: 4 },
];

const PropertyManagement = () => {
  const [areas, setAreas] = useState<PropertyArea[]>([]);
  const [dashboard, setDashboard] = useState<PropertyDashboardSummary | null>(null);
  const [history, setHistory] = useState<PropertyCheckInHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [qrModal, setQrModal] = useState<PropertyArea | null>(null);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const processedQrToken = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [createAreaForm] = Form.useForm();

  const [historyFilter, setHistoryFilter] = useState({
    page: 1,
    pageSize: 20,
    category: undefined as PropertyCategory | undefined,
    username: '',
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [areasRes, dashboardRes, historyRes] = await Promise.all([
        api.getPropertyAreas(),
        api.getPropertyDashboard(),
        api.getPropertyHistory({ page: historyFilter.page, pageSize: historyFilter.pageSize, category: historyFilter.category, username: historyFilter.username || undefined }),
      ]);
      setAreas(areasRes.data);
      setDashboard(dashboardRes.data);
      setHistory(historyRes.data.items);
      setTotal(historyRes.data.totalCount);
    } catch (error) {
      console.error('載入物業管理資料失敗:', error);
      message.error('載入 QR Code 區域管理資料失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyFilter.page, historyFilter.pageSize, historyFilter.category]);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token || processedQrToken.current === token) {
      return;
    }

    processedQrToken.current = token;
    const checkInFromQrCode = async () => {
      try {
        await api.propertyCheckIn({ qrToken: token });
        message.success('QR Code 簽到完成，已記錄時間與人員。');
        await loadAll();
      } catch (error) {
        console.error('QR Code 簽到失敗:', error);
        message.error('簽到失敗，請確認 QR Code 是否正確或帳號是否具有此區域的簽到權限。');
      } finally {
        navigate('/property', { replace: true });
      }
    };

    void checkInFromQrCode();
    // loadAll is intentionally omitted so a refreshed dashboard does not repeat a check-in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, searchParams]);

  const categoryStatItems = useMemo(() => {
    return categoryOptions.map(option => ({
      key: option.label,
      label: option.label,
      value: dashboard?.categoryStats?.[option.label] ?? 0,
    }));
  }, [dashboard]);

  const onCreateArea = async () => {
    try {
      const values = await createAreaForm.validateFields();
      await api.createPropertyArea(values);
      message.success('已新增區域並產生 QR Code。');
      createAreaForm.resetFields();
      await loadAll();
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }

      console.error('新增區域失敗:', error);
      message.error('新增區域失敗，請稍後再試。');
    }
  };

  const printQrCode = (area: PropertyArea) => {
    const printWindow = window.open('', '_blank', 'width=640,height=760');
    if (!printWindow) {
      message.warning('瀏覽器已封鎖列印視窗，請允許彈出式視窗後再試。');
      return;
    }

    const escapeHtml = (value: string) => value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

    printWindow.document.write(`<!doctype html>
      <html lang="zh-Hant">
        <head>
          <title>${escapeHtml(area.name)}</title>
          <style>
            body { margin: 0; font-family: sans-serif; text-align: center; color: #111; }
            main { padding: 40px; }
            h1 { margin: 0 0 8px; font-size: 30px; }
            p { margin: 0 0 28px; font-size: 20px; }
            img { width: 320px; height: 320px; }
          </style>
        </head>
        <body><main><h1>${escapeHtml(area.name)}</h1><p>${escapeHtml(area.location)}</p><img src="${escapeHtml(area.qrCodeImageUrl)}" alt="QR Code" /></main></body>
      </html>`);
    printWindow.document.close();
    printWindow.addEventListener('load', () => {
      printWindow.focus();
      printWindow.print();
    }, { once: true });
  };

  return (
    <>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'dashboard',
            label: '即時儀表板',
            children: (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Card><Statistic title="今日完成任務" value={dashboard?.todayCompletedCount ?? 0} /></Card>
                  </Col>
                  <Col xs={24} md={16}>
                    <Card title="分類統計">
                      <Row gutter={12}>
                        {categoryStatItems.map(item => (
                          <Col span={12} key={item.key}>
                            <Statistic title={item.label} value={item.value} />
                          </Col>
                        ))}
                      </Row>
                    </Card>
                  </Col>
                </Row>
                <Card title="最近活動紀錄">
                  <Table
                    rowKey="logId"
                    loading={loading}
                    pagination={false}
                    dataSource={dashboard?.recentActivities ?? []}
                    columns={[
                      { title: '時間', dataIndex: 'checkInAtUtc' },
                      { title: '人員', dataIndex: 'username' },
                      { title: '範疇', dataIndex: 'categoryName' },
                      { title: '區域', dataIndex: 'areaName' },
                    ]}
                  />
                </Card>
              </Space>
            ),
          },
          {
            key: 'area',
            label: '區域與 QR 管理',
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Card title="新增巡檢/清潔區域">
                  <Form layout="inline" form={createAreaForm}>
                    <Form.Item label="區域名稱" name="name" rules={[{ required: true }]}><Input placeholder="例如：B1 發電機室" /></Form.Item>
                    <Form.Item label="位置" name="location" rules={[{ required: true }]}><Input placeholder="例如：地下一樓西側" /></Form.Item>
                    <Form.Item label="範疇" name="category" rules={[{ required: true }]}><Select style={{ width: 150 }} options={categoryOptions} /></Form.Item>
                    <Form.Item><Button type="primary" onClick={() => void onCreateArea()}>新增並產生 QR</Button></Form.Item>
                  </Form>
                </Card>
                <Table
                  rowKey="id"
                  loading={loading}
                  dataSource={areas}
                  columns={[
                    { title: '範疇', dataIndex: 'categoryName', render: value => <Tag color="blue">{value}</Tag> },
                    { title: '區域名稱', dataIndex: 'name' },
                    { title: '位置', dataIndex: 'location' },
                    { title: '建立時間', dataIndex: 'createdAtUtc' },
                    {
                      title: 'QR Code',
                      render: (_, area) => <Button onClick={() => setQrModal(area)}>查看</Button>,
                    },
                  ]}
                />
              </Space>
            ),
          },
          {
            key: 'history',
            label: '歷史紀錄查詢',
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Card>
                  <Space>
                    <Select
                      allowClear
                      placeholder="篩選範疇"
                      style={{ width: 160 }}
                      options={categoryOptions}
                      onChange={(value: PropertyCategory | undefined) => setHistoryFilter(current => ({ ...current, page: 1, category: value }))}
                    />
                    <Input
                      placeholder="人員名稱"
                      style={{ width: 180 }}
                      onChange={event => setHistoryFilter(current => ({ ...current, page: 1, username: event.target.value }))}
                    />
                    <Button onClick={() => void loadAll()}>查詢</Button>
                  </Space>
                </Card>
                <Table
                  rowKey="logId"
                  loading={loading}
                  dataSource={history}
                  pagination={{
                    current: historyFilter.page,
                    pageSize: historyFilter.pageSize,
                    total,
                    onChange: (page, pageSize) => setHistoryFilter(current => ({ ...current, page, pageSize })),
                  }}
                  columns={[
                    { title: '時間', dataIndex: 'checkInAtUtc' },
                    { title: '人員', dataIndex: 'username' },
                    { title: '範疇', dataIndex: 'categoryName' },
                    { title: '區域', dataIndex: 'areaName' },
                    { title: '位置', dataIndex: 'location' },
                    { title: '備註', dataIndex: 'note' },
                  ]}
                />
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={qrModal ? `${qrModal.name} QR Code` : 'QR Code'}
        open={Boolean(qrModal)}
        onCancel={() => setQrModal(null)}
        footer={qrModal ? [
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => printQrCode(qrModal)}>
            列印
          </Button>,
        ] : null}
      >
        {qrModal && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <strong style={{ display: 'block', fontSize: 20 }}>{qrModal.name}</strong>
              <span>{qrModal.location}</span>
            </div>
            <img src={qrModal.qrCodeImageUrl} alt="qr-code" style={{ width: '100%', maxWidth: 280, display: 'block', margin: '0 auto' }} />
          </Space>
        )}
      </Modal>
    </>
  );
};

export default PropertyManagement;

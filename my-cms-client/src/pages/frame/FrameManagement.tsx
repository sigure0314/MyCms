import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import {
  Button,
  Card,
  Form,
  Image,
  message,
  Select,
  Space,
  Table,
  Typography,
  Upload,
} from 'antd';
import type { UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import api from '../../services/api';
import type {
  FramePlaylistAdminResponse,
  FramePlaylistItem,
  FramePlaylistUpdateRequest,
} from '../../services/api';

const { Text } = Typography;

const layoutOptions = [
  { label: '3x3 商場看板', value: '3x3' },
  { label: '1x3 家庭畫廊', value: '1x3' },
];

const FrameManagement: FC = () => {
  const [form] = Form.useForm();
  const [items, setItems] = useState<FramePlaylistItem[]>([]);
  const [settings, setSettings] = useState<FramePlaylistAdminResponse['settings'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [layoutMode, setLayoutMode] = useState('3x3');

  const fetchPlaylist = async () => {
    setLoading(true);
    try {
      const response = await api.getFramePlaylistAdmin();
      const sortedItems = [...response.data.items].sort((a, b) => a.order - b.order);
      setItems(sortedItems);
      setSettings(response.data.settings);
      const nextLayoutMode = response.data.settings.layoutMode ?? '3x3';
      setLayoutMode(nextLayoutMode);
      form.setFieldsValue({ layoutMode: nextLayoutMode });
      setDirty(false);
    } catch (error) {
      message.error('取得播放清單失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylist();
  }, []);

  const handleUpload: NonNullable<UploadProps['customRequest']> = async (options) => {
    const formData = new FormData();
    formData.append('image', options.file as File);

    try {
      await api.uploadFrameImage(formData);
      message.success('圖片已上傳');
      await fetchPlaylist();
      options.onSuccess?.({}, new XMLHttpRequest());
    } catch (error) {
      message.error('圖片上傳失敗');
      options.onError?.(error as Error);
    }
  };

  const moveItem = (id: string, direction: 'up' | 'down') => {
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) {
      return;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) {
      return;
    }

    const nextItems = [...items];
    const [removed] = nextItems.splice(index, 1);
    nextItems.splice(targetIndex, 0, removed);
    setItems(nextItems);
    setDirty(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteFrameItem(id);
      message.success('圖片已移除');
      await fetchPlaylist();
    } catch (error) {
      message.error('刪除圖片失敗');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload: FramePlaylistUpdateRequest = {
        layoutMode: form.getFieldValue('layoutMode') ?? settings?.layoutMode ?? '3x3',
        items: items.map((item, index) => ({ id: item.id, order: index + 1 })),
      };
      await api.updateFramePlaylist(payload);
      message.success('播放設定已更新');
      await fetchPlaylist();
    } catch (error) {
      message.error('更新播放設定失敗');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<FramePlaylistItem> = useMemo(() => [
    {
      title: '順序',
      dataIndex: 'order',
      key: 'order',
      width: 80,
      render: (_, __, index) => index + 1,
    },
    {
      title: '預覽',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      width: 140,
      render: (value: string) => (
        <Image width={120} height={80} src={value} style={{ objectFit: 'cover', borderRadius: 8 }} />
      ),
    },
    {
      title: '檔名',
      dataIndex: 'originalFileName',
      key: 'originalFileName',
      render: (value: string, record) => (
        <Space direction="vertical" size={4}>
          <Text strong>{value || record.fileName}</Text>
          <Text type="secondary">{record.fileName}</Text>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_, record, index) => (
        <Space>
          <Button
            icon={<ArrowUpOutlined />}
            onClick={() => moveItem(record.id, 'up')}
            disabled={index === 0}
          />
          <Button
            icon={<ArrowDownOutlined />}
            onClick={() => moveItem(record.id, 'down')}
            disabled={index === items.length - 1}
          />
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ], [items]);

  const layoutConfig = useMemo(() => {
    if (layoutMode === '1x3') {
      return { cols: 3, rows: 1 };
    }

    return { cols: 3, rows: 3 };
  }, [layoutMode]);

  const panelLinks = useMemo(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    return Array.from({ length: layoutConfig.cols * layoutConfig.rows }, (_, index) => ({
      panelNumber: index + 1,
      url: `${baseUrl}/frame/frame.html?cols=${layoutConfig.cols}&rows=${layoutConfig.rows}&index=${index}`,
    }));
  }, [layoutConfig.cols, layoutConfig.rows]);

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Card
        title="電子看板播放設定"
        extra={(
          <Button type="primary" onClick={handleSave} loading={saving} disabled={!dirty}>
            儲存設定
          </Button>
        )}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ layoutMode: settings?.layoutMode ?? '3x3' }}
          onValuesChange={(changedValues) => {
            setDirty(true);
            if (changedValues.layoutMode) {
              setLayoutMode(changedValues.layoutMode);
            }
          }}
        >
          <Form.Item label="播放模式" name="layoutMode">
            <Select options={layoutOptions} />
          </Form.Item>
        </Form>

        <div>
          <Text strong>面板預覽 (點擊開啟)</Text>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${layoutConfig.cols}, minmax(0, 1fr))`,
              gap: 16,
              marginTop: 12,
            }}
          >
            {panelLinks.map((panel) => (
              <a
                key={panel.panelNumber}
                href={panel.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  border: '1px solid #d9d9d9',
                  borderRadius: 12,
                  padding: 16,
                  textAlign: 'center',
                  color: 'inherit',
                  textDecoration: 'none',
                  backgroundColor: '#fafafa',
                }}
              >
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  Panel
                </Text>
                <Text style={{ fontSize: 24 }} strong>
                  {panel.panelNumber}
                </Text>
              </a>
            ))}
          </div>
        </div>
      </Card>

      <Card
        title="圖片管理"
        extra={(
          <Upload
            accept="image/*"
            showUploadList={false}
            customRequest={handleUpload}
          >
            <Button icon={<UploadOutlined />}>上傳圖片</Button>
          </Upload>
        )}
      >
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          pagination={false}
        />
      </Card>
    </Space>
  );
};

export default FrameManagement;

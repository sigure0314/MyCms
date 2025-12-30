import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Image,
  Input,
  message,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import { UploadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import api from '../../services/api';
import type { InstagramPost, InstagramPostStatus } from '../../services/api';

const { TextArea } = Input;
const { Text } = Typography;

const statusOptions: { label: string; value: InstagramPostStatus; color: string }[] = [
  { label: '待審核', value: 'PendingReview', color: 'gold' },
  { label: '審核通過', value: 'Approved', color: 'blue' },
  { label: '審核拒絕', value: 'Rejected', color: 'red' },
  { label: '已發佈', value: 'Published', color: 'green' },
];

const InstagramPosts: React.FC = () => {
  const [form] = Form.useForm();
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [statusDrafts, setStatusDrafts] = useState<Record<number, InstagramPostStatus>>({});
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<number, Dayjs | null>>({});
  const statusValue = Form.useWatch('status', form) as InstagramPostStatus | undefined;

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await api.getInstagramPosts();
      setPosts(response.data);
    } catch (error) {
      message.error('取得 IG 貼文列表失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    const nextStatusDrafts: Record<number, InstagramPostStatus> = {};
    const nextScheduleDrafts: Record<number, Dayjs | null> = {};
    posts.forEach((post) => {
      nextStatusDrafts[post.id] = post.status;
      nextScheduleDrafts[post.id] = post.scheduledAt ? dayjs(post.scheduledAt) : null;
    });
    setStatusDrafts(nextStatusDrafts);
    setScheduleDrafts(nextScheduleDrafts);
  }, [posts]);

  useEffect(() => {
    if (statusValue !== 'Approved') {
      form.setFieldsValue({ scheduledAt: undefined });
    }
  }, [form, statusValue]);

  const statusMap = useMemo(() => {
    return statusOptions.reduce<Record<string, { label: string; color: string }>>((acc, option) => {
      acc[option.value] = { label: option.label, color: option.color };
      return acc;
    }, {});
  }, []);

  const handleSubmit = async (values: { caption: string; status: InstagramPostStatus; scheduledAt?: Dayjs }) => {
    const imageFile = fileList[0]?.originFileObj;

    if (!imageFile) {
      message.warning('請先上傳貼文圖片');
      return;
    }

    const formData = new FormData();
    formData.append('caption', values.caption);
    formData.append('status', values.status);
    if (values.status === 'Approved' && values.scheduledAt) {
      formData.append('scheduledAt', values.scheduledAt.toISOString());
    }
    formData.append('image', imageFile);

    try {
      await api.createInstagramPost(formData);
      message.success('IG 貼文已建立');
      form.resetFields();
      setFileList([]);
      fetchPosts();
    } catch (error) {
      message.error('建立 IG 貼文失敗');
    }
  };

  const handleStatusChange = async (post: InstagramPost) => {
    const nextStatus = statusDrafts[post.id] ?? post.status;
    const scheduledAt = scheduleDrafts[post.id];
    try {
      await api.updateInstagramPost(post.id, {
        status: nextStatus,
        scheduledAt: nextStatus === 'Approved' && scheduledAt ? scheduledAt.toISOString() : undefined,
      });
      message.success('已更新貼文狀態');
      fetchPosts();
    } catch (error) {
      message.error('更新狀態失敗');
    }
  };

  const columns: ColumnsType<InstagramPost> = [
    {
      title: '預覽圖',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      render: (value: string) => (
        <Image
          width={120}
          height={120}
          src={value}
          style={{ objectFit: 'cover', borderRadius: 8 }}
        />
      ),
    },
    {
      title: '貼文內容',
      dataIndex: 'caption',
      key: 'caption',
      render: (value: string) => <span style={{ whiteSpace: 'pre-line' }}>{value}</span>,
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (value: InstagramPostStatus) => (
        <Tag color={statusMap[value]?.color}>{statusMap[value]?.label ?? value}</Tag>
      ),
    },
    {
      title: '預定發佈時間',
      dataIndex: 'scheduledAt',
      key: 'scheduledAt',
      render: (value?: string) => (value ? new Date(value).toLocaleString() : '-'),
    },
    {
      title: '建立時間',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space direction="vertical" size={8}>
          <Select
            value={statusDrafts[record.id] ?? record.status}
            style={{ minWidth: 140 }}
            options={statusOptions.map(option => ({ label: option.label, value: option.value }))}
            onChange={(value) => {
              setStatusDrafts((prev) => ({ ...prev, [record.id]: value }));
              if (value !== 'Approved') {
                setScheduleDrafts((prev) => ({ ...prev, [record.id]: null }));
              }
            }}
          />
          {(statusDrafts[record.id] ?? record.status) === 'Approved' && (
            <DatePicker
              showTime
              value={scheduleDrafts[record.id] ?? null}
              onChange={(value) => setScheduleDrafts((prev) => ({ ...prev, [record.id]: value }))}
              placeholder="選擇發布時間"
            />
          )}
          <Button type="primary" ghost onClick={() => handleStatusChange(record)}>
            更新狀態
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Card
        title="IG 貼文建立"
        style={{ borderColor: '#adc6ff', background: '#f5f7ff' }}
        headStyle={{ background: '#2f54eb', color: '#fff' }}
        bodyStyle={{ background: '#fff', borderRadius: 12 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ status: 'PendingReview' }}
        >
          <Row gutter={16}>
            <Col xs={24} lg={14}>
              <Form.Item
                label="貼文內容"
                name="caption"
                rules={[{ required: true, message: '請輸入貼文內容' }]}
              >
                <TextArea rows={6} placeholder="輸入 IG 貼文內容" />
              </Form.Item>
            </Col>
            <Col xs={24} lg={10}>
              <Form.Item label="貼文圖片" required>
                <Upload
                  beforeUpload={(file) => {
                    setFileList([
                      {
                        uid: file.uid,
                        name: file.name,
                        originFileObj: file,
                      },
                    ]);
                    return false;
                  }}
                  onRemove={() => {
                    setFileList([]);
                  }}
                  fileList={fileList}
                  maxCount={1}
                  listType="picture"
                >
                  <Button icon={<UploadOutlined />}>上傳圖片</Button>
                </Upload>
              </Form.Item>
              <Form.Item label="狀態" name="status">
                <Select options={statusOptions.map(option => ({ label: option.label, value: option.value }))} />
              </Form.Item>
              {statusValue === 'Approved' && (
                <Form.Item label="預定發佈時間" name="scheduledAt">
                  <DatePicker showTime style={{ width: '100%' }} placeholder="選擇發布時間" />
                </Form.Item>
              )}
              <Text type="secondary">
                審核通過後可安排發布時間，若未選擇時間將直接發佈。
              </Text>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  建立 IG 貼文
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card
        title="IG 貼文管理"
        style={{ borderColor: '#ffd591', background: '#fff7e6' }}
        headStyle={{ background: '#fa8c16', color: '#fff' }}
        bodyStyle={{ background: '#fff' }}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={posts}
          loading={loading}
          pagination={{ pageSize: 5 }}
        />
      </Card>
    </Space>
  );
};

export default InstagramPosts;

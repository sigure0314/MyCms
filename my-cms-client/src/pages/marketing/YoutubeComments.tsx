import React, { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

type CommentStatus = '待回覆' | '已回覆' | '已隱藏';
type Sentiment = '正向' | '中立' | '負向';

interface YoutubeComment {
  id: number;
  channel: string;
  videoTitle: string;
  author: string;
  content: string;
  sentiment: Sentiment;
  status: CommentStatus;
  receivedAt: string;
  assignedTo?: string;
}

const initialComments: YoutubeComment[] = [
  {
    id: 1,
    channel: '官方頻道',
    videoTitle: '新品發表會直播',
    author: 'Tech Lover',
    content: '主持人講解好清楚，想看更多開箱影片！',
    sentiment: '正向',
    status: '待回覆',
    receivedAt: '2025-01-08T10:12:00',
    assignedTo: '小美',
  },
  {
    id: 2,
    channel: '官方頻道',
    videoTitle: '新品發表會直播',
    author: '路人甲',
    content: '影片聲音有點小聲，可以調整嗎？',
    sentiment: '中立',
    status: '待回覆',
    receivedAt: '2025-01-08T09:20:00',
    assignedTo: '阿強',
  },
  {
    id: 3,
    channel: '行銷合作頻道',
    videoTitle: '品牌合作 Q&A',
    author: 'Sally',
    content: '已經私訊粉專，麻煩回覆合作細節，謝謝！',
    sentiment: '正向',
    status: '已回覆',
    receivedAt: '2025-01-07T21:45:00',
    assignedTo: '阿強',
  },
  {
    id: 4,
    channel: '官方頻道',
    videoTitle: '會員獨享優惠介紹',
    author: 'Sunny Day',
    content: '優惠券兌換方式在哪裡？找不到連結。',
    sentiment: '中立',
    status: '已回覆',
    receivedAt: '2025-01-07T18:02:00',
    assignedTo: '小美',
  },
  {
    id: 5,
    channel: '官方頻道',
    videoTitle: '售後服務 Q&A',
    author: 'AngryBird',
    content: '買的商品壞掉了，客服都沒人回！',
    sentiment: '負向',
    status: '待回覆',
    receivedAt: '2025-01-07T15:10:00',
  },
  {
    id: 6,
    channel: '行銷合作頻道',
    videoTitle: '品牌合作 Q&A',
    author: 'Marketing 101',
    content: '想邀請聯名影片，請問有對接窗口嗎？',
    sentiment: '正向',
    status: '待回覆',
    receivedAt: '2025-01-06T13:38:00',
  },
];

const statusColors: Record<CommentStatus, string> = {
  待回覆: 'orange',
  已回覆: 'green',
  已隱藏: 'red',
};

const sentimentColors: Record<Sentiment, string> = {
  正向: 'green',
  中立: 'blue',
  負向: 'volcano',
};

const YoutubeComments: React.FC = () => {
  const [comments, setComments] = useState<YoutubeComment[]>(initialComments);
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState<string | undefined>();
  const [status, setStatus] = useState<CommentStatus | '全部'>('全部');
  const [sentiment, setSentiment] = useState<Sentiment | '全部'>('全部');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const channelOptions = useMemo(() => Array.from(new Set(comments.map(c => c.channel))), [comments]);

  const filteredComments = useMemo(() => {
    return comments.filter(comment => {
      const matchKeyword = [comment.content, comment.author, comment.videoTitle]
        .some(text => text.toLowerCase().includes(search.toLowerCase()));
      const matchChannel = channel ? comment.channel === channel : true;
      const matchStatus = status === '全部' ? true : comment.status === status;
      const matchSentiment = sentiment === '全部' ? true : comment.sentiment === sentiment;
      return matchKeyword && matchChannel && matchStatus && matchSentiment;
    });
  }, [channel, comments, search, sentiment, status]);

  const summary = useMemo(() => {
    const pending = comments.filter(c => c.status === '待回覆').length;
    const handled = comments.filter(c => c.status === '已回覆').length;
    const negative = comments.filter(c => c.sentiment === '負向').length;
    return {
      total: comments.length,
      pending,
      handled,
      negative,
    };
  }, [comments]);

  const updateStatus = (id: number | React.Key[], nextStatus: CommentStatus) => {
    const ids = Array.isArray(id) ? id : [id];
    setComments(prev => prev.map(c => (ids.includes(c.id) ? { ...c, status: nextStatus } : c)));
    setSelectedRowKeys([]);
    message.success(`已將 ${ids.length} 則留言標記為「${nextStatus}」`);
  };

  const columns: ColumnsType<YoutubeComment> = [
    {
      title: '頻道',
      dataIndex: 'channel',
      key: 'channel',
      render: (value) => <Tag color="geekblue">{value}</Tag>,
    },
    {
      title: '影片/留言',
      key: 'content',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <span style={{ fontWeight: 600 }}>{record.videoTitle}</span>
          <span style={{ color: '#666' }}>
            <Badge status="processing" /> {record.author}
          </span>
          <span>{record.content}</span>
        </Space>
      ),
    },
    {
      title: '情緒',
      dataIndex: 'sentiment',
      key: 'sentiment',
      render: (value: Sentiment) => <Tag color={sentimentColors[value]}>{value}</Tag>,
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (value: CommentStatus) => <Tag color={statusColors[value]}>{value}</Tag>,
    },
    {
      title: '指派',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      render: (value?: string) => value || <Tag color="default">未指派</Tag>,
    },
    {
      title: '收到時間',
      dataIndex: 'receivedAt',
      key: 'receivedAt',
      render: value => new Date(value).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          {record.status !== '已回覆' && (
            <Button type="link" onClick={() => updateStatus(record.id, '已回覆')}>
              標記已回覆
            </Button>
          )}
          {record.status !== '已隱藏' && (
            <Button type="link" danger onClick={() => updateStatus(record.id, '已隱藏')}>
              隱藏留言
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row gutter={16}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="總留言" value={summary.total} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="待回覆" value={summary.pending} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="已回覆" value={summary.handled} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="負向留言" value={summary.negative} valueStyle={{ color: '#fa541c' }} />
          </Card>
        </Col>
      </Row>

      <Card
        title="YouTube 留言管理"
        extra={
          <Space>
            <Tooltip title="批次標記為已回覆">
              <Button
                disabled={!selectedRowKeys.length}
                onClick={() => updateStatus(selectedRowKeys, '已回覆')}
              >
                批次已回覆
              </Button>
            </Tooltip>
            <Tooltip title="批次隱藏留言">
              <Button
                danger
                disabled={!selectedRowKeys.length}
                onClick={() => updateStatus(selectedRowKeys, '已隱藏')}
              >
                批次隱藏
              </Button>
            </Tooltip>
          </Space>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search
            allowClear
            placeholder="搜尋留言或作者"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 220 }}
          />
          <Select
            allowClear
            placeholder="選擇頻道"
            style={{ width: 160 }}
            value={channel}
            onChange={value => setChannel(value)}
          >
            {channelOptions.map(opt => (
              <Select.Option key={opt} value={opt}>
                {opt}
              </Select.Option>
            ))}
          </Select>
          <Select
            value={status}
            onChange={value => setStatus(value)}
            style={{ width: 140 }}
          >
            <Select.Option value="全部">全部狀態</Select.Option>
            <Select.Option value="待回覆">待回覆</Select.Option>
            <Select.Option value="已回覆">已回覆</Select.Option>
            <Select.Option value="已隱藏">已隱藏</Select.Option>
          </Select>
          <Select
            value={sentiment}
            onChange={value => setSentiment(value)}
            style={{ width: 140 }}
          >
            <Select.Option value="全部">全部情緒</Select.Option>
            <Select.Option value="正向">正向</Select.Option>
            <Select.Option value="中立">中立</Select.Option>
            <Select.Option value="負向">負向</Select.Option>
          </Select>
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredComments}
          rowSelection={rowSelection}
          pagination={{ pageSize: 5, showTotal: total => `共 ${total} 則留言` }}
        />
      </Card>
    </Space>
  );
};

export default YoutubeComments;

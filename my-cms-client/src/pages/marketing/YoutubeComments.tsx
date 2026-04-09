import React, { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Input,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

type CommentStatus = '待回覆' | '已回覆' | '已隱藏';

interface YoutubeComment {
  id: string;
  videoId: string;
  author: string;
  content: string;
  likeCount: number;
  publishedAt: string;
  updatedAt: string;
  status: CommentStatus;
}

interface YoutubeCommentThreadResponse {
  nextPageToken?: string;
  items: Array<{
    snippet: {
      topLevelComment: {
        id: string;
        snippet: {
          authorDisplayName: string;
          textDisplay: string;
          likeCount: number;
          publishedAt: string;
          updatedAt: string;
          videoId: string;
        };
      };
    };
  }>;
}

const statusColors: Record<CommentStatus, string> = {
  待回覆: 'orange',
  已回覆: 'green',
  已隱藏: 'red',
};

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3/commentThreads';

const extractVideoId = (input: string): string | null => {
  const raw = input.trim();
  if (!raw) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
    return raw;
  }

  try {
    const url = new URL(raw);

    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
        return v;
      }

      const parts = url.pathname.split('/').filter(Boolean);
      const shortsIndex = parts.indexOf('shorts');
      if (shortsIndex >= 0 && parts[shortsIndex + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[shortsIndex + 1])) {
        return parts[shortsIndex + 1];
      }

      const embedIndex = parts.indexOf('embed');
      if (embedIndex >= 0 && parts[embedIndex + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[embedIndex + 1])) {
        return parts[embedIndex + 1];
      }
    }
  } catch {
    return null;
  }

  return null;
};

const YoutubeComments: React.FC = () => {
  const [comments, setComments] = useState<YoutubeComment[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CommentStatus | '全部'>('全部');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_YOUTUBE_API_KEY ?? '');
  const [loading, setLoading] = useState(false);

  const filteredComments = useMemo(() => {
    return comments.filter(comment => {
      const matchKeyword = [comment.content, comment.author]
        .some(text => text.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = status === '全部' ? true : comment.status === status;
      return matchKeyword && matchStatus;
    });
  }, [comments, search, status]);

  const summary = useMemo(() => {
    const pending = comments.filter(c => c.status === '待回覆').length;
    const handled = comments.filter(c => c.status === '已回覆').length;
    const hidden = comments.filter(c => c.status === '已隱藏').length;
    return {
      total: comments.length,
      pending,
      handled,
      hidden,
    };
  }, [comments]);

  const updateStatus = (id: string | React.Key[], nextStatus: CommentStatus) => {
    const ids = Array.isArray(id) ? id.map(String) : [id];
    setComments(prev => prev.map(c => (ids.includes(c.id) ? { ...c, status: nextStatus } : c)));
    setSelectedRowKeys([]);
    message.success(`已將 ${ids.length} 則留言標記為「${nextStatus}」`);
  };

  const fetchAllComments = async () => {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      message.error('請輸入有效的 YouTube 影片網址或影片 ID');
      return;
    }

    if (!apiKey.trim()) {
      message.error('請先輸入 YouTube API Key');
      return;
    }

    setLoading(true);

    try {
      let nextPageToken: string | undefined;
      const allComments: YoutubeComment[] = [];
      let pageCount = 0;

      do {
        pageCount += 1;

        const params = new URLSearchParams({
          part: 'snippet',
          videoId,
          maxResults: '100',
          key: apiKey.trim(),
        });

        if (nextPageToken) {
          params.set('pageToken', nextPageToken);
        }

        const response = await fetch(`${YOUTUBE_API_BASE}?${params.toString()}`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`YouTube API 錯誤 (${response.status}): ${errorText}`);
        }

        const data = await response.json() as YoutubeCommentThreadResponse;

        data.items.forEach(item => {
          const topLevel = item.snippet.topLevelComment;
          const snippet = topLevel.snippet;

          allComments.push({
            id: topLevel.id,
            videoId: snippet.videoId,
            author: snippet.authorDisplayName,
            content: snippet.textDisplay,
            likeCount: snippet.likeCount,
            publishedAt: snippet.publishedAt,
            updatedAt: snippet.updatedAt,
            status: '待回覆',
          });
        });

        nextPageToken = data.nextPageToken;
      } while (nextPageToken);

      setComments(allComments);
      setSelectedRowKeys([]);
      message.success(`已完成抓取，共 ${allComments.length} 則留言（${pageCount} 頁）`);
    } catch (error) {
      console.error(error);
      message.error('抓取留言失敗，請確認影片是否開放留言與 API Key 權限');
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<YoutubeComment> = [
    {
      title: '影片 ID',
      dataIndex: 'videoId',
      key: 'videoId',
      width: 160,
      render: value => <Tag color="geekblue">{value}</Tag>,
    },
    {
      title: '留言',
      key: 'content',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <span style={{ color: '#666' }}>
            <Badge status="processing" /> {record.author}
          </span>
          <span dangerouslySetInnerHTML={{ __html: record.content }} />
        </Space>
      ),
    },
    {
      title: '按讚數',
      dataIndex: 'likeCount',
      key: 'likeCount',
      width: 100,
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: CommentStatus) => <Tag color={statusColors[value]}>{value}</Tag>,
    },
    {
      title: '收到時間',
      dataIndex: 'publishedAt',
      key: 'publishedAt',
      width: 180,
      render: value => new Date(value).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
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
            <Statistic title="已隱藏" value={summary.hidden} valueStyle={{ color: '#fa541c' }} />
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
          <Input
            placeholder="輸入 YouTube 影片網址或影片 ID"
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            style={{ width: 340 }}
          />
          <Input.Password
            placeholder="YouTube API Key"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            style={{ width: 260 }}
          />
          <Button type="primary" loading={loading} onClick={fetchAllComments}>
            讀取全部留言
          </Button>
        </Space>

        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search
            allowClear
            placeholder="搜尋留言或作者"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 240 }}
          />
          <Button onClick={() => setStatus('全部')} type={status === '全部' ? 'primary' : 'default'}>
            全部
          </Button>
          <Button onClick={() => setStatus('待回覆')} type={status === '待回覆' ? 'primary' : 'default'}>
            待回覆
          </Button>
          <Button onClick={() => setStatus('已回覆')} type={status === '已回覆' ? 'primary' : 'default'}>
            已回覆
          </Button>
          <Button onClick={() => setStatus('已隱藏')} type={status === '已隱藏' ? 'primary' : 'default'}>
            已隱藏
          </Button>
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredComments}
          rowSelection={rowSelection}
          loading={loading}
          pagination={{ pageSize: 10, showTotal: total => `共 ${total} 則留言` }}
        />
      </Card>
    </Space>
  );
};

export default YoutubeComments;

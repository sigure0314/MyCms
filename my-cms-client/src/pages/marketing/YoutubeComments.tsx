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
import api, { getApiBaseUrl, type YoutubeComment } from '../../services/api';

type CommentStatus = '待回覆' | '已回覆' | '已隱藏';

type YoutubeCommentView = YoutubeComment & {
  status: CommentStatus;
};

const statusColors: Record<CommentStatus, string> = {
  待回覆: 'orange',
  已回覆: 'green',
  已隱藏: 'red',
};

const resolveDownloadUrl = (path: string): string => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const base = getApiBaseUrl();
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return `${base.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  const origin = window.location.origin;
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
};

const YoutubeComments: React.FC = () => {
  const [comments, setComments] = useState<YoutubeCommentView[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CommentStatus | '全部'>('全部');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_YOUTUBE_API_KEY ?? '');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [tempFileId, setTempFileId] = useState('');

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
    if (!videoUrl.trim()) {
      message.error('請輸入有效的 YouTube 影片網址或影片 ID');
      return;
    }

    if (!apiKey.trim()) {
      message.error('請先輸入 YouTube API Key');
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.fetchYoutubeComments(videoUrl.trim(), apiKey.trim());
      const mapped = data.comments.map(c => ({ ...c, status: '待回覆' as const }));
      setComments(mapped);
      setTempFileId(data.tempFileId);
      setSelectedRowKeys([]);
      message.success(`已完成抓取，共 ${data.totalCount} 則留言（${data.pageCount} 頁）`);
    } catch (error) {
      console.error(error);
      message.error('抓取留言失敗，請確認影片是否開放留言與 API Key 權限');
    } finally {
      setLoading(false);
    }
  };

  const exportComments = async () => {
    if (!tempFileId) {
      message.warning('請先讀取留言後再匯出');
      return;
    }

    setExporting(true);
    try {
      const { data } = await api.exportYoutubeComments(tempFileId);
      const downloadUrl = resolveDownloadUrl(data.downloadUrl);
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
      message.success('已產生匯出檔案');
    } catch (error) {
      console.error(error);
      message.error('匯出失敗，請先重新讀取留言');
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnsType<YoutubeCommentView> = [
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
          <Button loading={exporting} disabled={!tempFileId || loading} onClick={exportComments}>
            匯出 CSV
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

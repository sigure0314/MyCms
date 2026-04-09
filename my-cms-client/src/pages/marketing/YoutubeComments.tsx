import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Input, Row, Space, Statistic, Table, Tag, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import api, { type YoutubeComment } from '../../services/api';

type CommentStatus = '待回覆' | '已回覆' | '已隱藏';

type YoutubeCommentView = YoutubeComment & {
  status: CommentStatus;
};

const statusColors: Record<CommentStatus, string> = {
  待回覆: 'orange',
  已回覆: 'green',
  已隱藏: 'red',
};

const YoutubeComments: React.FC = () => {
  const [comments, setComments] = useState<YoutubeCommentView[]>([]);
  const [search, setSearch] = useState('');
  const [videoInput, setVideoInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<CommentStatus | '全部'>('全部');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
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

  const fetchAllComments = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = videoInput.trim()
        ? await api.fetchYoutubeCommentsByInput({
            videoInput: videoInput.trim(),
            apiKey: apiKey.trim() || undefined,
          })
        : await api.fetchYoutubeComments();
      const mapped = data.comments.map(c => ({ ...c, status: '待回覆' as const }));
      setComments(mapped);
      setSelectedRowKeys([]);
      message.success(`已完成抓取，共 ${data.totalCount} 則留言（${data.pageCount} 頁）`);
    } catch (error) {
      console.error(error);
      message.error('抓取留言失敗，請確認影片連結與 API Key（或後端 appsettings 設定）');
    } finally {
      setLoading(false);
    }
  }, [apiKey, videoInput]);

  useEffect(() => {
    void fetchAllComments();
  }, [fetchAllComments]);

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
            <Button type="primary" loading={loading} onClick={fetchAllComments}>
              重新整理
            </Button>
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
            allowClear
            placeholder="貼上 YouTube 影片連結或影片 ID"
            value={videoInput}
            onChange={e => setVideoInput(e.target.value)}
            style={{ width: 360 }}
          />
          <Input.Password
            allowClear
            placeholder="YouTube API Key（可選，留空則用後端設定）"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            style={{ width: 320 }}
          />
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

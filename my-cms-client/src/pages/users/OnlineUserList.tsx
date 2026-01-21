import React, { useEffect, useMemo, useState } from 'react';
import { Card, Table, Tag } from 'antd';
import api, { type OnlineUser } from '../../services/api';

const formatDuration = (totalSeconds: number) => {
  const rounded = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
};

const formatDateTime = (value: string) => {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString('zh-TW', { hour12: false });
};

const OnlineUserList: React.FC = () => {
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getOnlineUsers();
      setUsers(res.data);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const interval = window.setInterval(fetchUsers, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const columns = useMemo(
    () => [
      { title: '帳號', dataIndex: 'username', key: 'username' },
      {
        title: '累積時間',
        dataIndex: 'totalSeconds',
        key: 'totalSeconds',
        render: (value: number) => <Tag color="blue">{formatDuration(value)}</Tag>,
      },
      { title: '目前位置', dataIndex: 'currentPage', key: 'currentPage' },
      { title: '登入 IP', dataIndex: 'loginIp', key: 'loginIp' },
      {
        title: '登入時間',
        dataIndex: 'loginAtUtc',
        key: 'loginAtUtc',
        render: (value: string) => formatDateTime(value),
      },
      {
        title: '最後活動',
        dataIndex: 'lastSeenUtc',
        key: 'lastSeenUtc',
        render: (value: string) => formatDateTime(value),
      },
    ],
    []
  );

  return (
    <Card title="線上使用者列表">
      <Table dataSource={users} columns={columns} rowKey="username" loading={loading} />
    </Card>
  );
};

export default OnlineUserList;

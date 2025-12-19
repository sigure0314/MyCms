import React, { useEffect, useState } from 'react';
import { Table, Card, Tag } from 'antd';
import api from '../../services/api';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/users').then(res => setUsers(res.data)).finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '使用者', dataIndex: 'username', key: 'username' },
    { title: '信箱', dataIndex: 'email', key: 'email' },
    { title: '角色', dataIndex: 'role', key: 'role', render: (r:string) => <Tag color={r==='Admin'?'red':'blue'}>{r}</Tag> },
  ];

  return (
    <Card title="會員列表">
      <Table dataSource={users} columns={columns} rowKey="id" loading={loading} />
    </Card>
  );
};
export default UserList;
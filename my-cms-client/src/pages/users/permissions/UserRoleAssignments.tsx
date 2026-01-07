import React, { useEffect, useState } from 'react';
import { Card, Select, Table, Tag, message } from 'antd';
import api from '../../../services/api';
import type { Role, UserSummary } from '../../../services/api';

const UserRoleAssignments: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const res = await api.getRoles();
      setRoles(res.data);
    } catch {
      message.error('載入角色資料失敗');
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.getUsers();
      setUsers(res.data);
    } catch {
      message.error('載入使用者資料失敗');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchUsers();
  }, []);

  const handleUserRoleChange = async (userId: number, roleId: number) => {
    try {
      const res = await api.updateUserRole(userId, roleId);
      setUsers(prev => prev.map(user => (user.id === userId ? res.data : user)));
      await fetchRoles();
      message.success('角色指派完成');
    } catch {
      message.error('角色指派失敗');
    }
  };

  const userColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '使用者', dataIndex: 'username', key: 'username' },
    { title: '信箱', dataIndex: 'email', key: 'email' },
    {
      title: '目前角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => <Tag color={role === 'Admin' ? 'red' : 'blue'}>{role}</Tag>,
    },
    {
      title: '調整角色',
      key: 'roleSelect',
      render: (_: unknown, record: UserSummary) => {
        const selectedRoleId = roles.find(role => role.name === record.role)?.id;
        return (
          <Select
            value={selectedRoleId}
            style={{ minWidth: 160 }}
            onChange={(value) => handleUserRoleChange(record.id, value)}
            options={roles.map(role => ({ value: role.id, label: role.name }))}
            loading={loadingRoles}
          />
        );
      },
    },
  ];

  return (
    <Card title="使用者角色指派">
      <Table
        dataSource={users}
        columns={userColumns}
        rowKey="id"
        loading={loadingUsers}
      />
    </Card>
  );
};

export default UserRoleAssignments;

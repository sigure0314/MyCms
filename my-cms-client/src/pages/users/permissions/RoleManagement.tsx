import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Modal, Popconfirm, Space, Table, Tag, message } from 'antd';
import api from '../../../services/api';
import type { Role } from '../../../services/api';

const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm] = Form.useForm();
  const [editForm] = Form.useForm();

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

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleCreateRole = async (values: { name: string }) => {
    const name = values.name?.trim();
    if (!name) {
      message.warning('請輸入角色名稱');
      return;
    }

    setSavingRole(true);
    try {
      const res = await api.createRole(name);
      setRoles(prev => [...prev, res.data]);
      roleForm.resetFields();
      message.success('角色新增成功');
    } catch {
      message.error('角色新增失敗');
    } finally {
      setSavingRole(false);
    }
  };

  const openEditRole = (role: Role) => {
    setEditingRole(role);
    editForm.setFieldsValue({ name: role.name });
  };

  const handleUpdateRole = async () => {
    if (!editingRole) {
      return;
    }

    try {
      const values = await editForm.validateFields();
      setSavingRole(true);
      const res = await api.updateRole(editingRole.id, values.name.trim());
      setRoles(prev => prev.map(role => (role.id === editingRole.id ? res.data : role)));
      setEditingRole(null);
      message.success('角色更新成功');
    } catch {
      message.error('角色更新失敗');
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    try {
      await api.deleteRole(roleId);
      setRoles(prev => prev.filter(role => role.id !== roleId));
      message.success('角色已刪除');
    } catch {
      message.error('角色刪除失敗');
    }
  };

  const roleColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '角色名稱', dataIndex: 'name', key: 'name' },
    {
      title: '成員數',
      dataIndex: 'userCount',
      key: 'userCount',
      width: 120,
      render: (count: number) => <Tag color={count > 0 ? 'blue' : 'default'}>{count}</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: Role) => (
        <Space>
          <Button size="small" onClick={() => openEditRole(record)}>
            編輯
          </Button>
          <Popconfirm
            title="確認刪除此角色？"
            okText="刪除"
            cancelText="取消"
            onConfirm={() => handleDeleteRole(record.id)}
            disabled={record.userCount > 0}
          >
            <Button size="small" danger disabled={record.userCount > 0}>
              刪除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title="角色管理">
      <Form form={roleForm} layout="inline" onFinish={handleCreateRole}>
        <Form.Item name="name" rules={[{ required: true, message: '請輸入角色名稱' }]}>
          <Input placeholder="輸入角色名稱" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={savingRole}>
            新增角色
          </Button>
        </Form.Item>
      </Form>
      <Table
        style={{ marginTop: 16 }}
        dataSource={roles}
        columns={roleColumns}
        rowKey="id"
        loading={loadingRoles}
        pagination={false}
      />

      <Modal
        title="編輯角色"
        open={Boolean(editingRole)}
        onCancel={() => setEditingRole(null)}
        onOk={handleUpdateRole}
        confirmLoading={savingRole}
        okText="儲存"
        cancelText="取消"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="name"
            label="角色名稱"
            rules={[{ required: true, message: '請輸入角色名稱' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default RoleManagement;

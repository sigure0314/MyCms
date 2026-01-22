import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import api, { type Role, type UserSummary } from '../../services/api';

interface UserFormValues {
  username: string;
  email: string;
  roleId: number;
  password?: string;
}

const UserList: React.FC = () => {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeUser, setActiveUser] = useState<UserSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm<UserFormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await api.getUsers();
        setUsers(res.data);
      } finally {
        setLoading(false);
      }
    };
    void fetchUsers();
  }, []);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await api.getRoles();
        setRoles(res.data);
      } catch {
        setRoles([]);
      }
    };
    void fetchRoles();
  }, []);

  useEffect(() => {
    if (!isModalOpen || activeUser || roles.length === 0) {
      return;
    }
    const currentRoleId = form.getFieldValue('roleId');
    if (!currentRoleId) {
      form.setFieldsValue({ roleId: roles[0].id });
    }
  }, [activeUser, form, isModalOpen, roles]);

  const roleOptions = useMemo(
    () => roles.map(role => ({ label: role.name, value: role.id })),
    [roles]
  );

  const openCreateModal = () => {
    setActiveUser(null);
    form.resetFields();
    if (roles.length > 0) {
      form.setFieldsValue({ roleId: roles[0].id });
    }
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserSummary) => {
    setActiveUser(user);
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      roleId: user.roleId,
      password: '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const username = values.username.trim();
      const email = values.email.trim();
      const password = values.password?.trim() ?? '';
      const roleId = Number(values.roleId);
      if (!username || !email || !roleId) {
        messageApi.error('請確認欄位內容');
        return;
      }
      setSaving(true);
      if (activeUser) {
        const payload = {
          username,
          email,
          roleId,
          password: password ? password : undefined,
        };
        const res = await api.updateUser(activeUser.id, payload);
        setUsers(prev => prev.map(user => (user.id === activeUser.id ? res.data : user)));
        messageApi.success('會員資料已更新');
      } else {
        if (!password) {
          messageApi.error('請輸入密碼');
          return;
        }
        const res = await api.createUser({
          username,
          email,
          roleId,
          password,
        });
        setUsers(prev => [res.data, ...prev]);
        messageApi.success('會員已新增');
      }
      setIsModalOpen(false);
      setActiveUser(null);
      form.resetFields();
    } catch (error) {
      if (typeof error === 'object' && error && 'errorFields' in error) {
        return;
      }
      messageApi.error('儲存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '使用者', dataIndex: 'username', key: 'username' },
    { title: '信箱', dataIndex: 'email', key: 'email' },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (r: string) => <Tag color={r === 'Admin' ? 'red' : 'blue'}>{r}</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: UserSummary) => (
        <Button type="link" onClick={() => openEditModal(record)}>
          編輯
        </Button>
      ),
    },
  ];

  return (
    <Card
      title="會員列表"
      extra={
        <Button type="primary" onClick={openCreateModal}>
          新增會員
        </Button>
      }
    >
      {contextHolder}
      <Table dataSource={users} columns={columns} rowKey="id" loading={loading} />
      <Modal
        title={activeUser ? '編輯會員' : '新增會員'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setActiveUser(null);
          form.resetFields();
        }}
        onOk={handleSave}
        okText={activeUser ? '更新' : '新增'}
        cancelText="取消"
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="帳號"
            name="username"
            rules={[{ required: true, whitespace: true, message: '請輸入帳號' }]}
          >
            <Input placeholder="請輸入帳號" />
          </Form.Item>
          <Form.Item
            label="信箱"
            name="email"
            rules={[
              { required: true, whitespace: true, message: '請輸入信箱' },
              { type: 'email', message: '請輸入有效信箱' },
            ]}
          >
            <Input placeholder="請輸入信箱" />
          </Form.Item>
          <Form.Item
            label="角色"
            name="roleId"
            rules={[{ required: true, message: '請選擇角色' }]}
          >
            <Select placeholder="選擇角色" options={roleOptions} />
          </Form.Item>
          <Form.Item
            label={activeUser ? '新密碼 (選填)' : '密碼'}
            name="password"
            rules={
              activeUser
                ? []
                : [{ required: true, whitespace: true, message: '請輸入密碼' }]
            }
          >
            <Input.Password placeholder={activeUser ? '留空表示不變更' : '請輸入密碼'} />
          </Form.Item>
          {activeUser && (
            <Space direction="vertical" size={4}>
              <Tag color="blue">只修改需要更新的欄位即可</Tag>
            </Space>
          )}
        </Form>
      </Modal>
    </Card>
  );
};
export default UserList;

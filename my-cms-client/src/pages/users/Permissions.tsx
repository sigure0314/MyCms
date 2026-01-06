import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tree,
  message,
} from 'antd';
import api from '../../services/api';
import type { Permission, Role, UserSummary } from '../../services/api';

const Permissions: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [savingPermission, setSavingPermission] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [rolePermissionIds, setRolePermissionIds] = useState<number[]>([]);
  const [savingRolePermissions, setSavingRolePermissions] = useState(false);
  const [roleForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [permissionForm] = Form.useForm();
  const [permissionEditForm] = Form.useForm();

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

  const fetchPermissions = async () => {
    setLoadingPermissions(true);
    try {
      const res = await api.getPermissions();
      setPermissions(res.data);
    } catch {
      message.error('載入權限資料失敗');
    } finally {
      setLoadingPermissions(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchUsers();
    fetchPermissions();
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

  const handleCreatePermission = async (values: Omit<Permission, 'id'>) => {
    const code = values.code?.trim();
    const name = values.name?.trim();
    if (!code || !name) {
      message.warning('請輸入權限碼與名稱');
      return;
    }

    setSavingPermission(true);
    try {
      const res = await api.createPermission({ ...values, code, name });
      setPermissions(prev => [...prev, res.data]);
      permissionForm.resetFields();
      message.success('權限新增成功');
    } catch {
      message.error('權限新增失敗');
    } finally {
      setSavingPermission(false);
    }
  };

  const openEditPermission = (permission: Permission) => {
    setEditingPermission(permission);
    permissionEditForm.setFieldsValue({
      parentId: permission.parentId ?? null,
      code: permission.code,
      name: permission.name,
      type: permission.type,
      routePath: permission.routePath,
      apiMethod: permission.apiMethod,
      apiPath: permission.apiPath,
      icon: permission.icon,
      sortOrder: permission.sortOrder,
      isEnabled: permission.isEnabled,
    });
  };

  const handleUpdatePermission = async () => {
    if (!editingPermission) {
      return;
    }

    try {
      const values = await permissionEditForm.validateFields();
      setSavingPermission(true);
      const res = await api.updatePermission(editingPermission.id, {
        ...values,
        code: values.code.trim(),
        name: values.name.trim(),
      });
      setPermissions(prev =>
        prev.map(permission => (permission.id === editingPermission.id ? res.data : permission)),
      );
      setEditingPermission(null);
      message.success('權限更新成功');
    } catch {
      message.error('權限更新失敗');
    } finally {
      setSavingPermission(false);
    }
  };

  const handleDeletePermission = async (permissionId: number) => {
    try {
      await api.deletePermission(permissionId);
      setPermissions(prev => prev.filter(permission => permission.id !== permissionId));
      message.success('權限已刪除');
    } catch {
      message.error('權限刪除失敗');
    }
  };

  const handleSelectRole = async (roleId: number) => {
    setSelectedRoleId(roleId);
    try {
      const res = await api.getRolePermissions(roleId);
      setRolePermissionIds(res.data);
    } catch {
      message.error('載入角色權限失敗');
    }
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRoleId) {
      message.warning('請先選擇角色');
      return;
    }

    setSavingRolePermissions(true);
    try {
      await api.updateRolePermissions(selectedRoleId, rolePermissionIds);
      message.success('角色權限已更新');
    } catch {
      message.error('角色權限更新失敗');
    } finally {
      setSavingRolePermissions(false);
    }
  };

  const permissionOptions = permissions.map(permission => ({
    value: permission.id,
    label: `${permission.name} (${permission.code})`,
  }));

  const permissionTypeOptions = [
    { value: 1, label: 'Menu' },
    { value: 2, label: 'Page' },
    { value: 3, label: 'Action' },
    { value: 4, label: 'API' },
  ];

  const buildChildren = (parentId: number): any[] =>
    permissions
      .filter(item => item.parentId === parentId)
      .map(item => ({
        title: `${item.name} (${item.code})`,
        key: item.id,
        children: buildChildren(item.id),
      }));

  const permissionTreeData = permissions
    .filter(permission => permission.parentId === null || permission.parentId === undefined)
    .map(permission => ({
      title: `${permission.name} (${permission.code})`,
      key: permission.id,
      children: buildChildren(permission.id),
    }));

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

  const permissionColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '名稱', dataIndex: 'name', key: 'name' },
    { title: '權限碼', dataIndex: 'code', key: 'code' },
    {
      title: '類型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: number) => permissionTypeOptions.find(option => option.value === type)?.label,
    },
    { title: '路由', dataIndex: 'routePath', key: 'routePath' },
    { title: 'API', dataIndex: 'apiPath', key: 'apiPath' },
    { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder', width: 80 },
    {
      title: '狀態',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      width: 100,
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'default'}>{enabled ? '啟用' : '停用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: Permission) => (
        <Space>
          <Button size="small" onClick={() => openEditPermission(record)}>
            編輯
          </Button>
          <Popconfirm
            title="確認刪除此權限？"
            okText="刪除"
            cancelText="取消"
            onConfirm={() => handleDeletePermission(record.id)}
          >
            <Button size="small" danger>
              刪除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

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
          />
        );
      },
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title="權限管理">
        <Form
          form={permissionForm}
          layout="vertical"
          onFinish={handleCreatePermission}
          initialValues={{
            parentId: null,
            type: 1,
            sortOrder: 0,
            isEnabled: true,
          }}
        >
          <Space wrap size="large" style={{ width: '100%' }}>
            <Form.Item name="parentId" label="父節點">
              <Select
                allowClear
                placeholder="選擇父節點"
                style={{ minWidth: 200 }}
                options={permissionOptions}
              />
            </Form.Item>
            <Form.Item
              name="code"
              label="權限碼"
              rules={[{ required: true, message: '請輸入權限碼' }]}
            >
              <Input placeholder="例：user.view" />
            </Form.Item>
            <Form.Item
              name="name"
              label="名稱"
              rules={[{ required: true, message: '請輸入名稱' }]}
            >
              <Input placeholder="例：使用者查詢" />
            </Form.Item>
            <Form.Item name="type" label="類型">
              <Select style={{ minWidth: 120 }} options={permissionTypeOptions} />
            </Form.Item>
            <Form.Item name="routePath" label="前端路由">
              <Input placeholder="/users" />
            </Form.Item>
            <Form.Item name="apiMethod" label="API Method">
              <Input placeholder="GET" />
            </Form.Item>
            <Form.Item name="apiPath" label="API Path">
              <Input placeholder="/api/users" />
            </Form.Item>
            <Form.Item name="icon" label="Icon">
              <Input placeholder="UserOutlined" />
            </Form.Item>
            <Form.Item name="sortOrder" label="排序">
              <Input type="number" style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="isEnabled" valuePropName="checked" label="啟用">
              <Checkbox />
            </Form.Item>
            <Form.Item label=" ">
              <Button type="primary" htmlType="submit" loading={savingPermission}>
                新增權限
              </Button>
            </Form.Item>
          </Space>
        </Form>
        <Table
          style={{ marginTop: 16 }}
          dataSource={permissions}
          columns={permissionColumns}
          rowKey="id"
          loading={loadingPermissions}
          pagination={false}
        />
      </Card>

      <Card title="角色管理">
        <Form form={roleForm} layout="inline" onFinish={handleCreateRole}>
          <Form.Item
            name="name"
            rules={[{ required: true, message: '請輸入角色名稱' }]}
          >
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
      </Card>

      <Card title="角色權限設定">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Select
            placeholder="選擇角色"
            value={selectedRoleId ?? undefined}
            style={{ width: 240 }}
            options={roles.map(role => ({ value: role.id, label: role.name }))}
            onChange={handleSelectRole}
            loading={loadingRoles}
          />
          <Tree
            checkable
            checkedKeys={rolePermissionIds}
            onCheck={(checkedKeys) => {
              if (Array.isArray(checkedKeys)) {
                setRolePermissionIds(checkedKeys as number[]);
              }
            }}
            treeData={permissionTreeData}
          />
          <Button
            type="primary"
            onClick={handleSaveRolePermissions}
            loading={savingRolePermissions}
          >
            儲存角色權限
          </Button>
        </Space>
      </Card>

      <Card title="使用者角色指派">
        <Table
          dataSource={users}
          columns={userColumns}
          rowKey="id"
          loading={loadingUsers}
        />
      </Card>

      <Modal
        title="編輯權限"
        open={Boolean(editingPermission)}
        onCancel={() => setEditingPermission(null)}
        onOk={handleUpdatePermission}
        confirmLoading={savingPermission}
        okText="儲存"
        cancelText="取消"
      >
        <Form form={permissionEditForm} layout="vertical">
          <Form.Item name="parentId" label="父節點">
            <Select allowClear options={permissionOptions} />
          </Form.Item>
          <Form.Item
            name="code"
            label="權限碼"
            rules={[{ required: true, message: '請輸入權限碼' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="name"
            label="名稱"
            rules={[{ required: true, message: '請輸入名稱' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="type" label="類型">
            <Select options={permissionTypeOptions} />
          </Form.Item>
          <Form.Item name="routePath" label="前端路由">
            <Input />
          </Form.Item>
          <Form.Item name="apiMethod" label="API Method">
            <Input />
          </Form.Item>
          <Form.Item name="apiPath" label="API Path">
            <Input />
          </Form.Item>
          <Form.Item name="icon" label="Icon">
            <Input />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序">
            <Input type="number" />
          </Form.Item>
          <Form.Item name="isEnabled" valuePropName="checked" label="啟用">
            <Checkbox />
          </Form.Item>
        </Form>
      </Modal>

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
    </Space>
  );
};
export default Permissions;

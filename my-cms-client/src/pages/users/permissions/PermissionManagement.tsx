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
  message,
} from 'antd';
import api from '../../../services/api';
import type { Permission } from '../../../services/api';

const PermissionManagement: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermission, setSavingPermission] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [permissionForm] = Form.useForm();
  const [permissionEditForm] = Form.useForm();

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
    fetchPermissions();
  }, []);

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

  return (
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
    </Card>
  );
};

export default PermissionManagement;

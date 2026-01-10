import { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, InputNumber, Modal, Popconfirm, Space, Table, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import api, { CreateMenuItemRequest, UpdateMenuItemRequest } from '../../services/api';
import type { MenuItem } from '../../types/posAsyncKitchen';

const { Title, Text } = Typography;

const emptyFormValues: CreateMenuItemRequest = {
  name: '',
  description: '',
  price: 0,
  category: '',
};

const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [form] = Form.useForm<CreateMenuItemRequest>();
  const [messageApi, contextHolder] = message.useMessage();

  const fetchMenu = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.getMenuItems();
      setMenuItems(response.data);
    } catch (fetchError) {
      console.error(fetchError);
      setError('無法取得菜單資料，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMenu();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    form.setFieldsValue(emptyFormValues);
    setModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    form.setFieldsValue({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
    });
    setModalOpen(true);
  };

  const handleDelete = async (item: MenuItem) => {
    try {
      await api.deleteMenuItem(item.id);
      setMenuItems((prev) => prev.filter((entry) => entry.id !== item.id));
      messageApi.success('已刪除菜單品項');
    } catch (deleteError) {
      console.error(deleteError);
      messageApi.error('刪除失敗，請稍後再試。');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editingItem) {
        const response = await api.updateMenuItem(editingItem.id, values as UpdateMenuItemRequest);
        setMenuItems((prev) => prev.map((item) => (item.id === editingItem.id ? response.data : item)));
        messageApi.success('已更新菜單品項');
      } else {
        const response = await api.createMenuItem(values);
        setMenuItems((prev) => [...prev, response.data]);
        messageApi.success('已新增菜單品項');
      }
      setModalOpen(false);
    } catch (submitError) {
      if (submitError instanceof Error) {
        console.error(submitError);
      }
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<MenuItem> = [
    {
      title: '餐點名稱',
      dataIndex: 'name',
    },
    {
      title: '分類',
      dataIndex: 'category',
    },
    {
      title: '價格',
      dataIndex: 'price',
      render: (value: number) => <Text>NT$ {value.toFixed(2)}</Text>,
    },
    {
      title: '描述',
      dataIndex: 'description',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openEditModal(record)}>
            編輯
          </Button>
          <Popconfirm
            title="確認刪除"
            description={`確定刪除「${record.name}」嗎？`}
            okText="刪除"
            cancelText="取消"
            onConfirm={() => handleDelete(record)}
          >
            <Button danger type="link">
              刪除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
          <div>
            <Title level={3} style={{ marginBottom: 0 }}>
              菜單管理
            </Title>
            <Text type="secondary">新增、修改與刪除餐廳菜單項目。</Text>
          </div>
          <Button type="primary" onClick={openCreateModal}>
            新增菜單
          </Button>
        </Space>
        {error && <Alert type="error" message={error} showIcon />}
        <Table
          rowKey="id"
          columns={columns}
          dataSource={menuItems}
          loading={loading}
          pagination={{ pageSize: 8 }}
        />
      </Space>

      <Modal
        title={editingItem ? '編輯菜單品項' : '新增菜單品項'}
        open={modalOpen}
        okText={editingItem ? '更新' : '新增'}
        cancelText="取消"
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={emptyFormValues}>
          <Form.Item
            name="name"
            label="餐點名稱"
            rules={[{ required: true, message: '請輸入餐點名稱' }]}
          >
            <Input placeholder="例如：香煎雞腿排" />
          </Form.Item>
          <Form.Item
            name="category"
            label="分類"
            rules={[{ required: true, message: '請輸入分類' }]}
          >
            <Input placeholder="例如：主餐 / 飲品" />
          </Form.Item>
          <Form.Item
            name="price"
            label="價格"
            rules={[{ required: true, message: '請輸入價格' }]}
          >
            <InputNumber min={0.01} precision={2} style={{ width: '100%' }} placeholder="例如：120" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
            rules={[{ required: true, message: '請輸入描述' }]}
          >
            <Input.TextArea rows={3} placeholder="例如：香嫩雞腿搭配季節時蔬" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default MenuManagement;

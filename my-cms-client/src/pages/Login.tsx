import { Form, Input, Button, Card, message, Space, Spin } from 'antd';
import axios from 'axios';
import { useState } from 'react';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import type { LoginRequest } from '../types/auth';

const Login = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<LoginRequest>();
  const [loading, setLoading] = useState(false);
  const loginAsVisitor = async () => {
    try {
      setLoading(true);
      const visitor = await authService.getVisitorCredentials();
      if (!visitor?.username || !visitor?.password) {
        message.error('訪客帳號未設定');
        return;
      }
      await authService.login({ username: visitor.username, password: visitor.password });
      message.success('登入成功');
      navigate('/dashboard');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 404 || status === 400) {
          message.error('訪客帳號未設定');
          return;
        }
      }
      message.error('訪客登入失敗');
    } finally {
      setLoading(false);
    }
  };
  const onFinish = async (values: LoginRequest) => {
    try {
      setLoading(true);
      await authService.login(values);
      message.success('登入成功');
      navigate('/dashboard');
    } catch { message.error('登入失敗'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      {loading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(255, 255, 255, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <Spin size="large" tip="登入中..." />
        </div>
      )}
      <Card title="CMS Login" style={{ width: 300 }}>
        <Form form={form} onFinish={onFinish} disabled={loading}>
          <Form.Item name="username" rules={[{ required: true }]}><Input placeholder="Username" /></Form.Item>
          <Form.Item name="password" rules={[{ required: true }]}><Input.Password placeholder="Password" /></Form.Item>
          <Button type="link" onClick={loginAsVisitor} style={{ padding: 0 }} disabled={loading}>
            訪客登入
          </Button>
          <Button type="primary" htmlType="submit" block loading={loading}>Login</Button>
        </Form>
        <Space style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }} size={0}>
          <Button type="link" onClick={() => navigate('/register')} disabled={loading}>
            申請會員
          </Button>
          <Button type="link" onClick={() => navigate('/forgot-password')} disabled={loading}>
            忘記密碼
          </Button>
        </Space>
      </Card>
    </div>
  );
};
export default Login;

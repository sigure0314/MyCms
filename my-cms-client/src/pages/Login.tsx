import { Form, Input, Button, Card, message, Space } from 'antd';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import type { LoginRequest } from '../types/auth';

const Login = () => {
  const navigate = useNavigate();
  const onFinish = async (values: LoginRequest) => {
    try {
      await authService.login(values);
      message.success('登入成功');
      navigate('/dashboard');
    } catch { message.error('登入失敗'); }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card title="CMS Login" style={{ width: 300 }}>
        <Form onFinish={onFinish}>
          <Form.Item name="username" rules={[{ required: true }]}><Input placeholder="Username" /></Form.Item>
          <Form.Item name="password" rules={[{ required: true }]}><Input.Password placeholder="Password" /></Form.Item>
          <Button type="primary" htmlType="submit" block>Login</Button>
        </Form>
        <Space style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }} size={0}>
          <Button type="link" onClick={() => navigate('/register')}>
            申請會員
          </Button>
          <Button type="link" onClick={() => navigate('/forgot-password')}>
            忘記密碼
          </Button>
        </Space>
      </Card>
    </div>
  );
};
export default Login;

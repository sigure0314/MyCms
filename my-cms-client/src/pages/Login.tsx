import { Form, Input, Button, Card, message, Space } from 'antd';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import type { LoginRequest } from '../types/auth';

const Login = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<LoginRequest>();
  const fillVisitorCredentials = async () => {
    try {
      const visitor = await authService.getVisitorCredentials();
      if (!visitor?.username || !visitor?.password) {
        message.error('訪客帳號未設定');
        return;
      }
      form.setFieldsValue({ username: visitor.username, password: visitor.password });
    } catch {
      message.error('取得訪客帳號失敗');
    }
  };
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
        <Form form={form} onFinish={onFinish}>
          <Form.Item name="username" rules={[{ required: true }]}><Input placeholder="Username" /></Form.Item>
          <Form.Item name="password" rules={[{ required: true }]}><Input.Password placeholder="Password" /></Form.Item>
          <Button type="link" onClick={fillVisitorCredentials} style={{ padding: 0 }}>
            訪客登入
          </Button>
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

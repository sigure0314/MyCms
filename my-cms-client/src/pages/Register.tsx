import { Card, Form, Input, Button, message } from 'antd';

const Register = () => {
  const onFinish = () => {
    message.success('已送出申請，我們會盡快與您聯繫');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card title="申請會員" style={{ width: 360 }}>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item label="帳號" name="username" rules={[{ required: true, message: '請輸入帳號' }]}>
            <Input placeholder="輸入帳號" />
          </Form.Item>
          <Form.Item label="信箱" name="email" rules={[{ required: true, type: 'email', message: '請輸入有效信箱' }]}>
            <Input placeholder="輸入信箱" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            送出申請
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default Register;

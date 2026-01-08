import { Card, Form, Input, Button, message } from 'antd';

const ForgotPassword = () => {
  const onFinish = () => {
    message.success('已送出重設密碼通知，請查看信箱');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card title="忘記密碼" style={{ width: 360 }}>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item label="信箱" name="email" rules={[{ required: true, type: 'email', message: '請輸入有效信箱' }]}>
            <Input placeholder="輸入信箱" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            寄送重設信件
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default ForgotPassword;

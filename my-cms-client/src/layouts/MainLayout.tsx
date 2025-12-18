import { Layout, Menu, Button } from 'antd';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogoutOutlined, DashboardOutlined } from '@ant-design/icons';
import { authService } from '../services/authService';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
  const navigate = useNavigate();
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark">
        <div style={{ color:'white', padding: 20, textAlign:'center', fontWeight:'bold' }}>CMS</div>
        <Menu theme="dark" mode="inline" defaultSelectedKeys={['1']} items={[
          { key: '1', icon: <DashboardOutlined />, label: 'Dashboard', onClick: () => navigate('/dashboard') }
        ]} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 20px', display:'flex', justifyContent:'flex-end' }}>
          <Button icon={<LogoutOutlined />} onClick={authService.logout}>Logout</Button>
        </Header>
        <Content style={{ margin: '16px', padding: 24, background: '#fff' }}><Outlet /></Content>
      </Layout>
    </Layout>
  );
};
export default MainLayout;
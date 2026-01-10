import React, { useEffect } from 'react';
import { Layout, Menu, Button, theme } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LogoutOutlined, 
  DashboardOutlined, 
  UserOutlined, 
  TeamOutlined, 
  SafetyCertificateOutlined,
  CustomerServiceOutlined,
  ReadOutlined,       // 用於圖書系統主選單
  BookOutlined,       // 用於管理
  PlayCircleOutlined, // 用於播放
  RobotOutlined,      // 用於 AI 生成
  YoutubeOutlined,
  InstagramOutlined,
  SettingOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { authService } from '../services/authService';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    void authService.ensurePermissionsLoaded();
  }, []);

  // 定義選單結構 (支援巢狀)
  const menuItems: MenuProps['items'] = [
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '個人設定',
    },
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '儀表板',
    },
    {
      key: 'sub-user', // 父選單的 key (不會跳轉)
      icon: <UserOutlined />,
      label: '會員管理',
      children: [ //這就是巢狀的關鍵
        {
          key: '/users', // 子選單 key 對應路由路徑
          icon: <TeamOutlined />,
          label: '會員列表',
        },
        {
          key: '/permissions',
          icon: <SafetyCertificateOutlined />,
          label: '權限控管',
        },
      ],
    },
    {
      key: 'sub-marketing',
      icon: <CustomerServiceOutlined />,
      label: '粉絲團行銷管理',
      children: [
        {
          key: '/marketing/youtube',
          icon: <YoutubeOutlined />,
          label: 'YouTube 留言管理',
        },
        {
          key: '/marketing/instagram-posts',
          icon: <InstagramOutlined />,
          label: 'IG 貼文管理',
        },
      ],
    },
    {
      key: 'sub-library',
      icon: <ReadOutlined />,
      label: 'AI 圖書系統',
      children: [
        { 
          key: '/library/generate', 
          icon: <RobotOutlined />, 
          label: '童書文案生成' 
        },
        { 
          key: '/library/books', // 這就是我們剛剛做好的頁面
          icon: <BookOutlined />, 
          label: 'AI 童書管理' 
        },
        { 
          key: '/library/player', 
          icon: <PlayCircleOutlined />, 
          label: '童書播放' 
        },
      ],
    },
    {
      key: 'sub-pos-kitchen',
      icon: <ShopOutlined />,
      label: 'POS / Kitchen',
      children: [
        {
          key: '/pos/menu',
          label: '菜單管理',
        },
        {
          key: '/pos-async-kitchen',
          label: 'POS 點餐',
        },
        {
          key: '/pos-async-kitchen#/kitchen',
          label: '廚房看板',
        },
      ],
    }
  ];

  const filterMenuItems = (items: MenuProps['items']): MenuProps['items'] =>
    items
      ?.map(item => {
        if (!item) {
          return null;
        }

        if ('children' in item && item.children) {
          const filteredChildren = filterMenuItems(item.children);
          if (!filteredChildren || filteredChildren.length === 0) {
            return null;
          }

          return {
            ...item,
            children: filteredChildren,
          };
        }

        if (typeof item.key === 'string' && !authService.hasPermission(item.key)) {
          return null;
        }

        return item;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const visibleMenuItems = filterMenuItems(menuItems);

  // 處理點擊事件
  const handleMenuClick = (e: { key: string }) => {
    navigate(e.key);
  };

  const selectedKey = location.pathname.startsWith('/permissions')
    ? '/permissions'
    : location.pathname;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0" theme="dark">
        <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', textAlign: 'center', color: '#fff', lineHeight: '32px', fontWeight: 'bold' }}>
          MyCMS
        </div>
        <Menu
          theme="dark"
          mode="inline"
          // 讓目前的網址自動對應到選單的高亮狀態
          selectedKeys={[selectedKey]}
          // 預設展開「會員管理」資料夾 (選填)
          defaultOpenKeys={['sub-user', 'sub-marketing']}
          items={visibleMenuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 20px', background: colorBgContainer, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button icon={<LogoutOutlined />} onClick={authService.logout}>
            登出
          </Button>
        </Header>
        <Content style={{ margin: '24px 16px 0' }}>
          <div style={{ padding: 24, minHeight: 360, background: colorBgContainer, borderRadius: borderRadiusLG }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;

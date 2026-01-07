import React from 'react';
import { Tabs } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const tabItems = [
  { key: 'permissions', label: '權限管理' },
  { key: 'roles', label: '角色管理' },
  { key: 'role-permissions', label: '角色權限設定' },
  { key: 'user-roles', label: '使用者角色指派' },
];

const PermissionsLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeKey =
    tabItems.find(item => location.pathname.includes(`/permissions/${item.key}`))?.key ??
    'permissions';

  return (
    <div>
      <Tabs
        activeKey={activeKey}
        onChange={(key) => navigate(`/permissions/${key}`)}
        items={tabItems}
      />
      <div style={{ marginTop: 16 }}>
        <Outlet />
      </div>
    </div>
  );
};

export default PermissionsLayout;

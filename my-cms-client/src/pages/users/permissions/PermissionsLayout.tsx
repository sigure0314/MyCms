import React from 'react';
import { Tabs } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../../services/authService';

const tabItems = [
  { key: 'permissions', label: '權限管理' },
  { key: 'roles', label: '角色管理' },
  { key: 'role-permissions', label: '角色權限設定' },
  { key: 'user-roles', label: '使用者角色指派' },
];

const PermissionsLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const allowedTabs = tabItems.filter(item => authService.hasPermission(`/permissions/${item.key}`));
  const fallbackKey = allowedTabs[0]?.key ?? 'permissions';

  const activeKey =
    allowedTabs.find(item => location.pathname.includes(`/permissions/${item.key}`))?.key ??
    fallbackKey;

  return (
    <div>
      <Tabs
        activeKey={activeKey}
        onChange={(key) => navigate(`/permissions/${key}`)}
        items={allowedTabs}
      />
      <div style={{ marginTop: 16 }}>
        <Outlet />
      </div>
    </div>
  );
};

export default PermissionsLayout;

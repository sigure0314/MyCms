import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Button, Card, Select, Space, Tree, message } from 'antd';
import api from '../../../services/api';
import type { Permission, Role } from '../../../services/api';

const RolePermissions: FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [rolePermissionIds, setRolePermissionIds] = useState<number[]>([]);
  const [savingRolePermissions, setSavingRolePermissions] = useState(false);

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const res = await api.getRoles();
      setRoles(res.data);
    } catch {
      message.error('載入角色資料失敗');
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchPermissions = async () => {
    setLoadingPermissions(true);
    try {
      const res = await api.getPermissions();
      setPermissions(res.data);
    } catch {
      message.error('載入權限資料失敗');
    } finally {
      setLoadingPermissions(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const handleSelectRole = async (roleId: number) => {
    setSelectedRoleId(roleId);
    try {
      const res = await api.getRolePermissions(roleId);
      setRolePermissionIds(res.data);
    } catch {
      message.error('載入角色權限失敗');
    }
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRoleId) {
      message.warning('請先選擇角色');
      return;
    }

    setSavingRolePermissions(true);
    try {
      await api.updateRolePermissions(selectedRoleId, rolePermissionIds);
      message.success('角色權限已更新');
    } catch {
      message.error('角色權限更新失敗');
    } finally {
      setSavingRolePermissions(false);
    }
  };

  const buildChildren = (parentId: number): any[] =>
    permissions
      .filter(item => item.parentId === parentId)
      .map(item => ({
        title: `${item.name} (${item.code})`,
        key: item.id,
        children: buildChildren(item.id),
      }));

  const permissionTreeData = permissions
    .filter(permission => permission.parentId === null || permission.parentId === undefined)
    .map(permission => ({
      title: `${permission.name} (${permission.code})`,
      key: permission.id,
      children: buildChildren(permission.id),
    }));

  return (
    <Card title="角色權限設定" loading={loadingRoles || loadingPermissions}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Select
          placeholder="選擇角色"
          value={selectedRoleId ?? undefined}
          style={{ width: 240 }}
          options={roles.map(role => ({ value: role.id, label: role.name }))}
          onChange={handleSelectRole}
          loading={loadingRoles}
        />
        <Tree
          checkable
          checkedKeys={rolePermissionIds}
          onCheck={(checkedKeys) => {
            if (Array.isArray(checkedKeys)) {
              setRolePermissionIds(checkedKeys as number[]);
            }
          }}
          treeData={permissionTreeData}
        />
        <Button
          type="primary"
          onClick={handleSaveRolePermissions}
          loading={savingRolePermissions}
        >
          儲存角色權限
        </Button>
      </Space>
    </Card>
  );
};

export default RolePermissions;

import api from './api';
import type { LoginRequest, AuthResponse } from '../types/auth';

const PERMISSIONS_STORAGE_KEY = 'permissionRoutes';
const ROLE_STORAGE_KEY = 'role';

const getStoredPermissionRoutes = (): string[] => {
  const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((route): route is string => typeof route === 'string') : [];
  } catch {
    return [];
  }
};

const setStoredPermissionRoutes = (routes: string[]) => {
  localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(routes));
};

const parseJwt = (token: string) => {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

const getRoleFromToken = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return null;
  }

  const payload = parseJwt(token);
  if (!payload) {
    return null;
  }

  return (
    payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
    payload.role ??
    null
  );
};

const loadUserPermissions = async (roleName: string) => {
  const roleRes = await api.getRoles();
  const role = roleRes.data.find(item => item.name === roleName);
  if (!role) {
    setStoredPermissionRoutes([]);
    return [];
  }

  const [rolePermissionRes, permissionRes] = await Promise.all([
    api.getRolePermissions(role.id),
    api.getPermissions(),
  ]);

  const permissionIds = new Set(rolePermissionRes.data);
  const routes = permissionRes.data
    .filter(permission => permission.isEnabled && permission.routePath && permissionIds.has(permission.id))
    .map(permission => permission.routePath)
    .filter((route): route is string => typeof route === 'string');

  setStoredPermissionRoutes(routes);
  return routes;
};

const ensurePermissionsLoaded = async (options?: { force?: boolean }) => {
  if (!localStorage.getItem('token')) {
    return [];
  }

  const existing = getStoredPermissionRoutes();
  if (existing.length > 0 && !options?.force) {
    return existing;
  }

  const roleName = localStorage.getItem(ROLE_STORAGE_KEY) ?? getRoleFromToken();
  if (!roleName) {
    return existing;
  }

  return loadUserPermissions(roleName);
};

export const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', data);
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem(ROLE_STORAGE_KEY, res.data.role);
      await loadUserPermissions(res.data.role);
    }
    return res.data;
  },
  guestLogin: async (): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/guest');
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem(ROLE_STORAGE_KEY, res.data.role);
      await loadUserPermissions(res.data.role);
    }
    return res.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem(ROLE_STORAGE_KEY);
    localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
    window.location.href = '/login';
  },
  isAuthenticated: () => !!localStorage.getItem('token'),
  getPermissionRoutes: () => getStoredPermissionRoutes(),
  getLandingPath: () => {
    const routes = getStoredPermissionRoutes();
    const firstRoute = routes.find(route => typeof route === 'string' && route.length > 0);
    return firstRoute ?? '/settings';
  },
  hasPermission: (path: string) => {
    if (!localStorage.getItem('token')) {
      return false;
    }

    if (path === '/settings') {
      return true;
    }

    const routes = getStoredPermissionRoutes();
    if (routes.length === 0) {
      return true;
    }

    const normalizedPath = path.replace(/\/$/, '');
    return routes.some(route => {
      const normalizedRoute = route.replace(/\/$/, '');
      return (
        normalizedPath === normalizedRoute ||
        normalizedPath.startsWith(`${normalizedRoute}/`) ||
        normalizedRoute.startsWith(`${normalizedPath}/`)
      );
    });
  },
  ensurePermissionsLoaded,
};

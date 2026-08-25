import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { authService } from '../services/authService';

interface PermissionRouteProps {
  path: string;
  element: ReactElement;
}

const PermissionRoute = ({ path, element }: PermissionRouteProps) => {
  const location = useLocation();
  const [refreshedPath, setRefreshedPath] = useState<string | null>(null);
  const permissionsReady = authService.isAdmin() || refreshedPath === path;

  useEffect(() => {
    if (!authService.isAuthenticated() || authService.isAdmin()) {
      return;
    }

    let isMounted = true;

    authService
      .ensurePermissionsLoaded({ force: true })
      .catch(error => {
        console.warn('Permission route refresh failed.', error);
      })
      .finally(() => {
        if (isMounted) {
          setRefreshedPath(path);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [path]);

  if (!authService.isAuthenticated()) {
    const returnPath = `${location.pathname}${location.search}${location.hash}`;
    authService.rememberReturnPath(returnPath);
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(returnPath)}`} replace state={{ from: returnPath }} />;
  }

  if (!permissionsReady) {
    return <Spin tip="權限確認中..." />;
  }

  if (authService.hasPermission(path)) {
    return element;
  }

  const fallbackPath = authService.getLandingPath();

  if (fallbackPath === path) {
    return <Navigate to="/settings" replace />;
  }

  return <Navigate to={fallbackPath} replace />;
};

export default PermissionRoute;

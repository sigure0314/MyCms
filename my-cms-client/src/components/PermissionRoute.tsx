import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

interface PermissionRouteProps {
  path: string;
  element: ReactElement;
}

const PermissionRoute = ({ path, element }: PermissionRouteProps) => {
  if (authService.hasPermission(path)) {
    return element;
  }

  const storedRoutes = authService.getPermissionRoutes();
  const fallbackPath = storedRoutes.find(route => typeof route === 'string' && route.length > 0) ?? '/settings';

  if (fallbackPath === path) {
    return <Navigate to="/settings" replace />;
  }

  return <Navigate to={fallbackPath} replace />;
};

export default PermissionRoute;

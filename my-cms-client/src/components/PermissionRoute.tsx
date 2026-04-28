import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

interface PermissionRouteProps {
  path: string;
  element: ReactElement;
}

const PermissionRoute = ({ path, element }: PermissionRouteProps) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
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

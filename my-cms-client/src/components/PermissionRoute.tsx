import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

interface PermissionRouteProps {
  path: string;
  element: ReactElement;
}

const PermissionRoute = ({ path, element }: PermissionRouteProps) =>
  authService.hasPermission(path) ? element : <Navigate to="/dashboard" replace />;

export default PermissionRoute;

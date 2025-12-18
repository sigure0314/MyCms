import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../services/authService';
const ProtectedRoute = () => authService.isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />;
export default ProtectedRoute;
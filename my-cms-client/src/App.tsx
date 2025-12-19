import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

// 匯入新頁面
import Dashboard from './pages/Dashboard';
import UserList from './pages/users/UserList';
import Permissions from './pages/users/Permissions';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* 受保護的區域 */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          {/* 這裡對應 MainLayout 裡的 Outlet */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<UserList />} />
          <Route path="/permissions" element={<Permissions />} />
        </Route>
      </Route>

      {/* 預設導向 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
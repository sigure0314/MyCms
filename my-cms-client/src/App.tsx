import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionRoute from './components/PermissionRoute';

// 匯入新頁面
import Dashboard from './pages/Dashboard';
import UserList from './pages/users/UserList';
import OnlineUserList from './pages/users/OnlineUserList';
import PermissionsLayout from './pages/users/permissions/PermissionsLayout';
import PermissionManagement from './pages/users/permissions/PermissionManagement';
import RoleManagement from './pages/users/permissions/RoleManagement';
import RolePermissions from './pages/users/permissions/RolePermissions';
import UserRoleAssignments from './pages/users/permissions/UserRoleAssignments';
import YoutubeComments from './pages/marketing/YoutubeComments';
import InstagramPosts from './pages/marketing/InstagramPosts';

// ✨ 匯入新頁面
import BookManagement from './pages/library/BookManagement';
import StoryGenerator from './pages/library/StoryGenerator';

import PlayerList from './pages/player/PlayerList';
import PersonalReader from './pages/player/PersonalReader'; // (這個可以參照之前的個人閱讀模式寫法)
import StoryTeller from './pages/player/StoryTeller';
import PersonalSettings from './pages/PersonalSettings';
import PosAsyncKitchen from './pages/PosAsyncKitchen';
import MenuManagement from './pages/pos/MenuManagement';
import FrameManagement from './pages/frame/FrameManagement';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route element={<ProtectedRoute />}>
        <Route
          path="/pos-async-kitchen/*"
          element={<PermissionRoute path="/pos-async-kitchen" element={<PosAsyncKitchen />} />}
        />
        <Route path="/player/read/:id" element={<PersonalReader />} />
        <Route path="/player/story/:id" element={<StoryTeller />} />
        <Route element={<MainLayout />}>
          <Route
            path="/settings"
            element={<PermissionRoute path="/settings" element={<PersonalSettings />} />}
          />
          <Route
            path="/dashboard"
            element={<PermissionRoute path="/dashboard" element={<Dashboard />} />}
          />
          
          {/* 會員區 */}
          <Route
            path="/users"
            element={<PermissionRoute path="/users" element={<UserList />} />}
          />
          <Route
            path="/users/online"
            element={<PermissionRoute path="/users/online" element={<OnlineUserList />} />}
          />
          <Route
            path="/permissions"
            element={<PermissionRoute path="/permissions" element={<PermissionsLayout />} />}
          >
            <Route index element={<Navigate to="permissions" replace />} />
            <Route
              path="permissions"
              element={<PermissionRoute path="/permissions/permissions" element={<PermissionManagement />} />}
            />
            <Route
              path="roles"
              element={<PermissionRoute path="/permissions/roles" element={<RoleManagement />} />}
            />
            <Route
              path="role-permissions"
              element={<PermissionRoute path="/permissions/role-permissions" element={<RolePermissions />} />}
            />
            <Route
              path="user-roles"
              element={<PermissionRoute path="/permissions/user-roles" element={<UserRoleAssignments />} />}
            />
          </Route>
          
          {/* 行銷區 */}
          <Route
            path="/marketing/youtube"
            element={<PermissionRoute path="/marketing/youtube" element={<YoutubeComments />} />}
          />
          <Route
            path="/marketing/instagram-posts"
            element={<PermissionRoute path="/marketing/instagram-posts" element={<InstagramPosts />} />}
          />
          
          {/* ✨ AI 圖書系統區 */}
          <Route
            path="/library/generate"
            element={<PermissionRoute path="/library/generate" element={<StoryGenerator />} />}
          />
          <Route
            path="/library/books"
            element={<PermissionRoute path="/library/books" element={<BookManagement />} />}
          />
          
          <Route
            path="/library/player"
            element={<PermissionRoute path="/library/player" element={<PlayerList />} />}
          />

          <Route
            path="/pos/menu"
            element={<PermissionRoute path="/pos/menu" element={<MenuManagement />} />}
          />

          <Route
            path="/frame"
            element={<PermissionRoute path="/frame" element={<FrameManagement />} />}
          />

          {/* 注意：因為 generate 和 player 頁面還沒做，
             如果點選單會是一片空白。
             你可以先指到 dashboard 或是一個 "施工中" 的頁面，
             或是暫時先不設定這兩個 Route。
          */}
          
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;

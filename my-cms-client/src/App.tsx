import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

// 匯入新頁面
import Dashboard from './pages/Dashboard';
import UserList from './pages/users/UserList';
import Permissions from './pages/users/Permissions';
import YoutubeComments from './pages/marketing/YoutubeComments';
import InstagramPosts from './pages/marketing/InstagramPosts';

// ✨ 匯入新頁面
import BookManagement from './pages/library/BookManagement';
import StoryGenerator from './pages/library/StoryGenerator';

import PlayerList from './pages/player/PlayerList';
import PersonalReader from './pages/player/PersonalReader'; // (這個可以參照之前的個人閱讀模式寫法)
import StoryTeller from './pages/player/StoryTeller';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route element={<ProtectedRoute />}>
          <Route path="/player/read/:id" element={<PersonalReader />} />
          <Route path="/player/story/:id" element={<StoryTeller />} />
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* 會員區 */}
          <Route path="/users" element={<UserList />} />
          <Route path="/permissions" element={<Permissions />} />
          
          {/* 行銷區 */}
          <Route path="/marketing/youtube" element={<YoutubeComments />} />
          <Route path="/marketing/instagram-posts" element={<InstagramPosts />} />
          
          {/* ✨ AI 圖書系統區 */}
          <Route path="/library/generate" element={<StoryGenerator />} />
          <Route path="/library/books" element={<BookManagement />} />
          
          <Route path="/library/player" element={<PlayerList />} />

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

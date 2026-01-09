import { HashRouter, NavLink, Route, Routes, Navigate } from 'react-router-dom';
import PosPage from './components/PosPage';
import KitchenPage from './components/KitchenPage';

const App = () => (
  <HashRouter>
    <div className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">PosAsyncKitchen</p>
          <h1>同步點餐與廚房看板</h1>
        </div>
        <div className="status-pill">SignalR Ready</div>
      </header>
      <nav className="nav-tabs">
        <NavLink to="/" end>
          POS 點餐
        </NavLink>
        <NavLink to="/kitchen">廚房看板</NavLink>
      </nav>
      <main className="layout">
        <Routes>
          <Route path="/" element={<PosPage />} />
          <Route path="/kitchen" element={<KitchenPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  </HashRouter>
);

export default App;

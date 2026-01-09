import { useEffect, useMemo, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import type {
  CreatePosKitchenOrderRequest,
  PosKitchenMenuItem,
  PosKitchenOrder,
} from '../../types/posKitchen';
import {
  createPosKitchenOrder,
  fetchPosKitchenMenu,
  fetchPosKitchenOrders,
  posKitchenHubUrl,
  updatePosKitchenOrderStatus,
} from '../../services/posKitchenApi';
import {
  posKitchenFallbackMenu,
  posKitchenFallbackOrders,
} from '../../data/posKitchenFallback';
import { posKitchenOfflineStore } from '../../services/posKitchenOfflineStore';
import './PosAsyncKitchen.css';

const createLocalId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`);

type TabKey = 'pos' | 'kitchen';

interface CartLine {
  item: PosKitchenMenuItem;
  quantity: number;
}

const PosAsyncKitchen = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('pos');
  const [menu, setMenu] = useState<PosKitchenMenuItem[]>(posKitchenFallbackMenu);
  const [orders, setOrders] = useState<PosKitchenOrder[]>(posKitchenFallbackOrders);
  const [isFallback, setIsFallback] = useState(false);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [completedOrders, setCompletedOrders] = useState<Record<string, boolean>>({});
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const data = await fetchPosKitchenMenu();
        setMenu(data);
      } catch (error) {
        console.warn('Menu fallback enabled', error);
        setMenu(posKitchenFallbackMenu);
        setIsFallback(true);
      }
    };

    loadMenu();
  }, []);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await fetchPosKitchenOrders();
        setOrders(data);
      } catch (error) {
        console.warn('Orders fallback enabled', error);
        setOrders(posKitchenOfflineStore.getOrders());
        setIsFallback(true);
      }
    };

    loadOrders();

    const unsubscribe = posKitchenOfflineStore.subscribe(() => {
      setOrders(posKitchenOfflineStore.getOrders());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(posKitchenHubUrl())
      .withAutomaticReconnect()
      .build();

    connection.on('OrderQueued', (order: PosKitchenOrder) => {
      setOrders((prev) => [order, ...prev]);
    });

    connection.on('OrderStatusUpdated', (payload: { id: string; status: string }) => {
      setOrders((prev) =>
        prev.map((order) => (order.id === payload.id ? { ...order, status: payload.status } : order)),
      );
    });

    connection
      .start()
      .catch((error) => {
        console.warn('SignalR connection failed', error);
        setIsFallback(true);
      });

    return () => {
      connection.stop();
    };
  }, []);

  const total = useMemo(
    () => Object.values(cart).reduce((sum, line) => sum + line.item.price * line.quantity, 0),
    [cart],
  );

  const addToCart = (menuItem: PosKitchenMenuItem) => {
    setCart((prev) => {
      const existing = prev[menuItem.id];
      const quantity = existing ? existing.quantity + 1 : 1;
      return { ...prev, [menuItem.id]: { item: menuItem, quantity } };
    });
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setCart((prev) => {
      const existing = prev[menuItemId];
      if (!existing) return prev;
      const quantity = existing.quantity + delta;
      if (quantity <= 0) {
        const { [menuItemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [menuItemId]: { ...existing, quantity } };
    });
  };

  const handleSubmit = async () => {
    if (!customerName || Object.keys(cart).length === 0) {
      setStatusMessage('請輸入客戶名稱並加入品項。');
      return;
    }

    const payload: CreatePosKitchenOrderRequest = {
      customerName,
      notes: notes || undefined,
      items: Object.values(cart).map((line) => ({
        menuItemId: line.item.id,
        name: line.item.name,
        quantity: line.quantity,
        price: line.item.price,
      })),
    };

    try {
      await createPosKitchenOrder(payload);
      setStatusMessage('訂單已送出');
    } catch (error) {
      console.warn('Order fallback enabled', error);
      setIsFallback(true);
      posKitchenOfflineStore.addOrder({
        id: createLocalId(),
        customerName: payload.customerName,
        notes: payload.notes,
        createdAt: new Date().toISOString(),
        status: 'Queued',
        items: payload.items.map((item) => ({
          id: createLocalId(),
          orderId: 'offline',
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      });
      setStatusMessage('離線模式：訂單已加入待處理清單');
    }

    setCart({});
    setCustomerName('');
    setNotes('');
  };

  const toggleOrderComplete = (orderId: string) => {
    setCompletedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const toggleItemComplete = (itemId: string) => {
    setCompletedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      await updatePosKitchenOrderStatus(orderId, status);
    } catch (error) {
      console.warn('Status update fallback', error);
      setIsFallback(true);
      posKitchenOfflineStore.updateStatus(orderId, status);
      setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)));
    }
  };

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders],
  );

  return (
    <div className="pos-kitchen-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">PosAsyncKitchen</p>
          <h1>同步點餐與廚房看板</h1>
        </div>
        <div className="status-pill">SignalR Ready</div>
      </header>
      <nav className="nav-tabs">
        <button
          className={activeTab === 'pos' ? 'active' : undefined}
          type="button"
          onClick={() => setActiveTab('pos')}
        >
          POS 點餐
        </button>
        <button
          className={activeTab === 'kitchen' ? 'active' : undefined}
          type="button"
          onClick={() => setActiveTab('kitchen')}
        >
          廚房看板
        </button>
      </nav>
      <main className="layout">
        {activeTab === 'pos' ? (
          <section className="card">
            <div className="section-header">
              <div>
                <h2>POS 點餐</h2>
                <p>選擇餐點並送出訂單。</p>
              </div>
              {isFallback && <span className="order-pill warn">離線模式</span>}
            </div>
            <div className="menu-grid">
              {menu.map((menuItem) => (
                <div key={menuItem.id} className="card menu-item">
                  <div>
                    <h3>{menuItem.name}</h3>
                    <p className="muted">{menuItem.description}</p>
                  </div>
                  <div className="menu-footer">
                    <span className="price">${menuItem.price.toFixed(2)}</span>
                    <button className="btn" onClick={() => addToCart(menuItem)} type="button">
                      加入
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="card order-panel">
              <h3>購物車</h3>
              {Object.keys(cart).length === 0 ? (
                <p className="muted">尚未加入餐點。</p>
              ) : (
                <ul className="cart-list">
                  {Object.values(cart).map((line) => (
                    <li key={line.item.id} className="cart-line">
                      <div>
                        <strong>{line.item.name}</strong>
                        <p className="muted">${line.item.price.toFixed(2)}</p>
                      </div>
                      <div className="quantity-controls">
                        <button type="button" onClick={() => updateQuantity(line.item.id, -1)}>
                          -
                        </button>
                        <span>{line.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(line.item.id, 1)}>
                          +
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="form-grid">
                <label>
                  客戶姓名
                  <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
                </label>
                <label>
                  備註
                  <input value={notes} onChange={(event) => setNotes(event.target.value)} />
                </label>
              </div>
              <div className="order-footer">
                <div>
                  <p className="muted">總計</p>
                  <strong>${total.toFixed(2)}</strong>
                </div>
                <button className="btn primary" type="button" onClick={handleSubmit}>
                  送出訂單
                </button>
              </div>
              {statusMessage && <p className="status-message">{statusMessage}</p>}
            </div>
          </section>
        ) : (
          <section className="card">
            <div className="section-header">
              <div>
                <h2>廚房看板</h2>
                <p>即時更新的訂單清單。</p>
              </div>
              {isFallback && <span className="order-pill warn">離線模式</span>}
            </div>
            <div className="order-grid">
              {sortedOrders.map((order) => (
                <article key={order.id} className="card order-card">
                  <header className="order-header">
                    <div>
                      <h3>{order.customerName}</h3>
                      <p className="muted">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                    <span className="order-pill">{order.status}</span>
                  </header>
                  <p className="muted">{order.notes || '無備註'}</p>
                  <ul className="item-list">
                    {order.items.map((item) => (
                      <li key={item.id} className="item-row">
                        <label>
                          <input
                            type="checkbox"
                            checked={!!completedItems[item.id]}
                            onChange={() => toggleItemComplete(item.id)}
                          />
                          <span>{item.name}</span>
                        </label>
                        <span className="muted">x{item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="order-actions">
                    <label className="pill-checkbox">
                      <input
                        type="checkbox"
                        checked={!!completedOrders[order.id]}
                        onChange={() => toggleOrderComplete(order.id)}
                      />
                      整單完成
                    </label>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleStatusUpdate(order.id, 'Completed')}
                    >
                      更新狀態
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default PosAsyncKitchen;

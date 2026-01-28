import { Route, Routes } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { v4 as uuidv4 } from 'uuid';
import api from '../services/api';
import type { CreateOrderRequest, MenuItem, Order } from '../types/posAsyncKitchen';
import './PosAsyncKitchen.css';

const normalizeApiBaseUrl = (value: string | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return '/api';
  }

  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

const API_BASE_URL = normalizeApiBaseUrl(api.defaults.baseURL);
const FALLBACK_STORAGE_KEY = 'posAsyncKitchenOrders';

const fallbackOrders: Order[] = [
  {
    id: 'offline-1',
    customerName: 'Olivia Chen',
    notes: 'No onions please.',
    createdAt: new Date().toISOString(),
    status: 'Queued',
    items: [
      {
        id: 1,
        orderId: 'offline-1',
        menuItemId: 1,
        name: 'Classic Burger',
        quantity: 1,
        price: 8.5,
      },
      {
        id: 2,
        orderId: 'offline-1',
        menuItemId: 3,
        name: 'Sweet Potato Fries',
        quantity: 1,
        price: 3.8,
      },
    ],
  },
];

const getHubUrl = () => {
  const base = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL;
  return `${base}/hubs/orders`;
};

const loadFallbackOrders = (): Order[] => {
  const stored = localStorage.getItem(FALLBACK_STORAGE_KEY);
  if (!stored) {
    return fallbackOrders;
  }
  try {
    const parsed = JSON.parse(stored) as Order[];
    return parsed.length ? parsed : fallbackOrders;
  } catch {
    return fallbackOrders;
  }
};

const saveFallbackOrders = (orders: Order[]) => {
  localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(orders));
};

const sortOrdersByCreatedAt = (orders: Order[]) =>
  [...orders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

const addOrderIfMissing = (orders: Order[], incoming: Order) => {
  if (orders.some((order) => order.id === incoming.id)) {
    return orders;
  }
  return sortOrdersByCreatedAt([...orders, incoming]);
};

const getOrderPillClassName = (status: string) => (status === 'Completed' ? 'order-pill is-completed' : 'order-pill');
const ORDER_STATUS_OPTIONS = ['Queued', 'Preparing', 'Ready', 'Completed'];
const ORDER_STATUS_FILTER_OPTIONS = [
  { value: 'All', label: '全部' },
  ...ORDER_STATUS_OPTIONS.map((status) => ({
    value: status,
    label: status,
  })),
];

const PosAsyncKitchen = () => (
  <div className="pos-kitchen-page">
    <header className="page-header">
      <h1>Signlar同步點餐系統</h1>
    </header>
    <Routes>
      <Route index element={<PosOrderPage />} />
      <Route path="kitchen" element={<KitchenBoard />} />
    </Routes>
  </div>
);

const PosOrderPage = () => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [ordersOffline, setOrdersOffline] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');

  const useFallback = ordersOffline;

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const { data } = await api.get<MenuItem[]>('/orders/menu');
        setMenu(data);
      } catch (error) {
        console.warn('POS menu fetch failed.', error);
        setMenu([]);
      }
    };

    void fetchMenu();
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await api.get<Order[]>('/orders');
        setOrders(sortOrdersByCreatedAt(data));
        setOrdersOffline(false);
      } catch (error) {
        console.warn('POS orders fetch failed, fallback to local orders.', error);
        const fallback = loadFallbackOrders();
        setOrders(sortOrdersByCreatedAt(fallback));
        setOrdersOffline(true);
      }
    };

    void fetchOrders();
  }, []);

  useEffect(() => {
    if (ordersOffline) {
      return undefined;
    }

    const connection = new HubConnectionBuilder().withUrl(getHubUrl()).withAutomaticReconnect().build();

    connection.on('OrderQueued', (order: Order) => {
      setOrders((prev) => addOrderIfMissing(prev, order));
    });

    connection.on('OrderStatusUpdated', (payload: { id: string; status: string }) => {
      setOrders((prev) =>
        prev.map((order) => (order.id === payload.id ? { ...order, status: payload.status } : order)),
      );
    });

    const startConnection = async () => {
      try {
        await connection.start();
      } catch (error) {
        console.warn('POS SignalR connection failed, fallback to offline mode.', error);
        const fallback = loadFallbackOrders();
        setOrders(sortOrdersByCreatedAt(fallback));
        setOrdersOffline(true);
      }
    };

    void startConnection();

    return () => {
      void connection.stop();
    };
  }, [ordersOffline]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, quantity]) => {
        const menuItem = menu.find((item) => item.id === Number(id));
        if (!menuItem) {
          return null;
        }
        return {
          ...menuItem,
          quantity,
          lineTotal: quantity * menuItem.price,
        };
      })
      .filter(Boolean) as Array<MenuItem & { quantity: number; lineTotal: number }>;
  }, [cart, menu]);

  const total = useMemo(() => cartItems.reduce((sum, item) => sum + item.lineTotal, 0), [cartItems]);
  const filteredOrders = useMemo(
    () => (statusFilter === 'All' ? orders : orders.filter((order) => order.status === statusFilter)),
    [orders, statusFilter],
  );

  const updateQuantity = (menuItemId: number, delta: number) => {
    setCart((prev) => {
      const next = { ...prev };
      const current = next[menuItemId] ?? 0;
      const updated = current + delta;
      if (updated <= 0) {
        delete next[menuItemId];
      } else {
        next[menuItemId] = updated;
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!customerName.trim() || cartItems.length === 0) {
      return;
    }

    const request: CreateOrderRequest = {
      customerName: customerName.trim(),
      notes: notes.trim() || undefined,
      items: cartItems.map((item) => ({
        menuItemId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
    };

    setIsSubmitting(true);
    try {
      const { data: created } = await api.post<Order>('/orders', request);
      setOrders((prev) => addOrderIfMissing(prev, created));

      setCart({});
      setCustomerName('');
      setNotes('');
    } catch (error) {
      console.warn('Create order failed, fallback to local demo mode.', error);
      const fallbackOrdersList = loadFallbackOrders();
      const newOrderId = uuidv4();
      const newOrder: Order = {
        id: newOrderId,
        customerName: request.customerName,
        notes: request.notes,
        createdAt: new Date().toISOString(),
        status: 'Queued',
        items: request.items.map((item, index) => ({
          id: index + 1,
          orderId: newOrderId,
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      };
      const updated = [...fallbackOrdersList, newOrder];
      saveFallbackOrders(updated);
      setOrders(sortOrdersByCreatedAt(updated));
      setCart({});
      setCustomerName('');
      setNotes('');
      setOrdersOffline(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {useFallback && <div className="offline-banner">離線示範模式：訂單清單採用本地資料。</div>}
      <div className="layout">
        <div className="stack">
          <div className="card">
            <h2>菜單</h2>
            <div className="menu-grid">
              {menu.map((item) => (
                <div key={item.id} className="card menu-card">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <p>NT$ {item.price.toFixed(2)}</p>
                  <button className="primary-button" type="button" onClick={() => updateQuantity(item.id, 1)}>
                    加入購物車
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h2>送出清單</h2>
            <div className="order-actions">
              <label>
                列表狀態
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  {ORDER_STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="order-list">
              {filteredOrders.length === 0 && (
                <span>{orders.length === 0 ? '尚無送出訂單。' : '此狀態尚無訂單。'}</span>
              )}
              {filteredOrders.map((order) => {
                const orderTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                return (
                  <div key={order.id} className="order-card">
                    <div className="order-header">
                      <div>
                        <strong>{order.customerName}</strong>
                        <div className={getOrderPillClassName(order.status)}>{order.status}</div>
                      </div>
                      <div className="order-meta">
                        {new Date(order.createdAt).toLocaleString('zh-TW', { hour12: false })}
                      </div>
                    </div>
                    <div className="order-items">
                      {order.items.map((item) => (
                        <div key={`${order.id}-${item.id}`} className="order-item">
                          <span>
                            {item.name} x {item.quantity}
                          </span>
                          <span>NT$ {(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="order-total">
                      <strong>總計</strong>
                      <strong>NT$ {orderTotal.toFixed(2)}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="card">
          <h2>購物車</h2>
          <div className="field">
            <label htmlFor="customerName">客戶名稱</label>
            <input
              id="customerName"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="請輸入姓名"
            />
          </div>
          <div className="field">
            <label htmlFor="notes">備註</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="少冰、加辣等"
              rows={3}
            />
          </div>
          <div className="cart-list">
            {cartItems.length === 0 && <span>尚未加入任何品項。</span>}
            {cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <div>
                  <strong>{item.name}</strong>
                  <div>NT$ {item.lineTotal.toFixed(2)}</div>
                </div>
                <div className="cart-item-controls">
                  <button className="secondary-button" type="button" onClick={() => updateQuantity(item.id, -1)}>
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button className="secondary-button" type="button" onClick={() => updateQuantity(item.id, 1)}>
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <hr />
          <div className="cart-item">
            <strong>總計</strong>
            <strong>NT$ {total.toFixed(2)}</strong>
          </div>
          <button
            className="primary-button"
            type="button"
            disabled={!customerName.trim() || cartItems.length === 0 || isSubmitting}
            onClick={handleSubmit}
          >
            送出訂單
          </button>
        </div>
      </div>
    </div>
  );
};

const KitchenBoard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [useFallback, setUseFallback] = useState(false);
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await api.get<Order[]>('/orders');
        setOrders(data);
        setUseFallback(false);
      } catch (error) {
        console.warn('Kitchen orders fetch failed, fallback to in-memory orders.', error);
        setOrders(loadFallbackOrders());
        setUseFallback(true);
      }
    };

    void fetchOrders();
  }, []);

  useEffect(() => {
    if (useFallback) {
      return undefined;
    }

    const connection = new HubConnectionBuilder().withUrl(getHubUrl()).withAutomaticReconnect().build();

    connection.on('OrderQueued', (order: Order) => {
      setOrders((prev) => addOrderIfMissing(prev, order));
    });

    connection.on('OrderStatusUpdated', (payload: { id: string; status: string }) => {
      setOrders((prev) =>
        prev.map((order) => (order.id === payload.id ? { ...order, status: payload.status } : order)),
      );
    });

    const startConnection = async () => {
      try {
        await connection.start();
      } catch (error) {
        console.warn('SignalR connection failed, fallback to offline mode.', error);
        setUseFallback(true);
        setOrders(loadFallbackOrders());
      }
    };

    void startConnection();

    connection.onclose((error) => {
      if (error) {
        console.warn('SignalR connection closed.', error);
      }
    });

    connection.onreconnecting((error) => {
      console.warn('SignalR reconnecting...', error);
    });

    return () => {
      void connection.stop();
    };
  }, [useFallback]);

  const updateStatus = async (id: string, status: string) => {
    if (useFallback) {
      const updated = orders.map((order) => (order.id === id ? { ...order, status } : order));
      setOrders(updated);
      saveFallbackOrders(updated);
      return;
    }

    try {
      await api.put(`/orders/${id}/status`, { status });
    } catch (error) {
      console.warn('Status update failed, using local update.', error);
      setOrders((prev) => prev.map((order) => (order.id === id ? { ...order, status } : order)));
    }
  };

  const toggleOrderDone = (order: Order) => {
    const nextStatus = order.status === 'Completed' ? 'Preparing' : 'Completed';
    void updateStatus(order.id, nextStatus);
  };

  const toggleItemDone = (orderId: string, itemId: number) => {
    const key = `${orderId}-${itemId}`;
    setCompletedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div>
      {useFallback && <div className="offline-banner">離線示範模式：訂單清單採用本地資料。</div>}
      <div className="layout">
        <div className="card">
          <h2>廚房看板</h2>
          <div className="order-list">
            {orders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <div>
                    <strong>{order.customerName}</strong>
                    <div className={getOrderPillClassName(order.status)}>{order.status}</div>
                  </div>
                  <div className="order-actions">
                    <label>
                      <input
                        type="checkbox"
                        checked={order.status === 'Completed'}
                        onChange={() => toggleOrderDone(order)}
                      />
                      整單完成
                    </label>
                    <select value={order.status} onChange={(event) => updateStatus(order.id, event.target.value)}>
                      {ORDER_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {order.notes && <p>備註：{order.notes}</p>}
                <div className="order-items">
                  {order.items.map((item) => {
                    const itemKey = `${order.id}-${item.id}`;
                    return (
                      <div key={itemKey} className="order-item">
                        <span>
                          {item.name} x {item.quantity}
                        </span>
                        <label>
                          <input
                            type="checkbox"
                            checked={!!completedItems[itemKey]}
                            onChange={() => toggleItemDone(order.id, item.id)}
                          />
                          品項完成
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2>狀態摘要</h2>
          <p>即時更新將透過 SignalR 廣播到此看板。</p>
          <ul>
            <li>OrderQueued：新增訂單立即顯示。</li>
            <li>OrderStatusUpdated：狀態更新即時同步。</li>
            <li>離線模式下可做示範用的本地更新。</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PosAsyncKitchen;

import { useEffect, useMemo, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import type { Order } from '../types/orders';
import { fetchOrders, signalRHubUrl, updateOrderStatus } from '../services/api';
import { fallbackOrders } from '../data/fallback';
import { offlineStore } from '../services/offlineStore';

const KitchenPage = () => {
  const [orders, setOrders] = useState<Order[]>(fallbackOrders);
  const [isFallback, setIsFallback] = useState(false);
  const [completedOrders, setCompletedOrders] = useState<Record<string, boolean>>({});
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await fetchOrders();
        setOrders(data);
      } catch (error) {
        console.warn('Orders fallback enabled', error);
        setOrders(offlineStore.getOrders());
        setIsFallback(true);
      }
    };

    loadOrders();

    const unsubscribe = offlineStore.subscribe(() => {
      setOrders(offlineStore.getOrders());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(signalRHubUrl())
      .withAutomaticReconnect()
      .build();

    connection.on('OrderQueued', (order: Order) => {
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

  const toggleOrderComplete = (orderId: string) => {
    setCompletedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const toggleItemComplete = (itemId: string) => {
    setCompletedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      await updateOrderStatus(orderId, status);
    } catch (error) {
      console.warn('Status update fallback', error);
      setIsFallback(true);
      offlineStore.updateStatus(orderId, status);
      setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)));
    }
  };

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders],
  );

  return (
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
  );
};

export default KitchenPage;

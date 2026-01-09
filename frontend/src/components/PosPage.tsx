import { useEffect, useMemo, useState } from 'react';
import type { CreateOrderRequest, MenuItem } from '../types/orders';
import { createOrder, fetchMenu } from '../services/api';
import { fallbackMenu } from '../data/fallback';
import { offlineStore } from '../services/offlineStore';

const createLocalId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`);

interface CartLine {
  item: MenuItem;
  quantity: number;
}

const PosPage = () => {
  const [menu, setMenu] = useState<MenuItem[]>(fallbackMenu);
  const [isFallback, setIsFallback] = useState(false);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const data = await fetchMenu();
        setMenu(data);
      } catch (error) {
        console.warn('Menu fallback enabled', error);
        setMenu(fallbackMenu);
        setIsFallback(true);
      }
    };

    loadMenu();
  }, []);

  const total = useMemo(
    () => Object.values(cart).reduce((sum, line) => sum + line.item.price * line.quantity, 0),
    [cart],
  );

  const addToCart = (menuItem: MenuItem) => {
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

    const payload: CreateOrderRequest = {
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
      await createOrder(payload);
      setStatusMessage('訂單已送出');
    } catch (error) {
      console.warn('Order fallback enabled', error);
      setIsFallback(true);
      offlineStore.addOrder({
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

  return (
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
  );
};

export default PosPage;

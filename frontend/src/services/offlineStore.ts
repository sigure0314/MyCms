import type { Order } from '../types/orders';
import { fallbackOrders } from '../data/fallback';

const orders: Order[] = [...fallbackOrders];
const listeners = new Set<() => void>();

export const offlineStore = {
  getOrders: () => [...orders],
  addOrder: (order: Order) => {
    orders.unshift(order);
    listeners.forEach((listener) => listener());
  },
  updateStatus: (id: string, status: string) => {
    const target = orders.find((order) => order.id === id);
    if (target) {
      target.status = status;
      listeners.forEach((listener) => listener());
    }
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

import type { PosKitchenOrder } from '../types/posKitchen';
import { posKitchenFallbackOrders } from '../data/posKitchenFallback';

const orders: PosKitchenOrder[] = [...posKitchenFallbackOrders];
const listeners = new Set<() => void>();

export const posKitchenOfflineStore = {
  getOrders: () => [...orders],
  addOrder: (order: PosKitchenOrder) => {
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

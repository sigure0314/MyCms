import type {
  CreatePosKitchenOrderRequest,
  PosKitchenMenuItem,
  PosKitchenOrder,
} from '../types/posKitchen';

const apiBase = (import.meta.env.VITE_POS_KITCHEN_API_BASE as string | undefined) ?? '';

const getUrl = (path: string) => `${apiBase}${path}`;

export const fetchPosKitchenMenu = async () => {
  const response = await fetch(getUrl('/api/orders/menu'));
  if (!response.ok) {
    throw new Error('Failed to load menu');
  }
  return (await response.json()) as PosKitchenMenuItem[];
};

export const fetchPosKitchenOrders = async () => {
  const response = await fetch(getUrl('/api/orders'));
  if (!response.ok) {
    throw new Error('Failed to load orders');
  }
  return (await response.json()) as PosKitchenOrder[];
};

export const createPosKitchenOrder = async (payload: CreatePosKitchenOrderRequest) => {
  const response = await fetch(getUrl('/api/orders'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to create order');
  }

  return (await response.json()) as PosKitchenOrder;
};

export const updatePosKitchenOrderStatus = async (id: string, status: string) => {
  const response = await fetch(getUrl(`/api/orders/${id}/status`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(status),
  });

  if (!response.ok) {
    throw new Error('Failed to update status');
  }

  return (await response.json()) as PosKitchenOrder;
};

export const posKitchenHubUrl = () => getUrl('/hubs/orders');

export interface PosKitchenMenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

export interface PosKitchenOrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface PosKitchenOrder {
  id: string;
  customerName: string;
  notes?: string | null;
  createdAt: string;
  status: string;
  items: PosKitchenOrderItem[];
}

export interface CreatePosKitchenOrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface CreatePosKitchenOrderRequest {
  customerName: string;
  notes?: string | null;
  items: CreatePosKitchenOrderItem[];
}

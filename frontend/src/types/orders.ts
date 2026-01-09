export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerName: string;
  notes?: string | null;
  createdAt: string;
  status: string;
  items: OrderItem[];
}

export interface CreateOrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface CreateOrderRequest {
  customerName: string;
  notes?: string | null;
  items: CreateOrderItem[];
}

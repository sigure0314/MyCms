export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
}

export interface OrderItem {
  id: number;
  orderId: string;
  menuItemId: number;
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

export interface CreateOrderItemRequest {
  menuItemId: number;
  name: string;
  quantity: number;
  price: number;
}

export interface CreateOrderRequest {
  customerName: string;
  notes?: string | null;
  items: CreateOrderItemRequest[];
}

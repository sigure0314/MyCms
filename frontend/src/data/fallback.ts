import type { MenuItem, Order } from '../types/orders';

export const fallbackMenu: MenuItem[] = [
  {
    id: 'classic-burger',
    name: 'Classic Burger',
    description: 'Beef patty, cheddar, lettuce, tomato.',
    price: 7.99,
    category: 'Main',
  },
  {
    id: 'veggie-bowl',
    name: 'Veggie Bowl',
    description: 'Quinoa, seasonal veggies, and house sauce.',
    price: 6.5,
    category: 'Main',
  },
  {
    id: 'sweet-potato-fries',
    name: 'Sweet Potato Fries',
    description: 'Crispy fries with smoked paprika salt.',
    price: 3.75,
    category: 'Side',
  },
  {
    id: 'iced-lemon-tea',
    name: 'Iced Lemon Tea',
    description: 'Fresh lemon with lightly sweetened tea.',
    price: 2.5,
    category: 'Drink',
  },
];

export const fallbackOrders: Order[] = [
  {
    id: 'offline-order-1',
    customerName: 'Offline Guest',
    notes: 'Fallback demo order',
    createdAt: new Date().toISOString(),
    status: 'Queued',
    items: [
      {
        id: 'offline-item-1',
        orderId: 'offline-order-1',
        menuItemId: 'classic-burger',
        name: 'Classic Burger',
        quantity: 1,
        price: 7.99,
      },
    ],
  },
];

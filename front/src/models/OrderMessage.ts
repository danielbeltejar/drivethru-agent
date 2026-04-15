export interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Order {
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: string;
  command: string;
  order: Order;
}

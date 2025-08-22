// ============================================================================
// ORDER MANAGEMENT TYPES
// ============================================================================

import { Order, OrderCreateInput, OrderUpdateInput } from './order';

export interface OrderManagement {
  createOrder(input: OrderCreateInput): Promise<Order>;
  updateOrder(id: string, input: OrderUpdateInput): Promise<Order>;
  deleteOrder(id: string): Promise<void>;
  getOrder(id: string): Promise<Order | null>;
  getOrders(filters?: any): Promise<Order[]>;
}

export interface OrderValidation {
  validateOrderInput(input: OrderCreateInput): boolean;
  validateOrderUpdate(input: OrderUpdateInput): boolean;
}

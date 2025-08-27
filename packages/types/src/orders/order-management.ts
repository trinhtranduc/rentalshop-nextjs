// ============================================================================
// ORDER MANAGEMENT TYPES
// ============================================================================

import { Order, OrderCreateInput, OrderUpdateInput } from './order';

export interface OrderManagement {
  createOrder(input: OrderCreateInput): Promise<Order>;
  updateOrder(id: number, input: OrderUpdateInput): Promise<Order>;
  deleteOrder(id: number): Promise<void>;
  getOrder(id: number): Promise<Order | null>;
  getOrders(filters?: any): Promise<Order[]>;
}

export interface OrderValidation {
  validateOrderInput(input: OrderCreateInput): boolean;
  validateOrderUpdate(input: OrderUpdateInput): boolean;
}

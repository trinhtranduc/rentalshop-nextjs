// ============================================================================
// ORDER ITEMS TYPES
// ============================================================================

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  rentalDays?: number;
  startDate?: Date;
  endDate?: Date;
  daysRented?: number;
  deposit?: number;
  notes?: string;
}

export interface OrderItemWithProduct extends Omit<OrderItem, 'createdAt' | 'updatedAt'> {
  product: {
    id: string;
    name: string;
    barcode?: string;
    description?: string;
  };
}

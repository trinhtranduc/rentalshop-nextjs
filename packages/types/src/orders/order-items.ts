// ============================================================================
// ORDER ITEMS TYPES
// ============================================================================

export interface OrderItem {
  id: string;           // Database CUID (internal use)
  publicId: number;     // Public numeric ID (external use)
  orderId: string;      // Database CUID
  productId: string;    // Database CUID
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemInput {
  productId: number;    // Frontend sends publicId (number)
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
    id: string;         // Database CUID (internal use)
    publicId: number;   // Public numeric ID (external use)
    name: string;
    barcode?: string;
    description?: string;
  };
}

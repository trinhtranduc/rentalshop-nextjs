// ============================================================================
// PAYMENTS TYPES
// ============================================================================

export type PaymentMethod = 'STRIPE' | 'TRANSFER' | 'MANUAL' | 'CASH' | 'CHECK' | 'PAYPAL';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
export type PaymentType = 'ORDER_PAYMENT' | 'SUBSCRIPTION_PAYMENT' | 'PLAN_CHANGE' | 'PLAN_EXTENSION';
export type CollateralType = 'CASH' | 'ID_CARD' | 'PASSPORT' | 'DRIVERS_LICENSE' | 'OTHER';

export interface Payment {
  id: number;
  amount: number;
  currency: string;
  method: PaymentMethod;
  type: PaymentType;
  status: PaymentStatus;
  reference?: string;
  transactionId?: string;
  invoiceNumber?: string;
  description?: string;
  notes?: string;
  failureReason?: string;
  metadata?: string;
  processedAt?: Date;
  processedBy?: string;
  orderId?: number;
  subscriptionId?: number;
  merchantId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentInput {
  orderId: number;
  amount: number;
  method: PaymentMethod;
  type: PaymentType;
  reference?: string;
  notes?: string;
}

export interface PaymentUpdateInput {
  status?: PaymentStatus;
  reference?: string;
  notes?: string;
}

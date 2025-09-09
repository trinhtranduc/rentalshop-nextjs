// ============================================================================
// PAYMENTS TYPES
// ============================================================================

import { PaymentMethod, PaymentStatus, PaymentType } from '@rentalshop/constants';

// Re-export types from centralized constants
export type { PaymentMethod, PaymentStatus, PaymentType };
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

// ============================================================================
// PAYMENTS TYPES
// ============================================================================

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'DIGITAL_WALLET';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type PaymentType = 'DEPOSIT' | 'SECURITY_DEPOSIT' | 'RENTAL_FEE' | 'DAMAGE_FEE' | 'LATE_FEE' | 'REFUND';
export type CollateralType = 'CASH' | 'ID_CARD' | 'PASSPORT' | 'DRIVERS_LICENSE' | 'OTHER';

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentInput {
  orderId: string;
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

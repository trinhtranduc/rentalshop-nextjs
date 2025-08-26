/**
 * Types and interfaces for CreateOrderForm components
 */

import type { 
  OrderInput, 
  CustomerSearchResult,
  ProductWithStock
} from '@rentalshop/types';

// Re-export types for local use
export type { 
  CustomerSearchResult,
  ProductWithStock 
};

export interface OrderItemFormData {
  productId: string;
  quantity: number;
  unitPrice: number;
  deposit: number;
  notes: string;
}

export interface OrderFormData {
  orderType: 'RENT' | 'SALE';
  customerId: string;
  outletId: string;
  pickupPlanAt?: string;
  returnPlanAt?: string;
  subtotal: number;
  taxAmount: number;
  discountType: 'amount' | 'percentage';
  discountValue: number;
  discountAmount: number;
  depositAmount: number;
  securityDeposit: number;
  lateFee: number;
  damageFee: number;
  totalAmount: number;
  notes: string;
  orderItems: OrderItemFormData[];
}

export interface ValidationErrors {
  customerId?: string;
  orderItems?: string;
  pickupPlanAt?: string;
  returnPlanAt?: string;
  depositAmount?: string;
}

export interface CreateOrderFormProps {
  customers?: CustomerSearchResult[];
  products?: ProductWithStock[];
  outlets?: Array<{ id: string; name: string; merchantId?: string }>;
  categories?: Array<{ id: string; name: string }>;
  onSubmit?: (data: OrderInput) => void;
  onCancel?: () => void;
  loading?: boolean;
  layout?: 'stacked' | 'split';
  merchantId?: string;
  // Edit mode props
  isEditMode?: boolean;
  initialOrder?: any; // Order data for editing
  orderNumber?: string; // Order number for display in edit mode
}

export interface ProductAvailabilityStatus {
  status: 'available' | 'unavailable' | 'out-of-stock' | 'low-stock' | 'unknown';
  text: string;
  color: string;
}

export interface CustomerSearchOption {
  value: string;
  label: string;
  type: 'customer';
}

export interface ProductSearchOption {
  value: string;
  label: string;
  image?: string;
  subtitle?: string;
  details?: string[];
  type: 'product';
}

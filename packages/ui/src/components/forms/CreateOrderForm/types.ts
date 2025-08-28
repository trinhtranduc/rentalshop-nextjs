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

// Local interface that matches the unified OrderItemFormData structure
export interface OrderItemFormData {
  // For existing items (edit mode)
  id?: string;          // Database CUID (only present when editing existing items)
  
  // Product information
  productId: number;    // Frontend uses publicId (number) for product selection
  product: {
    id: number;         // Frontend uses publicId (number) for display
    publicId: number;   // Keep publicId for reference
    name: string;
    description?: string;
    images?: string[] | null;
    barcode?: string;
    rentPrice?: number;
    deposit?: number;
  };
  
  // Order item details
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  rentalDays?: number;
  deposit?: number;
  notes?: string;
  
  // Rental-specific fields
  startDate?: string;   // ISO date string for form inputs
  endDate?: string;     // ISO date string for form inputs
  daysRented?: number;
}

export interface OrderFormData {
  orderType: 'RENT' | 'SALE';
  customerId?: number;  // Optional until customer is selected
  outletId?: number;    // Optional until outlet is selected
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
  customerId?: string;  // Changed from number to string for error messages
  outletId?: string;    // Added for outlet validation
  orderItems?: string;
  pickupPlanAt?: string;
  returnPlanAt?: string;
  depositAmount?: string;
}

export interface CreateOrderFormProps {
  customers?: CustomerSearchResult[];
  products?: ProductWithStock[];
  outlets?: Array<{ id: number; name: string; merchantId?: number }>;
  categories?: Array<{ id: number; name: string }>;
  onSubmit?: (data: OrderInput) => void;
  onCancel?: () => void;
  loading?: boolean;
  layout?: 'stacked' | 'split';
  merchantId?: number;
  // Edit mode props
  isEditMode?: boolean;
  initialOrder?: any; // Order data for editing
  orderNumber?: string; // Order number for display in edit mode
  // Form control props
  onFormReady?: (resetForm: () => void) => void;
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

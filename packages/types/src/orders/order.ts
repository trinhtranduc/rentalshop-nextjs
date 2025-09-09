// ============================================================================
// ORDER TYPES
// ============================================================================

import { OrderItemInput, OrderItemWithProduct } from './order-items';
import type { Payment } from './payments';

// Simplified order types: only RENT and SALE
import { OrderType, OrderStatus } from '@rentalshop/constants';

// Re-export types from centralized constants
export type { OrderType, OrderStatus };

export interface Order {
  id: string;           // Database CUID (internal use)
  publicId: number;     // Public numeric ID (external use)
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  customerId?: string;  // Database CUID
  outletId: string;     // Database CUID
  createdById: string;  // Database CUID of user who created the order
  totalAmount: number;
  depositAmount: number;
  pickupPlanAt?: Date;
  returnPlanAt?: Date;
  pickedUpAt?: Date;
  returnedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Additional properties for order details
  damageFee?: number;
  bailAmount?: number;
  material?: string;
  securityDeposit?: number;
  collateralType?: string;
  collateralDetails?: string;
  notes?: string;
  // Discount properties
  discountType?: 'amount' | 'percentage';
  discountValue?: number;
  discountAmount?: number;
}

export interface OrderCreateInput {
  orderType: OrderType;
  customerId?: number;  // Frontend sends publicId (number)
  outletId: number;     // Frontend sends publicId (number)
  totalAmount: number;
  depositAmount?: number;
  pickupPlanAt?: Date;
  returnPlanAt?: Date;
  orderItems: OrderItemInput[];
}



export interface OrderFilters {
  status?: OrderStatus | OrderStatus[]; // Support both single status and array of statuses
  orderType?: OrderType;
  outletId?: number;
  customerId?: number;
  productId?: number; // Filter orders by specific product
  startDate?: Date | string; // Support both Date objects and string dates for API calls
  endDate?: Date | string;   // Support both Date objects and string dates for API calls
  search?: string;
  pickupDate?: Date;
  returnDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  isReadyToDeliver?: boolean;
  
  // Pagination properties
  limit?: number;
  offset?: number;
  
  // UI-specific filter properties
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  outlet?: string;
  dateRange?: { start: string; end: string };
}

// Unified order input model for both creating and updating
export interface OrderInput {
  // Optional fields for updates (backend generates if missing)
  orderId?: number;        // For updates - existing order publicId
  orderNumber?: string;    // For updates - existing order number
  
  // Core order fields
  orderType: OrderType;
  customerId?: number;
  outletId: number;
  pickupPlanAt?: Date;
  returnPlanAt?: Date;
  rentalDuration?: number;
  subtotal: number;
  taxAmount?: number;
  discountType?: 'amount' | 'percentage';
  discountValue?: number;
  discountAmount?: number;
  totalAmount: number;
  depositAmount?: number;
  securityDeposit?: number;
  damageFee?: number;
  lateFee?: number;
  collateralType?: string;
  collateralDetails?: string;
  notes?: string;
  pickupNotes?: string;
  returnNotes?: string;
  damageNotes?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  isReadyToDeliver?: boolean;
  
  // Order items
  orderItems: OrderItemInput[];
  
  // Update-specific fields (optional for create, required for update)
  status?: OrderStatus;
  pickedUpAt?: Date;
  returnedAt?: Date;
}

// Keep OrderUpdateInput for backward compatibility, but it's now the same as OrderInput
export type OrderUpdateInput = OrderInput;

export interface OrderSearchResult {
  id: string;           // Database CUID (internal use)
  publicId: number;     // Public numeric ID (external use)
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  totalAmount: number;
  depositAmount: number;
  createdAt: Date;
  updatedAt: Date;
  pickupPlanAt: Date | null;
  returnPlanAt: Date | null;
  pickedUpAt: Date | null;
  returnedAt: Date | null;
  isReadyToDeliver: boolean;
  customer: {
    id: string;         // Database CUID (internal use)
    publicId: number;   // Public numeric ID (external use)
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
  } | null;
  outlet: {
    id: string;         // Database CUID (internal use)
    publicId: number;   // Public numeric ID (external use)
    name: string;
  };
}

// Extended order types for search and API responses
export interface OrderWithDetails extends Order {
  customer: {
    id: string;         // Database CUID (internal use)
    publicId: number;   // Public numeric ID (external use)
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
  } | null;
  outlet: {
    id: string;         // Database CUID (internal use)
    publicId: number;   // Public numeric ID (external use)
    name: string;
    address: string | null;
    merchantId: string; // Database CUID
    merchant: {
      id: string;       // Database CUID (internal use)
      publicId: number; // Public numeric ID (external use)
      name: string;
    };
  };
  orderItems: OrderItemWithProduct[];
  payments: Payment[];
  // Creator information
  createdBy: {
    id: string;         // Database CUID
    publicId: number;   // Public numeric ID
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
  // Add merchantId for backward compatibility with database package
  merchantId: string;   // Database CUID
}

export interface OrderSearchFilter {
  q?: string;
  outletId?: number;    // API queries use publicId (number)
  customerId?: number;  // API queries use publicId (number)
  userId?: number;      // API queries use publicId (number)
  orderType?: OrderType;
  status?: OrderStatus;
  startDate?: Date;
  endDate?: Date;
  pickupDate?: Date;
  returnDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  isReadyToDeliver?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OrderSearchResponse {
  success: boolean;
  data: {
    orders: OrderSearchResult[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Order statistics and history types
export interface OrderHistoryInput {
  orderId: number;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  notes?: string;
  userId?: string;
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  totalDeposits: number;
  activeRentals: number;
  overdueRentals: number;
  completedOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
}

export interface OrderStatsByPeriod {
  period: string;
  orders: number;
  revenue: number;
  deposits: number;
}

export interface OrderExportData {
  orderNumber: string;
  orderType: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  outletName: string;
  totalAmount: number;
  depositAmount: number;
  pickupPlanAt?: string;
  returnPlanAt?: string;
  pickedUpAt?: string;
  returnedAt?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

// ============================================================================
// NOTE: UI-specific types have been moved to order-display.ts
// API-specific types have been moved to order-api.ts
// This file now contains only core order types for database/domain logic
// ============================================================================

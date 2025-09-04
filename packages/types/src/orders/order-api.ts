// ============================================================================
// ORDER API TYPES - For API Requests/Responses
// ============================================================================

import { OrderStatus, OrderType } from './order';
import { OrderItemInput } from './order-items';

// ============================================================================
// SHARED API TYPES
// ============================================================================

/**
 * Standard API response wrapper
 * This matches the ApiResponse from @rentalshop/utils/common
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errorCode?: string;
}

// ============================================================================
// API REQUEST TYPES
// ============================================================================

/**
 * Create order request
 * Used in: POST /api/orders
 */
export interface CreateOrderRequest {
  orderType: OrderType;
  customerId?: number;           // Public ID
  outletId: number;              // Public ID
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
  orderItems: OrderItemInput[];
}

/**
 * Update order request
 * Used in: PUT /api/orders/[id]
 */
export interface UpdateOrderRequest extends Partial<CreateOrderRequest> {
  orderId?: number;              // Public ID for updates
  orderNumber?: string;          // For updates
  status?: OrderStatus;
  pickedUpAt?: Date;
  returnedAt?: Date;
}

/**
 * Order search/filter request
 * Used in: GET /api/orders
 */
export interface OrderSearchRequest {
  q?: string;                    // Search query
  outletId?: number;             // Public ID
  customerId?: number;           // Public ID
  merchantId?: number;           // Public ID
  orderType?: OrderType;
  status?: OrderStatus;
  startDate?: string;            // ISO date string
  endDate?: string;              // ISO date string
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // Special operations
  orderId?: number;              // Get specific order by public ID
  productId?: number;            // Get orders for specific product
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

// Note: ApiResponse<T> is imported from @rentalshop/utils/common

/**
 * Order list API response
 * Used in: GET /api/orders
 */
export interface OrderListApiResponse extends ApiResponse<{
  orders: OrderApiData[];
  total: number;
  totalPages: number;
  hasMore: boolean;
  currentPage: number;
}> {}

/**
 * Single order API response
 * Used in: GET /api/orders/[id]
 */
export interface OrderDetailApiResponse extends ApiResponse<OrderApiData> {}

/**
 * Order data from API (with CUIDs converted to public IDs)
 * Used in: All order API responses
 */
export interface OrderApiData {
  id: number;                    // Public ID (converted from CUID)
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  totalAmount: number;
  depositAmount: number;
  pickupPlanAt?: Date;
  returnPlanAt?: Date;
  pickedUpAt?: Date;
  returnedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isReadyToDeliver?: boolean;
  
  // Customer information
  customer?: {
    id: number;                  // Public ID
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
  };
  
  // Outlet information
  outlet: {
    id: number;                  // Public ID
    name: string;
  };
  
  // Order items
  orderItems: Array<{
    id: number;                  // Public ID
    orderId: number;             // Public ID
    productId: number;           // Public ID
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  
  // Payments
  payments: Array<{
    id: number;                  // Public ID
    orderId: number;             // Public ID
    amount: number;
    method: string;
    status: string;
    createdAt: Date;
  }>;
  
  // Additional fields
  damageFee?: number;
  securityDeposit?: number;
  collateralType?: string;
  collateralDetails?: string;
  notes?: string;
  pickupNotes?: string;
  returnNotes?: string;
  damageNotes?: string;
  discountType?: 'amount' | 'percentage';
  discountValue?: number;
  discountAmount?: number;
}

// ============================================================================
// API ERROR TYPES
// ============================================================================

/**
 * Order API error response
 * Uses the standard ApiResponse format with success: false
 */
export interface OrderApiError extends ApiResponse<never> {
  success: false;
  error: string;
  message?: string;
  code?: string;
  details?: Record<string, any>;
}

// ============================================================================
// API VALIDATION TYPES
// ============================================================================

/**
 * Order validation result
 */
export interface OrderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Order creation validation
 */
export interface OrderCreateValidation extends OrderValidationResult {
  customerExists?: boolean;
  outletExists?: boolean;
  productsAvailable?: boolean;
  sufficientStock?: boolean;
}

// ============================================================================
// ORDER ENTITY TYPES - CONSOLIDATED
// ============================================================================

import { 
  BaseEntity, 
  BaseEntityWithOutlet,
  BaseSearchParams,
  BaseSearchResult,
  BaseFormInput,
  BaseUpdateInput,
  EntityStatus,
  MerchantReference,
  OutletReference,
  CustomerReference,
  ProductReference,
  UserReference
} from '../common/base';

// ============================================================================
// ORDER ENUMS AND TYPES
// ============================================================================

/**
 * Order types - simplified to RENT and SALE only
 */
export type OrderType = 'RENT' | 'SALE';

/**
 * Order statuses - simplified status flow
 */
export type OrderStatus = 'RESERVED' | 'PICKUPED' | 'RETURNED' | 'COMPLETED' | 'CANCELLED';

// ============================================================================
// CORE ORDER INTERFACES
// ============================================================================

/**
 * Main Order interface - consolidated from multiple sources
 * Combines orders/order.ts and order-detail.ts definitions
 */
export interface Order extends BaseEntityWithOutlet {
  // Core order fields
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  customerId?: number; // Integer ID
  createdById: number; // Integer ID of user who created the order
  totalAmount: number;
  depositAmount: number;
  
  // Rental-specific fields
  pickupPlanAt?: Date | string;
  returnPlanAt?: Date | string;
  pickedUpAt?: Date | string;
  returnedAt?: Date | string;
  rentalDuration?: number; // Duration value (hours, days, or 1 for rental)
  rentalDurationUnit?: 'hour' | 'day' | 'rental'; // Unit for rentalDuration
  
  // Additional order details
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
  
  // Related entities (populated when needed)
  customer?: CustomerReference;
  outlet?: OutletReference;
  merchant?: MerchantReference;
  orderItems?: OrderItem[];
  payments?: Payment[];
  createdBy?: UserReference;
  
  // Flattened fields for API responses (when customer object is not included)
  customerName?: string;
  customerPhone?: string;
  outletName?: string;
  merchantName?: string;
  createdByName?: string;
}

// ============================================================================
// ORDER ITEM TYPES
// ============================================================================

/**
 * Order item interface
 * Used for order line items
 */
export interface OrderItem {
  id: number; // Auto-incrementing integer ID
  orderId: number; // Integer ID
  productId: number; // Integer ID
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deposit?: number;
  product?: ProductReference;
}

/**
 * Order item input interface
 * Used for creating/updating order items
 */
export interface OrderItemInput {
  productId: number; // Frontend sends id (number)
  quantity: number;
  unitPrice: number;
  totalPrice: number; // Added missing property
  deposit?: number;
  rentalDays?: number; // Added missing property
  notes?: string; // Added missing property
}

/**
 * Order item with product details
 * Used for order item displays
 */
export interface OrderItemWithProduct {
  id: number; // Auto-incrementing integer ID
  orderId: number; // Integer ID
  productId: number; // Integer ID
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deposit?: number;
  rentalDays?: number;
  notes?: string;
  product: ProductReference;
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

/**
 * Payment interface
 * Used for order payments
 */
export interface Payment {
  id: string; // Database CUID
  orderId: string; // Database CUID
  amount: number;
  method: string;
  status: string;
  transactionId?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Payment input interface
 * Used for creating new payments
 */
export interface PaymentInput {
  orderId: string; // Database CUID
  amount: number;
  method: string;
  status?: string;
  transactionId?: string;
}

/**
 * Payment update interface
 * Used for updating existing payments
 */
export interface PaymentUpdateInput {
  id: string; // Database CUID
  amount?: number;
  method?: string;
  status?: string;
  transactionId?: string;
}

// ============================================================================
// USER REFERENCE TYPE
// ============================================================================

// UserReference is now imported from common/base.ts

// ============================================================================
// ORDER FORM INPUTS
// ============================================================================

/**
 * Order creation input
 * Used for creating new orders
 */
export interface OrderCreateInput extends BaseFormInput {
  orderType: OrderType;
  customerId?: number; // Frontend sends id (number)
  outletId: number; // Frontend sends id (number)
  totalAmount: number;
  depositAmount?: number;
  pickupPlanAt?: Date | string;
  returnPlanAt?: Date | string;
  orderItems: OrderItemInput[];
}

/**
 * Order input interface
 * Unified interface for both creating and updating orders
 */
export interface OrderInput {
  // Optional fields for updates (backend generates if missing)
  orderId?: number; // For updates - existing order id
  orderNumber?: string; // For updates - existing order number
  
  // Core order fields
  orderType: OrderType;
  customerId?: number;
  outletId: number;
  createdById: number; // Required: ID of user who created the order
  pickupPlanAt?: Date | string;
  returnPlanAt?: Date | string;
  rentalDuration?: number;
  subtotal: number;
  taxAmount?: number;
  discountType?: 'amount' | 'percentage';
  discountValue?: number;
  discountAmount?: number;
  // Additional fields
  bailAmount?: number;
  material?: string;
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
  pickedUpAt?: Date | string;
  returnedAt?: Date | string;
}

/**
 * Order update input
 * Alias for OrderInput for backward compatibility
 */
export type OrderUpdateInput = OrderInput;

// ============================================================================
// ORDER SEARCH AND FILTERS
// ============================================================================

/**
 * Order search parameters
 * Extends base search with order-specific filters
 */
export interface OrderSearchParams extends BaseSearchParams {
  status?: OrderStatus | OrderStatus[]; // Support both single status and array of statuses
  orderType?: OrderType;
  outletId?: number;
  customerId?: number;
  productId?: number; // Filter orders by specific product
  startDate?: Date | string;
  endDate?: Date | string;
  pickupDate?: Date | string;
  returnDate?: Date | string;
  minAmount?: number;
  maxAmount?: number;
  isReadyToDeliver?: boolean;
  dateRange?: { start: string; end: string };
}

/**
 * Order search result
 * Used for order search responses
 */
export interface OrderSearchResult {
  id: number;           // Auto-incrementing integer ID
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  totalAmount: number;
  depositAmount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  pickupPlanAt: Date | string | null;
  returnPlanAt: Date | string | null;
  pickedUpAt: Date | string | null;
  returnedAt: Date | string | null;
  isReadyToDeliver: boolean;
  customer: {
    id: number;         // Auto-incrementing integer ID
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
  } | null;
  outlet: {
    id: number;         // Auto-incrementing integer ID
    name: string;
  };
  orderItems: OrderItemWithProduct[];
}

/**
 * Order search response
 * Used for API responses with pagination
 */
export interface OrderSearchResponse {
  success: boolean;
  data: {
    orders: OrderSearchResult[];
    total: number;
    page: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    totalPages: number;
  };
}

// ============================================================================
// ORDER WITH RELATIONS
// ============================================================================

/**
 * Order list item (minimal data for list views)
 * Flattened structure for better performance
 */
export interface OrderListItem {
  id: number;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  totalAmount: number;
  depositAmount: number;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  
  // Flattened customer data (simplified)
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  
  // Flattened outlet data (simplified)
  outletId: number;
  outletName?: string;
  merchantName?: string;
  
  // Flattened createdBy data
  createdById: number;
  createdByName?: string;
  
  // Order items with flattened product data
  orderItems: OrderItemFlattened[];
  
  // Calculated fields
  itemCount: number;
  paymentCount: number;
  totalPaid: number;
  
  // Rental-specific fields for list view
  pickupPlanAt?: Date | string;
  returnPlanAt?: Date | string;
}

/**
 * Order item with flattened product data
 * Used for order list views with simplified structure
 */
export interface OrderItemFlattened {
  id: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  // Flattened product data
  productId?: number;
  productName?: string;
  productBarcode?: string;
  productImages?: string[];
  productRentPrice?: number;
  productDeposit?: number;
}

/**
 * Order with details (full data for detail views)
 * Includes nested objects for comprehensive information
 */
export interface OrderWithDetails {
  id: number;           // Auto-incrementing integer ID
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  customerId?: number;  // Integer ID
  outletId: number;     // Integer ID
  createdById: number;  // Integer ID of user who created the order
  totalAmount: number;
  depositAmount: number;
  securityDeposit?: number;
  damageFee?: number;
  lateFee?: number;
  discountType?: 'amount' | 'percentage';
  discountValue?: number;
  discountAmount?: number;
  pickupPlanAt?: Date | string;
  returnPlanAt?: Date | string;
  pickedUpAt?: Date | string;
  returnedAt?: Date | string;
  rentalDuration?: number;
  isReadyToDeliver?: boolean;
  collateralType?: string;
  collateralDetails?: string;
  notes?: string;
  pickupNotes?: string;
  returnNotes?: string;
  damageNotes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  
  // Full nested objects
  customer?: CustomerReference;
  outlet: OutletReference;
  orderItems: OrderItemWithProduct[];
  payments: Payment[];
  createdBy?: UserReference;
  merchant: MerchantReference;
  
  // Timeline/audit log
  timeline?: OrderTimelineItem[];
  
  // Calculated fields
  itemCount: number;
  paymentCount: number;
  totalPaid: number;
}

/**
 * Order timeline item for audit log
 */
export interface OrderTimelineItem {
  id: number;
  action: string;
  description: string;
  oldValues?: any;
  newValues?: any;
  createdAt: Date | string;
  createdBy?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

// ============================================================================
// ORDER MANAGEMENT TYPES
// ============================================================================

/**
 * Order action type
 * Used for order management actions
 */
export type OrderAction = 'create' | 'edit' | 'view' | 'delete' | 'pickup' | 'return' | 'complete' | 'cancel';

/**
 * Order filters interface
 * Used for filtering orders in management views
 */
export interface OrderFilters {
  status?: OrderStatus | OrderStatus[];
  orderType?: OrderType;
  merchantId?: number; // Add merchant filtering support
  outletId?: number;
  customerId?: number;
  productId?: number;
  startDate?: Date | string;
  endDate?: Date | string;
  search?: string;
  pickupDate?: Date | string;
  returnDate?: Date | string;
  minAmount?: number;
  maxAmount?: number;
  isReadyToDeliver?: boolean;
  page?: number;
  limit?: number;
  offset?: number;  // Added missing offset property
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  outlet?: string;
  dateRange?: { start: string; end: string };
}

// ============================================================================
// ORDER ANALYTICS TYPES
// ============================================================================

/**
 * Order statistics interface
 * Used for order analytics and reporting
 */
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

/**
 * Order statistics by period
 * Used for time-based analytics
 */
export interface OrderStatsByPeriod {
  period: string;
  orders: number;
  revenue: number;
  deposits: number;
}

/**
 * Order history input
 * Used for order audit trails
 */
export interface OrderHistoryInput {
  orderId: number;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  notes?: string;
  userId?: string;
}

/**
 * Order export data
 * Used for order data export
 */
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
// ORDER LIST TYPES - FOR ADMIN/CLIENT APPS
// ============================================================================

/**
 * Order list data interface
 * Used for order list displays in admin/client apps
 */
export interface OrderListData {
  orders: OrderSearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  filters: OrderFilters;
}

/**
 * Orders data interface with stats
 * Used for Orders component with statistics
 */
export interface OrdersData {
  orders: OrderListItem[];
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  hasMore?: boolean;
  stats?: OrderStats;
}

/**
 * Order detail data interface
 * Used for detailed order views in admin/client apps
 */
export interface OrderDetailData {
  order: OrderWithDetails;
  relatedOrders: OrderSearchResult[];
  customerHistory: CustomerReference[];
  productHistory: ProductReference[];
}

/**
 * Order data interface for client components
 * Used for order displays in client apps
 */
export interface OrderData {
  id: number;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  depositAmount: number;
  pickupPlanAt?: Date | string;
  returnPlanAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  outletName: string;
  isReadyToDeliver: boolean;
}

// ============================================================================
// ORDER SEARCH FILTERS - FOR API COMPATIBILITY
// ============================================================================

/**
 * Order search filter
 * Used for order search operations in API
 */
export interface OrderSearchFilter {
  q?: string;
  outletId?: number;    // API queries use id (number)
  customerId?: number;  // API queries use id (number)
  userId?: number;      // API queries use id (number)
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

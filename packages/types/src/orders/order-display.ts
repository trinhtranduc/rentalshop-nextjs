// ============================================================================
// ORDER DISPLAY TYPES - For UI Components
// ============================================================================

import { Order, OrderStatus, OrderType, OrderStats } from './order';
import { OrderItemWithProduct } from './order-items';
import { Payment } from './payments';

// ============================================================================
// CORE ORDER DISPLAY TYPES
// ============================================================================

/**
 * Base order for listing/table display (minimal data)
 * Used in: OrderTable, OrderList, etc.
 */
export interface OrderListItem {
  id: number;                    // Public ID for frontend
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  customerName: string;          // Computed: firstName + lastName
  customerPhone: string;
  outletName: string;            // Computed from outlet
  merchantName: string;          // Computed from merchant
  totalAmount: number;
  depositAmount: number;
  createdAt: Date;
  pickupPlanAt?: Date;
  returnPlanAt?: Date;
  pickedUpAt?: Date;
  returnedAt?: Date;
  isReadyToDeliver?: boolean;
}

/**
 * Order for detailed view (comprehensive data)
 * Used in: OrderDetail, OrderView, etc.
 */
export interface OrderDetailView extends OrderListItem {
  // Customer details
  customer: {
    id: number;                  // Public ID
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
  } | null;
  
  // Outlet details
  outlet: {
    id: number;                  // Public ID
    name: string;
    address: string | null;
    merchantId: number;          // Public ID
    merchant: {
      id: number;                // Public ID
      name: string;
    };
  };
  
  // Order items with product details
  orderItems: Array<{
    id: number;                  // Public ID
    productId: number;           // Public ID
    product: {
      id: number;                // Public ID
      name: string;
      description?: string;
      images?: string | null;
      barcode?: string;
    };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
  }>;
  
  // Payment information
  payments: Array<{
    id: number;                  // Public ID
    amount: number;
    method: string;
    status: string;
    createdAt: Date;
  }>;
  
  // Creator information
  createdBy?: {
    id: number;                  // Public ID
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  
  // Additional order details
  damageFee?: number;
  securityDeposit?: number;
  collateralType?: string;
  collateralDetails?: string;
  notes?: string;
  pickupNotes?: string;
  returnNotes?: string;
  damageNotes?: string;
  
  // Discount information
  discountType?: 'amount' | 'percentage';
  discountValue?: number;
  discountAmount?: number;
  
  // Financial breakdown
  subtotal: number;
  taxAmount: number;
}

// ============================================================================
// ORDER COLLECTION TYPES
// ============================================================================

/**
 * Paginated order list response
 * Used in: OrderTable, OrderList with pagination
 */
export interface OrderListResponse {
  orders: OrderListItem[];
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  hasMore: boolean;
}

// Note: OrderStats is imported from './order' to avoid duplication

/**
 * Order list with statistics
 * Used in: Orders page, Order management
 */
export interface OrderListData extends OrderListResponse {
  stats: OrderStats;
}

// ============================================================================
// ORDER FILTER TYPES
// ============================================================================

/**
 * Filters for order listing/search
 * Used in: OrderTable, OrderList, OrderSearch
 */
export interface OrderListFilters {
  search?: string;
  status?: OrderStatus;
  orderType?: OrderType;
  outletId?: number;
  customerId?: number;
  merchantId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'orderNumber' | 'totalAmount' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// ORDER ACTION TYPES
// ============================================================================

/**
 * Order action handlers for UI components
 * Used in: OrderTable, OrderCard, etc.
 */
export interface OrderActionHandlers {
  onView?: (orderId: number) => void;
  onEdit?: (orderId: number) => void;
  onCancel?: (orderId: number) => void;
  onPickup?: (orderId: number) => void;
  onReturn?: (orderId: number) => void;
  onStatusChange?: (orderId: number, status: OrderStatus) => void;
  onRefresh?: () => void;
}

/**
 * Order detail action handlers
 * Used in: OrderDetail, OrderView
 */
export interface OrderDetailActionHandlers extends OrderActionHandlers {
  onSaveSettings?: (orderId: number, settings: OrderSettings) => void;
  onExport?: (orderId: number) => void;
  onPrint?: (orderId: number) => void;
}

/**
 * Order settings for detail view
 * Used in: OrderDetail settings panel
 */
export interface OrderSettings {
  damageFee: number;
  securityDeposit: number;
  collateralType: string;
  collateralDetails: string;
  notes: string;
  pickupNotes: string;
  returnNotes: string;
  damageNotes: string;
}

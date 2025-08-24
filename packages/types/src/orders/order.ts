// ============================================================================
// ORDER TYPES
// ============================================================================

import { OrderItemInput, OrderItemWithProduct } from './order-items';
import type { Payment } from './payments';

export type OrderType = 'RENT' | 'SALE' | 'RENT_TO_OWN';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'WAITING' | 'PICKUPED' | 'RETURNED' | 'CANCELLED' | 'ACTIVE' | 'COMPLETED' | 'OVERDUE' | 'DAMAGED';

export interface Order {
  id: string;
  publicId: number;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  customerId?: string;
  outletId: string;
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
}

export interface OrderCreateInput {
  orderType: OrderType;
  customerId?: string;
  outletId: string;
  totalAmount: number;
  depositAmount?: number;
  pickupPlanAt?: Date;
  returnPlanAt?: Date;
  orderItems: OrderItemInput[];
}

export interface OrderUpdateInput {
  status?: OrderStatus;
  pickupPlanAt?: Date;
  returnPlanAt?: Date;
  pickedUpAt?: Date;
  returnedAt?: Date;
  rentalDuration?: number;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
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
  isReadyToDeliver?: boolean;
  // Additional settings fields
  bailAmount?: number;
  material?: string;
  // Order items management
  orderItems?: Array<{
    id?: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    deposit?: number;
    notes?: string;
  }>;
}

export interface OrderFilters {
  status?: OrderStatus | OrderStatus[]; // Support both single status and array of statuses
  orderType?: OrderType;
  outletId?: string;
  customerId?: string;
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

// Additional order types for database operations
export interface OrderInput {
  orderType: OrderType;
  customerId?: string;
  outletId: string;
  pickupPlanAt?: Date;
  returnPlanAt?: Date;
  rentalDuration?: number;
  subtotal: number;
  taxAmount?: number;
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

export interface OrderUpdateInput {
  status?: OrderStatus;
  pickupPlanAt?: Date;
  returnPlanAt?: Date;
  pickedUpAt?: Date;
  returnedAt?: Date;
  rentalDuration?: number;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
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
  isReadyToDeliver?: boolean;
}

export interface OrderSearchResult {
  id: string;
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
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
  } | null;
  outlet: {
    id: string;
    name: string;
  };
}

// Extended order types for search and API responses
export interface OrderWithDetails extends Order {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
  } | null;
  outlet: {
    id: string;
    name: string;
    address: string | null;
    merchantId: string;
    merchant: {
      id: string;
      name: string;
    };
  };
  orderItems: OrderItemWithProduct[];
  payments: Payment[];
  // Add merchantId for backward compatibility with database package
  merchantId: string;
}

export interface OrderSearchFilter {
  q?: string;
  outletId?: string;
  customerId?: string;
  userId?: string;
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
  orderId: string;
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

// UI-specific types
export interface OrderData extends Order {
  customer?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  outlet?: {
    id: string;
    name: string;
    address: string;
    merchantId: string;
    merchant: {
      id: string;
      publicId: number;
      name: string;
      description?: string;
    };
  };
  // Additional properties that the UI components need
  customerName?: string;
  customerPhone?: string;
  outletName?: string;
  // Direct merchant access for convenience
  merchantId?: string;
  merchant?: {
    id: string;
    publicId: number;
    name: string;
    description?: string;
  };
}

// Orders component data structure
export interface OrdersData {
  orders: OrderData[];
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  stats: OrderStats;
}

export interface OrderDetailData extends OrderData {
  orderItems: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  // Additional properties for order details
  damageFee?: number;
  securityDeposit?: number;
  collateralType?: string;
  collateralDetails?: string;
  notes?: string;
}

export interface OrderDetailProps {
  order: OrderDetailData;
  onEdit?: (order: OrderDetailData) => void;
  onCancel?: (order: OrderDetailData) => void;
  onStatusChange?: (orderId: string, status: OrderStatus) => void;
  onPickup?: (orderId: string) => void;
  onReturn?: (orderId: string) => void;
  onSaveSettings?: (settings: SettingsForm) => void;
  loading?: boolean;
  showActions?: boolean;
}

export interface SettingsForm {
  damageFee: number;
  securityDeposit: number;
  collateralType: string;
  collateralDetails: string;
  notes: string;
  autoConfirm?: boolean;
  requireDeposit?: boolean;
  allowOverdue?: boolean;
}

import type {
  User,
  Merchant,
  Outlet,
  Category,
  Product,
  Customer,
  Order,
  OrderItem,
  Payment,
} from '@prisma/client';

// Customer Types
export interface CustomerWithMerchant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: Date;
  idNumber?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  merchantId: string;
  merchant: {
    id: string;
    name: string;
  };
}

export interface CustomerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: Date;
  idNumber?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  notes?: string;
  merchantId: string;
}

export interface CustomerUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: Date;
  idNumber?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  notes?: string;
  isActive?: boolean;
}

export interface CustomerFilters {
  merchantId?: string;
  isActive?: boolean;
  search?: string;
  city?: string;
  state?: string;
  country?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
}

export interface CustomerSearchFilter {
  q?: string;
  merchantId?: string;
  isActive?: boolean;
  city?: string;
  state?: string;
  country?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  limit?: number;
  offset?: number;
}

export interface CustomerSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: Date;
  idNumber?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  merchant: {
    id: string;
    name: string;
  };
}

export interface CustomerSearchResponse {
  success: boolean;
  data: {
    customers: CustomerSearchResult[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Product Types
export interface ProductSearchResult {
  id: string;
  name: string;
  description?: string;
  barcode?: string;
  stock: number;
  renting: number;
  available: number;
  rentPrice: number;
  salePrice?: number;
  deposit: number;
  images: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  outlet: {
    id: string;
    name: string;
    merchant: {
      id: string;
      companyName: string;
    };
  };
  category: {
    id: string;
    name: string;
  };
}

export interface ProductSearchResponse {
  success: boolean;
  data: {
    products: ProductSearchResult[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ProductSearchFilter {
  merchantId?: string;
  outletId?: string;
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
  isActive?: boolean;
}

export interface ProductInput {
  merchantId: string;
  categoryId: string;
  name: string;
  description?: string;
  barcode?: string;
  totalStock: number;
  rentPrice: number;
  salePrice?: number;
  deposit: number;
  images?: string;
  outletStock?: Array<{
    outletId: string;
    stock: number;
  }>;
}

export interface ProductUpdateInput {
  categoryId?: string;
  name?: string;
  description?: string;
  barcode?: string;
  totalStock?: number;
  rentPrice?: number;
  salePrice?: number;
  deposit?: number;
  images?: string;
  isActive?: boolean;
}

export interface OutletStockInput {
  productId: string;
  outletId: string;
  stock: number;
  available?: number;
  renting?: number;
}

export interface ProductWithStock {
  id: string;
  name: string;
  description?: string;
  barcode?: string;
  totalStock: number;
  rentPrice: number;
  salePrice?: number;
  deposit: number;
  images?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
  };
  merchant: {
    id: string;
    name: string;
  };
  outletStock: Array<{
    id: string;
    stock: number;
    available: number;
    renting: number;
    outlet: {
      id: string;
      name: string;
    };
  }>;
}

// Order Types
export type OrderType = 'RENT' | 'SALE' | 'RENT_TO_OWN';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE' | 'DAMAGED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DIGITAL_WALLET';
export type PaymentType = 'DEPOSIT' | 'RENTAL_FEE' | 'DAMAGE_FEE' | 'REFUND';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

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
  };
  orderItems: OrderItemWithProduct[];
  payments: Payment[];
}

export interface OrderItemWithProduct extends OrderItem {
  product: {
    id: string;
    name: string;
    description: string | null;
    images: string | null;
    barcode: string | null;
  };
}

export interface OrderInput {
  orderType: OrderType;
  customerId?: string;
  outletId: string;
  pickupPlanAt?: Date;
  returnPlanAt?: Date;
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  depositAmount?: number;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  orderItems: OrderItemInput[];
}

export interface OrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deposit?: number;
  notes?: string;
  startDate?: Date;
  endDate?: Date;
  daysRented?: number;
}

export interface OrderUpdateInput {
  status?: OrderStatus;
  pickupPlanAt?: Date;
  returnPlanAt?: Date;
  pickedUpAt?: Date;
  returnedAt?: Date;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
  depositAmount?: number;
  damageFee?: number;
  notes?: string;
  pickupNotes?: string;
  returnNotes?: string;
  damageNotes?: string;
}

export interface OrderFilters {
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
  limit?: number;
  offset?: number;
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

// Payment Types
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

// Order History Types
export interface OrderHistoryInput {
  orderId: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  notes?: string;
  userId?: string;
}

// Order Statistics
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

// Order Export Types
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
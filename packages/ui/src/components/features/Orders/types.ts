// ============================================================================
// ORDER LIST TYPES
// ============================================================================
export interface OrderData {
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  orders: Order[];
  stats: OrderStats;
}

export interface OrderStats {
  totalOrders: number;
  activeOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  revenueThisMonth: number;
  ordersThisMonth: number;
  totalDeposits: number;
  averageOrderValue: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerId: string;
  outletId: string;
  orderType: 'RENT' | 'SALE' | 'RENT_TO_OWN';
  totalAmount: number;
  depositAmount: number;
  createdAt: string;
  pickupPlanAt?: string;
  returnPlanAt?: string;
  orderItems: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    product: {
      id: string;
      name: string;
      description: string | null;
      images: string | null;
      barcode: string | null;
      productCode?: string;
    };
    note?: string;
    rentalDays?: number;
  }>;
}

export interface OrderFilters {
  search: string;
  status: string;
  orderType: string;
  outlet: string;
  dateRange: {
    start: string;
    end: string;
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// ============================================================================
// ORDER DETAIL TYPES
// ============================================================================
export interface OrderDetailData {
  id: string;
  orderNumber: string;
  orderType: 'RENT' | 'SALE' | 'RENT_TO_OWN';
  status: string;
  createdAt: string;
  updatedAt: string;
  pickupPlanAt?: string;
  returnPlanAt?: string;
  pickedUpAt?: string;
  returnedAt?: string;
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  depositAmount: number;
  securityDeposit?: number;    // Tiền thế chân (Security Deposit)
  damageFee?: number;
  lateFee?: number;            // Phí trễ hạn (Late Fee)
  rentalDuration?: number;     // Số ngày thuê (Rental Duration)
  notes?: string;
  pickupNotes?: string;
  returnNotes?: string;
  damageNotes?: string;
  collateralType?: string;     // Thế chân bằng tiền/giấy tờ
  collateralDetails?: string;  // Chi tiết thế chấp
  customer?: {
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
  orderItems: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    product: {
      id: string;
      name: string;
      description: string | null;
      images: string | null;
      barcode: string | null;
      productCode?: string;
    };
    note?: string;
    rentalDays?: number;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    createdAt: string;
  }>;
  // Computed fields from the API
  customerFullName?: string;
  customerContact?: string;
  totalItems?: number;
  isRental?: boolean;
  isOverdue?: boolean;
  daysOverdue?: number;
  paymentSummary?: {
    totalPaid: number;
    totalPending: number;
    totalFailed: number;
    remainingBalance: number;
  };
  statusTimeline?: Array<{
    status: string;
    timestamp: string;
    description: string;
  }>;
  // Additional fields for order management
  bailAmount?: number;
  material?: string;
}

export interface OrderDetailProps {
  order: OrderDetailData;
  onEdit?: () => void;
  onCancel?: (order: OrderDetailData) => void;
  onStatusChange?: (status: string) => void;
  onPickup?: (orderId: string, data: any) => void;
  onReturn?: (orderId: string, data: any) => void;
  onSaveSettings?: (data: any) => void;
  loading?: boolean;
  showActions?: boolean;
}

export interface SettingsForm {
  damageFee: number;          // Phí hư hỏng (Damage Fee)
  bailAmount: number;         // Tiền thế chân (Bail Amount)
  material: string;           // Vật liệu (Material)
  securityDeposit: number;    // Tiền thế chân (Security Deposit)
  collateralType: string;     // Thế chân bằng tiền/giấy tờ
  collateralDetails: string;  // Chi tiết thế chấp
  notes: string;              // Ghi chú chung
}

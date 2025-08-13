export interface Order {
  id: string;
  orderNumber: string;
  orderType: 'RENT' | 'SALE' | 'RENT_TO_OWN';
  status: 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'RETURNED';
  customerId: string;
  customerName: string;
  customerPhone: string;
  outletId: string;
  outletName: string;
  totalAmount: number;
  depositAmount: number;
  pickupPlanAt?: string;
  returnPlanAt?: string;
  pickedUpAt?: string;
  returnedAt?: string;
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItem[];
  payments: Payment[];
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productBarcode?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Payment {
  id: string;
  amount: number;
  method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'DIGITAL_WALLET';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  createdAt: string;
}

export interface OrderFilters {
  search: string;
  status: string;
  orderType: string;
  outlet: string;
  sortBy: 'orderNumber' | 'createdAt' | 'totalAmount' | 'customerName' | 'status';
  sortOrder: 'asc' | 'desc';
}

export interface OrderData {
  orders: Order[];
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  stats: OrderStats;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  totalDeposits: number;
  averageOrderValue: number;
  ordersThisMonth: number;
  revenueThisMonth: number;
}

export interface OrderAction {
  id: string;
  label: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'outline' | 'destructive';
  onClick: (orderId: string) => void;
}

export interface OrderStatus {
  value: string;
  label: string;
  color: string;
  description: string;
}

export interface OrderType {
  value: string;
  label: string;
  description: string;
}

import { Order, OrderFilters, OrderData, OrderStats, OrderDetailData, SettingsForm } from '@rentalshop/types';
import { ORDER_STATUS, getStatusColor, getStatusLabel } from '@rentalshop/constants';

export const filterOrders = (orders: OrderData[], filters: OrderFilters): OrderData[] => {
  return orders.filter(order => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        order.orderNumber.toLowerCase().includes(searchLower) ||
        (order.customerName?.toLowerCase().includes(searchLower) || false) ||
        (order.customerPhone?.toLowerCase().includes(searchLower) || false);
      
      if (!matchesSearch) return false;
    }
    
    // Status filter
    if (filters.status && order.status !== filters.status) {
      return false;
    }
    
    // Order type filter
    if (filters.orderType && order.orderType !== filters.orderType) {
      return false;
    }
    
    // Outlet filter
    if (filters.outletId && order.outlet?.id !== filters.outletId) {
      return false;
    }
    
    return true;
  });
};

/**
 * @deprecated DO NOT USE - Client-side sorting is dangerous with large datasets!
 * 
 * ⚠️ WARNING: Sorting 1M+ records in browser will:
 * - Freeze UI for 10-30 seconds
 * - Potentially crash browser (out of memory)
 * - Terrible user experience
 * 
 * ✅ INSTEAD: Use server-side sorting via API:
 * - ordersApi.search({ sortBy: 'orderNumber', sortOrder: 'desc' })
 * - Database handles sorting efficiently with indexes
 * - Only transfers paginated results (20-50 records)
 * 
 * This function is kept ONLY for backward compatibility with small datasets (< 100 records).
 * Use at your own risk!
 */
export const sortOrders = (orders: Order[], sortBy: string, sortOrder: 'asc' | 'desc'): Order[] => {
  // Safety check - prevent sorting large datasets
  if (orders.length > 1000) {
    console.error('❌ CRITICAL: Attempting to client-side sort', orders.length, 'orders!');
    console.error('❌ This will freeze the UI and may crash the browser!');
    console.error('✅ Use server-side sorting instead: ordersApi.search({ sortBy, sortOrder })');
    throw new Error(`Client-side sorting not supported for ${orders.length} records. Use server-side sorting.`);
  }
  
  if (orders.length > 100) {
    console.warn('⚠️ WARNING: Client-side sorting', orders.length, 'records may slow down UI');
    console.warn('✅ Consider using server-side sorting for better performance');
  }
  
  return [...orders].sort((a, b) => {
    let aValue: any;
    let bValue: any;
    
    switch (sortBy) {
      case 'orderNumber':
        aValue = a.orderNumber.toLowerCase();
        bValue = b.orderNumber.toLowerCase();
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case 'pickupPlanAt':
        aValue = a.pickupPlanAt ? new Date(a.pickupPlanAt).getTime() : 0;
        bValue = b.pickupPlanAt ? new Date(b.pickupPlanAt).getTime() : 0;
        break;
      case 'returnPlanAt':
        aValue = a.returnPlanAt ? new Date(a.returnPlanAt).getTime() : 0;
        bValue = b.returnPlanAt ? new Date(b.returnPlanAt).getTime() : 0;
        break;
      case 'totalAmount':
        aValue = a.totalAmount;
        bValue = b.totalAmount;
        break;
      case 'customerName':
        aValue = a.customerName.toLowerCase();
        bValue = b.customerName.toLowerCase();
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'orderType':
        aValue = a.orderType;
        bValue = b.orderType;
        break;
      default:
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });
};

export const paginateOrders = (orders: Order[], page: number, limit: number): OrderData => {
  const total = orders.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedOrders = orders.slice(startIndex, endIndex);
  
  return {
    orders: paginatedOrders,
    total,
    currentPage: page,
    totalPages,
    limit,
    stats: calculateOrderStats(orders) // This would need to be calculated from the full dataset
  };
};

export const calculateOrderStats = (orders: Order[]): OrderStats => {
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === ORDER_STATUS.RESERVED).length;
  const activeOrders = orders.filter(o => o.status === ORDER_STATUS.PICKUPED).length;
  const completedOrders = orders.filter(o => o.status === ORDER_STATUS.COMPLETED || o.status === ORDER_STATUS.RETURNED).length;
  const cancelledOrders = orders.filter(o => o.status === ORDER_STATUS.CANCELLED).length;
  
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalDeposits = orders.reduce((sum, o) => sum + o.depositAmount, 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const ordersThisMonth = orders.filter(o => 
    new Date(o.createdAt) >= thisMonth
  ).length;
  const revenueThisMonth = orders.filter(o => 
    new Date(o.createdAt) >= thisMonth
  ).reduce((sum, o) => sum + o.totalAmount, 0);
  
  return {
    totalOrders,
    pendingOrders,
    activeOrders,
    completedOrders,
    cancelledOrders,
    totalRevenue,
    totalDeposits,
    averageOrderValue,
    ordersThisMonth,
    revenueThisMonth
  };
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const getOrderStatusColor = (status: string): string => {
  return getStatusColor(status, 'order');
};

export const getOrderStatusBadge = (status: string): string => {
  return getStatusColor(status, 'order');
};

export const getOrderTypeBadge = (type: string): string => {
  const badges = {
    RENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    SALE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    RENT_TO_OWN: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
  };
  return badges[type as keyof typeof badges] || badges.RENT;
};

export const validateOrderData = (order: Partial<Order>): string[] => {
  const errors: string[] = [];
  
  if (!order.orderNumber || order.orderNumber.trim().length === 0) {
    errors.push('Order number is required');
  }
  
  if (!order.customerId || order.customerId.trim().length === 0) {
    errors.push('Customer is required');
  }
  
  if (!order.outletId || order.outletId.trim().length === 0) {
    errors.push('Outlet is required');
  }
  
  if (order.totalAmount === undefined || order.totalAmount < 0) {
    errors.push('Total amount must be a positive number');
  }
  
  if (order.depositAmount === undefined || order.depositAmount < 0) {
    errors.push('Deposit amount must be a positive number');
  }
  
  if (!order.orderItems || order.orderItems.length === 0) {
    errors.push('Order must contain at least one item');
  }
  
  return errors;
};

export const calculateOrderTotal = (orderItems: any[]): number => {
  return orderItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
};

export const isOrderOverdue = (order: Order): boolean => {
  if (order.status !== ORDER_STATUS.PICKUPED || !order.returnPlanAt) return false;
  
  const returnDate = new Date(order.returnPlanAt);
  const now = new Date();
  return now > returnDate;
};

export const getDaysUntilReturn = (order: Order): number | null => {
  if (order.status !== ORDER_STATUS.PICKUPED || !order.returnPlanAt) return null;
  
  const returnDate = new Date(order.returnPlanAt);
  const now = new Date();
  const diffTime = returnDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

export const calculateCollectionAmount = (order: OrderDetailData, settingsForm: SettingsForm): number => {
  if (order.orderType === 'RENT') {
    if (order.status === ORDER_STATUS.RESERVED) {
      return settingsForm.bailAmount || 0;
    } else if (order.status === ORDER_STATUS.PICKUPED) {
      return (settingsForm.bailAmount || 0) - (settingsForm.damageFee || 0);
    }
  }
  return 0;
};

export const getCollectionTitle = (order: OrderDetailData): string => {
  if (order.orderType === 'RENT') {
    if (order.status === ORDER_STATUS.RESERVED) {
      return 'Bail Amount';
    } else if (order.status === ORDER_STATUS.PICKUPED) {
      return 'Collection Amount';
    }
  }
  return 'Collection';
};

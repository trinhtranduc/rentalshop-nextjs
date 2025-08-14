import { Customer, CustomerFilters, CustomerData, CustomerStats } from './types';

export const filterCustomers = (customers: Customer[], filters: CustomerFilters): Customer[] => {
  return customers.filter(customer => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(searchLower) ||
        customer.email.toLowerCase().includes(searchLower) ||
        customer.phone.toLowerCase().includes(searchLower) ||
        (customer.companyName && customer.companyName.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;
    }
    
    // Status filter
    if (filters.status && customer.status !== filters.status) {
      return false;
    }
    
    return true;
  });
};

export const sortCustomers = (customers: Customer[], sortBy: string, sortOrder: 'asc' | 'desc'): Customer[] => {
  return [...customers].sort((a, b) => {
    let aValue: any;
    let bValue: any;
    
    switch (sortBy) {
      case 'name':
        aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
        bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
        break;
      case 'orders':
        aValue = a.totalOrders;
        bValue = b.totalOrders;
        break;
      case 'spent':
        aValue = a.totalSpent;
        bValue = b.totalSpent;
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case 'lastOrder':
        aValue = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
        bValue = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
        break;
      default:
        aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
        bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });
};

export const paginateCustomers = (customers: Customer[], page: number, limit: number): CustomerData => {
  const total = customers.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedCustomers = customers.slice(startIndex, endIndex);
  
  return {
    customers: paginatedCustomers,
    total,
    currentPage: page,
    totalPages,
    limit,
    stats: calculateCustomerStats(customers) // This would need to be calculated from the full dataset
  };
};

export const calculateCustomerStats = (customers: Customer[]): CustomerStats => {
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const inactiveCustomers = customers.filter(c => c.status === 'inactive').length;
  const blockedCustomers = customers.filter(c => c.status === 'blocked').length;
  
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const newCustomersThisMonth = customers.filter(c => 
    new Date(c.createdAt) >= thisMonth
  ).length;
  
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const averageOrderValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
  
  const topCustomers = customers
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)
    .map(c => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      totalSpent: c.totalSpent,
      totalOrders: c.totalOrders,
      lastOrderDate: c.lastOrderDate || c.createdAt
    }));
  
  return {
    totalCustomers,
    activeCustomers,
    inactiveCustomers,
    blockedCustomers,
    newCustomersThisMonth,
    totalRevenue,
    averageOrderValue,
    topCustomers
  };
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
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

export const getCustomerStatusColor = (status: string): string => {
  const colors = {
    active: 'text-green-600 dark:text-green-400',
    inactive: 'text-gray-600 dark:text-gray-400',
    blocked: 'text-red-600 dark:text-red-400'
  };
  return colors[status as keyof typeof colors] || colors.inactive;
};

export const getCustomerStatusBadge = (status: string): string => {
  const badges = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    blocked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  };
  return badges[status as keyof typeof badges] || badges.inactive;
};

export const getMembershipBadge = (level: string): string => {
  const badges = {
    basic: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    premium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    vip: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
  };
  return badges[level as keyof typeof badges] || badges.basic;
};

export const validateCustomerData = (customer: Partial<Customer>): string[] => {
  const errors: string[] = [];
  
  if (!customer.firstName || customer.firstName.trim().length === 0) {
    errors.push('First name is required');
  }
  
  if (!customer.lastName || customer.lastName.trim().length === 0) {
    errors.push('Last name is required');
  }
  
  if (!customer.email || customer.email.trim().length === 0) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    errors.push('Invalid email format');
  }
  
  if (!customer.phone || customer.phone.trim().length === 0) {
    errors.push('Phone number is required');
  }
  
  if (customer.totalOrders !== undefined && customer.totalOrders < 0) {
    errors.push('Total orders cannot be negative');
  }
  
  if (customer.totalSpent !== undefined && customer.totalSpent < 0) {
    errors.push('Total spent cannot be negative');
  }
  
  return errors;
};

export const searchCustomers = (customers: Customer[], query: string): Customer[] => {
  if (!query.trim()) return customers;
  
  const searchLower = query.toLowerCase();
  return customers.filter(customer => 
    `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(searchLower) ||
    customer.email.toLowerCase().includes(searchLower) ||
    customer.phone.toLowerCase().includes(searchLower) ||
    (customer.companyName && customer.companyName.toLowerCase().includes(searchLower))
  );
};

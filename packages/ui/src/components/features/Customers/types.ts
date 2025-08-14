export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  status: 'active' | 'inactive' | 'blocked';
  membershipLevel: 'basic' | 'premium' | 'vip';
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFilters {
  search: string;
  status: string;
}

export interface CustomerData {
  customers: Customer[];
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  stats: CustomerStats;
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  blockedCustomers: number;
  newCustomersThisMonth: number;
  totalRevenue: number;
  averageOrderValue: number;
  topCustomers: TopCustomer[];
}

export interface TopCustomer {
  id: string;
  name: string;
  totalSpent: number;
  totalOrders: number;
  lastOrderDate: string;
}

export interface CustomerAction {
  id: string;
  label: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'outline' | 'destructive';
  onClick: (customerId: string) => void;
}

export interface CustomerSearchResult {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  totalOrders: number;
}

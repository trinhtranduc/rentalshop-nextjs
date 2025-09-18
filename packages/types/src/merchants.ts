export interface Merchant {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  businessType?: string;
  taxId?: string;
  website?: string;
  description?: string;
  isActive: boolean;
  subscriptionPlan?: string;
  subscriptionStatus: 'active' | 'trial' | 'expired' | 'cancelled';
  outletsCount: number;
  usersCount: number;
  productsCount: number;
  totalRevenue: number;
  createdAt: string;
  lastActiveAt?: string;
  // Enhanced plan and subscription info
  plan?: {
    id: number;
    name: string;
    description: string;
    basePrice: number;
    currency: string;
    trialDays: number;
    maxOutlets: number;
    maxUsers: number;
    maxProducts: number;
    maxCustomers: number;
    features: string[];
    isActive: boolean;
    isPopular: boolean;
  };
  currentSubscription?: {
    id: number;
    status: string;
    startDate: string;
    endDate?: string;
    nextBillingDate?: string;
    amount: number;
    currency: string;
    autoRenew: boolean;
    plan?: {
      id: number;
      name: string;
      basePrice: number;
      currency: string;
    };
    planVariant?: {
      id: number;
      name: string;
      duration: number;
      price: number;
      discount: number;
      savings: number;
    };
  };
}

export interface MerchantStats {
  totalOutlets: number;
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
}

import type { Outlet } from './outlets';
import type { User } from './users';
import type { Product } from './products';
import type { Order } from './orders';

export interface MerchantDetailData {
  merchant: Merchant;
  outlets?: Outlet[];
  users?: User[];
  products?: Product[];
  orders?: Order[];
  stats: MerchantStats;
}

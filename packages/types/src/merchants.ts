export interface Merchant {
  id: number;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  subscriptionPlan: string;
  subscriptionStatus: 'active' | 'trial' | 'expired' | 'cancelled';
  trialEndsAt?: string;
  outletsCount: number;
  usersCount: number;
  productsCount: number;
  totalRevenue: number;
  createdAt: string;
  lastActiveAt: string;
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
  outlets: Outlet[];
  users: User[];
  products: Product[];
  orders: Order[];
  stats: MerchantStats;
}

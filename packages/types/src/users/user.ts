// ============================================================================
// USER TYPES
// ============================================================================

import { UserRole } from '../auth/roles';

export interface User {
  id: number;        // This represents the publicId from database
  firstName: string;
  lastName: string;
  name: string; // Computed field: firstName + lastName
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date | string; // Accept both Date objects and ISO strings from API
  emailVerified: boolean;
  updatedAt: Date | string; // Accept both Date objects and ISO strings from API
  merchantId?: string | number; // Accept both string and number from API
  outletId?: string | number;  // Accept both string and number from API
  lastLoginAt?: Date | string; // Accept both Date objects and ISO strings from API
  
  // Additional fields from API response
  merchant?: {
    id: number;                 // publicId
    name: string;
    email?: string;
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
    planId?: string;
    subscriptionStatus?: string;
    totalRevenue?: number;
    createdAt: Date | string;
    lastActiveAt?: Date | string;
  };
  outlet?: {
    id: number;                 // publicId
    name: string;
    address?: string;
    phone?: string;
    description?: string;
    isActive: boolean;
    isDefault: boolean;
    createdAt: Date | string;
    merchant?: {
      id: number;               // publicId
      name: string;
    };
  };
}

export interface UserCreateInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  merchantId?: string;
  outletId?: string;
}

export interface UserUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface UserFilters {
  role?: UserRole;
  merchantId?: string;
  outletId?: string;
  isActive?: boolean;
  status?: 'all' | 'active' | 'inactive';  // Added missing status property
  search?: string;
  page?: number;
  limit?: number;
}

export interface UserSearchResult {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

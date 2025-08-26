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
  createdAt: Date;
  emailVerified: boolean;
  updatedAt: Date;
  merchantId?: string | number; // Accept both string and number from API
  outletId?: string | number;  // Accept both string and number from API
  lastLoginAt?: Date;
  
  // Additional fields from API response
  merchant?: {
    id: string | number;
    name: string;
  };
  outlet?: {
    id: string | number;
    name: string;
    merchant?: {
      id: string | number;
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
  search?: string;
}

export interface UserSearchResult {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

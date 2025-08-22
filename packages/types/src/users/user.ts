// ============================================================================
// USER TYPES
// ============================================================================

import { UserRole } from '../auth/roles';

export interface User {
  id: string;
  publicId: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  merchantId?: string;
  outletId?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreateInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  merchantId?: string;
  outletId?: string;
}

export interface UserUpdateInput {
  name?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  merchantId?: string;
  outletId?: string;
  isActive?: boolean;
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

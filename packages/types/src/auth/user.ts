// ============================================================================
// USER AUTHENTICATION TYPES
// ============================================================================

import { UserRole } from './roles';

export interface AuthUser {
  id: string;
  publicId: string;
  email: string;
  name: string;
  role: UserRole;
  merchantId?: string;
  outletId?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
  user: AuthUser;
  token: string;
  expiresAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
  merchantId?: string;
  outletId?: string;
}

export interface PasswordReset {
  email: string;
  token: string;
  newPassword: string;
}

export interface ChangePassword {
  currentPassword: string;
  newPassword: string;
}

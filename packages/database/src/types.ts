import type {
  User,
  Merchant,
  Outlet,
  OutletStaff,
  Admin,
  Category,
  Product,
  Customer,
  Rental,
  Payment,
  Notification,
  PasswordResetToken,
  EmailVerificationToken,
  Session,
} from '@prisma/client';

// Customer Types
export interface CustomerWithMerchant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: Date;
  idNumber?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  merchantId: string;
  merchant: {
    id: string;
    companyName: string;
  };
}

export interface CustomerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: Date;
  idNumber?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  notes?: string;
  merchantId: string;
}

export interface CustomerUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: Date;
  idNumber?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  notes?: string;
  isActive?: boolean;
}

export interface CustomerFilters {
  merchantId?: string;
  isActive?: boolean;
  search?: string;
  city?: string;
  state?: string;
  country?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
}

export interface CustomerSearchFilter {
  q?: string;
  merchantId?: string;
  isActive?: boolean;
  city?: string;
  state?: string;
  country?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  limit?: number;
  offset?: number;
}

export interface CustomerSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: Date;
  idNumber?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  merchant: {
    id: string;
    companyName: string;
  };
}

export interface CustomerSearchResponse {
  success: boolean;
  data: {
    customers: CustomerSearchResult[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
} 
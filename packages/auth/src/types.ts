export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: import('@rentalshop/constants').UserRole; // ✅ Type safe with enum
}

export interface AuthUser {
  id: number; // id for frontend compatibility
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
  phone?: string;
  merchantId?: number; // For quick access to merchant ID
  outletId?: number;   // For quick access to outlet ID
  permissions?: string[]; // Custom permissions from UserPermission table
  merchant?: {
    id: number;
    name: string;
    description?: string;
    tenantKey?: string; // Include tenantKey for referral link
    referralLink?: string; // Referral code (same as tenantKey)
    publicProductLink?: string; // Public product link URL
  };
  outlet?: {
    id: number;
    name: string;
    address?: string;
    merchant?: {
      id: number;
      name: string;
      tenantKey?: string; // Include tenantKey for referral link
      referralLink?: string; // Referral code (same as tenantKey)
      publicProductLink?: string; // Public product link URL
    };
    defaultBankAccount?: {
      id: number;
      accountHolderName: string;
      accountNumber: string;
      bankName: string;
      bankCode?: string;
      branch?: string;
      isDefault: boolean;
      qrCode?: string;
      notes?: string;
      isActive: boolean;
      outletId: number;
    };
  };
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
} 
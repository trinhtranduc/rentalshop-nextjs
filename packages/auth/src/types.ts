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
  merchant?: {
    id: number;
    name: string;
    description?: string;
  };
  outlet?: {
    id: number;
    name: string;
    address?: string;
  };
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
} 
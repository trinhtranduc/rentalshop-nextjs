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
  role?: 'CLIENT' | 'SHOP_OWNER' | 'ADMIN';
}

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
  phone?: string;
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
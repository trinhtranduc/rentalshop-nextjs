export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: 'CLIENT' | 'SHOP_OWNER' | 'ADMIN';
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  avatar?: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
} 
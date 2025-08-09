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
  role?: 'USER' | 'ADMIN';
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
  phone?: string;
  merchant?: {
    id: string;
    name: string;
    description?: string;
  };
  outlet?: {
    id: string;
    name: string;
    address?: string;
  };
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
} 
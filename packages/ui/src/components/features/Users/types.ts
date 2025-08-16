export interface User {
  id: string;
  publicId: number | null; // Public ID for user-friendly URLs (nullable for users without valid publicId)
  name: string;
  email: string;
  phone: string; // Phone is now required due to database constraint
  role: 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
  isActive: boolean;
  createdAt: string;
  merchant?: {
    id: string;
    companyName: string;
  };
  admin?: {
    id: string;
    level: string;
  };
  outletStaff?: Array<{
    id: string;
    role: string;
    outlet: {
      id: string;
      name: string;
      merchant: {
        id: string;
        companyName: string;
      };
    };
  }>;
}

export interface UserCreateInput {
  name: string;
  email: string;
  phone: string; // Phone is now required due to database constraint
  role: 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
  isActive: boolean;
  password: string;
}

export interface UserUpdateInput {
  name?: string;
  email?: string;
  phone?: string; // Phone is required due to database constraint, but optional for updates
  role?: 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
  isActive?: boolean;
}

export interface UserFilters {
  search: string;
  role: string;
  merchant: string;
}

export interface UserData {
  users: User[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

export interface UserAction {
  type: 'view' | 'edit' | 'delete' | 'activate' | 'deactivate';
  userId: string;
}

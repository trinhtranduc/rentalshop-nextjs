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
  merchantId?: string; // Required for MERCHANT, OUTLET_ADMIN, OUTLET_STAFF roles
  outletId?: string; // Required for OUTLET_ADMIN and OUTLET_STAFF roles
}

export interface UserUpdateInput {
  name?: string;
  email?: string;
  phone?: string;
  role?: 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
  isActive?: boolean;
  merchantId?: string;
  outletId?: string;
}

export interface UserRole {
  value: 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
  label: string;
  description: string;
  permissions: string[];
}

export const USER_ROLES: UserRole[] = [
  {
    value: 'ADMIN',
    label: 'System Administrator',
    description: 'Full system access, can manage all merchants, outlets, and users',
    permissions: [
      'Manage all merchants and outlets',
      'Manage all users system-wide',
      'Access system-wide analytics',
      'Configure system settings',
      'View all data across the platform'
    ]
  },
  {
    value: 'MERCHANT',
    label: 'Merchant Owner',
    description: 'Business owner who can manage their merchant organization and outlets',
    permissions: [
      'Manage their own merchant organization',
      'Create and manage multiple outlets',
      'Manage users within their organization',
      'Access organization-wide analytics',
      'Configure business settings'
    ]
  },
  {
    value: 'OUTLET_ADMIN',
    label: 'Outlet Administrator',
    description: 'Outlet manager with full access to their assigned outlet',
    permissions: [
      'Manage their assigned outlet',
      'Manage outlet staff and users',
      'Manage products and inventory',
      'Access outlet-specific analytics',
      'Process orders and payments'
    ]
  },
  {
    value: 'OUTLET_STAFF',
    label: 'Outlet Staff',
    description: 'Regular staff member with limited access to their assigned outlet',
    permissions: [
      'View outlet information',
      'Process basic orders',
      'Check product availability',
      'Access limited outlet data',
      'Basic customer service functions'
    ]
  }
];

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

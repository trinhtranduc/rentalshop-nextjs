export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'CLIENT' | 'MERCHANT' | 'OUTLET_STAFF' | 'ADMIN';
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

export interface UserFilters {
  search: string;
  role: string;
  merchant: string;
  outlet: string;
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

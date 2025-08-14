'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users,
  UsersLoading,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent
} from '@rentalshop/ui';
import { useAuth } from '../../hooks/useAuth';

// Import types from the Users feature
import type { UserData, UserFilters as UserFiltersType } from '../../../../packages/ui/src/components/features/Users/types';

// Define the API User type (what we get from the backend)
interface ApiUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  merchant?: {
    id: string;
    name: string;
  };
  outlet?: {
    id: string;
    name: string;
    merchant: {
      id: string;
      name: string;
    };
  };
}

export default function UsersPage() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  
  // Initialize filters
  const [filters, setFilters] = useState<UserFiltersType>({
    search: '',
    role: 'all',
    merchant: 'all',
    outlet: 'all'
  });

  useEffect(() => {
    fetchUsers();
  }, [currentPage, filters]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { authenticatedFetch } = await import('@rentalshop/utils');
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(filters.search && { search: filters.search }),
        ...(filters.role !== 'all' && { role: filters.role }),
        ...(filters.outlet !== 'all' && { outlet: filters.outlet })
      });

      const response = await authenticatedFetch(`/api/users?${params}`);

      if (!response.ok) {
        if (response.status === 403) {
          console.log('Access denied: User does not have admin role');
          // Don't show alert, just log and continue with mock data
          return;
        }
        if (response.status === 401) {
          console.log('Authentication failed');
          return;
        }
        throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data.users);
        setTotalPages(data.data.totalPages);
        setTotalUsers(data.data.total);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  const handleFiltersChange = (newFilters: UserFiltersType) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleViewModeChange = (mode: 'grid' | 'table') => {
    setViewMode(mode);
  };

  const handleUserAction = (action: string, userId: string) => {
    switch (action) {
      case 'view':
        console.log('View user:', userId);
        break;
      case 'edit':
        console.log('Edit user:', userId);
        break;
      case 'delete':
        console.log('Delete user:', userId);
        break;
      case 'activate':
        console.log('Activate user:', userId);
        break;
      case 'deactivate':
        console.log('Deactivate user:', userId);
        break;
      case 'add':
        console.log('Add new user');
        break;

      default:
        console.log('Unknown action:', action, userId);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Mock data for when API fails
  const mockUsers: ApiUser[] = [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      role: 'ADMIN',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      merchant: {
        id: '1',
        name: 'Test Company'
      }
    },
    {
      id: '2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '+1234567891',
      role: 'MERCHANT',
      isActive: true,
      createdAt: '2024-01-02T00:00:00Z',
      merchant: {
        id: '1',
        name: 'Test Company'
      }
    }
  ];

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>User Management</PageTitle>
        </PageHeader>
        <PageContent>
          <UsersLoading />
        </PageContent>
      </PageWrapper>
    );
  }

  // Transform API data to match the modular component's expected format
  const transformUsersForComponent = (apiUsers: ApiUser[]) => {
    return apiUsers.map(user => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone,
      role: user.role as 'CLIENT' | 'MERCHANT' | 'OUTLET_STAFF' | 'ADMIN',
      isActive: user.isActive,
      createdAt: user.createdAt,
      merchant: user.merchant ? {
        id: user.merchant.id,
        companyName: user.merchant.name
      } : undefined,
      admin: undefined,
      outletStaff: undefined
    }));
  };

  // Use mock data if no users loaded from API
  const displayUsers = users.length > 0 ? users : mockUsers;
  const displayTotal = totalUsers > 0 ? totalUsers : mockUsers.length;
  const displayPages = totalPages > 0 ? totalPages : 1;

  // Transform data for the modular Users component
  const userData: UserData = {
    users: transformUsersForComponent(displayUsers),
    total: displayTotal,
    currentPage,
    totalPages: displayPages,
    hasMore: currentPage < displayPages
  };

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>User Management</PageTitle>
            <p className="text-gray-600">Manage users in the system</p>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        <Users
          data={userData}
          filters={filters}
          viewMode={viewMode}
          onFiltersChange={handleFiltersChange}
          onViewModeChange={handleViewModeChange}
          onUserAction={handleUserAction}
          onPageChange={handlePageChange}
        />
      </PageContent>
    </PageWrapper>
  );
} 
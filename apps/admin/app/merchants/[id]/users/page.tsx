'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Users,
  Button
} from '@rentalshop/ui';
import { ArrowLeft } from 'lucide-react';
import type { User, UserFilters } from '@rentalshop/types';

interface UserData {
  users: User[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

export default function MerchantUsersPage() {
  const params = useParams();
  const router = useRouter();
  const merchantId = params.id as string;
  
  const [userData, setUserData] = useState<UserData>({
    users: [],
    total: 0,
    currentPage: 1,
    totalPages: 1,
    hasMore: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UserFilters>({
    limit: 20,
    offset: 0
  });
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  useEffect(() => {
    fetchUsers();
  }, [merchantId, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        setError('Authentication required');
        return;
      }

      // Build query string
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.role) queryParams.append('role', filters.role);
      if (filters.status) queryParams.append('isActive', filters.status === 'active' ? 'true' : 'false');
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
      if (filters.offset) queryParams.append('offset', filters.offset.toString());

      const response = await fetch(`http://localhost:3002/api/merchants/${merchantId}/users?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserData({
            users: data.data.users || [],
            total: data.data.total || 0,
            currentPage: Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1,
            totalPages: Math.ceil((data.data.total || 0) / (filters.limit || 20)),
            hasMore: (filters.offset || 0) + (filters.limit || 20) < (data.data.total || 0)
          });
        } else {
          setError(data.message || 'Failed to fetch users');
        }
      } else {
        console.error('Failed to fetch users');
        // Fallback to mock data for now
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
      // Fallback to mock data for now
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters: UserFilters) => {
    setFilters(newFilters);
  };

  const handleSearchChange = (searchValue: string) => {
    setFilters(prev => ({ ...prev, search: searchValue, offset: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({ limit: 20, offset: 0 });
  };

  const handleViewModeChange = (mode: 'grid' | 'table') => {
    setViewMode(mode);
  };

  const handleUserAction = (action: string, userId: string) => {
    switch (action) {
      case 'view':
        router.push(`/merchants/${merchantId}/users/${userId}`);
        break;
      case 'edit':
        router.push(`/merchants/${merchantId}/users/${userId}/edit`);
        break;
      case 'add':
        router.push(`/merchants/${merchantId}/users/add`);
        break;
      default:
        console.log('User action:', action, userId);
    }
  };

  const handlePageChange = (page: number) => {
    const newOffset = (page - 1) * (filters.limit || 20);
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const handleUserCreated = async (userInput: any) => {
    // Handle user creation - would typically make API call
    console.log('User created:', userInput);
    await fetchUsers(); // Refresh the list
  };

  const handleUserUpdated = async (user: User) => {
    // Handle user update - would typically make API call
    console.log('User updated:', user);
    await fetchUsers(); // Refresh the list
  };

  const handleError = (error: string) => {
    setError(error);
  };

  if (loading) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="animate-pulse">
            <div className="h-8 bg-bg-tertiary rounded w-1/4 mb-6"></div>
            <div className="h-12 bg-bg-tertiary rounded mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-bg-tertiary rounded"></div>
              ))}
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium mb-2">Error Loading Users</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {error}
            </p>
            <button
              onClick={() => router.push(`/merchants/${merchantId}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Back to Merchant
            </button>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/merchants/${merchantId}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Merchant
            </Button>
            <PageTitle subtitle={`Manage users for merchant ${merchantId}`}>
              Merchant Users
            </PageTitle>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        <Users
          data={userData}
          filters={filters}
          viewMode={viewMode}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onViewModeChange={handleViewModeChange}
          onUserAction={handleUserAction}
          onPageChange={handlePageChange}
          onUserCreated={handleUserCreated}
          onUserUpdated={handleUserUpdated}
          onError={handleError}
        />
      </PageContent>
    </PageWrapper>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { getAuthToken } from '@rentalshop/utils';
import { useParams, useRouter } from 'next/navigation';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Outlets,
  Button
} from '@rentalshop/ui';
import { ArrowLeft } from 'lucide-react';
import type { Outlet, OutletData, OutletFilters } from '@rentalshop/types';

interface OutletData {
  outlets: Outlet[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

interface OutletFilters {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export default function MerchantOutletsPage() {
  const params = useParams();
  const router = useRouter();
  const merchantId = params.id as string;
  
  const [outletData, setOutletData] = useState<OutletData>({
    outlets: [],
    total: 0,
    currentPage: 1,
    totalPages: 1,
    hasMore: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OutletFilters>({
    limit: 20,
    offset: 0
  });
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  useEffect(() => {
    fetchOutlets();
  }, [merchantId, filters]);

  const fetchOutlets = async () => {
    try {
      setLoading(true);
      
      // Get auth token from localStorage
      const token = getAuthToken();
      if (!token) {
        console.error('No auth token found');
        setError('Authentication required');
        return;
      }

      // Build query string
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.status) queryParams.append('isActive', filters.status === 'active' ? 'true' : 'false');
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
      if (filters.offset) queryParams.append('offset', filters.offset.toString());

      const response = await fetch(`http://localhost:3002/api/merchants/${merchantId}/outlets?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOutletData({
            outlets: data.data.outlets || [],
            total: data.data.total || 0,
            currentPage: Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1,
            totalPages: Math.ceil((data.data.total || 0) / (filters.limit || 20)),
            hasMore: (filters.offset || 0) + (filters.limit || 20) < (data.data.total || 0)
          });
        } else {
          setError(data.message || 'Failed to fetch outlets');
        }
      } else {
        console.error('Failed to fetch outlets');
        // Fallback to mock data for now
      }
    } catch (error) {
      console.error('Error fetching outlets:', error);
      setError('Failed to fetch outlets');
      // Fallback to mock data for now
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value, offset: 0 }));
  };

  const handleStatusFilter = (value: string) => {
    // Convert 'all' to undefined for the API
    const statusValue = value === 'all' ? undefined : value;
    setFilters(prev => ({ ...prev, status: statusValue, offset: 0 }));
  };

  const handlePageChange = (page: number) => {
    const newOffset = (page - 1) * (filters.limit || 20);
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const handleViewOutlet = (outletId: number) => {
    router.push(`/merchants/${merchantId}/outlets/${outletId}`);
  };

  const handleEditOutlet = (outletId: number) => {
    router.push(`/merchants/${merchantId}/outlets/${outletId}/edit`);
  };

  const handleFiltersChange = (newFilters: OutletFilters) => {
    setFilters(newFilters);
  };

  const handleSearchChange = (searchValue: string) => {
    setFilters(prev => ({ ...prev, search: searchValue }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: undefined,
      status: undefined,
      limit: 20,
      offset: 0
    });
  };

  const handleViewModeChange = (mode: 'grid' | 'table') => {
    setViewMode(mode);
  };

  const handleOutletAction = (action: string, outletId: number) => {
    switch (action) {
      case 'view':
        router.push(`/merchants/${merchantId}/outlets/${outletId}`);
        break;
      case 'edit':
        router.push(`/merchants/${merchantId}/outlets/${outletId}`);
        break;
      case 'add':
        // TODO: Implement add outlet functionality
        console.log('Add outlet clicked');
        break;
      default:
        console.log('Unknown action:', action);
    }
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
            <h3 className="text-lg font-medium mb-2">Error Loading Outlets</h3>
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
            <PageTitle subtitle={`Manage outlets for merchant ${merchantId}`}>
              Merchant Outlets
            </PageTitle>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        <Outlets
          data={outletData}
          filters={filters}
          viewMode={viewMode}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onViewModeChange={handleViewModeChange}
          onOutletAction={handleOutletAction}
          onPageChange={handlePageChange}
          merchantId={merchantId}
        />
      </PageContent>
    </PageWrapper>
  );
}

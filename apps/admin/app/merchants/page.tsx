'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Merchants,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent
} from '@rentalshop/ui';
import { merchantsApi, type Merchant as ApiMerchant } from '@rentalshop/utils';
import type { Merchant } from '@rentalshop/types';

export default function MerchantsPage() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [totalMerchants, setTotalMerchants] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchMerchants();
  }, []);

  // Ensure merchants is always an array
  useEffect(() => {
    if (!Array.isArray(merchants)) {
      setMerchants([]);
    }
  }, [merchants]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, planFilter]);

  // Convert API response to expected type
  const convertApiMerchantToMerchant = (apiMerchant: ApiMerchant): Merchant => {
    return {
      id: apiMerchant.id,
      name: apiMerchant.name,
      email: apiMerchant.email || '',
      phone: apiMerchant.phone,
      address: apiMerchant.address,
      isActive: apiMerchant.isActive,
      subscriptionPlan: apiMerchant.planId,
      subscriptionStatus: (apiMerchant.subscriptionStatus as 'active' | 'trial' | 'expired' | 'cancelled') || 'trial',
      trialEndsAt: apiMerchant.trialEndsAt ? String(apiMerchant.trialEndsAt) : undefined,
      outletsCount: 0, // Default values - these would come from a separate API call
      usersCount: 0,
      productsCount: 0,
      totalRevenue: apiMerchant.totalRevenue || 0,
      createdAt: String(apiMerchant.createdAt),
      lastActiveAt: apiMerchant.lastActiveAt ? String(apiMerchant.lastActiveAt) : undefined,
    };
  };

  const fetchMerchants = async () => {
    try {
      setLoading(true);
      
      // Use centralized API client with automatic authentication and error handling
      const response = await merchantsApi.getMerchants();
      
      if (response.success && response.data) {
        // Convert API response to expected type
        const convertedMerchants = (response.data.merchants || []).map(convertApiMerchantToMerchant);
        setMerchants(convertedMerchants);
        setTotalMerchants(response.data.total || 0);
      } else {
        console.error('Failed to fetch merchants:', response.error);
        // Set empty state on error
        setMerchants([]);
        setTotalMerchants(0);
      }
    } catch (error) {
      console.error('Error fetching merchants:', error);
      // Set empty state on error
      setMerchants([]);
      setTotalMerchants(0);
    } finally {
      setLoading(false);
    }
  };

  const filteredMerchants = (merchants || []).filter(merchant => {
    const matchesSearch = merchant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (merchant.email && merchant.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && merchant.isActive) ||
                         (statusFilter === 'inactive' && !merchant.isActive);
    const matchesPlan = planFilter === 'all' || merchant.subscriptionPlan === planFilter;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredMerchants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMerchants = filteredMerchants.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFiltersChange = (filters: { search: string; status: string; plan: string }) => {
    setSearchTerm(filters.search);
    setStatusFilter(filters.status);
    setPlanFilter(filters.plan);
  };

  const handleSearchChange = (searchValue: string) => {
    setSearchTerm(searchValue);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPlanFilter('all');
    setSortBy('name');
    setSortOrder('asc');
  };

  const handleSort = (column: string) => {
    const newSortBy = column;
    const newSortOrder = sortBy === newSortBy && sortOrder === 'asc' ? 'desc' : 'asc';
    
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  const handleMerchantAction = (action: string, merchantId: number) => {
    switch (action) {
      case 'view':
        router.push(`/merchants/${merchantId}`);
        break;
      case 'edit':
        router.push(`/merchants/${merchantId}/edit`);
        break;
      case 'change-plan':
        // This will be handled by the Merchants component
        console.log('Change plan for merchant:', merchantId);
        break;
      default:
        console.log('Merchant action:', action, merchantId);
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

  // Prepare data for Merchants component
  const merchantsData = {
    merchants: paginatedMerchants,
    total: filteredMerchants.length,
    currentPage,
    totalPages,
    stats: {
      totalMerchants: totalMerchants || merchants.length,
      activeMerchants: (merchants || []).filter(m => m.isActive).length,
      trialAccounts: (merchants || []).filter(m => m.subscriptionStatus === 'trial').length,
      totalRevenue: (merchants || []).reduce((sum, m) => sum + m.totalRevenue, 0)
    }
  };

  const filters = {
    search: searchTerm,
    status: statusFilter,
    plan: planFilter,
    sortBy,
    sortOrder
  };

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle subtitle="Manage all merchants across the platform">
          Merchant Management
        </PageTitle>
      </PageHeader>

      <PageContent>
        <Merchants
          data={merchantsData}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onMerchantAction={handleMerchantAction}
          onPageChange={handlePageChange}
          onSort={handleSort}
        />
      </PageContent>
    </PageWrapper>
  );
}

"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePagination } from './usePagination';
import { customersApi } from '@rentalshop/utils';
import type { Customer, CustomerFilters as CustomerFiltersType, CustomerCreateInput, CustomerUpdateInput } from '@rentalshop/types';

export interface UseCustomerManagementOptions {
  initialLimit?: number;
  useSearchCustomers?: boolean; // true for admin (searchCustomers), false for client (getCustomersPaginated)
  enableStats?: boolean; // true for admin, false for client
  merchantId?: number; // Optional merchant ID for filtering
  outletId?: number; // Optional outlet ID for filtering
}

export interface UseCustomerManagementReturn {
  // State
  customers: Customer[];
  loading: boolean;
  searchTerm: string;
  cityFilter: string;
  stateFilter: string;
  countryFilter: string;
  idTypeFilter: string;
  statusFilter: string;
  selectedCustomer: Customer | null;
  showCustomerDetail: boolean;
  showCreateForm: boolean;
  showEditDialog: boolean;
  pagination: any;
  
  // Actions
  setSearchTerm: (term: string) => void;
  setCityFilter: (city: string) => void;
  setStateFilter: (state: string) => void;
  setCountryFilter: (country: string) => void;
  setIdTypeFilter: (idType: string) => void;
  setStatusFilter: (status: string) => void;
  setSelectedCustomer: (customer: Customer | null) => void;
  setShowCustomerDetail: (show: boolean) => void;
  setShowCreateForm: (show: boolean) => void;
  setShowEditDialog: (show: boolean) => void;
  
  // Handlers
  fetchCustomers: (page?: number) => Promise<void>;
  handleViewCustomer: (customer: Customer) => void;
  handleEditCustomer: (customer: Customer) => void;
  handleToggleStatus: (customer: Customer) => void;
  handleCustomerUpdated: (updatedCustomer: Customer) => void;
  handleCustomerError: (error: string) => void;
  handleCustomerRowAction: (action: string, customerId: number) => void;
  handleAddCustomer: () => void;
  handleExportCustomers: () => void;
  handleFiltersChange: (newFilters: CustomerFiltersType) => void;
  handleSearchChange: (searchValue: string) => void;
  handleClearFilters: () => void;
  handlePageChangeWithFetch: (page: number) => void;
  handleCustomerCreated: (customerData: CustomerCreateInput) => Promise<void>;
  handleCustomerUpdatedAsync: (customerData: CustomerUpdateInput) => Promise<void>;
  
  // Computed values
  filteredCustomers: Customer[];
  filters: CustomerFiltersType;
  stats?: any;
}

export const useCustomerManagement = (options: UseCustomerManagementOptions = {}): UseCustomerManagementReturn => {
  const router = useRouter();
  const {
    initialLimit = 10,
    useSearchCustomers = false,
    enableStats = false,
    merchantId,
    outletId
  } = options;

  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [idTypeFilter, setIdTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Pagination state using shared hook
  const { pagination, handlePageChange, updatePaginationFromResponse } = usePagination({
    initialLimit
  });

  // Fetch customers function
  const fetchCustomers = useCallback(async (page: number = pagination.currentPage) => {
    try {
      setLoading(true);
      
      let response;
      
      if (useSearchCustomers) {
        // Admin page uses searchCustomers with filters
        const filters: CustomerFiltersType = {
          search: searchTerm || undefined,
          city: cityFilter || undefined,
          state: stateFilter || undefined,
          country: countryFilter || undefined,
          idType: idTypeFilter !== 'all' ? (idTypeFilter as any) : undefined,
          isActive: statusFilter !== 'all' ? (statusFilter === 'active') : undefined,
          merchantId: merchantId,
          outletId: outletId
        };
        
        response = await customersApi.searchCustomers(filters);
      } else {
        // Client page uses getCustomersPaginated
        response = await customersApi.getCustomersPaginated(page, pagination.limit);
      }
      
      if (response.success && response.data) {
        if (useSearchCustomers) {
          // searchCustomers returns Customer[] directly
          const customersData = Array.isArray(response.data) ? response.data : [];
          setCustomers(customersData);
          
          // For search, we don't have pagination info, so use current pagination
          updatePaginationFromResponse({
            total: customersData.length,
            limit: pagination.limit,
            offset: (page - 1) * pagination.limit,
            hasMore: false
          });
        } else {
          // getCustomersPaginated returns CustomersResponse with nested structure
          const customersResponse = response.data as any;
          const customersData = customersResponse.customers || [];
          const total = customersResponse.total || 0;
          const totalPagesCount = customersResponse.totalPages || 1;
          
          setCustomers(customersData);
          
          // Update pagination state using the hook
          updatePaginationFromResponse({
            total,
            limit: pagination.limit,
            offset: (page - 1) * pagination.limit,
            hasMore: page < totalPagesCount
          });
        }
      } else {
        console.error('API Error:', response.error);
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.limit, searchTerm, cityFilter, stateFilter, countryFilter, idTypeFilter, statusFilter, useSearchCustomers, merchantId, outletId, updatePaginationFromResponse]);

  // Initial fetch
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Refetch customers when filters change (reset to page 1)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handlePageChange(1);
      fetchCustomers(1);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, cityFilter, stateFilter, countryFilter, idTypeFilter, statusFilter, handlePageChange, fetchCustomers]);

  // Filter customers based on current filters
  const filteredCustomers = useMemo(() => {
    if (useSearchCustomers) {
      // Admin page: API handles filtering, return all customers
      return customers;
    } else {
      // Client page: Apply local filtering
      return (customers || []).filter(customer => {
        if (!customer || typeof customer !== 'object') {
          return false;
        }
        
        const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
        const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (customer.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (customer.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (customer.address || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCity = !cityFilter || (customer.city || '').toLowerCase().includes(cityFilter.toLowerCase());
        const matchesState = !stateFilter || (customer.state || '').toLowerCase().includes(stateFilter.toLowerCase());
        const matchesCountry = !countryFilter || (customer.country || '').toLowerCase().includes(countryFilter.toLowerCase());
        const matchesIdType = idTypeFilter === 'all' || customer.idType === idTypeFilter;
        const matchesStatus = statusFilter === 'all' || 
                             (statusFilter === 'active' && customer.isActive) ||
                             (statusFilter === 'inactive' && !customer.isActive);
        
        return matchesSearch && matchesCity && matchesState && matchesCountry && 
               matchesIdType && matchesStatus;
      });
    }
  }, [customers, searchTerm, cityFilter, stateFilter, countryFilter, idTypeFilter, statusFilter, useSearchCustomers]);

  // Calculate stats if enabled
  const stats = useMemo(() => {
    if (!enableStats) return undefined;
    
    const customersArray = customers || [];
    const totalCustomers = customersArray.length;
    const activeCustomers = customersArray.filter(c => c.isActive).length;
    const inactiveCustomers = customersArray.filter(c => !c.isActive).length;
    const customersWithEmail = customersArray.filter(c => c.email && c.email.trim() !== '').length;
    const customersWithAddress = customersArray.filter(c => c.address && c.address.trim() !== '').length;
    
    return { 
      totalCustomers, 
      activeCustomers, 
      inactiveCustomers, 
      customersWithEmail,
      customersWithAddress
    };
  }, [customers, enableStats]);

  // Create filters object for components
  const filters: CustomerFiltersType = useMemo(() => ({
    search: searchTerm,
    city: cityFilter || undefined,
    state: stateFilter || undefined,
    country: countryFilter || undefined,
    idType: idTypeFilter !== 'all' ? idTypeFilter as any : undefined,
    isActive: statusFilter !== 'all' ? (statusFilter === 'active') : undefined,
    merchantId: merchantId,
    outletId: outletId
  }), [searchTerm, cityFilter, stateFilter, countryFilter, idTypeFilter, statusFilter, merchantId, outletId]);

  // Event handlers
  const handleViewCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDetail(true);
  }, []);

  const handleEditCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setShowEditDialog(true);
  }, []);

  const handleToggleStatus = useCallback(async (customer: Customer) => {
    try {
      // Use updateCustomer to toggle the isActive status
      const response = await customersApi.updateCustomer(customer.id, {
        isActive: !customer.isActive
      });
      
      if (response.success) {
        fetchCustomers(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to update customer status');
      }
    } catch (error) {
      console.error('Error updating customer status:', error);
    }
  }, [fetchCustomers]);

  const handleCustomerUpdated = useCallback((updatedCustomer: Customer) => {
    setShowEditDialog(false);
    setShowCustomerDetail(false);
    fetchCustomers(); // Refresh the list to get the latest data
  }, [fetchCustomers]);

  const handleCustomerError = useCallback((error: string) => {
    console.error('Customer operation error:', error);
  }, []);

  const handleCustomerRowAction = useCallback((action: string, customerId: number) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    switch (action) {
      case 'view':
        handleViewCustomer(customer);
        break;
      case 'edit':
        handleEditCustomer(customer);
        break;
      case 'viewOrders':
        // Navigate to customer orders page
        console.log('🔄 Navigating to customer orders page:', `/customers/${customerId}/orders`);
        router.push(`/customers/${customerId}/orders`);
        break;
      case 'activate':
      case 'deactivate':
        handleToggleStatus(customer);
        break;
      case 'delete':
        // Handle delete action
        console.log('Delete customer:', customerId);
        break;
      default:
        console.log('Unknown action:', action);
    }
  }, [customers, handleViewCustomer, handleEditCustomer, handleToggleStatus]);

  const handleAddCustomer = useCallback(() => {
    setShowCreateForm(true);
  }, []);

  const handleExportCustomers = useCallback(() => {
    // TODO: Implement export functionality
    console.log('Export functionality coming soon!');
  }, []);

  const handleFiltersChange = useCallback((newFilters: CustomerFiltersType) => {
    setCityFilter(newFilters.city || '');
    setStateFilter(newFilters.state || '');
    setCountryFilter(newFilters.country || '');
    setIdTypeFilter(newFilters.idType || 'all');
    setStatusFilter(newFilters.isActive !== undefined ? (newFilters.isActive ? 'active' : 'inactive') : 'all');
    handlePageChange(1);
  }, [handlePageChange]);

  const handleSearchChange = useCallback((searchValue: string) => {
    setSearchTerm(searchValue);
    handlePageChange(1);
  }, [handlePageChange]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setCityFilter('');
    setStateFilter('');
    setCountryFilter('');
    setIdTypeFilter('all');
    setStatusFilter('all');
    handlePageChange(1);
  }, [handlePageChange]);

  const handlePageChangeWithFetch = useCallback((page: number) => {
    handlePageChange(page);
    fetchCustomers(page);
  }, [handlePageChange, fetchCustomers]);

  const handleCustomerCreated = useCallback(async (customerData: CustomerCreateInput) => {
    try {
      const response = await customersApi.createCustomer(customerData);
      if (response.success) {
        setShowCreateForm(false);
        fetchCustomers(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error; // Re-throw to let the form handle the error
    }
  }, [fetchCustomers]);

  const handleCustomerUpdatedAsync = useCallback(async (customerData: CustomerUpdateInput) => {
    if (!selectedCustomer) return;
    
    try {
      const response = await customersApi.updateCustomer(selectedCustomer.id, customerData);
      if (response.success) {
        setShowEditDialog(false);
        fetchCustomers(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to update customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error; // Re-throw to let the form handle the error
    }
  }, [selectedCustomer, fetchCustomers]);

  return {
    // State
    customers,
    loading,
    searchTerm,
    cityFilter,
    stateFilter,
    countryFilter,
    idTypeFilter,
    statusFilter,
    selectedCustomer,
    showCustomerDetail,
    showCreateForm,
    showEditDialog,
    pagination,
    
    // Actions
    setSearchTerm,
    setCityFilter,
    setStateFilter,
    setCountryFilter,
    setIdTypeFilter,
    setStatusFilter,
    setSelectedCustomer,
    setShowCustomerDetail,
    setShowCreateForm,
    setShowEditDialog,
    
    // Handlers
    fetchCustomers,
    handleViewCustomer,
    handleEditCustomer,
    handleToggleStatus,
    handleCustomerUpdated,
    handleCustomerError,
    handleCustomerRowAction,
    handleAddCustomer,
    handleExportCustomers,
    handleFiltersChange,
    handleSearchChange,
    handleClearFilters,
    handlePageChangeWithFetch,
    handleCustomerCreated,
    handleCustomerUpdatedAsync,
    
    // Computed values
    filteredCustomers,
    filters,
    stats
  };
};

'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Button, 
  Customers,
  CustomersLoading,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  ConfirmationDialog,
  ToastContainer
} from '@rentalshop/ui';
import { UserPlus } from 'lucide-react';
import { useAuth } from '@rentalshop/hooks';
import { useToasts } from '@rentalshop/ui';
import { PaginationResult, Customer, CustomerFilters } from '@rentalshop/types';
const { customersApi } = await import('@rentalshop/utils');

// Extend the Customer type for this page
interface ExtendedCustomer {
  id: string;
  publicId: number; // Change to number to match Customer type
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string; // Add missing zipCode field
  country?: string;
  dateOfBirth?: string;
  idNumber?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  notes?: string;
  isActive: boolean;
  merchant: {
    id: string;
    name: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export default function CustomersPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // State for customers and UI
  const [customers, setCustomers] = useState<ExtendedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  
  // Caching state
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [cacheKey, setCacheKey] = useState<string>('');
  
  // Confirmation dialog state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<ExtendedCustomer | null>(null);
  
  // Initialize filters
  const [filters, setFilters] = useState<CustomerFilters>({
    search: '',
    status: 'active', // Default to active customers since backend filters inactive by default
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // Separate search state to prevent unnecessary re-renders
  const [searchQuery, setSearchQuery] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const hasInitializedRef = useRef(false);
  const { toasts, showSuccess, showError, removeToast } = useToasts();

  const fetchCustomers = useCallback(async () => {
    try {
      // Check authentication first
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      console.log('🔐 Auth token exists:', !!token);
      
      if (!token) {
        console.error('❌ No authentication token found');
        setError('Please log in to view customers');
        showError('Authentication Error', 'Please log in to view customers');
        return;
      }

      // Create cache key based on current filters and page
      const newCacheKey = JSON.stringify({ 
        searchQuery, 
        currentPage, 
        filters: { 
          status: filters.status, 
          sortBy: filters.sortBy, 
          sortOrder: filters.sortOrder 
        } 
      });
      
      // Check if we can use cached data (cache valid for 30 seconds)
      const now = Date.now();
      const cacheValid = (now - lastFetchTime) < 30000 && cacheKey === newCacheKey;
      
      if (cacheValid && customers.length > 0) {
        console.log('✅ Using cached customer data');
        return;
      }
      
      console.log('🔄 Fetching fresh customer data...');
      setCacheKey(newCacheKey);
      setLastFetchTime(now);

      // Show appropriate loading state
      if (searchQuery !== undefined && hasInitializedRef.current) {
        setLoading(true); // Table-only loading for search operations
      } else if (!isInitialLoad) {
        setLoading(true); // Full page loading for other operations
      }

      // Build API parameters for customersApi.getCustomers()
      const apiFilters: {
        limit: number;
        sortBy?: string;
        sortOrder?: string;
        offset?: number;
        search?: string;
        page?: number;
        isActive?: boolean;
      } = {
        limit: 10,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };

      if (searchQuery) {
        // Search endpoint - use offset-based pagination
        apiFilters.offset = (currentPage - 1) * 10; // Convert page to offset
        apiFilters.search = searchQuery;
      } else {
        // Standard listing endpoint - use page-based pagination
        apiFilters.page = currentPage;
      }

      // Only pass isActive filter when explicitly requesting inactive customers
      if (filters.status === 'inactive') {
        apiFilters.isActive = false;
      } else if (filters.status === 'blocked') {
        apiFilters.isActive = false; // Blocked customers are also inactive
      }

      console.log('🔍 Fetching customers with filters:', apiFilters);
      const response = await customersApi.getCustomers(apiFilters);
      console.log('📡 API Response:', response);
      console.log('📡 API Response.data:', response.data);
      console.log('📡 API Response.data.customers:', response.data?.customers);
      console.log('📡 API Response.data.total:', response.data?.total);
      console.log('📡 API Response.data.totalPages:', response.data?.totalPages);

      if (response.success && response.data) {
        console.log('📊 Raw response data structure:', response.data);
        
        // Handle the nested API response structure
        // API returns: { success: true, data: { customers: [...], total: 60, ... } }
        let customers, total, totalPages;
        
        // Check if data has the expected structure
        if (response.data && typeof response.data === 'object' && 'data' in response.data) {
          // Nested structure: response.data.data.customers
          const nestedData = (response.data as any).data;
          customers = nestedData?.customers || [];
          total = nestedData?.total || customers.length;
          totalPages = nestedData?.totalPages || Math.ceil(total / 10);
          
          console.log('✅ Found nested data structure');
        } else if (response.data && typeof response.data === 'object' && 'customers' in response.data) {
          // Direct structure: response.data.customers
          customers = (response.data as any).customers || [];
          total = (response.data as any).total || customers.length;
          totalPages = (response.data as any).totalPages || Math.ceil(total / 10);
          
          console.log('✅ Found direct data structure');
        } else {
          // Fallback: check for any array in the response
          console.warn('⚠️ Unexpected response structure, searching for customer data...');
          
          // Try to find customers array in any nested object
          const findCustomersArray = (obj: any): any[] | null => {
            if (Array.isArray(obj)) {
              // Check if this array contains customer-like objects
              if (obj.length > 0 && obj[0]?.firstName && obj[0]?.lastName) {
                return obj;
              }
            } else if (obj && typeof obj === 'object') {
              for (const key in obj) {
                const result = findCustomersArray(obj[key]);
                if (result) return result;
              }
            }
            return null;
          };
          
          customers = findCustomersArray(response.data) || [];
          total = customers.length;
          totalPages = Math.ceil(total / 10);
          
          if (customers.length > 0) {
            console.log('✅ Found customers array in nested structure');
          } else {
            console.error('❌ No customers array found in response');
          }
        }
        
        console.log('📊 Processed data:', { 
          customers: customers?.length || 0, 
          total, 
          totalPages,
          sampleCustomer: customers?.[0] 
        });
        
        // Validate customer data structure
        if (customers && customers.length > 0) {
          const firstCustomer = customers[0];
          console.log('🔍 Sample customer structure:', {
            hasId: !!firstCustomer.id,
            hasPublicId: !!firstCustomer.publicId,
            hasFirstName: !!firstCustomer.firstName,
            hasLastName: !!firstCustomer.lastName,
            hasEmail: !!firstCustomer.email,
            hasPhone: !!firstCustomer.phone,
            hasMerchant: !!firstCustomer.merchant,
            keys: Object.keys(firstCustomer)
          });
        }
        
        // Check if customers array is empty and log the full response
        if (!customers || customers.length === 0) {
          console.warn('⚠️ Customers array is empty! Full response data:', response.data);
          console.warn('⚠️ Response data keys:', Object.keys(response.data || {}));
          
          // Try to find any useful information in the response
          if (response.data && typeof response.data === 'object' && 'data' in response.data) {
            const nestedData = (response.data as any).data;
            console.warn('⚠️ Nested data keys:', Object.keys(nestedData || {}));
          }
          
          // Set empty state
          setCustomers([]);
          setTotalPages(1);
          setTotalCustomers(0);
          return;
        }
        
        setCustomers(customers);
        setTotalPages(totalPages);
        setTotalCustomers(total);
        
        // If current page is beyond total pages after search, reset to page 1
        if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(1);
        }
      } else {
        console.error('❌ API response failed:', response);
        console.error('❌ Response success:', response.success);
        console.error('❌ Response data:', response.data);
        console.error('❌ Response error:', response.error);
        throw new Error(response.error || 'Failed to fetch customers');
      }
    } catch (error) {
      console.error('❌ Error fetching customers:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load customers';
      setError(errorMessage);
      showError('Fetch Error', errorMessage);
    } finally {
      setLoading(false);
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  }, [currentPage, searchQuery, filters.status, filters.sortBy, filters.sortOrder, setCustomers, setTotalPages, setTotalCustomers, setLoading, isInitialLoad, hasInitializedRef, customers, lastFetchTime, cacheKey]);

  // Effect for initial load - only runs once
  useEffect(() => {
    fetchCustomers();
    // Mark as initialized after first load
    hasInitializedRef.current = true;
  }, []); // Remove fetchCustomers dependency

  // Effect for all data changes - intelligently handles search vs. other operations
  useEffect(() => {
    if (hasInitializedRef.current) {
      fetchCustomers();
    }
  }, [searchQuery, currentPage, filters.status, filters.sortBy, filters.sortOrder]); // Remove fetchCustomers dependency

  // Separate handler for search changes - only updates search state
  const handleSearchChange = useCallback((searchValue: string) => {
    setSearchQuery(searchValue);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  // Handler for other filter changes - only reloads table data
  const handleFiltersChange = useCallback((newFilters: CustomerFilters) => {
    // Check if the filters actually changed to prevent unnecessary updates
    const hasChanged = Object.keys(newFilters).some(key => 
      newFilters[key as keyof CustomerFilters] !== filters[key as keyof CustomerFilters]
    );
    
    if (hasChanged) {
      setFilters(newFilters);
      setCurrentPage(1); // Reset to first page when filters change
    }
  }, [filters]);

  // Handler for clearing all filters - only reloads table data
  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      status: 'active', // Default to active customers since backend filters inactive by default
      sortBy: 'name',
      sortOrder: 'asc'
    });
    setSearchQuery(''); // This will trigger the search effect to reload table
    setCurrentPage(1);
    // Don't call fetchCustomers directly - let the search effect handle it
  }, []);

  const handleCustomerAction = useCallback(async (action: string, customerId?: string) => {
    if (!customerId) {
      console.warn('Customer action called without customerId');
      return;
    }
    
    switch (action) {
      case 'edit':
        // Navigate to customer edit page
        console.log('🔍 CustomersPage: Edit customer:', customerId);
        // Find the customer to get their public ID
        const customerToEdit = customers.find(c => c.id === customerId);
        if (customerToEdit && customerToEdit.publicId) {
          router.push(`/customers/${customerToEdit.publicId}/edit`);
        } else {
          console.error('❌ CustomersPage: Customer not found or missing public ID:', customerId);
          showError('Navigation Error', 'Customer not found or missing public ID');
        }
        break;
      case 'delete':
        // Handle delete
        if (confirm('Are you sure you want to delete this customer?')) {
          try {
            const { authenticatedFetch } = await import('@rentalshop/utils');
            const response = await authenticatedFetch(`/api/customers/${customerId}`, {
              method: 'DELETE'
            });
            
            if (response.ok) {
              // Refresh the customer list
              fetchCustomers();
            } else {
              console.error('Failed to delete customer');
              showError('Delete Failed', 'Failed to delete customer. Please try again.');
            }
          } catch (error) {
            console.error('Error deleting customer:', error);
            showError('Delete Error', 'An error occurred while deleting the customer');
          }
        }
        break;
      case 'view':
        // Navigate to customer detail page
        console.log('🔍 CustomersPage: View customer:', customerId);
        // Find the customer to get their public ID
        const customer = customers.find(c => c.id === customerId);
        if (customer && customer.publicId) {
          router.push(`/customers/${customer.publicId}`);
        } else {
          console.error('❌ CustomersPage: Customer not found or missing public ID:', customerId);
          showError('Navigation Error', 'Customer not found or missing public ID');
        }
        break;
      default:
        console.log('Unknown action:', action);
    }
  }, [customers, router, fetchCustomers]);

  // Handle customer deletion - show confirmation dialog first
  const handleDeleteCustomer = useCallback((customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setCustomerToDelete(customer);
      setShowDeleteConfirm(true);
    }
  }, [customers]);

  // Handle confirmed customer deletion
  const handleConfirmDelete = useCallback(async () => {
    if (!customerToDelete) return;
    
    try {
      console.log('🔍 CustomersPage: Deleting customer:', customerToDelete.id);
      
      // Call the delete API
      const response = await customersApi.deleteCustomer(customerToDelete.id);
      
      if (response.success) {
        console.log('✅ CustomersPage: Customer deleted successfully');
        
        // Remove the customer from the local state
        setCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
        setTotalCustomers(prev => prev - 1);
        
        // Show success toast
        showSuccess('Customer Deleted', 'Customer has been deleted successfully!');
      } else {
        console.error('❌ CustomersPage: Failed to delete customer:', response.error);
        // Show error toast
        showError('Delete Failed', response.error || 'Failed to delete customer');
      }
      
    } catch (error) {
      console.error('❌ CustomersPage: Error deleting customer:', error);
      // Show error toast
      showError('Delete Error', error instanceof Error ? error.message : 'An unexpected error occurred while deleting the customer');
    } finally {
      // Close the confirmation dialog
      setShowDeleteConfirm(false);
      setCustomerToDelete(null);
    }
  }, [customerToDelete]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSort = useCallback((column: string) => {
    // Map column names to sort values
    const columnMapping: Record<string, 'name' | 'orders' | 'spent' | 'createdAt' | 'lastOrder'> = {
      'name': 'name',
      'contact': 'name', // Sort by name for contact column
      'location': 'name', // Sort by name for location column
      'status': 'name', // Sort by name for status column
      'createdAt': 'createdAt', // Sort by creation date
      'orders': 'orders',
      'spent': 'spent',
      'lastOrder': 'lastOrder'
    };
    
    const newSortBy = columnMapping[column] || 'name';
    const newSortOrder = filters.sortBy === newSortBy && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    
    setFilters(prev => ({
      ...prev,
      sortBy: newSortBy,
      sortOrder: newSortOrder
    }));
    setCurrentPage(1); // Reset to first page when sorting changes
  }, [filters.sortBy, filters.sortOrder, setFilters, setCurrentPage]);

  // Transform data for the Customers component - memoized to prevent unnecessary re-renders
  const customerData: PaginationResult<Customer> = useMemo(() => {
    console.log('🔄 Transforming customer data:', { customers, totalCustomers, currentPage, totalPages });
    
    const transformedData = {
      data: customers.map(customer => ({
        id: customer.id,
        publicId: customer.publicId, // Convert to number as required by Customer type
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        zipCode: customer.zipCode,
        country: customer.country,
        dateOfBirth: customer.dateOfBirth ? new Date(customer.dateOfBirth) : undefined,
        idNumber: customer.idNumber,
        idType: customer.idType,
        notes: customer.notes,
        isActive: customer.isActive,
        merchantId: customer.merchant.id, // Required field for Customer type
        outletId: undefined, // Not available in current data
        createdAt: customer.createdAt ? new Date(customer.createdAt) : new Date(),
        updatedAt: customer.updatedAt ? new Date(customer.updatedAt) : new Date()
      })),
      pagination: {
        page: currentPage,
        totalPages,
        total: totalCustomers,
        limit: 10,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
      }
    };
    
    console.log('✅ Final transformed data:', transformedData);
    return transformedData;
  }, [customers, totalCustomers, currentPage, totalPages]);

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Customers</PageTitle>
        </PageHeader>
        <PageContent>
          <CustomersLoading />
        </PageContent>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Customers</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-12">
            <div className="text-red-500 text-4xl mb-4">❌</div>
            <h3 className="text-lg font-medium mb-2">Error Loading Customers</h3>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button 
              onClick={() => {
                setError(null);
                fetchCustomers();
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Retry
            </Button>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (!loading && customers.length === 0 && !error) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Customers</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">👥</div>
            <h3 className="text-lg font-medium mb-2">No Customers Found</h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchQuery 
                ? `No customers match your search: "${searchQuery}"`
                : 'No customers have been added yet.'
              }
            </p>
            {searchQuery && (
              <Button 
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                variant="outline"
                className="mr-2"
              >
                Clear Search
              </Button>
            )}
            <Button 
              onClick={() => router.push('/customers/add')}
              className="bg-green-600 hover:bg-green-700"
            >
              Add First Customer
            </Button>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>Customers</PageTitle>
            <p className="text-gray-600">Manage your customer database and relationships</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                // TODO: Implement export functionality
                alert('Export functionality coming soon!');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 rounded-md flex items-center text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export
            </button>
            <Button 
              onClick={() => router.push('/customers/add')}
              className="bg-green-600 hover:bg-green-700 text-white h-9 px-4"
            >
              <UserPlus className="w-4 h-4 mr-2" /> Add Customer
            </Button>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        <Customers
          data={customerData}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onCustomerAction={handleCustomerAction}
          onPageChange={handlePageChange}
          onSort={handleSort}
          merchantId={user?.merchantId || ''}
          onDeleteCustomer={handleDeleteCustomer}
        />

        {/* Confirmation Dialog for Delete Customer */}
        <ConfirmationDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          type="danger"
          title="Delete Customer"
          description={customerToDelete ? `Are you sure you want to delete ${customerToDelete.firstName} ${customerToDelete.lastName}? This action cannot be undone.` : ''}
          confirmText="Delete Customer"
          onConfirm={handleConfirmDelete}
        />
      </PageContent>
      
      {/* Toast Container for notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </PageWrapper>
  );
} 
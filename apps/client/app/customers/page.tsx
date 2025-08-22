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
  isActive: boolean;
  merchant: {
    id: string;
    companyName: string;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  
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

      const response = await customersApi.getCustomers(apiFilters);

      if (response.success && response.data) {
        // Handle both search response and standard listing response
        let customers, total, totalPages;
        
        if (response.data.customers) {
          // This is either a search response or standard listing
          customers = response.data.customers;
          total = response.data.total || customers.length;
          
          // Calculate totalPages based on the response structure
          if (response.data.totalPages !== undefined) {
            // Standard listing response
            totalPages = response.data.totalPages;
          } else if (response.data.limit && response.data.total) {
            // Search response - calculate pages from limit and total
            totalPages = Math.ceil(response.data.total / response.data.limit);
          } else {
            // Fallback calculation
            totalPages = Math.ceil(total / 10);
          }
        } else {
          // Fallback if data structure is unexpected
          customers = [];
          total = 0;
          totalPages = 1;
        }
        
        setCustomers(customers);
        setTotalPages(totalPages);
        setTotalCustomers(total);
        
        // If current page is beyond total pages after search, reset to page 1
        if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(1);
        }
      } else {
        throw new Error(response.error || 'Failed to fetch customers');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      // Show error toast
      showError('Fetch Error', 'Failed to load customers. Please try again.');
    } finally {
      setLoading(false);
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  }, [currentPage, searchQuery, filters.status, filters.sortBy, filters.sortOrder, setCustomers, setTotalPages, setTotalCustomers, setLoading, isInitialLoad, hasInitializedRef]);

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
  const customerData: PaginationResult<Customer> = useMemo(() => ({
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
  }), [customers, totalCustomers, currentPage, totalPages]);

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

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>Customers</PageTitle>
            <p className="text-gray-600">Manage your customer database and relationships</p>
          </div>
          <Button 
            onClick={() => router.push('/customers/add')}
            className="bg-green-600 hover:bg-green-700 text-white h-9 px-4"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Add Customer
          </Button>
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
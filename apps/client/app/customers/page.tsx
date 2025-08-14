'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Button, 
  Customers,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent
} from '@rentalshop/ui';
import { UserPlus } from 'lucide-react';

// Import types from the Customers feature
import { CustomerData, CustomerFilters as CustomerFiltersType } from '../../../../packages/ui/src/components/features/Customers/types';

// Extend the Customer type for this page
interface ExtendedCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
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
  const [customers, setCustomers] = useState<ExtendedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  
  // Initialize filters
  const [filters, setFilters] = useState<CustomerFiltersType>({
    search: '',
    status: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const { authenticatedFetch } = await import('@rentalshop/utils');

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(filters.search && { search: filters.search }),
        ...(filters.status !== 'all' && { status: filters.status }),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });

      const response = await authenticatedFetch(`/api/customers?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }

      const data = await response.json();
      
      if (data.success) {
        setCustomers(data.data.customers);
        setTotalPages(data.data.totalPages);
        setTotalCustomers(data.data.total || data.data.customers.length);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleFiltersChange = (newFilters: CustomerFiltersType) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleCustomerAction = async (action: string, customerId: string) => {
    switch (action) {
      case 'edit':
        // Handle edit - you can implement this based on your needs
        console.log('Edit customer:', customerId);
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
            }
          } catch (error) {
            console.error('Error deleting customer:', error);
          }
        }
        break;
      case 'view':
        // Handle view - you can implement this based on your needs
        console.log('View customer:', customerId);
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (column: string) => {
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
  };

  // Transform data for the Customers component
  const customerData: CustomerData = {
    customers: customers.map(customer => ({
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      companyName: customer.merchant?.companyName,
      address: customer.address,
      city: undefined, // Not available in current data
      state: customer.state,
      zipCode: undefined, // Not available in current data
      country: customer.country,
      status: customer.isActive ? 'active' : 'inactive',
      membershipLevel: 'basic', // Default value, not available in current data
      totalOrders: 0, // Not available in current data
      totalSpent: 0, // Not available in current data
      lastOrderDate: undefined, // Not available in current data
      createdAt: customer.createdAt || new Date().toISOString(), // Use actual date from API
      updatedAt: customer.updatedAt || new Date().toISOString()  // Use actual date from API
    })),
    total: totalCustomers,
    currentPage,
    totalPages,
    limit: 10,
    stats: {
      totalCustomers: totalCustomers,
      activeCustomers: customers.filter(c => c.isActive).length,
      inactiveCustomers: customers.filter(c => !c.isActive).length,
      blockedCustomers: 0, // Not available in current data
      newCustomersThisMonth: 0, // Not available in current data
      totalRevenue: 0, // Not available in current data
      averageOrderValue: 0, // Not available in current data
      topCustomers: [] // Not available in current data
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Customers</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading customers...</p>
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
          <Button 
            onClick={() => console.log('Add customer')}
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
          onCustomerAction={handleCustomerAction}
          onPageChange={handlePageChange}
          onSort={handleSort}
        />
      </PageContent>
    </PageWrapper>
  );
} 
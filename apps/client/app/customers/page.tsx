'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  CardContent, 
  Button, 
  Input, 
  Badge,
  CustomerTable,
  CustomerDialog,
  CustomerForm,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent
} from '@rentalshop/ui';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Customer {
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
}

export default function CustomersPage() {
  const { user, logout } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, [currentPage]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { authenticatedFetch } = await import('@rentalshop/utils');

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        isActive: showActiveOnly.toString(),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await authenticatedFetch(`/api/customers?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }

      const data = await response.json();
      
              if (data.success) {
          setCustomers(data.data.customers);
          setTotalPages(data.data.totalPages);
        }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(() => {
    setCurrentPage(1);
    fetchCustomers();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '') {
        handleSearch();
      } else {
        // If search is cleared, fetch all customers
        setCurrentPage(1);
        fetchCustomers();
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [searchTerm, handleSearch]);

  const handleEditCustomer = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setEditingCustomer(customer);
      setDialogOpen(true);
    }
  };

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setDialogOpen(true);
  };

  const handleSaveCustomer = async (customerData: Partial<Customer>) => {
    try {
      const { authenticatedFetch } = await import('@rentalshop/utils');

      const url = editingCustomer 
        ? `/api/customers/${editingCustomer.id}`
        : '/api/customers';
      
      const method = editingCustomer ? 'PUT' : 'POST';

      const response = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(customerData)
      });

      if (!response.ok) {
        throw new Error('Failed to save customer');
      }

      // Refresh the customer list
      fetchCustomers();
      setDialogOpen(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error('Error saving customer:', error);
      throw error;
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) {
      return;
    }

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
  };

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>Customers</PageTitle>
            <p className="text-gray-600">Manage your customer database and relationships</p>
          </div>
          <Button 
            onClick={handleAddCustomer} 
            className="bg-green-600 hover:bg-green-700 text-white h-9 px-4"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Add Customer
          </Button>
        </div>
      </PageHeader>

      {/* Search and Filters */}
      <PageContent>
        <Card className="mb-6 p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Customers
                {searchTerm && (
                  <span className="ml-2 text-sm text-blue-600 font-normal">
                    (Searching for "{searchTerm}")
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                {searchTerm && (
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchTerm('')}
                    className="whitespace-nowrap"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showActiveOnly}
                  onChange={(e) => setShowActiveOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-base text-gray-700">Active only</span>
              </label>
              
              <Button variant="outline" onClick={() => {
                setSearchTerm('');
                setShowActiveOnly(true);
              }}>
                Reset Filters
              </Button>
            </div>
          </div>
        </Card>

        {/* Customer List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-base text-gray-600">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-xl font-medium mb-2">No customers found</h3>
              <p className="text-base">Try adjusting your search criteria or add a new customer.</p>
            </div>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <CustomerTable
                customers={customers}
                onEdit={handleEditCustomer}
                onDelete={handleDeleteCustomer}
                showActions={true}
              />
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* Customer Dialog */}
        <CustomerDialog
          customer={editingCustomer}
          onSave={handleSaveCustomer}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          trigger={null}
        />
      </PageContent>
    </PageWrapper>
  );
} 
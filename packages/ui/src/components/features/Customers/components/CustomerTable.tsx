import React from 'react';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';
import { Customer } from '@rentalshop/types';
import { Eye, Edit, ShoppingBag } from 'lucide-react';

interface CustomerTableProps {
  customers: Customer[];
  onCustomerAction: (action: string, customerId: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}



export function CustomerTable({ 
  customers, 
  onCustomerAction, 
  sortBy = 'name', 
  sortOrder = 'asc',
  onSort
}: CustomerTableProps) {
  // Debug logging
  console.log('🔍 CustomerTable received customers:', customers);
  console.log('🔍 CustomerTable customers length:', customers?.length);
  console.log('🔍 CustomerTable first customer:', customers?.[0]);

  const triggerCustomerAction = (action: string, customer: Customer) => {
    // Directly call the onCustomerAction callback
    onCustomerAction(action, customer.id);
  };


  if (customers.length === 0) {
    return (
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-medium mb-2">No customers found</h3>
            <p className="text-sm">
              Try adjusting your filters or add some customers to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with sorting options */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Customers ({customers.length})
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Sort by:</span>
          <div className="flex items-center gap-1">
            {[
              { key: 'name', label: 'Name' },
              { key: 'createdAt', label: 'Created' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onSort?.(key)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  sortBy === key
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {label}
                {sortBy === key && (
                  <span className="ml-1">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Card-style rows */}
      <div className="grid gap-4">
        {customers.map((customer) => (
          <Card 
            key={customer.id} 
            className="hover:shadow-md transition-shadow duration-200 border-gray-200 dark:border-gray-700"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                {/* Left side - Main info */}
                <div className="flex items-center gap-3 flex-1">
                  {/* Customer Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        {customer.firstName} {customer.lastName}
                      </h3>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ID: {customer.id}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      {/* Contact Info */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Contact</p>
                        <p className="text-gray-900 dark:text-white">{customer.email}</p>
                        <p className="text-gray-500 dark:text-gray-400">{customer.phone}</p>
                      </div>
                      
                      {/* Location */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Location</p>
                        {customer.city && customer.state && (
                          <p className="text-gray-900 dark:text-white">
                            {customer.city}, {customer.state}
                          </p>
                        )}
                        {customer.country && (
                          <p className="text-gray-500 dark:text-gray-400">
                            {customer.country}
                          </p>
                        )}
                        {!customer.city && !customer.state && !customer.country && (
                          <p className="text-gray-500 dark:text-gray-400">N/A</p>
                        )}
                      </div>
                      
                      {/* Created Date */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Created</p>
                        <p className="text-gray-900 dark:text-white">
                          {customer.createdAt ? formatDate(customer.createdAt.toString()) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right side - Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => triggerCustomerAction('view', customer)}
                    className="h-8 px-3"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => triggerCustomerAction('edit', customer)}
                    className="h-8 px-3"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => triggerCustomerAction('viewOrders', customer)}
                    className="h-8 px-3"
                  >
                    <ShoppingBag className="h-3 w-3 mr-1" />
                    Orders
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import React from 'react';
import { Button } from '@rentalshop/ui';
import { Card, CardContent } from '@rentalshop/ui';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@rentalshop/ui';
import { Customer } from '@rentalshop/types';
import { Eye, Edit, Trash2, ShoppingBag, MoreVertical } from 'lucide-react';

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
  sortBy = 'createdAt', 
  sortOrder = 'desc',
  onSort
}: CustomerTableProps) {
  const [openDropdownId, setOpenDropdownId] = React.useState<number | null>(null);
  
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

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return 'N/A';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSort = (column: string) => {
    if (onSort) {
      onSort(column);
    }
  };

  return (
    <Card className="shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          {/* Table Header with Sorting - Sticky */}
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
            <tr>
              <th 
                onClick={() => handleSort('id')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex items-center gap-1">
                  ID
                  {sortBy === 'id' && (
                    <span className="text-xs">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort('name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex items-center gap-1">
                  Name
                  {sortBy === 'name' && (
                    <span className="text-xs">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Location
              </th>
              <th 
                onClick={() => handleSort('createdAt')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex items-center gap-1">
                  Created
                  {sortBy === 'createdAt' && (
                    <span className="text-xs">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          
          {/* Table Body */}
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                {/* ID */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    #{customer.id}
                  </div>
                </td>
                
                {/* Name */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {customer.firstName} {customer.lastName}
                    </div>
                  </div>
                </td>
                
                {/* Contact */}
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">{customer.email}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">{customer.phone}</div>
                  </div>
                </td>
                
                {/* Location */}
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {customer.city && customer.state ? (
                      <div>
                        <div>{customer.city}, {customer.state}</div>
                        {customer.country && (
                          <div className="text-gray-500 dark:text-gray-400 text-xs">{customer.country}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">N/A</span>
                    )}
                  </div>
                </td>
                
                {/* Created Date */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {formatDate(customer.createdAt)}
                  </div>
                </td>
                
                {/* Actions - Dropdown Menu */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setOpenDropdownId(customer.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end"
                      open={openDropdownId === customer.id}
                      onOpenChange={(open: boolean) => setOpenDropdownId(open ? customer.id : null)}
                    >
                      <DropdownMenuItem onClick={() => {
                        onCustomerAction('view', customer.id);
                        setOpenDropdownId(null);
                      }}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        onCustomerAction('edit', customer.id);
                        setOpenDropdownId(null);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Customer
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        onCustomerAction('viewOrders', customer.id);
                        setOpenDropdownId(null);
                      }}>
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        View Orders
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => {
                          onCustomerAction('delete', customer.id);
                          setOpenDropdownId(null);
                        }}
                        className="text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Customer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

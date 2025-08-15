import React, { useState, useRef, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../ui/table';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../../../ui/dropdown-menu';
import { Customer } from '../types';
import { ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Eye, Edit, ClipboardList, Trash2 } from 'lucide-react';

interface CustomerTableProps {
  customers: Customer[];
  onCustomerAction: (action: string, customerId: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  onViewOrders?: (customerId: string) => void;
  onDeleteCustomer?: (customerId: string) => void;
}

// Move SortableHeader outside to prevent recreation on each render
const SortableHeader = ({ 
  column, 
  children, 
  sortable = true,
  onSort,
  sortBy,
  sortOrder
}: { 
  column: string; 
  children: React.ReactNode; 
  sortable?: boolean;
  onSort?: (column: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  if (!sortable || !onSort) {
    return <TableHead className="px-4 py-3">{children}</TableHead>;
  }

  const isActive = sortBy === column;
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('SortableHeader clicked:', column); // Debug log
    onSort(column);
  };
  
  return (
    <TableHead 
      className={`cursor-pointer transition-all duration-200 select-none px-4 py-3 ${
        isActive 
          ? 'bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-500 dark:border-blue-400 shadow-sm' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm'
      }`}
      onClick={handleClick}
      style={{ userSelect: 'none' }}
    >
      <div className="flex items-center justify-between group">
        <span className={`font-medium transition-colors duration-200 ${
          isActive 
            ? 'text-blue-700 dark:text-blue-300' 
            : 'text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200'
        }`}>
          {children}
        </span>
        <span className={`ml-2 transition-all duration-200 ${
          isActive 
            ? 'text-blue-600 dark:text-blue-400 scale-110' 
            : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:scale-105'
        }`}>
          {isActive ? (
            sortOrder === 'asc' ? (
              <ArrowUp className="w-4 h-4" />
            ) : (
              <ArrowDown className="w-4 h-4" />
            )
          ) : (
            <ArrowUpDown className="w-4 h-4" />
          )}
        </span>
      </div>
    </TableHead>
  );
};

export function CustomerTable({ 
  customers, 
  onCustomerAction, 
  sortBy = 'name', 
  sortOrder = 'asc',
  onSort,
  onViewOrders,
  onDeleteCustomer
}: CustomerTableProps) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const triggerCustomerAction = (action: string, customer: Customer) => {
    // Create custom event to communicate with CustomerActions component
    const event = new CustomEvent('customer-action', {
      detail: { action, customer }
    });
    window.dispatchEvent(event);
    
    // Also call the original onCustomerAction for backward compatibility
    onCustomerAction(action, customer.id);
    
    // Close the dropdown after action
    setOpenDropdownId(null);
  };

  const handleViewOrders = (customerId: string, customer: Customer) => {
    // Create custom event to communicate with CustomerActions component
    const event = new CustomEvent('customer-view-orders', {
      detail: { customerId, customer }
    });
    window.dispatchEvent(event);
    
    // Also call the original onViewOrders for backward compatibility
    onViewOrders?.(customerId);
    
    // Close the dropdown after action
    setOpenDropdownId(null);
  };

  const handleDeleteCustomer = (customerId: string) => {
    onDeleteCustomer?.(customerId);
    setOpenDropdownId(null);
  };

  const toggleDropdown = (customerId: string) => {
    setOpenDropdownId(openDropdownId === customerId ? null : customerId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && dropdownRefs.current[openDropdownId]) {
        const dropdownElement = dropdownRefs.current[openDropdownId];
        if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
          setOpenDropdownId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

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

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      blocked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    
    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants]}>
        {status}
      </Badge>
    );
  };

  const getMembershipBadge = (level: string) => {
    const variants = {
      basic: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      premium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      vip: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    };
    
    return (
      <Badge variant="outline" className={variants[level as keyof typeof variants]}>
        {level.toUpperCase()}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
          Customers
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader column="name" sortable={true} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>Customer</SortableHeader>
                <SortableHeader column="contact" sortable={false}>Contact</SortableHeader>
                <SortableHeader column="location" sortable={false}>Location</SortableHeader>
                <SortableHeader column="status" sortable={false}>Status</SortableHeader>
                <SortableHeader column="createdAt" sortable={true} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>Created At</SortableHeader>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {customer.firstName} {customer.lastName}
                      </div>
                      {customer.companyName && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {customer.companyName}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <div className="text-sm">{customer.email}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {customer.phone}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      {customer.country && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {customer.country}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {getStatusBadge(customer.status)}
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {customer.createdAt ? formatDate(customer.createdAt) : 'N/A'}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="relative" ref={(el) => { dropdownRefs.current[customer.id] = el; }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDropdown(customer.id);
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                      
                      {openDropdownId === customer.id && (
                        <div className="absolute right-0 top-full mt-1 z-50 min-w-[12rem] overflow-hidden rounded-md border bg-white dark:bg-gray-800 p-1 text-sm shadow-md">
                          <div 
                            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
                            onClick={() => triggerCustomerAction('view', customer)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </div>
                          <div 
                            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
                            onClick={() => triggerCustomerAction('edit', customer)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Customer
                          </div>
                          <div 
                            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
                            onClick={() => handleViewOrders(customer.id, customer)}
                          >
                            <ClipboardList className="mr-2 h-4 w-4" />
                            View Orders
                          </div>
                          <div className="-mx-1 my-1 h-px bg-gray-200 dark:bg-gray-600"></div>
                          <div 
                            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            onClick={() => handleDeleteCustomer(customer.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Customer
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

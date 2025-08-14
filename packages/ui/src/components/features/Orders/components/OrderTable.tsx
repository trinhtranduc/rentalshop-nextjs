import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../ui/table';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { Order } from '../types';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface OrderTableProps {
  orders: Order[];
  onOrderAction: (action: string, orderId: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
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

export function OrderTable({ 
  orders, 
  onOrderAction,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  onSort
}: OrderTableProps) {
  if (orders.length === 0) {
    return (
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium mb-2">No orders found</h3>
            <p className="text-sm">
              Try adjusting your filters or create some orders to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      COMPLETED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      RETURNED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    };
    
    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants]}>
        {status}
      </Badge>
    );
  };

  const getOrderTypeBadge = (type: string) => {
    const variants = {
      RENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      SALE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      RENT_TO_OWN: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    };
    
    return (
      <Badge variant="outline" className={variants[type as keyof typeof variants]}>
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
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
          Orders
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader column="orderNumber" sortable={false}>
                  Order
                </SortableHeader>
                <SortableHeader column="customerName" sortable={false}>
                  Customer
                </SortableHeader>
                <SortableHeader column="orderType" sortable={false}>
                  Type
                </SortableHeader>
                <SortableHeader column="status" sortable={true} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                  Status
                </SortableHeader>
                <SortableHeader column="totalAmount" sortable={false}>
                  Amount
                </SortableHeader>
                <SortableHeader column="pickupPlanAt" sortable={true} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                  Pickup
                </SortableHeader>
                <SortableHeader column="returnPlanAt" sortable={true} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                  Return
                </SortableHeader>
                <SortableHeader column="createdAt" sortable={true} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                  Created
                </SortableHeader>
                <TableHead className="px-4 py-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {order.orderNumber}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {order.customerName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {order.customerPhone}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {getOrderTypeBadge(order.orderType)}
                  </TableCell>
                  
                  <TableCell>
                    {getStatusBadge(order.status)}
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <div className="font-medium">{formatCurrency(order.totalAmount)}</div>
                      {order.depositAmount > 0 && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Deposit: {formatCurrency(order.depositAmount)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {order.pickupPlanAt ? formatDate(order.pickupPlanAt) : 'N/A'}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {order.returnPlanAt ? formatDate(order.returnPlanAt) : 'N/A'}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {order.createdAt ? formatDate(order.createdAt) : 'N/A'}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOrderAction('view', order.orderNumber)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOrderAction('edit', order.orderNumber)}
                      >
                        Edit
                      </Button>
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

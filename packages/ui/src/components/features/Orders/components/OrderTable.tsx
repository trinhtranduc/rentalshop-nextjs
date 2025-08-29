import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../ui';
import { Button } from '../../../ui';
import { Badge } from '../../../ui';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui';
import { OrderData } from '@rentalshop/types';
import { ArrowUpDown, ArrowUp, ArrowDown, Eye } from 'lucide-react';
import { ORDER_STATUS_COLORS } from '@rentalshop/constants';

interface OrderTableProps {
  orders: OrderData[];
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
  // Debug logging to see what data we're receiving
  console.log('OrderTable: Received orders data:', orders.map(o => ({ id: o.id, status: o.status, orderNumber: o.orderNumber })));
  console.log('🔍 DEBUG: ORDER_STATUS_COLORS imported:', ORDER_STATUS_COLORS);
  console.log('🔍 DEBUG: ORDER_STATUS_COLORS keys:', Object.keys(ORDER_STATUS_COLORS));
  console.log('🔍 DEBUG: ORDER_STATUS_COLORS values:', Object.values(ORDER_STATUS_COLORS));
  
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
    // Debug logging to see what status values we're receiving
    if (!status || typeof status !== 'string') {
      console.warn('OrderTable: Invalid status value:', status);
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-800">
          {status || 'UNKNOWN'}
        </Badge>
      );
    }

    // Safety check for ORDER_STATUS_COLORS
    if (!ORDER_STATUS_COLORS) {
      console.error('OrderTable: ORDER_STATUS_COLORS is undefined! This should not happen.');
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800">
          {status}
        </Badge>
      );
    }

    const colors = ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS] || 'bg-gray-100 text-gray-800';
    
    // Debug: Log what we're getting for each status
    console.log(`🔍 Status Badge Debug - Status: "${status}"`);
    console.log(`🔍 Status type:`, typeof status);
    console.log(`🔍 Status length:`, status.length);
    console.log(`🔍 Status char codes:`, Array.from(status).map(c => c.charCodeAt(0)));
    console.log(`🔍 Available keys in ORDER_STATUS_COLORS:`, Object.keys(ORDER_STATUS_COLORS));
    console.log(`🔍 Has status "${status}" in ORDER_STATUS_COLORS:`, status in ORDER_STATUS_COLORS);
    console.log(`🔍 Colors for "${status}":`, colors);
    console.log(`🔍 ORDER_STATUS_COLORS["PICKUPED"]:`, ORDER_STATUS_COLORS.PICKUPED);
    
    return (
      <Badge className={colors}>
        {status}
      </Badge>
    );
  };

  const getOrderTypeBadge = (type: string) => {
    const variants = {
      RENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      SALE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    };
    
    return (
      <Badge variant="default" className={variants[type as keyof typeof variants]}>
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

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return 'N/A';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
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
                <SortableHeader column="outletName" sortable={false}>
                  Outlet
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
                <TableHead className="w-24">Actions</TableHead>
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
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {order.outletName}
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
                      {formatDate(order.pickupPlanAt)}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(order.returnPlanAt)}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(order.createdAt)}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOrderAction('view', order.orderNumber)}
                      >
                        <Eye className="w-4 h-4 mr-1" /> View
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

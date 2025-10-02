'use client'

import React from 'react';
// LINE-STYLE IMPORTS (COMMENTED FOR REVERT)
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@rentalshop/ui';
import { Button } from '@rentalshop/ui';
import { Badge } from '@rentalshop/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@rentalshop/ui';
import { OrderData } from '@rentalshop/types';
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, Edit } from 'lucide-react';

interface OrderTableProps {
  orders: OrderData[];
  onOrderAction: (action: string, orderId: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

// LINE-STYLE SORTABLE HEADER (COMMENTED FOR REVERT)
// const SortableHeader = ({ 
//   column, 
//   children, 
//   sortable = true,
//   onSort,
//   sortBy,
//   sortOrder
// }: { 
//   column: string; 
//   children: React.ReactNode; 
//   sortable?: boolean;
//   onSort?: (column: string) => void;
//   sortBy?: string;
//   sortOrder?: 'asc' | 'desc';
// }) => {
//   if (!sortable || !onSort) {
//     return <TableHead className="px-4 py-3">{children}</TableHead>;
//   }

//   const isActive = sortBy === column;
  
//   const handleClick = (e: React.MouseEvent) => {
//     e.preventDefault();
//     e.stopPropagation();
//     console.log('SortableHeader clicked:', column); // Debug log
//     onSort(column);
//   };
  
//   return (
//     <TableHead 
//       className={`cursor-pointer transition-all duration-200 select-none px-4 py-3 ${
//         isActive 
//           ? 'bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-500 dark:border-blue-400 shadow-sm' 
//           : 'hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm'
//       }`}
//       onClick={handleClick}
//       style={{ userSelect: 'none' }}
//     >
//       <div className="flex items-center justify-between group">
//         <span className={`font-medium transition-colors duration-200 ${
//           isActive 
//             ? 'text-blue-700 dark:text-blue-300' 
//             : 'text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200'
//         }`}>
//           {children}
//         </span>
//         <span className={`ml-2 transition-all duration-200 ${
//           isActive 
//             ? 'text-blue-600 dark:text-blue-400 scale-110' 
//             : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:scale-105'
//         }`}>
//           {isActive ? (
//             sortOrder === 'asc' ? (
//               <ArrowUp className="w-4 h-4" />
//             ) : (
//               <ArrowDown className="w-4 h-4" />
//             )
//           ) : (
//             <ArrowUpDown className="w-4 h-4" />
//           )}
//         </span>
//       </div>
//     </TableHead>
//   );
// };

// CARD-STYLE SORTABLE HEADER (Categories Style)
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
    return <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{children}</span>;
  }

  const isActive = sortBy === column;
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('SortableHeader clicked:', column); // Debug log
    onSort(column);
  };

  const getSortIcon = () => {
    if (!isActive) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };
  
  return (
    <button
      onClick={handleClick}
      className={`px-2 py-1 rounded text-xs transition-colors ${
        isActive
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'
      }`}
      style={{ userSelect: 'none' }}
    >
      {children}
      {getSortIcon() && (
        <span className="ml-1">{getSortIcon()}</span>
      )}
    </button>
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
      BOOKED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-blue-200',
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
    <div className="space-y-6">
      {/* Header with sorting options */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Orders ({orders.length})
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Sort by:</span>
          <div className="flex items-center gap-1">
            {[
              { key: 'status', label: 'Status' },
              { key: 'pickupPlanAt', label: 'Pickup' },
              { key: 'returnPlanAt', label: 'Return' },
              { key: 'createdAt', label: 'Created' }
            ].map(({ key, label }) => (
              <SortableHeader
                key={key}
                column={key}
                sortable={true}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              >
                {label}
              </SortableHeader>
            ))}
          </div>
        </div>
      </div>

      {/* LINE-STYLE TABLE (COMMENTED FOR REVERT) */}
      {/* 
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
      */}

      {/* CARD-STYLE LAYOUT - CLIENT VERSION (NO MERCHANT COLUMN) */}
      <div className="grid gap-3">
        {orders.map((order) => (
          <Card 
            key={order.id} 
            className="hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                {/* Left side - Main info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {order.orderNumber}
                    </h3>
                    {getOrderTypeBadge(order.orderType)}
                    {getStatusBadge(order.status)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
                    {/* Customer Info */}
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 mb-1">Customer</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {order.customerName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {order.customerPhone}
                      </p>
                    </div>
                    
                    {/* Outlet Info */}
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 mb-1">Outlet</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {order.outletName}
                      </p>
                    </div>
                    
                    {/* Amount Info */}
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 mb-1">Amount</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(order.totalAmount)}
                      </p>
                      {order.depositAmount > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Deposit: {formatCurrency(order.depositAmount)}
                        </p>
                      )}
                    </div>
                    
                    {/* Schedule Info */}
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 mb-1">Schedule</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        Pickup: {formatDate(order.pickupPlanAt)}
                      </p>
                      {order.returnPlanAt && (
                        <p className="text-sm text-gray-900 dark:text-white">
                          Return: {formatDate(order.returnPlanAt)}
                        </p>
                      )}
                    </div>
                    
                    {/* Created Date */}
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 mb-1">Created</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Right side - Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOrderAction('view', order.orderNumber)}
                    className="h-8 px-3"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  {/* 
                    Edit Button Logic:
                    - RENT orders: Only editable when RESERVED (not PICKUPED/RETURNED/CANCELLED)
                    - SALE orders: Only editable when RESERVED (normally SALE starts as COMPLETED, so rarely editable)
                    - All other statuses: Disabled
                  */}
                  {order.status === 'RESERVED' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOrderAction('edit', order.orderNumber)}
                      className="h-8 px-3"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="h-8 px-3 opacity-50 cursor-not-allowed"
                      title={`Cannot edit ${order.status.toLowerCase()} orders`}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

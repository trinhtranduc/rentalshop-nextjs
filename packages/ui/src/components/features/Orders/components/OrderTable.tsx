import React from 'react';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Card, CardContent } from '../../../ui/card';
import { Eye, Edit } from 'lucide-react';

// Local interface matching what OrderTable actually uses
interface OrderTableItem {
  id: number;
  orderNumber: string;
  orderType: string;
  status: string;
  customerName: string;
  customerPhone: string;
  outletName: string;
  totalAmount: number;
  depositAmount: number;
  createdAt: Date;
  pickupPlanAt?: Date;
  returnPlanAt?: Date;
}

interface OrderTableProps {
  orders: OrderTableItem[];
  onOrderAction: (action: string, orderId: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export function OrderTable({ 
  orders, 
  onOrderAction,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  onSort
}: OrderTableProps) {
  // Debug: Log order statuses
  React.useEffect(() => {
    if (orders.length > 0) {
      console.log('📋 OrderTable - Order statuses:', orders.map(o => ({ 
        orderNumber: o.orderNumber, 
        status: o.status,
        canEdit: o.status === 'RESERVED'
      })));
    }
  }, [orders]);

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
      RESERVED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      PICKUPED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      RETURNED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      COMPLETED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
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

  const getOrderIcon = () => {
    return (
      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center justify-center shadow-sm">
        <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-0">
      {/* Card-style rows without top/bottom padding - matching Product list UI */}
      <div className="grid gap-0">
        {orders.map((order) => (
          <Card 
            key={order.id} 
            className="hover:shadow-md transition-shadow duration-200 border-gray-200 dark:border-gray-700 rounded-none border-t-0 border-l-0 border-r-0 border-b"
          >
            <CardContent className="px-6 py-0">
              <div className="flex items-center justify-between py-4">
                {/* Left side - Main info */}
                <div className="flex items-center gap-3 flex-1">
                  {/* Order Icon */}
                  <div className="relative">
                    {getOrderIcon()}
                  </div>
                  
                  {/* Order Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
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
                        <p className="text-gray-900 dark:text-white font-medium">{order.customerName}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">{order.customerPhone}</p>
                      </div>
                      
                      {/* Amount Info */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Total Amount</p>
                        <p className="text-gray-900 dark:text-white font-medium">{formatCurrency(order.totalAmount)}</p>
                        {order.depositAmount > 0 && (
                          <p className="text-gray-500 dark:text-gray-400 text-xs">
                            Deposit: {formatCurrency(order.depositAmount)}
                          </p>
                        )}
                      </div>
                      
                      {/* Schedule Info */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Pickup Date</p>
                        <p className="text-gray-900 dark:text-white">{formatDate(order.pickupPlanAt)}</p>
                        {order.returnPlanAt && (
                          <p className="text-gray-500 dark:text-gray-400 text-xs">
                            Return: {formatDate(order.returnPlanAt)}
                          </p>
                        )}
                      </div>
                      
                      {/* Outlet Info */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Outlet</p>
                        <p className="text-gray-900 dark:text-white">{order.outletName}</p>
                      </div>
                      
                      {/* Created Date */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Created</p>
                        <p className="text-gray-900 dark:text-white">
                          {formatDate(order.createdAt)}
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

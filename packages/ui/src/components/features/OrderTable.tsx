import React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Eye, Package, RotateCcw, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatDate, formatDateOnly, formatCurrency } from '../../lib/utils';
import type { OrderSearchResult, OrderStatus, OrderType } from '@rentalshop/database';

export interface OrderTableProps {
  orders: OrderSearchResult[];
  onView?: (orderId: string) => void;
  onPickup?: (orderId: string) => void;
  onReturn?: (orderId: string) => void;
  onCancel?: (orderId: string) => void;
  className?: string;
  showActions?: boolean;
}

const getStatusLabel = (status: OrderStatus): string => {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'ACTIVE':
      return 'Active';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'OVERDUE':
      return 'Overdue';
    case 'DAMAGED':
      return 'Damaged';
    default:
      return status;
  }
};

const getStatusBadgeClass = (status: OrderStatus): string => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'CONFIRMED':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'ACTIVE':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'COMPLETED':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'OVERDUE':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'DAMAGED':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getOrderTypeLabel = (type: OrderType): string => {
  switch (type) {
    case 'RENT':
      return 'Rent';
    case 'SALE':
      return 'Sale';
    case 'RENT_TO_OWN':
      return 'Rent to Own';
    default:
      return type;
  }
};

export const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  onView,
  onPickup,
  onReturn,
  onCancel,
  className,
  showActions = true,
}) => {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[160px] font-bold text-gray-900">Order</TableHead>
            <TableHead className="w-[200px] font-bold text-gray-900">Customer</TableHead>
            <TableHead className="w-[120px] font-bold text-gray-900">Status</TableHead>
            <TableHead className="w-[120px] font-bold text-gray-900">Type</TableHead>
            <TableHead className="w-[140px] font-bold text-gray-900">Total</TableHead>
            <TableHead className="w-[120px] font-bold text-gray-900">Deposit</TableHead>
            <TableHead className="w-[180px] font-bold text-gray-900">Pickup</TableHead>
            <TableHead className="w-[180px] font-bold text-gray-900">Return</TableHead>
            <TableHead className="w-[160px] font-bold text-gray-900">Outlet</TableHead>
            {showActions && <TableHead className="w-[160px] text-right font-bold text-gray-900">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const customerName = order.customer
              ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
              : 'Walk-in Customer';
            const isPickupReady = order.status === 'CONFIRMED' && !!order.pickupPlanAt;
            const isReturnReady = order.status === 'ACTIVE' && !!order.returnPlanAt;
            const isOverdue = order.status === 'ACTIVE' && order.returnPlanAt && new Date(order.returnPlanAt) < new Date();

            return (
              <TableRow key={order.id} className="hover:bg-gray-50 transition-colors">
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">{order.orderNumber}</span>
                    <span className="text-xs text-gray-500">{formatDate(order.createdAt)}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col text-sm">
                    <span className="text-gray-900">{customerName}</span>
                    {order.customer?.phone && (
                      <span className="text-xs text-gray-500">{order.customer.phone}</span>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <Badge className={getStatusBadgeClass(order.status)}>{getStatusLabel(order.status)}</Badge>
                  {isOverdue && (
                    <div className="text-xs text-red-600 mt-1">Overdue</div>
                  )}
                </TableCell>

                <TableCell>
                  <Badge variant="outline">{getOrderTypeLabel(order.orderType)}</Badge>
                </TableCell>

                <TableCell>
                  <div className="text-gray-900 font-medium">{formatCurrency(order.totalAmount)}</div>
                </TableCell>

                <TableCell>
                  <div className="text-gray-900">{formatCurrency(order.depositAmount)}</div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col text-xs text-gray-700">
                    {order.pickupPlanAt && (
                      <span>
                        Plan: <span className="font-medium">{formatDateOnly(order.pickupPlanAt)}</span>
                      </span>
                    )}
                    {order.pickedUpAt && (
                      <span className="text-green-700">
                        Actual: <span className="font-medium">{formatDateOnly(order.pickedUpAt)}</span>
                      </span>
                    )}
                    {!order.pickupPlanAt && !order.pickedUpAt && <span className="text-gray-400">—</span>}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col text-xs text-gray-700">
                    {order.returnPlanAt && (
                      <span>
                        Plan: <span className="font-medium">{formatDateOnly(order.returnPlanAt)}</span>
                      </span>
                    )}
                    {order.returnedAt && (
                      <span className="text-green-700">
                        Actual: <span className="font-medium">{formatDateOnly(order.returnedAt)}</span>
                      </span>
                    )}
                    {!order.returnPlanAt && !order.returnedAt && <span className="text-gray-400">—</span>}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="text-sm text-gray-900">{order.outlet.name}</div>
                </TableCell>

                {showActions && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onView && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onView(order.id)}
                          className="h-8 w-8 p-0"
                          aria-label="View"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      {onPickup && isPickupReady && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => onPickup(order.id)}
                          className="h-8 w-8 p-0"
                          aria-label="Pickup"
                          title="Xác nhận nhận hàng"
                        >
                          <Package className="w-4 h-4" />
                        </Button>
                      )}
                      {onReturn && isReturnReady && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => onReturn(order.id)}
                          className="h-8 w-8 p-0"
                          aria-label="Return"
                          title="Xác nhận trả hàng"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                      {onCancel && (order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onCancel(order.id)}
                          className="h-8 w-8 p-0"
                          aria-label="Cancel"
                          title="Hủy đơn hàng"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};



import React from 'react';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Card, CardContent } from '../../../ui/card';
import { useFormatCurrency } from '@rentalshop/ui';
import { useOrderTranslations } from '@rentalshop/hooks';
import { useFormattedFullDate } from '@rentalshop/utils';
import { ORDER_STATUS_COLORS, ORDER_TYPE_COLORS } from '@rentalshop/constants';
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

export const OrderTable = React.memo(function OrderTable({ 
  orders, 
  onOrderAction,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  onSort
}: OrderTableProps) {
  // Use formatCurrency hook - automatically uses merchant's currency
  const formatMoney = useFormatCurrency();
  const t = useOrderTranslations();
  
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
            <h3 className="text-lg font-medium mb-2">{t('messages.noOrders')}</h3>
            <p className="text-sm">
              {t('messages.tryAdjustingFilters')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant="outline" className={ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS]}>
        {t(`status.${status}`)}
      </Badge>
    );
  };

  const getOrderTypeBadge = (type: string) => {
    return (
      <Badge variant="outline" className={ORDER_TYPE_COLORS[type as keyof typeof ORDER_TYPE_COLORS]}>
        {t(`orderType.${type}`)}
      </Badge>
    );
  };

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return 'N/A';
    // Use the new date utility for consistent formatting
    return useFormattedFullDate(dateString);
  };

  const getOrderIcon = () => {
    return (
      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center justify-center shadow-sm">
        <svg className="w-8 h-8 text-blue-700 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    );
  };

  const handleSort = (column: string) => {
    if (onSort) {
      onSort(column);
    }
  };

  return (
    <Card className="shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col">
      <div className="overflow-auto flex-1">
        <table className="w-full min-w-[1000px]">
          {/* Table Header with Sorting - Sticky */}
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
            <tr>
              <th 
                onClick={() => handleSort('orderNumber')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex items-center gap-1">
                  {t('orderNumber')}
                  {sortBy === 'orderNumber' && (
                    <span className="text-xs">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('orderType.label')}
              </th>
              <th 
                onClick={() => handleSort('status')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex items-center gap-1">
                  {t('status.label')}
                  {sortBy === 'status' && (
                    <span className="text-xs">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('customer.label')}
              </th>
              <th 
                onClick={() => handleSort('totalAmount')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex items-center gap-1">
                  {t('amount.total')}
                  {sortBy === 'totalAmount' && (
                    <span className="text-xs">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort('pickupPlanAt')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex items-center gap-1">
                  {t('dates.pickupDate')}
                  {sortBy === 'pickupPlanAt' && (
                    <span className="text-xs">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort('createdAt')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex items-center gap-1">
                  {t('dates.createdDate')}
                  {sortBy === 'createdAt' && (
                    <span className="text-xs">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('actions.label')}
              </th>
            </tr>
          </thead>
          
          {/* Table Body */}
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                {/* Order Number */}
                <td className="px-6 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {order.orderNumber}
                  </div>
                </td>
                
                {/* Order Type */}
                <td className="px-6 py-3 whitespace-nowrap">
                  {getOrderTypeBadge(order.orderType)}
                </td>
                
                {/* Status */}
                <td className="px-6 py-3 whitespace-nowrap">
                  {getStatusBadge(order.status)}
                </td>
                
                {/* Customer */}
                <td className="px-6 py-3">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">{order.customerName}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">{order.customerPhone}</div>
                  </div>
                </td>
                
                {/* Amount */}
                <td className="px-6 py-3 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">{formatMoney(order.totalAmount)}</div>
                    {order.depositAmount > 0 && (
                      <div className="text-gray-500 dark:text-gray-400 text-xs">
                        {t('amount.deposit')}: {formatMoney(order.depositAmount)}
                      </div>
                    )}
                  </div>
                </td>
                
                {/* Pickup Date */}
                <td className="px-6 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {formatDate(order.pickupPlanAt)}
                  </div>
                  {order.returnPlanAt && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {t('dates.returnLabel')}: {formatDate(order.returnPlanAt)}
                    </div>
                  )}
                </td>
                
                {/* Created Date */}
                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(order.createdAt)}
                </td>
                
                {/* Actions */}
                <td className="px-6 py-3 whitespace-nowrap text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOrderAction('view', order.orderNumber)}
                      className="h-8 px-3"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {t('actions.view')}
                    </Button>
                    
                    {/* Always show Edit button, but disable if not RESERVED */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOrderAction('edit', order.orderNumber)}
                      disabled={order.status !== 'RESERVED'}
                      className="h-8 px-3"
                      title={order.status !== 'RESERVED' ? t('messages.cannotEditOrder') : undefined}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {t('actions.edit')}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
});

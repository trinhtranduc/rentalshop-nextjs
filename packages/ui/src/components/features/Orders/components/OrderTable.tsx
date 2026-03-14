'use client';

import React from 'react';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Card, CardContent } from '../../../ui/card';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../../../ui/dropdown-menu';
import { useFormatCurrency, useToast } from '@rentalshop/ui';
import { useOrderTranslations, useTableSelection } from '@rentalshop/hooks';
import { useFormattedFullDate, useFormattedDateTime } from '@rentalshop/utils/client';
import { formatPhoneNumber } from '@rentalshop/utils';
import { Copy } from 'lucide-react';
import { getOrderStatusClassName, ORDER_TYPE_COLORS } from '@rentalshop/constants';
import { Eye, Edit, Trash2, MoreVertical } from 'lucide-react';
import type { OrderListItem, OrderItemFlattened } from '@rentalshop/types';

interface OrderTableProps {
  orders: OrderListItem[];
  onOrderAction: (action: string, orderId: string | number) => void; // Support both string (orderNumber) and number (customerId)
  onSelectionChange?: (selectedOrderIds: number[]) => void; // Callback when selection changes
  onBatchDelete?: (orderIds: number[]) => void; // Callback for batch delete
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  showMerchant?: boolean; // ⭐ Show merchant column for admin view
  userRole?: 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF'; // ⭐ User role for permission checks
  hideCopyPhone?: boolean; // ⭐ Hide copy phone button
}

export const OrderTable = React.memo(function OrderTable({ 
  orders, 
  onOrderAction,
  onSelectionChange,
  onBatchDelete,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  onSort,
  showMerchant = false,
  userRole = 'OUTLET_STAFF', // Default to most restrictive role
  hideCopyPhone = false // Default to show copy button
}: OrderTableProps) {
  // Use formatCurrency hook - automatically uses merchant's currency
  const formatMoney = useFormatCurrency();
  const t = useOrderTranslations();
  const { toastSuccess } = useToast();
  
  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toastSuccess('Copied', 'Phone number copied to clipboard');
  };
  
  // Use reusable selection hook
  const {
    selectedIdsSet: selectedOrderIds,
    allSelected,
    someSelected,
    handleToggleSelect,
    handleSelectAll,
    isSelected,
  } = useTableSelection(orders, onSelectionChange);

  // Check if all selected orders are CANCELLED
  const selectedOrders = React.useMemo(() => {
    return orders.filter(order => selectedOrderIds.has(order.id));
  }, [orders, selectedOrderIds]);

  const allSelectedAreCancelled = React.useMemo(() => {
    if (selectedOrders.length === 0) return false;
    return selectedOrders.every(order => order.status === 'CANCELLED');
  }, [selectedOrders]);

  // Check if user can delete (not OUTLET_STAFF)
  const canDelete = userRole !== 'OUTLET_STAFF';
  
  // Check if user is ADMIN (can delete any order)
  const isAdmin = userRole === 'ADMIN';
  
  // Show batch delete button if:
  // 1. User can delete (not OUTLET_STAFF)
  // 2. Has selected orders
  // 3. ADMIN can delete any orders, others can only delete CANCELLED orders
  const showBatchDeleteButton = canDelete && selectedOrders.length > 0 && (isAdmin || allSelectedAreCancelled);
  
  // Debug: Log order statuses and delete button visibility
  React.useEffect(() => {
    if (orders.length > 0) {
      console.log('📋 OrderTable - Order statuses:', orders.map(o => {
        const canDelete = userRole !== 'OUTLET_STAFF' && (isAdmin || o.status === 'CANCELLED');
        return { 
          orderNumber: o.orderNumber, 
          status: o.status,
          canEdit: o.status === 'RESERVED',
          canDelete,
          userRole,
          isAdmin
        };
      }));
    }
  }, [orders, userRole, isAdmin]);

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
      <Badge variant="outline" className={getOrderStatusClassName(status)}>
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
    // Use the new date utility for consistent formatting (date only for pickup/return dates)
    return useFormattedFullDate(dateString);
  };
  
  // Format date with time for createdAt
  const formatDateTime = (dateString: string | Date | undefined) => {
    if (!dateString) return 'N/A';
    return useFormattedDateTime(dateString);
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

  const handleBatchDelete = () => {
    if (onBatchDelete && selectedOrders.length > 0) {
      const orderIds = selectedOrders.map(order => order.id);
      onBatchDelete(orderIds);
    }
  };

  return (
    <Card className="shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col">
      {/* Batch Delete Toolbar */}
      {showBatchDeleteButton && (
        <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 flex items-center justify-between">
          <div className="text-sm text-blue-900 dark:text-blue-100">
            {t('messages.selectedOrders', { count: selectedOrders.length }) || `${selectedOrders.length} orders selected`}
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBatchDelete}
            className="h-8 px-4"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('actions.deleteSelected') || 'Delete Selected'}
          </Button>
        </div>
      )}
      <div className="overflow-y-auto flex-1 h-full">
        <table className="w-full">
          {/* Table Header with Sorting - Sticky */}
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
            <tr>
              {/* Select All Checkbox */}
              {onSelectionChange && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someSelected;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    title={allSelected ? t('actions.deselectAll') || 'Deselect all' : t('actions.selectAll') || 'Select all'}
                  />
                </th>
              )}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[200px]">
                {t('customer.label')}
              </th>
              {showMerchant && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Merchant
                </th>
              )}
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
            {orders.map((order) => {
              const orderIsSelected = isSelected(order.id);
              return (
              <tr key={order.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${orderIsSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                {/* Checkbox */}
                {onSelectionChange && (
                  <td className="px-6 py-3 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={orderIsSelected}
                      onChange={() => handleToggleSelect(order.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </td>
                )}
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
                <td className="px-6 py-3 min-w-[200px]">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {order.customerName || 'N/A'}
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
                      <span className="whitespace-nowrap">{formatPhoneNumber(order.customerPhone || '')}</span>
                      {order.customerPhone && !hideCopyPhone && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyPhone(order.customerPhone || '');
                          }}
                          className="opacity-60 hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex-shrink-0"
                          title="Copy phone number"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </td>
                
                {/* Merchant */}
                {showMerchant && (
                  <td className="px-6 py-3 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {order.merchantName || 'N/A'}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">
                        {order.outletName || 'N/A'}
                      </div>
                    </div>
                  </td>
                )}
                
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
                  {formatDateTime(order.createdAt)}
                </td>
                
                {/* Actions - View & Edit outside (icon + label), Delete in dropdown */}
                <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 rounded-md border border-gray-200 px-3 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                      onClick={() => onOrderAction('view', order.orderNumber)}
                    >
                      <Eye className="h-4 w-4 shrink-0" />
                      <span>{t('actions.view')}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 gap-1.5 rounded-md border border-gray-200 px-3 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 ${order.status !== 'RESERVED' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => order.status === 'RESERVED' && onOrderAction('edit', order.orderNumber)}
                    >
                      <Edit className="h-4 w-4 shrink-0" />
                      <span>{t('actions.edit')}</span>
                    </Button>
                    {(userRole !== 'OUTLET_STAFF' && (isAdmin || order.status === 'CANCELLED')) ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 rounded-md border border-gray-200 p-0 shrink-0 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800" title={t('actions.delete')}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onOrderAction('delete', order.orderNumber);
                            }}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('actions.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
});

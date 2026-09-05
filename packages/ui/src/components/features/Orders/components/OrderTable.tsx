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
import { useLocale } from 'next-intl';
import { formatPhoneNumber, formatFullDateByLocale, formatDateTimeByLocale } from '@rentalshop/utils';
import { ChevronDown, Copy, Gift } from 'lucide-react';
import { getOrderStatusClassName, ORDER_TYPE_COLORS } from '@rentalshop/constants';
import { Eye, Edit, Trash2, MoreVertical } from 'lucide-react';
import type { OrderListItem } from '@rentalshop/types';

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
  const locale = useLocale();
  const tableId = React.useId();
  const [expandedOrderIds, setExpandedOrderIds] = React.useState<Set<number>>(() => new Set());

  const toggleOrderExpanded = (orderId: number) => {
    setExpandedOrderIds(previous => {
      const next = new Set(previous);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };
  
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
    return formatFullDateByLocale(dateString, locale);
  };
  
  // Format date with time for createdAt
  const formatDateTime = (dateString: string | Date | undefined) => {
    if (!dateString) return 'N/A';
    return formatDateTimeByLocale(dateString, locale);
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
      <div className="overflow-x-auto overflow-y-auto flex-1 h-full">
        <table className="w-full min-w-[800px]">
          {/* Table Header with Sorting - Sticky */}
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
            <tr>
              <th scope="col" className="w-14 px-2 py-3">
                <span className="sr-only">{t('detail.orderInformation')}</span>
              </th>
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
              const isExpanded = expandedOrderIds.has(order.id);
              const informationId = `${tableId}-order-${order.id}`;
              return (
              <React.Fragment key={order.id}>
              <tr className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${orderIsSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <td className="px-2 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 text-gray-600 dark:text-gray-300"
                    aria-expanded={isExpanded}
                    aria-controls={informationId}
                    aria-label={t(isExpanded ? 'actions.collapseOrder' : 'actions.expandOrder', { orderNumber: order.orderNumber })}
                    title={t(isExpanded ? 'actions.collapseOrder' : 'actions.expandOrder', { orderNumber: order.orderNumber })}
                    onClick={() => toggleOrderExpanded(order.id)}
                  >
                    <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${isExpanded ? 'rotate-180' : '-rotate-90'}`} />
                  </Button>
                </td>
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
                  <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                    {order.orderNumber}
                    {((order as any).loyaltyPointsRedeemed > 0 || (order as any).loyaltyPointsEarned > 0) && (
                      <Gift className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" title="Có hoạt động điểm thưởng" />
                    )}
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
                      <span>{t('actions.details')}</span>
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
              <tr id={informationId} hidden={!isExpanded} className="bg-gray-50 dark:bg-gray-800/50">
                {isExpanded && (
                  <td colSpan={9 + (onSelectionChange ? 1 : 0) + (showMerchant ? 1 : 0)} className="px-6 py-5">
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {t('detail.orderInformation')} · {order.orderNumber}
                      </h3>
                      <dl className="grid grid-cols-2 gap-x-8 gap-y-4 xl:grid-cols-4">
                        {[
                          [t('customer.name'), order.customerName || '—'],
                          [t('customer.phone'), formatPhoneNumber(order.customerPhone || '') || '—'],
                          [t('messages.outlet'), order.outletName || '—'],
                          [t('items.title'), String(order.itemCount)],
                          [t('amount.total'), formatMoney(order.totalAmount)],
                          [t('amount.deposit'), formatMoney(order.depositAmount)],
                          ...(order.orderType === 'RENT' ? [
                            [t('dates.pickupDate'), formatDateTime(order.pickupPlanAt)],
                            [t('dates.returnDate'), formatDateTime(order.returnPlanAt)],
                          ] : []),
                          [t('dates.createdDate'), formatDateTime(order.createdAt)],
                        ].map(([label, value]) => (
                          <div key={label} className="min-w-0">
                            <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
                            <dd className="mt-1 break-words text-sm font-medium text-gray-900 dark:text-white">{value}</dd>
                          </div>
                        ))}
                      </dl>
                      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('detail.notes')}</p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-900 dark:text-white">
                          {order.notes?.trim() || t('detail.noNotes')}
                        </p>
                      </div>
                    </div>
                  </td>
                )}
              </tr>
              </React.Fragment>
            );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
});

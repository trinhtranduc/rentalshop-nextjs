'use client';

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
import { Edit, Trash2, ShoppingBag, MoreVertical, User, Medal, Award, Crown, Gem, Diamond, Star } from 'lucide-react';
import { useCustomerTranslations, useTableSelection } from '@rentalshop/hooks';
// Shop clock (Asia/Ho_Chi_Minh), independent of the browser timezone
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});
const fmtDateTime = (value?: string | Date | null) => (value ? dateTimeFormat.format(new Date(value)).replace(',', '') : '—');
import { formatPhoneNumber } from '@rentalshop/utils';
import { Copy } from 'lucide-react';
import { useToast } from '@rentalshop/ui';

interface CustomerTableProps {
  customers: Customer[];
  onCustomerAction: (action: string, customerId: number) => void;
  onSelectionChange?: (selectedCustomerIds: number[]) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  canManageCustomers?: boolean; // Permission to manage customers (show delete option)
  showMerchantColumn?: boolean; // Show merchant column (for admin customers page)
}

const getTierIcon = (icon?: string | null) => {
  switch ((icon || '').toLowerCase()) {
    case 'medal':
      return Medal;
    case 'award':
      return Award;
    case 'crown':
      return Crown;
    case 'gem':
      return Gem;
    case 'diamond':
      return Diamond;
    case 'star':
      return Star;
    case 'user':
    default:
      return User;
  }
};

export function CustomerTable({ 
  customers, 
  onCustomerAction,
  onSelectionChange,
  sortBy = 'createdAt', 
  sortOrder = 'desc',
  onSort,
  canManageCustomers = false,
  showMerchantColumn = false
}: CustomerTableProps) {
  const t = useCustomerTranslations();
  const [openDropdownId, setOpenDropdownId] = React.useState<string | null>(null);
  const { toastSuccess } = useToast();
  
  const handleCopyPhone = (phone: string | null | undefined) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    toastSuccess(t('fields.phone'), phone);
  };
  
  // Use reusable selection hook
  const {
    selectedIdsSet: selectedCustomerIds,
    allSelected,
    someSelected,
    handleToggleSelect,
    handleSelectAll,
    isSelected,
  } = useTableSelection(customers, onSelectionChange);
  
  if (customers.length === 0) {
    return (
      <Card className="shadow-sm border-gray-200 dark:border-gray-700 h-full flex flex-col">
        <CardContent className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-medium mb-2">
              {t('messages.noCustomers')}
            </h3>
            <p className="text-sm">
              {t('messages.noCustomersDescription')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleSort = (column: string) => {
    if (onSort) onSort(column);
  };

  const name = (c: Customer) => [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || c.phone || '—';
  const place = (c: Customer) => [c.city, c.state].filter(Boolean).join(', ');
  const sortMark = (column: string) => (sortBy === column ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : '');
  const ariaSort = (column: string): 'ascending' | 'descending' | 'none' =>
    sortBy === column ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none';

  // Only an active tier is worth a badge; "loyalty off" on every row was noise
  const tierBadge = (c: Customer) =>
    c.loyaltyStatus === 'active' && c.loyalty?.tier?.name ? (
      <span
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold"
        style={{
          borderColor: c.loyalty.tier.color || undefined,
          color: c.loyalty.tier.color || undefined,
          backgroundColor: c.loyalty.tier.color ? `${c.loyalty.tier.color}14` : undefined,
        }}
      >
        {React.createElement(getTierIcon(c.loyalty.tier.icon), { className: 'h-3.5 w-3.5', 'aria-hidden': true } as any)}
        {c.loyalty.tier.name}
      </span>
    ) : null;

  // Keyed by surface: the phone list and the table each render a menu (two open copies closed each other)
  const actionsMenu = (c: Customer, surface: 'list' | 'table') => {
    const menuId = `${surface}-${c.id}`;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            aria-label={`${t('actions.title')}: ${name(c)}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdownId(openDropdownId === menuId ? null : menuId);
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          open={openDropdownId === menuId}
          onOpenChange={(open: boolean) => setOpenDropdownId(open ? menuId : null)}
        >
          <DropdownMenuItem onClick={() => { onCustomerAction('edit', c.id); setOpenDropdownId(null); }}>
            <Edit className="h-4 w-4 mr-2" />
            {t('actions.editCustomer')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { onCustomerAction('viewOrders', c.id); setOpenDropdownId(null); }}>
            <ShoppingBag className="h-4 w-4 mr-2" />
            {t('actions.viewOrders')}
          </DropdownMenuItem>
          {canManageCustomers && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { onCustomerAction('delete', c.id); setOpenDropdownId(null); }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('actions.deleteCustomer')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const phoneCell = (c: Customer) =>
    c.phone ? (
      <span className="inline-flex items-center gap-1">
        <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} className="font-medium tabular-nums text-gray-900 hover:text-blue-700 hover:underline">
          {formatPhoneNumber(c.phone)}
        </a>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleCopyPhone(c.phone); }}
          aria-label={`${t('fields.phone')}: copy`}
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </span>
    ) : (
      <span className="text-gray-500">—</span>
    );

  const open = (c: Customer) => onCustomerAction('view', c.id);
  const th = 'px-4 py-2.5 text-left text-xs font-medium text-gray-600';

  return (
    <Card className="shadow-sm border border-gray-200 h-full flex flex-col">
      {/* Phones: one card per customer */}
      <ul className="divide-y divide-gray-100 overflow-y-auto flex-1 h-full md:hidden">
        {customers.map((c) => (
          <li key={c.id} className="flex items-start gap-3 px-4 py-3" onClick={() => open(c)}>
            <div className="min-w-0 flex-1">
              <button type="button" onClick={(e) => { e.stopPropagation(); open(c); }} className="block max-w-full truncate text-left text-sm font-semibold text-gray-900">
                {name(c)}
              </button>
              <div className="mt-0.5 text-sm">{phoneCell(c)}</div>
              {(place(c) || tierBadge(c)) && (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  {tierBadge(c)}
                  {place(c) && <span className="truncate">{place(c)}</span>}
                </div>
              )}
            </div>
            <div onClick={(e) => e.stopPropagation()}>{actionsMenu(c, 'list')}</div>
          </li>
        ))}
      </ul>

      {/* Tablet and up: table */}
      <div className="hidden md:block overflow-y-auto flex-1 h-full">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
            <tr>
              <th className={`${th} w-12`}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => { if (input) input.indeterminate = someSelected; }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  aria-label={t('actions.selectAll')}
                />
              </th>
              <th className={th} aria-sort={ariaSort('name')}>
                <button type="button" onClick={() => handleSort('name')} className="font-medium hover:text-gray-900">
                  {t('fields.name')}{sortMark('name')}
                </button>
              </th>
              <th className={th}>{t('fields.phone')}</th>
              <th className={`${th} hidden lg:table-cell`}>{t('fields.location')}</th>
              {showMerchantColumn && <th className={th}>{t('fields.merchant')}</th>}
              <th className={`${th} hidden xl:table-cell`} aria-sort={ariaSort('createdAt')}>
                <button type="button" onClick={() => handleSort('createdAt')} className="font-medium hover:text-gray-900">
                  {t('fields.createdAt')}{sortMark('createdAt')}
                </button>
              </th>
              <th className={`${th} w-12`}><span className="sr-only">{t('actions.title')}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customers.map((c) => (
              <tr
                key={c.id}
                onClick={() => open(c)}
                className={`cursor-pointer transition-colors ${isSelected(c.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedCustomerIds.has(c.id)}
                    onChange={() => handleToggleSelect(c.id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    aria-label={name(c)}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); open(c); }}
                      className="max-w-[16rem] truncate text-left font-semibold text-gray-900 hover:text-blue-700 hover:underline"
                    >
                      {name(c)}
                    </button>
                    {tierBadge(c)}
                  </div>
                  {c.email && <p className="max-w-[16rem] truncate text-xs text-gray-600">{c.email}</p>}
                </td>
                <td className="px-4 py-2.5">{phoneCell(c)}</td>
                <td className="hidden px-4 py-2.5 text-gray-700 lg:table-cell">{place(c) || '—'}</td>
                {showMerchantColumn && <td className="px-4 py-2.5 text-gray-900">{c.merchant?.name || '—'}</td>}
                <td className="hidden px-4 py-2.5 tabular-nums text-gray-700 xl:table-cell">{fmtDateTime(c.createdAt as any)}</td>
                <td className="px-2 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>{actionsMenu(c, 'table')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

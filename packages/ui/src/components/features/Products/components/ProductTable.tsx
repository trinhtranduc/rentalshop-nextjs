'use client'

import React from 'react';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../../../ui/dropdown-menu';
import { useFormatCurrency } from '@rentalshop/ui';
import { useProductTranslations, useCommonTranslations, useTableSelection } from '@rentalshop/hooks';
import { usePermissions } from '@rentalshop/hooks';
import { Product } from '@rentalshop/types';
import { getProductImageUrl } from '@rentalshop/utils/client';
import {
  resolveProductListStockDisplay,
  type ProductListStockInput,
} from '@rentalshop/utils';
import { Eye, Edit, ShoppingCart, Trash2, MoreVertical, Package } from 'lucide-react';
import { ImageLightbox } from '../../../ui/image-lightbox';

interface ProductTableProps {
  products: Product[];
  onProductAction: (action: string, productId: number) => void;
  onSelectionChange?: (selectedProductIds: number[]) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  showMerchantColumn?: boolean; // Show merchant column (for admin products page)
  /** When set (product list filter), stock numbers reflect this outlet row only—not merchant-wide rollup. */
  scopedOutletId?: number;
}

export function ProductTable({ 
  products, 
  onProductAction,
  onSelectionChange,
  sortBy = 'name', 
  sortOrder = 'asc',
  onSort,
  showMerchantColumn = false,
  scopedOutletId
}: ProductTableProps) {
  // ✅ Use permissions hook for UI control
  const { canManageProducts, canUpdateProducts, canViewProducts, canDeleteOrders } = usePermissions();
  
  // Use formatCurrency hook - automatically uses merchant's currency
  const formatMoney = useFormatCurrency();
  const t = useProductTranslations();
  const tc = useCommonTranslations();
  
  // Use reusable selection hook
  const {
    selectedIdsSet: selectedProductIds,
    allSelected,
    someSelected,
    handleToggleSelect,
    handleSelectAll,
    isSelected,
  } = useTableSelection(products, onSelectionChange);
  
  if (products.length === 0) {
    return (
      <Card className="shadow-sm border-gray-200 dark:border-gray-700 h-full flex flex-col">
        <CardContent className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-lg font-medium mb-2">{t('messages.noProducts')}</h3>
            <p className="text-sm">
              {t('messages.noProductsDescription')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleSort = (column: string) => {
    if (onSort) {
      onSort(column);
    }
  };

  // Shop clock for the created date (a hook used to be called inside the row loop)
  const createdFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });
  const pricingSuffix = (product: Product) => {
    const type = (product as any).pricingType;
    return type === 'HOURLY' ? `/${t('pricing.durationUnitHours')}` : type === 'DAILY' ? `/${t('pricing.durationUnitDays')}` : '';
  };
  const thumb = (product: Product, size = 'h-10 w-10') => {
    const imageUrl = getProductImageUrl(product);
    const hasImage = Boolean(imageUrl && imageUrl.trim() !== '' && product.images && product.images.length > 0);
    return hasImage ? (
      <ImageLightbox src={imageUrl} alt={product.name} triggerClassName={`${size} shrink-0 rounded-md border border-gray-200`} imgClassName="rounded-md object-cover" />
    ) : (
      <span className={`${size} flex shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50`}>
        <Package className="h-4 w-4 text-gray-400" aria-hidden="true" />
      </span>
    );
  };
  /** Stock on one line: free / total with a bar, rentals out only when there are any. */
  const stockCell = (product: Product) => {
    const stock = resolveProductListStockDisplay(product as ProductListStockInput, scopedOutletId);
    const pct = stock.totalStock > 0 ? Math.min(100, Math.round((stock.available / stock.totalStock) * 100)) : 0;
    const empty = stock.available <= 0;
    return (
      <div className="min-w-[8rem]" title={stock.showBranchesHint ? t('inventory.listRollupHint', { count: stock.outletBranchCount }) : undefined}>
        <p className="text-sm tabular-nums">
          <span className={`font-semibold ${empty ? 'text-red-700' : 'text-gray-900'}`}>{stock.available}</span>
          <span className="text-gray-500"> / {stock.totalStock} {t('list.free')}</span>
        </p>
        <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
          <div className={`h-full rounded-full ${empty ? 'bg-red-500' : pct < 25 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
        </div>
        {stock.renting > 0 && <p className="mt-0.5 text-xs text-gray-600">{t('list.rentingOut', { count: stock.renting })}</p>}
      </div>
    );
  };
  const actionsMenu = (product: Product) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={t('list.moreActions', { name: product.name })}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canViewProducts && (
          <DropdownMenuItem onClick={() => onProductAction('view', product.id)}>
            <Eye className="mr-2 h-4 w-4" />
            {t('actions.viewDetails')}
          </DropdownMenuItem>
        )}
        {canUpdateProducts && (
          <DropdownMenuItem onClick={() => onProductAction('edit', product.id)}>
            <Edit className="mr-2 h-4 w-4" />
            {t('actions.edit')}
          </DropdownMenuItem>
        )}
        {canViewProducts && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onProductAction('view-orders', product.id)}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              {t('actions.viewOrders')}
            </DropdownMenuItem>
          </>
        )}
        {canManageProducts && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onProductAction('delete', product.id)} className="text-red-700 focus:text-red-800">
              <Trash2 className="mr-2 h-4 w-4" />
              {t('actions.delete')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const nameButton = (product: Product) => (
    <button
      type="button"
      onClick={() => onProductAction('view', product.id)}
      className="text-left text-sm font-medium text-gray-900 hover:text-blue-700 hover:underline"
    >
      {product.name}
    </button>
  );
  const sortHeader = (column: string, label: string) => (
    <button type="button" onClick={() => handleSort(column)} className="inline-flex items-center gap-1 hover:text-gray-900">
      {label}
      {sortBy === column && <span aria-hidden="true">{sortOrder === 'desc' ? '↓' : '↑'}</span>}
    </button>
  );
  const th = 'px-3 py-2.5 text-left text-xs font-medium text-gray-600';

  return (
    <Card className="flex h-full flex-col border border-gray-200 shadow-sm">
      {/* Phones: one card per product */}
      <ul className="divide-y divide-gray-100 md:hidden">
        {products.map((product) => (
          <li key={product.id} className="flex items-start gap-3 p-3">
            {thumb(product, 'h-12 w-12')}
            <div className="min-w-0 flex-1">
              {nameButton(product)}
              <p className="text-xs text-gray-600">
                {[(product as any).category?.name, product.barcode].filter(Boolean).join(' · ')}
              </p>
              <div className="mt-1.5 flex flex-wrap items-start gap-x-4 gap-y-1">
                <p className="text-sm tabular-nums">
                  <span className="font-semibold text-gray-900">{formatMoney(product.rentPrice || 0)}</span>
                  <span className="text-xs text-gray-500">{pricingSuffix(product)}</span>
                </p>
                {stockCell(product)}
              </div>
            </div>
            {actionsMenu(product)}
          </li>
        ))}
      </ul>

      <div className="hidden h-full flex-1 overflow-y-auto md:block">
        <table className="w-full">
          <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
            <tr>
              {onSelectionChange && (
                <th className={`${th} w-10`}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someSelected;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded text-blue-600 focus:ring-blue-500"
                    aria-label={allSelected ? tc('actions.deselectAll') || 'Deselect all' : tc('actions.selectAll') || 'Select all'}
                  />
                </th>
              )}
              <th className={th}>{sortHeader('name', t('productName'))}</th>
              {showMerchantColumn && <th className={th}>Merchant</th>}
              <th className={th}>{tc('labels.category')}</th>
              <th className={`${th} text-right`}>{t('list.rentPrice')}</th>
              <th className={th}>{t('list.stock')}</th>
              <th className={`${th} hidden min-[1400px]:table-cell`}>{sortHeader('createdAt', tc('labels.createdAt'))}</th>
              <th className={`${th} w-12`}>
                <span className="sr-only">{tc('labels.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {products.map((product) => {
              const selected = isSelected(product.id);
              return (
                <tr key={product.id} className={selected ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                  {onSelectionChange && (
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => handleToggleSelect(product.id)}
                        className="h-4 w-4 cursor-pointer rounded text-blue-600 focus:ring-blue-500"
                        aria-label={t('list.select', { name: product.name })}
                      />
                    </td>
                  )}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      {thumb(product)}
                      <div className="min-w-0">
                        {nameButton(product)}
                        {product.barcode && <p className="text-xs text-gray-600">{product.barcode}</p>}
                      </div>
                    </div>
                  </td>
                  {showMerchantColumn && (
                    <td className="px-3 py-2.5 text-sm text-gray-900">{(product as any).merchant?.name || '—'}</td>
                  )}
                  <td className="px-3 py-2.5 text-sm text-gray-700">{(product as any).category?.name || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <p className="text-sm font-semibold tabular-nums text-gray-900">
                      {formatMoney(product.rentPrice || 0)}
                      <span className="text-xs font-normal text-gray-500">{pricingSuffix(product)}</span>
                    </p>
                    {product.salePrice && product.salePrice > 0 ? (
                      <p className="text-xs tabular-nums text-gray-600">
                        {t('price.sale')} {formatMoney(product.salePrice)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">{stockCell(product)}</td>
                  <td className="hidden whitespace-nowrap px-3 py-2.5 text-sm tabular-nums text-gray-600 min-[1400px]:table-cell">
                    {product.createdAt ? createdFormat.format(new Date(product.createdAt as any)) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right">{actionsMenu(product)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

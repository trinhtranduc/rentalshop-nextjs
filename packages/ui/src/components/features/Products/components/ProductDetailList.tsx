'use client'

import React from 'react';
import { useProductTranslations, useCommonTranslations, usePermissions } from '@rentalshop/hooks';
import { Package } from 'lucide-react';
import { ImageLightbox } from '../../../ui/image-lightbox';
import type { ProductWithStock } from '@rentalshop/types';
import { getRentalPriceLabel, formatRentalPrice } from '../utils';
import { useFormatCurrency } from '@rentalshop/ui';

interface ProductDetailListProps {
  product: ProductWithStock;
  onEdit?: () => void;
  onViewOrders?: () => void;
  showActions?: boolean;
  isMerchantAccount?: boolean;
  className?: string;
}

// Shop clock (Asia/Ho_Chi_Minh), independent of the browser timezone
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const fmtDateTime = (value?: string | Date | null) => (value ? dateTimeFormat.format(new Date(value)).replace(',', '') : '—');

const normalizeImages = (images: string | string[] | null | undefined): string[] => {
  if (!images) return [];
  if (Array.isArray(images)) return images.filter(Boolean);
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : images.split(',').filter(Boolean);
  } catch {
    return images.split(',').filter(Boolean);
  }
};

/**
 * Product view, laid out like the create/edit form (Shopify-style) so the three screens read the same:
 * main column = description, photos, prices, stock per outlet; side column = category, barcode, SKU.
 * The name is the page title, so it is not repeated here.
 */
export const ProductDetailList: React.FC<ProductDetailListProps> = ({
  product,
  isMerchantAccount = false,
  className = '',
}) => {
  const t = useProductTranslations();
  const tc = useCommonTranslations();
  const formatCurrency = useFormatCurrency();
  const { hasPermission } = usePermissions();
  const canViewCostPrice = hasPermission('products.manage');
  const images = normalizeImages(product.images as any);
  const outletStock = product.outletStock || [];
  const totals = outletStock.reduce(
    (acc, os) => ({ stock: acc.stock + os.stock, available: acc.available + os.available, renting: acc.renting + os.renting }),
    { stock: 0, available: 0, renting: 0 }
  );
  const options = ((product as any).pricingOptions as Array<{ type?: string; price?: number; isActive?: boolean }>) || [];
  const daily = options.find((o) => (o.type || '').toUpperCase() === 'DAILY' && o.isActive !== false && (o.price ?? 0) > 0);
  const anyProduct = product as any;

  const card = 'rounded-xl border border-gray-200 bg-white p-4 sm:p-5';
  const priceRow = (label: string, value: React.ReactNode, hint?: string, strong = false) => (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-sm text-gray-600">
        {label}
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </dt>
      <dd className={`tabular-nums ${strong ? 'text-xl font-bold text-gray-900' : 'text-sm font-semibold text-gray-900'}`}>{value}</dd>
    </div>
  );

  const heading = (id: string, text: string) => (
    <h2 id={id} className="mb-2 text-sm font-semibold text-gray-900">
      {text}
    </h2>
  );

  return (
    <div className={`grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start ${className}`}>
      <div className="min-w-0 space-y-4">
        {/* Description */}
        <section className={card} aria-labelledby="desc-title">
          {heading('desc-title', t('fields.description'))}
          <p className={`whitespace-pre-wrap text-sm ${product.description ? 'text-gray-900' : 'text-gray-500'}`}>
            {product.description || '—'}
          </p>
        </section>

        {/* Photos */}
        <section className={card} aria-labelledby="images-title">
          {heading('images-title', t('fields.images'))}
          {images.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {images.map((src, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded-lg border border-gray-200">
                  <ImageLightbox src={src} alt={`${product.name} ${i + 1}`} triggerClassName="h-full w-full" imgClassName="object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-500">
              <div className="text-center">
                <Package className="mx-auto h-7 w-7" aria-hidden="true" />
                <p className="mt-1 text-xs">{t('view.noImage')}</p>
              </div>
            </div>
          )}
        </section>

        {/* Prices, in the same 2-column grid as the form */}
        <section className={card} aria-labelledby="price-title">
          {heading('price-title', t('pricing.title'))}
          <dl className="grid gap-x-6 sm:grid-cols-2">
            {priceRow(
              t('fields.rentPrice'),
              formatRentalPrice(product.rentPrice, product.pricingType, t, formatCurrency),
              getRentalPriceLabel(product.pricingType, t),
              true
            )}
            {daily && priceRow(t('view.dailyPrice'), `${formatCurrency(daily.price || 0)}${t('view.perDay')}`)}
            {priceRow(t('fields.deposit'), formatCurrency(product.deposit || 0), t('view.depositHint'))}
            {product.salePrice && product.salePrice > 0 ? priceRow(t('fields.salePrice'), formatCurrency(product.salePrice)) : null}
            {canViewCostPrice && (product.costPrice ?? 0) > 0 ? priceRow(t('fields.costPrice'), formatCurrency(product.costPrice ?? 0)) : null}
          </dl>
        </section>

        {/* Stock per outlet, shown, not behind "view more" */}
        <section className={card} aria-labelledby="stock-title">
          {heading('stock-title', t('view.stockTitle'))}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-600">
                  <th className="py-2 pr-3 font-medium">{t('view.outlet')}</th>
                  <th className="py-2 pl-3 text-right font-medium">{t('inventory.totalStock')}</th>
                  <th className="py-2 pl-3 text-right font-medium">{t('inventory.availableStock')}</th>
                  <th className="py-2 pl-3 text-right font-medium">{t('fields.renting')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {outletStock.map((os, i) => (
                  <tr key={os.outlet?.id || os.id || i}>
                    <td className="py-2 pr-3 text-gray-900">{os.outlet?.name || '—'}</td>
                    <td className="py-2 pl-3 text-right tabular-nums text-gray-900">{os.stock}</td>
                    <td className={`py-2 pl-3 text-right font-semibold tabular-nums ${os.available > 0 ? 'text-emerald-700' : 'text-red-700'}`}>{os.available}</td>
                    <td className="py-2 pl-3 text-right tabular-nums text-gray-700">{os.renting}</td>
                  </tr>
                ))}
              </tbody>
              {outletStock.length > 1 && (
                <tfoot>
                  <tr className="border-t border-gray-200 font-semibold">
                    <td className="py-2 pr-3 text-gray-900">{tc('labels.total')}</td>
                    <td className="py-2 pl-3 text-right tabular-nums">{totals.stock}</td>
                    <td className="py-2 pl-3 text-right tabular-nums text-emerald-700">{totals.available}</td>
                    <td className="py-2 pl-3 text-right tabular-nums">{totals.renting}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      </div>

      {/* Side column: organisation, as on the form */}
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-4">
        <section className={card} aria-labelledby="org-title">
          {heading('org-title', t('form.sectionOrganise'))}
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium text-gray-600">{tc('labels.category')}</dt>
              <dd className="mt-0.5 text-gray-900">{anyProduct.category?.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-600">{t('fields.barcode')}</dt>
              <dd className="mt-0.5 break-all font-mono text-gray-900">{product.barcode || '—'}</dd>
            </div>
            {anyProduct.sku && anyProduct.sku !== product.barcode && (
              <div>
                <dt className="text-xs font-medium text-gray-600">SKU</dt>
                <dd className="mt-0.5 break-all font-mono text-gray-900">{anyProduct.sku}</dd>
              </div>
            )}
          </dl>
          <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
            {t('view.updated', { created: fmtDateTime(product.createdAt as any), updated: fmtDateTime(product.updatedAt as any) })}
          </p>
        </section>
      </aside>
    </div>
  );
};

import React from 'react';
import { Card, CardContent } from '../../../ui/card';
import { Package } from 'lucide-react';
import { useOrderTranslations } from '@rentalshop/hooks';
import { useFormatCurrency } from '@rentalshop/ui';
import type { OrderWithDetails } from '@rentalshop/types';

interface OrderProductsListProps {
  order: OrderWithDetails;
}

/** Notes written by the system on seeded/imported orders ("Product 3 - Furniture - RENT") repeat the name. */
const isAutoNote = (note: string, name: string) => {
  const n = note.trim().toLowerCase();
  return n === name.toLowerCase() || /^.+ - (rent|sale)$/i.test(note.trim()) && n.startsWith(name.toLowerCase());
};

/** One line per item: name, quantity × price and pricing, line total; the item sum at the bottom. */
export const OrderProductsList: React.FC<OrderProductsListProps> = ({ order }) => {
  const t = useOrderTranslations();
  const formatMoney = useFormatCurrency();
  const isRent = order.orderType === 'RENT';
  const items = order.orderItems || [];
  const sum = items.reduce((acc, item) => acc + (item.totalPrice || (item.quantity || 1) * (item.unitPrice || 0)), 0);

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-slate-900">{t('detailItems.title')}</h2>
          <span className="text-xs tabular-nums text-slate-600">{items.length}</span>
        </div>
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-600">{t('items.noItems')}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item, index) => {
              const anyItem = item as any;
              const name: string = item.product?.name || anyItem.productName || '—';
              const image: string | undefined = anyItem.productImages?.[0] || (item.product as any)?.images?.[0];
              const pricingType = String(anyItem.pricingType || 'FIXED').toUpperCase();
              const isDaily = isRent && pricingType === 'DAILY';
              const days = Math.max(1, anyItem.rentalDays || 1);
              const note: string = anyItem.notes || '';
              const lineTotal = item.totalPrice || (item.quantity || 1) * (item.unitPrice || 0);
              return (
                <li key={item.id ?? index} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                    {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-slate-400" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{name}</p>
                    <p className="text-xs tabular-nums text-slate-600">
                      {item.quantity} × {formatMoney(item.unitPrice)}
                      {isRent && <> · {t(`form.pricing.${isDaily ? 'DAILY' : 'FIXED'}`)}</>}
                      {isDaily && <> × {t('detailInfo.days', { count: days })}</>}
                      {isRent && anyItem.deposit > 0 && <> · {t('detailItems.depositEach', { amount: formatMoney(anyItem.deposit) })}</>}
                    </p>
                    {note && !isAutoNote(note, name) && <p className="mt-0.5 text-xs text-slate-700">{note}</p>}
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{formatMoney(lineTotal)}</span>
                </li>
              );
            })}
          </ul>
        )}
        {items.length > 0 && (
          <div className="mt-1 flex justify-between border-t border-slate-200 pt-2 text-sm">
            <span className="text-slate-600">{isRent ? t('form.summary.rentTotal') : t('form.summary.saleTotal')}</span>
            <span className="font-semibold tabular-nums text-slate-900">{formatMoney(sum)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

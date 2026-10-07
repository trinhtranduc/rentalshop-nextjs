'use client';

/**
 * Sửa đơn (#523): the Tạo đơn screen with the order loaded. `[id]` is the order number.
 * Same edit rule as before: a reserved rental or a completed sale; the order type is locked.
 */
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useDedupedApi } from '@rentalshop/hooks';
import { ordersApi } from '@rentalshop/utils';
import { cardClass, outlineBtn, type T } from '../../list/parts';
import { DetailSkeleton } from '../../detail/sections';
import { OrderEditor } from '../../create/OrderEditor';
import { canEditOrder, type OrderLike } from '../../create/create-model';

type EditableOrder = OrderLike & { id: number; orderNumber: string };

export default function EditOrderPage() {
  const params = useParams();
  const orderNumber = String(params.id || '').replace(/^ORD-/, '');
  const t = useTranslations('orders.web') as unknown as T;

  const { data, loading, error } = useDedupedApi({
    filters: { orderNumber, edit: true },
    fetchFn: async () => {
      const result = await ordersApi.getOrderByNumber(orderNumber);
      if (!result.success || !result.data) throw new Error(result.error || 'ORDER_NOT_FOUND');
      return result.data;
    },
    enabled: !!orderNumber,
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
  const order = (data || null) as unknown as EditableOrder | null;

  if (loading && !order) return <DetailSkeleton />;

  if (!order || !canEditOrder(order)) {
    const message = !order ? (error && !/not.?found/i.test(error.message || '') ? t('detail.loadFailed') : t('detail.notFound')) : t('editor.notEditable');
    return (
      <div className="mx-auto box-border flex w-full max-w-[640px] flex-col gap-4 px-4 pb-12 pt-10 text-ar-ink sm:px-8">
        <div className={`${cardClass} flex flex-col items-start gap-4 p-6`} role="alert">
          <h1 className="m-0 text-xl font-bold">{message}</h1>
          <div className="flex flex-wrap gap-2">
            {order && (
              <Link href={`/orders/${order.orderNumber}`} className={outlineBtn}>
                {t('editor.backToOrder', { number: order.orderNumber })}
              </Link>
            )}
            <Link href="/orders" className={outlineBtn}>
              {t('detail.back')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <OrderEditor key={order.id} order={order} />;
}

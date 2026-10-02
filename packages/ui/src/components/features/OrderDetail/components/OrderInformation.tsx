import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '../../../ui/card';
import { CalendarDays, Copy, Phone, Store, User } from 'lucide-react';
import { useOrderTranslations } from '@rentalshop/hooks';
import { formatPhoneNumber, countRentalDays } from '@rentalshop/utils';
import type { OrderWithDetails } from '@rentalshop/types';
import { useToast } from '@rentalshop/ui';
import { overdueDays } from '../order-dates';

interface OrderInformationProps {
  order: OrderWithDetails;
}

// Shop clock (Asia/Ho_Chi_Minh), independent of the browser timezone
const dateFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const fmtDate = (value?: string | Date | null) => (value ? dateFormat.format(new Date(value)) : '—');
const fmtDateTime = (value?: string | Date | null) => (value ? dateTimeFormat.format(new Date(value)).replace(',', '') : '—');

/**
 * "Khách & lịch": who the order is for, when, and whether it is late.
 * Labels sit next to their values (the old two-column layout pushed values 300px away).
 */
export const OrderInformation: React.FC<OrderInformationProps> = ({ order }) => {
  const t = useOrderTranslations();
  const { toastSuccess } = useToast();
  const anyOrder = order as any;

  const name = order.customer?.firstName
    ? [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ').trim()
    : anyOrder.customerName || t('customer.noCustomer');
  const phone: string = (order.customer?.phone || anyOrder.customerPhone || '').trim();
  const customerId = order.customer?.id;
  const createdBy = anyOrder.createdBy
    ? [anyOrder.createdBy.firstName, anyOrder.createdBy.lastName].filter(Boolean).join(' ').trim()
    : '';
  const isRent = order.orderType === 'RENT';
  const days = isRent && order.pickupPlanAt && order.returnPlanAt ? countRentalDays(order.pickupPlanAt as any, order.returnPlanAt as any) : 0;
  const late = overdueDays(order as any);

  const copyPhone = () => {
    navigator.clipboard.writeText(phone);
    toastSuccess(t('detailInfo.copied'), phone);
  };

  return (
    <Card>
      <CardContent className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        {/* Customer */}
        <div className="min-w-0 space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <User className="h-3.5 w-3.5" aria-hidden="true" />
            {t('detailInfo.customer')}
          </p>
          {customerId ? (
            <Link href={`/customers/${customerId}`} className="block truncate text-base font-semibold text-slate-900 hover:text-blue-700 hover:underline">
              {name}
            </Link>
          ) : (
            <p className="truncate text-base font-semibold text-slate-900">{name}</p>
          )}
          {phone && (
            <div className="flex items-center gap-1">
              <a href={`tel:${phone}`} className="inline-flex min-h-[28px] items-center gap-1.5 text-sm text-blue-700 hover:underline">
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {formatPhoneNumber(phone)}
              </a>
              <button
                type="button"
                onClick={copyPhone}
                aria-label={t('detailInfo.copyPhone')}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="min-w-0 space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {isRent ? t('detailInfo.schedule') : t('detailInfo.saleDate')}
          </p>
          {isRent ? (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold tabular-nums text-slate-900">
              <span>
                {fmtDate(order.pickupPlanAt as any)} → {fmtDate(order.returnPlanAt as any)}
              </span>
              {days > 0 && <span className="text-sm font-normal text-slate-600">· {t('detailInfo.days', { count: days })}</span>}
              {late > 0 && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                  {t('detailInfo.late', { count: late })}
                </span>
              )}
            </p>
          ) : (
            <p className="text-base font-semibold tabular-nums text-slate-900">{fmtDateTime(order.createdAt as any)}</p>
          )}
          {isRent && (anyOrder.pickedUpAt || anyOrder.returnedAt) && (
            <p className="text-xs text-slate-600">
              {anyOrder.pickedUpAt && t('detailInfo.pickedUpAt', { date: fmtDateTime(anyOrder.pickedUpAt) })}
              {anyOrder.pickedUpAt && anyOrder.returnedAt && ' · '}
              {anyOrder.returnedAt && t('detailInfo.returnedAt', { date: fmtDateTime(anyOrder.returnedAt) })}
            </p>
          )}
        </div>

        {/* Where and by whom */}
        <p className="flex flex-wrap items-center gap-x-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600 sm:col-span-2">
          <Store className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-medium text-slate-800">{order.outlet?.name || anyOrder.outletName || '—'}</span>
          <span>·</span>
          <span>
            {createdBy
              ? t('detailInfo.createdBy', { date: fmtDateTime(order.createdAt as any), name: createdBy })
              : t('detailInfo.created', { date: fmtDateTime(order.createdAt as any) })}
          </span>
        </p>
      </CardContent>
    </Card>
  );
};

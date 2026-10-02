'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { Contact, Copy, Mail, MapPin, Phone, StickyNote, Trash2 } from 'lucide-react';
import { useCustomerTranslations, useOrderTranslations } from '@rentalshop/hooks';
import { formatPhoneNumber } from '@rentalshop/utils';
import type { Customer } from '@rentalshop/types';
import { useFormatCurrency, useToast } from '@rentalshop/ui';

// Shop clock (Asia/Ho_Chi_Minh), independent of the browser timezone
const dateFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDate = (value?: string | Date | null) => (value ? dateFormat.format(new Date(value)) : '—');

const card = 'rounded-xl border border-gray-200 bg-white p-4 sm:p-5';

type CustomerOrder = { id: number; orderNumber: string; status: string; totalAmount: number; createdAt: string };

const STATUS_TONE: Record<string, string> = {
  RESERVED: 'bg-amber-50 text-amber-800',
  PICKUPED: 'bg-blue-50 text-blue-800',
  RETURNED: 'bg-emerald-50 text-emerald-800',
  COMPLETED: 'bg-emerald-50 text-emerald-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

export const customerDisplayName = (customer: Customer): string =>
  [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || customer.phone || '—';

const ordersOf = (customer: Customer): CustomerOrder[] =>
  (((customer as any).orders as CustomerOrder[]) || [])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

/** Totals for the side panel. Spend leaves out cancelled orders, like revenue elsewhere. */
export const customerOrderStats = (customer: Customer) => {
  const orders = ordersOf(customer);
  const live = orders.filter((o) => o.status !== 'CANCELLED');
  return {
    count: orders.length,
    spent: live.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0),
    renting: orders.filter((o) => o.status === 'PICKUPED').length,
    lastOrderAt: orders[0]?.createdAt || null,
  };
};

/** Main column: how to reach the customer and what is on file */
export const CustomerContactCard: React.FC<{ customer: Customer }> = ({ customer }) => {
  const t = useCustomerTranslations();
  const { toastSuccess } = useToast();
  const anyCustomer = customer as any;
  const address = [customer.address, customer.city, customer.state, customer.zipCode, customer.country].filter(Boolean).join(', ');

  const row = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2.5 sm:grid-cols-[9rem_minmax(0,1fr)]">
      <dt className="flex items-center gap-1.5 text-sm text-gray-600">
        {icon}
        {label}
      </dt>
      <dd className="min-w-0 break-words text-sm text-gray-900">{value}</dd>
    </div>
  );
  const icon = (Icon: React.ComponentType<{ className?: string }>) => <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;

  return (
    <section className={card} aria-labelledby="customer-contact-title">
      <h2 id="customer-contact-title" className="text-sm font-semibold text-gray-900">
        {t('profile.contact')}
      </h2>
      <dl className="mt-1 divide-y divide-gray-100">
        {row(
          icon(Phone),
          t('fields.phone'),
          customer.phone ? (
            <span className="inline-flex items-center gap-1">
              <a href={`tel:${customer.phone}`} className="font-semibold text-blue-700 hover:underline">
                {formatPhoneNumber(customer.phone)}
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(customer.phone || '');
                  toastSuccess(t('fields.phone'), customer.phone || '');
                }}
                aria-label={`${t('fields.phone')}: copy`}
                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </span>
          ) : (
            <span className="text-gray-500">{t('fields.notProvided')}</span>
          )
        )}
        {row(
          icon(Mail),
          t('fields.email'),
          customer.email ? (
            <a href={`mailto:${customer.email}`} className="text-blue-700 hover:underline">
              {customer.email}
            </a>
          ) : (
            <span className="text-gray-500">{t('fields.notProvided')}</span>
          )
        )}
        {row(icon(MapPin), t('fields.address'), address || <span className="text-gray-500">{t('fields.noAddress')}</span>)}
        {anyCustomer.idNumber && row(icon(Contact), t('fields.idNumber'), <span className="font-mono">{anyCustomer.idNumber}</span>)}
        {anyCustomer.notes && row(icon(StickyNote), t('fields.notes'), <span className="whitespace-pre-wrap">{anyCustomer.notes}</span>)}
      </dl>
    </section>
  );
};

/** Main column: the latest orders, newest first, each one a link */
export const CustomerRecentOrders: React.FC<{ customer: Customer; limit?: number }> = ({ customer, limit = 5 }) => {
  const t = useCustomerTranslations();
  const to = useOrderTranslations();
  const formatCurrency = useFormatCurrency();
  const orders = ordersOf(customer);

  return (
    <section className={card} aria-labelledby="customer-orders-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="customer-orders-title" className="text-sm font-semibold text-gray-900">
          {t('orders.title')}
        </h2>
        {orders.length > limit && (
          <Link href={`/customers/${customer.id}/orders`} className="text-sm font-medium text-blue-700 hover:underline">
            {t('orders.viewOrders')} ({orders.length})
          </Link>
        )}
      </div>
      {orders.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600">{t('orders.noOrders')}</p>
      ) : (
        <ul className="mt-1 divide-y divide-gray-100">
          {orders.slice(0, limit).map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.orderNumber}`}
                className="-mx-2 flex min-h-[44px] items-center gap-3 rounded-md px-2 py-2 hover:bg-gray-50"
              >
                <span className="font-mono text-sm font-semibold text-gray-900">#{o.orderNumber}</span>
                <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[o.status] || 'bg-gray-100 text-gray-700'}`}>
                  {to(`status.${o.status}`)}
                </span>
                <span className="ml-auto text-xs tabular-nums text-gray-600">{fmtDate(o.createdAt)}</span>
                <span className={`w-24 text-right text-sm font-semibold tabular-nums ${o.status === 'CANCELLED' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                  {formatCurrency(Number(o.totalAmount) || 0)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

interface CustomerSummaryPanelProps {
  customer: Customer;
  onDelete?: () => void;
  isUpdating?: boolean;
}

/** Side column: what this customer is worth to the shop, and the rare risky action */
export const CustomerSummaryPanel: React.FC<CustomerSummaryPanelProps> = ({ customer, onDelete, isUpdating }) => {
  const t = useCustomerTranslations();
  const formatCurrency = useFormatCurrency();
  const stats = customerOrderStats(customer);

  const stat = (label: string, value: React.ReactNode, strong = false) => (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-sm text-gray-600">{label}</dt>
      <dd className={`tabular-nums ${strong ? 'text-lg font-bold text-gray-900' : 'text-sm font-semibold text-gray-900'}`}>{value}</dd>
    </div>
  );

  return (
    <section className={card} aria-labelledby="customer-summary-title">
      <h2 id="customer-summary-title" className="text-sm font-semibold text-gray-900">
        {t('stats.title')}
      </h2>
      <dl className="mt-1 divide-y divide-gray-100">
        {stat(t('orders.totalSpent'), formatCurrency(stats.spent), true)}
        {stat(t('orders.totalOrders'), stats.count)}
        {stats.renting > 0 && stat(t('orders.activeOrders'), <span className="text-blue-700">{stats.renting}</span>)}
        {stat(t('stats.lastOrder'), fmtDate(stats.lastOrderAt))}
        {stat(t('stats.memberSince'), fmtDate(customer.createdAt as any))}
      </dl>
      {onDelete && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={onDelete}
            disabled={isUpdating}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-1 text-sm font-medium text-red-700 hover:text-red-800 hover:underline disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {t('actions.deleteCustomer')}
          </button>
        </div>
      )}
    </section>
  );
};

/** Loyalty stays folded: most shops do not use it on every customer */
export const CustomerLoyaltyFold: React.FC<{ children: React.ReactNode; label: string }> = ({ children, label }) => {
  const [open, setOpen] = useState(false);
  return (
    <section className={card}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-gray-900"
      >
        {label}
        <span className="text-xs font-medium text-blue-700">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
};

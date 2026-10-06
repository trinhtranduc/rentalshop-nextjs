'use client';

/**
 * Hồ sơ khách (#541): contact, latest orders, Số đơn / Đã chi (cancelled excluded) / Đang thuê,
 * reward points when the shop's loyalty program is on, and delete. Same API calls as the list panel.
 */
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useFormatCurrency, useToast } from '@rentalshop/ui';
import { usePermissions } from '@rentalshop/hooks';
import { formatDateKeyInTimeZone, getLocalDateKey, SHOP_TIMEZONE } from '@rentalshop/utils';
import { cardClass, outlineBtn, type T } from '../../orders/list/parts';
import { customerName, dayText, formatPhone, initials } from '../customers-model';
import { fullAddress, parseCustomerId } from '../customer-form-model';
import { CustomerOrderList, DeleteDialog, useCustomerOrders } from '../list/parts';
import { Avatar, BackLink, CallButton, LoadProblem, LoyaltyCard, PageSkeleton, StatsGrid, pageClass, useCustomer, type CustomerRecord } from '../profile/parts';

function ContactCard({ customer, t }: { customer: CustomerRecord; t: T }) {
  const none = <span className="text-ar-muted">{t('profile.none')}</span>;
  const address = fullAddress(customer);
  const row = (label: string, value: React.ReactNode) => (
    <div className="grid grid-cols-[minmax(96px,136px)_minmax(0,1fr)] gap-3 border-t border-ar-subtle py-2.5 first:border-t-0">
      <dt className="text-[15px] text-ar-muted">{label}</dt>
      <dd className="m-0 min-w-0 break-words text-[15px] text-ar-ink">{value}</dd>
    </div>
  );
  return (
    <section aria-labelledby="contact-title" className={`${cardClass} px-5 py-[18px]`}>
      <h2 id="contact-title" className="m-0 text-lg font-bold">
        {t('profile.contact')}
      </h2>
      <dl className="m-0 mt-2">
        {row(
          t('profile.phone'),
          customer.phone ? (
            <a href={`tel:${customer.phone}`} className="font-semibold tabular-nums text-ar-primary-ink no-underline hover:underline">
              {formatPhone(customer.phone)}
            </a>
          ) : (
            none
          ),
        )}
        {row(
          t('profile.email'),
          customer.email ? (
            <a href={`mailto:${customer.email}`} className="text-ar-primary-ink no-underline hover:underline">
              {customer.email}
            </a>
          ) : (
            none
          ),
        )}
        {row(t('profile.address'), address || none)}
        {row(t('profile.idNumber'), customer.idNumber ? <span className="tabular-nums">{customer.idNumber}</span> : none)}
        {row(t('profile.notes'), customer.notes ? <span className="whitespace-pre-wrap">{customer.notes}</span> : none)}
      </dl>
    </section>
  );
}

export default function CustomerProfilePage() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations('customers.web') as unknown as T;
  const to = useTranslations('orders.web') as unknown as T;
  const money = useFormatCurrency();
  const { toastSuccess } = useToast();
  const { canManageCustomers } = usePermissions();
  const id = parseCustomerId(params.id as string | string[] | undefined);
  const [nonce, setNonce] = useState(0);
  const { customer, loading, failed } = useCustomer(id, nonce);
  const orders = useCustomerOrders(customer ? customer.id : null, 0);
  const [deleting, setDeleting] = useState(false);

  const weekdays = useMemo(() => to('weekdays').split(','), [to]);
  const todayKey = useMemo(() => formatDateKeyInTimeZone(new Date(), SHOP_TIMEZONE), []);

  if (loading) {
    return (
      <div className={pageClass}>
        <BackLink href="/customers" label={t('form.backList')} />
        <PageSkeleton />
      </div>
    );
  }
  if (failed || !customer) {
    return (
      <div className={pageClass}>
        <BackLink href="/customers" label={t('form.backList')} />
        <LoadProblem failed={failed || 'notFound'} onRetry={() => setNonce((n) => n + 1)} t={t} />
      </div>
    );
  }

  const name = customerName(customer) || t('noName');
  const since = customer.createdAt
    ? dayText(getLocalDateKey(customer.createdAt instanceof Date ? customer.createdAt.toISOString() : String(customer.createdAt)))
    : '';
  const sub = [formatPhone(customer.phone), since ? t('profile.since', { day: since }) : ''].filter(Boolean).join(' · ');

  return (
    <div className={pageClass}>
      <BackLink href="/customers" label={t('form.backList')} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar text={initials(customerName(customer) || customer.phone || '?')} />
          <div className="flex min-w-0 flex-col">
            <h1 className={`m-0 truncate text-2xl font-bold ${customerName(customer) ? 'text-ar-ink' : 'text-ar-muted'}`}>{name}</h1>
            {sub && <span className="truncate text-sm tabular-nums text-ar-muted">{sub}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {customer.phone && <CallButton phone={customer.phone} label={t('profile.call', { name })} />}
          <Link href={`/customers/${customer.id}/orders`} className={outlineBtn}>
            {t('profile.orders')}
          </Link>
          {canManageCustomers && (
            <Link href={`/customers/${customer.id}/edit`} className={outlineBtn}>
              {t('profile.edit')}
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-4">
          <ContactCard customer={customer} t={t} />
          <section aria-labelledby="recent-title" className={`${cardClass} overflow-hidden`}>
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-3 pt-[18px]">
              <h2 id="recent-title" className="m-0 text-lg font-bold">
                {t('profile.recent')}
              </h2>
              <Link href={`/customers/${customer.id}/orders`} className="text-sm font-semibold text-ar-primary-ink no-underline hover:underline">
                {t('detail.allOrders')}
              </Link>
            </div>
            <CustomerOrderList data={orders} todayKey={todayKey} weekdays={weekdays} t={t} to={to} money={money} />
          </section>
        </div>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <section aria-labelledby="summary-title" className={`${cardClass} overflow-hidden`}>
            <div className="flex flex-col gap-3.5 px-5 pb-4 pt-[18px]">
              <h2 id="summary-title" className="m-0 text-lg font-bold">
                {t('profile.summary')}
              </h2>
              <StatsGrid summary={orders.summary} loading={orders.loading} t={t} money={money} />
              <span className="text-sm text-ar-muted">{t('detail.spentNote')}</span>
            </div>
            {canManageCustomers && (
              <div className="border-t border-ar-subtle px-5 py-3">
                <button type="button" onClick={() => setDeleting(true)} className="h-8 rounded-lg px-1 text-sm font-semibold text-ar-danger hover:underline">
                  {t('profile.delete')}
                </button>
              </div>
            )}
          </section>
          <LoyaltyCard customerId={customer.id} enabled={!orders.loading && orders.loyaltyActive} t={t} />
        </div>
      </div>

      <DeleteDialog
        customer={deleting ? customer : null}
        onClose={() => setDeleting(false)}
        onDeleted={() => {
          toastSuccess(t('delete.done'), name);
          router.push('/customers');
        }}
        t={t}
      />
    </div>
  );
}

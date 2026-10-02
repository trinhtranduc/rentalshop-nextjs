'use client'

import React from 'react';
import { Mail, Phone, Store, Trash2, UserCheck, UserX } from 'lucide-react';
import { useUsersTranslations } from '@rentalshop/hooks';
import { formatPhoneNumber } from '@rentalshop/utils';
import type { User } from '@rentalshop/types';
import { Button } from '../../../ui/button';

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

const card = 'rounded-xl border border-gray-200 bg-white p-4 sm:p-5';

const ROLE_TONE: Record<string, string> = {
  ADMIN: 'bg-red-50 text-red-700',
  MERCHANT: 'bg-blue-50 text-blue-700',
  OUTLET_ADMIN: 'bg-emerald-50 text-emerald-800',
  OUTLET_STAFF: 'bg-gray-100 text-gray-800',
};

export const userDisplayName = (user: User): string =>
  (user as any).name ||
  [(user as any).firstName, (user as any).lastName].filter(Boolean).join(' ').trim() ||
  user.email;

/** Role and status pills, shared by the page header and the list */
export const UserBadges: React.FC<{ user: User }> = ({ user }) => {
  const t = useUsersTranslations();
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_TONE[user.role] || 'bg-gray-100 text-gray-800'}`}>
        {t(`roles.${user.role}`)}
      </span>
      <span
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${
          user.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-700'
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-emerald-600' : 'bg-gray-500'}`} aria-hidden="true" />
        {user.isActive ? t('fields.active') : t('fields.inactive')}
      </span>
    </span>
  );
};

/** Main column: who the person is and where they work */
export const UserInfoCard: React.FC<{ user: User }> = ({ user }) => {
  const t = useUsersTranslations();
  const anyUser = user as any;
  const row = (label: string, value: React.ReactNode) => (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)]">
      <dt className="text-sm text-gray-600">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-gray-900">{value}</dd>
    </div>
  );

  return (
    <div className="space-y-4">
      <section className={card} aria-labelledby="user-info-title">
        <h2 id="user-info-title" className="text-sm font-semibold text-gray-900">
          {t('fields.basicInformation')}
        </h2>
        <dl className="mt-1 divide-y divide-gray-100">
          {row(t('fields.fullName'), userDisplayName(user))}
          {row(
            t('fields.email'),
            <a href={`mailto:${user.email}`} className="inline-flex items-center gap-1.5 text-blue-700 hover:underline">
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {user.email}
            </a>
          )}
          {row(
            t('fields.phone'),
            user.phone ? (
              <a href={`tel:${user.phone}`} className="inline-flex items-center gap-1.5 text-blue-700 hover:underline">
                <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {formatPhoneNumber(user.phone)}
              </a>
            ) : (
              '—'
            )
          )}
          {row(t('fields.role'), t(`roles.${user.role}`))}
        </dl>
      </section>

      {(anyUser.merchant || anyUser.outlet) && (
        <section className={card} aria-labelledby="user-org-title">
          <h2 id="user-org-title" className="text-sm font-semibold text-gray-900">
            {t('organizationAssignment')}
          </h2>
          <dl className="mt-1 divide-y divide-gray-100">
            {anyUser.merchant && row(t('fields.merchant'), anyUser.merchant.name)}
            {row(
              t('fields.outlet'),
              anyUser.outlet ? (
                <span className="inline-flex items-start gap-1.5">
                  <Store className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden="true" />
                  <span>
                    {anyUser.outlet.name}
                    {anyUser.outlet.address && <span className="block text-xs text-gray-600">{anyUser.outlet.address}</span>}
                  </span>
                </span>
              ) : (
                '—'
              )
            )}
          </dl>
        </section>
      )}
    </div>
  );
};

interface UserAccountPanelProps {
  user: User;
  isUpdating?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onDelete?: () => void;
}

/** Side column: account state and the rare, risky actions */
export const UserAccountPanel: React.FC<UserAccountPanelProps> = ({ user, isUpdating, onActivate, onDeactivate, onDelete }) => {
  const t = useUsersTranslations();
  const anyUser = user as any;
  const isAdmin = user.role === 'ADMIN';

  return (
    <section className={card} aria-labelledby="user-account-title">
      <h2 id="user-account-title" className="text-sm font-semibold text-gray-900">
        {t('accountStatus')}
      </h2>
      <p className="mt-2 text-sm text-gray-700">
        {user.isActive ? t('messages.deactivateToPrevent') : t('messages.activateToRestore')}
      </p>
      {!isAdmin &&
        (user.isActive
          ? onDeactivate && (
              <Button type="button" variant="outline" onClick={onDeactivate} disabled={isUpdating} className="mt-3 w-full">
                <UserX className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('actions.deactivateAccount')}
              </Button>
            )
          : onActivate && (
              <Button type="button" variant="outline" onClick={onActivate} disabled={isUpdating} className="mt-3 w-full text-emerald-800">
                <UserCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('actions.activateAccount')}
              </Button>
            ))}

      <dl className="mt-4 space-y-2 border-t border-gray-100 pt-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-gray-600">{t('fields.emailStatus')}</dt>
          <dd className={anyUser.emailVerified ? 'text-emerald-800' : 'text-amber-800'}>
            {anyUser.emailVerified ? t('status.verified') : t('status.notVerified')}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-gray-600">{t('fields.lastLogin')}</dt>
          <dd className="tabular-nums text-gray-900">{fmtDateTime(anyUser.lastLoginAt)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-gray-600">{t('fields.createdAt')}</dt>
          <dd className="tabular-nums text-gray-900">{fmtDateTime(user.createdAt as any)}</dd>
        </div>
      </dl>

      {!isAdmin && onDelete && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={onDelete}
            disabled={isUpdating}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-1 text-sm font-medium text-red-700 hover:text-red-800 hover:underline disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {t('actions.deleteAccount')}
          </button>
          <p className="mt-1 text-xs text-gray-600">{t('messages.permanentlyDeleteShort')}</p>
        </div>
      )}
    </section>
  );
};

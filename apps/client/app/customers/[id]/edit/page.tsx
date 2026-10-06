'use client';

/** Sửa khách (#541): the shared customer form → PUT /api/customers?id= with the changed fields only. */
import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useToast } from '@rentalshop/ui';
import { customersApi } from '@rentalshop/utils';
import type { CustomerUpdateInput } from '@rentalshop/types';
import { Skeleton, type T } from '../../../orders/list/parts';
import { customerName } from '../../customers-model';
import { formValuesOf, parseCustomerId, updatePayload, type CustomerFormValues } from '../../customer-form-model';
import { CustomerForm, type SaveResult } from '../../form/CustomerForm';
import { BackLink, LoadProblem, useCustomer } from '../../profile/parts';

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations('customers.web') as unknown as T;
  const { toastSuccess } = useToast();
  const id = parseCustomerId(params.id as string | string[] | undefined);
  const [nonce, setNonce] = useState(0);
  const { customer, loading, failed } = useCustomer(id, nonce);
  const initial = useMemo(() => formValuesOf(customer), [customer]);
  const profileHref = id ? `/customers/${id}` : '/customers';

  const save = async (values: CustomerFormValues): Promise<SaveResult> => {
    if (!customer) return { ok: false };
    const payload = updatePayload(customer, values);
    if (!payload) {
      router.push(profileHref);
      return { ok: true };
    }
    const res = await customersApi.updateCustomer(customer.id, payload as unknown as CustomerUpdateInput);
    if (!res.success) return { ok: false, code: (res as { code?: string }).code };
    toastSuccess(t('form.updated'), values.name.trim());
    router.push(profileHref);
    return { ok: true };
  };

  const name = customer ? customerName(customer) || t('noName') : '';

  return (
    <div className="mx-auto box-border flex w-full max-w-[880px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <BackLink href={customer ? profileHref : '/customers'} label={customer ? name : t('form.backList')} />
      <h1 className="m-0 text-2xl font-bold text-ar-ink">{t('form.titleEdit')}</h1>
      {loading ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-ar-line-soft bg-ar-surface p-5" aria-busy="true">
          <Skeleton className="h-11 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
          </div>
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : failed || !customer ? (
        <LoadProblem failed={failed || 'notFound'} onRetry={() => setNonce((n) => n + 1)} t={t} />
      ) : (
        <CustomerForm
          key={customer.id}
          mode="edit"
          initial={initial}
          hadPhone={!!(customer.phone || '').trim()}
          cancelHref={profileHref}
          onSave={save}
          t={t}
        />
      )}
    </div>
  );
}

'use client';

/** Khách mới (#541): the shared customer form → POST /api/customers, then the new customer's profile. */
import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useToast } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { customersApi } from '@rentalshop/utils';
import type { CustomerInput } from '@rentalshop/types';
import type { T } from '../../orders/list/parts';
import { createPayload, emptyForm, type CustomerFormValues } from '../customer-form-model';
import { CustomerForm, type SaveResult } from '../form/CustomerForm';
import { BackLink } from '../profile/parts';

export default function AddCustomerPage() {
  const router = useRouter();
  const t = useTranslations('customers.web') as unknown as T;
  const { toastSuccess } = useToast();
  const { user } = useAuth();
  const merchantId = user?.merchant?.id ? Number(user.merchant.id) : undefined;
  const initial = useMemo(() => emptyForm(), []);

  const save = async (values: CustomerFormValues): Promise<SaveResult> => {
    const payload = { ...createPayload(values), ...(merchantId ? { merchantId } : {}) };
    const res = await customersApi.createCustomer(payload as unknown as CustomerInput);
    if (!res.success) return { ok: false, code: (res as { code?: string }).code };
    toastSuccess(t('form.created'), values.name.trim());
    const id = (res.data as { id?: number } | undefined)?.id;
    router.push(id ? `/customers/${id}` : '/customers');
    return { ok: true };
  };

  return (
    <div className="mx-auto box-border flex w-full max-w-[880px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <BackLink href="/customers" label={t('form.backList')} />
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-2xl font-bold text-ar-ink">{t('form.titleCreate')}</h1>
        <p className="m-0 text-[15px] text-ar-muted">{t('form.hintCreate')}</p>
      </div>
      <CustomerForm mode="create" initial={initial} cancelHref="/customers" onSave={save} t={t} />
    </div>
  );
}

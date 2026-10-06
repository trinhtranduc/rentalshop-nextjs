'use client';

/**
 * Tài khoản ngân hàng of one chi nhánh (#545) on the shop shell. Same calls as the old page:
 * `bankAccountsApi.getBankAccounts / createBankAccount / updateBankAccount / deleteBankAccount`; the
 * add / edit form is the shared BankAccountForm in the shared dialog (dark via `html.ar-shell`).
 * The outlet name in the header comes from GET /api/outlets (the list the Chi nhánh page reads).
 * View needs `bankAccounts.view`, add / edit / delete `bankAccounts.manage` (as before).
 */
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth, usePermissions } from '@rentalshop/hooks';
import { BankAccountForm, Dialog, DialogContent, DialogHeader, DialogTitle, useToast } from '@rentalshop/ui';
import { bankAccountsApi, generateBankQRCodeData, outletsApi } from '@rentalshop/utils';
import type { BankAccount, BankAccountInput } from '@rentalshop/utils';
import { ICONS, ShellIcon } from '../../../components/shell/Icon';
import { Skeleton, cardClass, outlineBtn, primaryBtn, type T } from '../../../orders/list/parts';
import { Modal } from '../../../orders/create/parts';
import { smallBtn } from '../../parts';
import { groupAccountNumber, parseOutletId } from '../../outlets-model';

const dangerBtn =
  'inline-flex h-10 items-center justify-center whitespace-nowrap rounded-[10px] bg-ar-danger px-3.5 text-[15px] font-semibold text-white hover:opacity-95 disabled:opacity-50';
const COPY_ICON = 'M9 9h10v10H9zM5 15V5h10';

type Editing = { kind: 'add' } | { kind: 'edit'; account: BankAccount } | { kind: 'delete'; account: BankAccount } | null;

export default function OutletBankAccountsPage() {
  const params = useParams();
  const { user } = useAuth();
  const { toastSuccess } = useToast();
  const { canManageBankAccounts, canViewBankAccounts } = usePermissions();
  const t = useTranslations('outlets.web.bank') as unknown as T;
  const tb = useTranslations('bankAccounts');
  const tc = useTranslations('common');

  const outletId = parseOutletId(params.id as string | string[] | undefined);
  const merchantId = Number(user?.merchant?.id || user?.merchantId || 0);

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [outletName, setOutletName] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [formLoading, setFormLoading] = useState(false);

  const load = useCallback(async () => {
    if (!merchantId || !outletId) return;
    setLoading(true);
    setFailed(false);
    try {
      const res = await bankAccountsApi.getBankAccounts(merchantId, outletId);
      if (res.success && res.data) {
        // Same as before: fill a QR payload for accounts saved without one.
        setAccounts(
          res.data.map((a) =>
            !a.qrCode && a.accountNumber && a.accountHolderName && a.bankName
              ? { ...a, qrCode: generateBankQRCodeData({ accountNumber: a.accountNumber, accountHolderName: a.accountHolderName, bankName: a.bankName, bankCode: a.bankCode }) }
              : a,
          ),
        );
      } else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [merchantId, outletId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!outletId || !merchantId) return;
    let cancelled = false;
    outletsApi
      .getOutlets()
      .then((res) => {
        const data = res?.data as { outlets?: Array<{ id: number; name: string }> } | Array<{ id: number; name: string }> | undefined;
        const list = Array.isArray(data) ? data : data?.outlets || [];
        const found = list.find((o) => o.id === outletId);
        if (!cancelled && found) setOutletName(found.name);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [outletId, merchantId]);

  const submitAdd = async (data: BankAccountInput) => {
    if (!outletId) return;
    setFormLoading(true);
    try {
      const res = await bankAccountsApi.createBankAccount(merchantId, outletId, data);
      if (res.success) {
        toastSuccess(tc('labels.success'), tb('messages.addSuccess'));
        setEditing(null);
        void load();
      }
    } catch {
      // The global API error handler shows the toast (as before).
    } finally {
      setFormLoading(false);
    }
  };

  const submitEdit = async (data: BankAccountInput) => {
    if (!outletId || editing?.kind !== 'edit') return;
    setFormLoading(true);
    try {
      const res = await bankAccountsApi.updateBankAccount(merchantId, outletId, editing.account.id, data);
      if (res.success) {
        toastSuccess(tc('labels.success'), tb('messages.updateSuccess'));
        setEditing(null);
        void load();
      }
    } catch {
      // Handled globally.
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!outletId || editing?.kind !== 'delete') return;
    setFormLoading(true);
    try {
      const res = await bankAccountsApi.deleteBankAccount(merchantId, outletId, editing.account.id);
      if (res.success) {
        toastSuccess(tc('labels.success'), tb('messages.deleteSuccess'));
        setEditing(null);
        void load();
      }
    } catch {
      // Handled globally.
    } finally {
      setFormLoading(false);
    }
  };

  const copy = (value: string) => {
    void navigator.clipboard?.writeText(value);
    toastSuccess(tb('card.copied'), tb('card.accountNumberCopied'));
  };

  const th = 'px-2 py-2.5 text-left text-xs font-bold uppercase tracking-[0.06em] text-ar-muted';
  const defaultTag = (a: BankAccount) =>
    a.isDefault ? (
      <span className="inline-block whitespace-nowrap rounded-[7px] bg-ar-reserved-bg px-2 py-[2px] text-xs font-bold text-ar-reserved">{tb('card.default')}</span>
    ) : null;
  const statusTag = (a: BankAccount) =>
    a.isActive === false ? (
      <span className="inline-block whitespace-nowrap rounded-[7px] bg-ar-cancelled-bg px-2 py-[3px] text-sm font-bold text-ar-cancelled">{t('inactive')}</span>
    ) : (
      <span className="inline-block whitespace-nowrap rounded-[7px] bg-ar-done-bg px-2 py-[3px] text-sm font-bold text-ar-done">{t('active')}</span>
    );
  const number = (a: BankAccount) => (
    <span className="inline-flex items-center gap-1">
      <span className="tabular-nums">{groupAccountNumber(a.accountNumber)}</span>
      <button
        type="button"
        onClick={() => copy(a.accountNumber)}
        aria-label={t('copy', { number: a.accountNumber })}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ar-muted hover:bg-ar-subtle hover:text-ar-ink"
      >
        <ShellIcon d={COPY_ICON} size={15} />
      </button>
    </span>
  );
  const rowActions = (a: BankAccount) =>
    canManageBankAccounts ? (
      <span className="flex items-center justify-end gap-1">
        <button type="button" onClick={() => setEditing({ kind: 'edit', account: a })} className={smallBtn}>
          {t('edit')}
        </button>
        <button type="button" onClick={() => setEditing({ kind: 'delete', account: a })} className={`${smallBtn} text-ar-danger`}>
          {t('delete')}
        </button>
      </span>
    ) : null;

  const body = () => {
    if (!canViewBankAccounts) return <p className="m-0 px-5 py-6 text-[15px] text-ar-muted">{t('noAccess')}</p>;
    if (failed || !outletId)
      return (
        <div role="alert" className="flex flex-wrap items-center gap-3 px-5 py-6 text-[15px] text-ar-muted">
          <span>{t('loadFailed')}</span>
          {outletId && (
            <button type="button" onClick={() => void load()} className={smallBtn}>
              {t('retry')}
            </button>
          )}
        </div>
      );
    if (loading && accounts.length === 0)
      return (
        <div className="flex flex-col gap-3 px-4 py-4" aria-busy="true">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
    if (accounts.length === 0)
      return (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <p className="m-0 text-[15px] font-semibold">{tb('list.emptyTitle')}</p>
          <p className="m-0 text-sm text-ar-muted">{tb('list.emptyDescription')}</p>
        </div>
      );
    return (
      <div className={loading ? 'opacity-60 transition-opacity' : undefined} aria-busy={loading || undefined}>
        <table className="hidden w-full border-collapse text-[15px] md:table">
          <thead>
            <tr className="bg-ar-surface-muted">
              <th scope="col" className={`${th} pl-4`}>{t('cols.holder')}</th>
              <th scope="col" className={th}>{t('cols.number')}</th>
              <th scope="col" className={th}>{t('cols.bank')}</th>
              <th scope="col" className={th}>{t('cols.branch')}</th>
              <th scope="col" className={th}>{t('cols.status')}</th>
              <th scope="col" className={`${th} pr-4`}>
                <span className="sr-only">{t('cols.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-t border-ar-subtle">
                <td className="py-2.5 pl-4 pr-2 align-middle">
                  <span className="flex flex-wrap items-center gap-2 font-semibold">
                    {a.accountHolderName}
                    {defaultTag(a)}
                  </span>
                </td>
                <td className="px-2 py-2.5 align-middle text-ar-ink-2">{number(a)}</td>
                <td className="px-2 py-2.5 align-middle text-ar-ink-2">{a.bankName}</td>
                <td className="px-2 py-2.5 align-middle text-ar-ink-2">{a.branch || <span className="text-ar-faint">—</span>}</td>
                <td className="px-2 py-2.5 align-middle">{statusTag(a)}</td>
                <td className="py-2.5 pl-2 pr-4 text-right align-middle">{rowActions(a)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="m-0 list-none p-0 md:hidden">
          {accounts.map((a) => (
            <li key={a.id} className="flex flex-col gap-1.5 border-t border-ar-subtle px-4 py-3 first:border-t-0">
              <span className="flex flex-wrap items-center gap-2 font-semibold">
                {a.accountHolderName}
                {defaultTag(a)}
                {statusTag(a)}
              </span>
              <span className="text-sm text-ar-ink-2">{number(a)}</span>
              <span className="text-sm text-ar-muted">{[a.bankName, a.branch].filter(Boolean).join(' · ')}</span>
              {canManageBankAccounts && <span className="flex justify-start pt-1">{rowActions(a)}</span>}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <Link href="/outlets" className="inline-flex items-center gap-1 self-start text-sm font-semibold text-ar-muted no-underline hover:text-ar-ink">
        <ShellIcon d={ICONS.chevronLeft} size={16} />
        {t('back')}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="m-0 text-2xl font-bold">{t('title')}</h1>
          {outletId && <p className="m-0 truncate text-[15px] text-ar-muted">{t('subtitle', { name: outletName || `#${outletId}` })}</p>}
        </div>
        {canViewBankAccounts && canManageBankAccounts && outletId && (
          <button type="button" onClick={() => setEditing({ kind: 'add' })} className={primaryBtn}>
            <ShellIcon d={ICONS.plus} size={18} />
            {t('add')}
          </button>
        )}
      </div>

      <section className={`${cardClass} min-w-0 overflow-hidden`}>{body()}</section>

      <Dialog open={editing?.kind === 'add'} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tb('form.addTitle')}</DialogTitle>
          </DialogHeader>
          <BankAccountForm onSubmit={submitAdd} onCancel={() => setEditing(null)} loading={formLoading} title={tb('form.title')} submitText={tb('form.add')} />
        </DialogContent>
      </Dialog>

      <Dialog open={editing?.kind === 'edit'} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tb('form.editTitle')}</DialogTitle>
          </DialogHeader>
          {editing?.kind === 'edit' && (
            <BankAccountForm
              initialData={editing.account}
              onSubmit={submitEdit}
              onCancel={() => setEditing(null)}
              loading={formLoading}
              title={tb('form.title')}
              submitText={tb('form.update')}
            />
          )}
        </DialogContent>
      </Dialog>

      <Modal
        open={editing?.kind === 'delete'}
        title={tb('messages.deleteConfirmTitle')}
        onClose={() => (formLoading ? undefined : setEditing(null))}
        closeLabel={t('close')}
        footer={
          <>
            <button type="button" onClick={() => setEditing(null)} disabled={formLoading} className={outlineBtn}>
              {t('confirmCancel')}
            </button>
            <button type="button" onClick={confirmDelete} disabled={formLoading} className={dangerBtn}>
              {formLoading ? t('deleting') : tc('buttons.delete')}
            </button>
          </>
        }
      >
        <p className="m-0 text-[15px] text-ar-ink-2">
          {editing?.kind === 'delete' ? tb('messages.deleteConfirm', { name: editing.account.accountHolderName || '' }) : ''}
        </p>
      </Modal>
    </div>
  );
}

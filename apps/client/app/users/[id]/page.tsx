'use client';

/**
 * Staff detail (#544) on the shell: who, where, account state. Sửa and Đổi mật khẩu open shell
 * dialogs; Khoá / Mở khoá / Xoá ask first. Same calls as before: usersApi.getUserById,
 * updateUserByPublicId, changePassword, activateUser, deactivateUser, deleteUser.
 */
import React, { useCallback, useEffect, useId, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@rentalshop/hooks';
import { useToast } from '@rentalshop/ui';
import { outletsApi, SHOP_TIMEZONE, usersApi } from '@rentalshop/utils';
import type { User } from '@rentalshop/types';
import { Modal } from '../../orders/create/parts';
import { Skeleton, cardClass, outlineBtn, primaryBtn, type T } from '../../orders/list/parts';
import { canManageRow, canSeeStaffPage, staffName, type StaffLike } from '../users-model';
import {
  canPickOutlet,
  editPayload,
  formFromUser,
  passwordResetProblem,
  readOutlets,
  validateStaffForm,
  type OutletOption,
  type StaffFormErrors,
  type StaffFormValues,
} from '../staff-form-model';
import { Avatar, BackLink, Field, NoAccess, OutletChips, PasswordInput, RoleTag, StatusPill, dangerBtn, inputClass, pageClass } from '../staff-parts';

type StaffDetail = StaffLike & {
  merchantId?: number | null;
  emailVerified?: boolean | null;
  createdAt?: string | null;
  merchant?: { id?: number | null; name?: string | null } | null;
  outlet?: { id?: number | null; name?: string | null; address?: string | null } | null;
};
type Confirm = 'activate' | 'deactivate' | 'delete' | null;

const dateTime = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: SHOP_TIMEZONE,
});
/** "07/10/2026 04:52" in Vietnam time. */
function fmt(value?: string | Date | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const p = Object.fromEntries(dateTime.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] gap-3 border-t border-ar-subtle py-2.5 first:border-t-0 sm:grid-cols-[10rem_minmax(0,1fr)]">
      <dt className="text-sm text-ar-muted">{label}</dt>
      <dd className="m-0 min-w-0 break-words text-[15px] text-ar-ink">{children}</dd>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Sửa nhân viên
// ----------------------------------------------------------------------------

function EditDialog({
  open,
  staff,
  viewerRole,
  onClose,
  onSaved,
  t,
}: {
  open: boolean;
  staff: StaffDetail;
  viewerRole?: string;
  onClose: () => void;
  onSaved: () => void;
  t: T;
}) {
  const tm = useTranslations('users.messages');
  const { toastSuccess } = useToast();
  const [form, setForm] = useState<StaffFormValues>(() => formFromUser(staff));
  const [errors, setErrors] = useState<StaffFormErrors>({});
  const [outlets, setOutlets] = useState<OutletOption[]>([]);
  const [loadingOutlets, setLoadingOutlets] = useState(false);
  const [saving, setSaving] = useState(false);
  const pickOutlet = canPickOutlet(viewerRole);
  const outletLabelId = useId();

  useEffect(() => {
    if (!open) return;
    setForm(formFromUser(staff));
    setErrors({});
  }, [open, staff]);

  useEffect(() => {
    if (!open || !pickOutlet) return;
    let cancelled = false;
    setLoadingOutlets(true);
    outletsApi
      .getOutlets()
      .then((res) => {
        if (!cancelled) setOutlets(readOutlets(res?.data));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingOutlets(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, pickOutlet]);

  const set = <K extends keyof StaffFormValues>(key: K, value: StaffFormValues[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const err = (key: keyof StaffFormValues) => (errors[key] ? t(`form.errors.${errors[key]}`) : undefined);

  const save = async () => {
    const problems = validateStaffForm(form, 'edit');
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    setSaving(true);
    try {
      const res = await usersApi.updateUserByPublicId(staff.id, editPayload(form, staff) as Partial<User>);
      if (res.success) {
        toastSuccess(tm('updateSuccess'), tm('updateSuccess'));
        onSaved();
      }
      // Errors: global API error toast.
    } catch {
      // Same.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={t('detail.editTitle')}
      onClose={() => (saving ? undefined : onClose())}
      closeLabel={t('confirm.close')}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={outlineBtn}>
            {t('form.cancel')}
          </button>
          <button type="button" onClick={save} disabled={saving} className={primaryBtn}>
            {saving ? t('form.saving') : t('form.save')}
          </button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        noValidate
      >
        <Field label={t('form.name')} error={err('name')}>
          {({ id, describedBy, invalid }) => (
            <input id={id} value={form.name} onChange={(e) => set('name', e.target.value)} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={`${inputClass} ${invalid ? 'border-ar-danger' : ''}`} />
          )}
        </Field>
        <Field label={t('form.email')} error={err('email')} hint={t('detail.emailFixed')}>
          {({ id, describedBy }) => <input id={id} type="email" value={form.email} disabled aria-describedby={describedBy} className={inputClass} />}
        </Field>
        <Field label={t('form.phone')} error={err('phone')}>
          {({ id, describedBy, invalid }) => (
            <input id={id} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder={t('form.optional')} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={`${inputClass} ${invalid ? 'border-ar-danger' : ''}`} />
          )}
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ar-ink-2">{t('form.role')}</span>
          <span className="flex items-center gap-2">
            <RoleTag role={staff.role} t={t} />
            <span className="text-sm text-ar-muted">{t('detail.roleFixed')}</span>
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span id={outletLabelId} className="text-sm font-semibold text-ar-ink-2">
            {t('form.outlet')}
          </span>
          {pickOutlet ? (
            <OutletChips outlets={outlets} value={form.outletId} onChange={(id) => set('outletId', id)} loading={loadingOutlets} labelledBy={outletLabelId} t={t} />
          ) : (
            <span className="text-[15px] text-ar-ink">{staff.outlet?.name || '—'}</span>
          )}
          {errors.outletId && <span className="text-sm text-ar-danger">{err('outletId')}</span>}
        </div>
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}

// ----------------------------------------------------------------------------
// Đổi mật khẩu
// ----------------------------------------------------------------------------

function PasswordDialog({ open, staff, onClose, t }: { open: boolean; staff: StaffDetail; onClose: () => void; t: T }) {
  const tm = useTranslations('users.messages');
  const { toastSuccess } = useToast();
  const [pw, setPw] = useState({ newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Partial<Record<'newPassword' | 'confirmPassword', string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPw({ newPassword: '', confirmPassword: '' });
      setErrors({});
    }
  }, [open]);

  const submit = async () => {
    const problems = passwordResetProblem(pw.newPassword, pw.confirmPassword);
    setErrors(Object.fromEntries(problems.map((p) => [p.field, p.key])));
    if (problems.length > 0) return;
    setSaving(true);
    try {
      const res = await usersApi.changePassword(staff.id, pw.newPassword);
      if (res.success) {
        toastSuccess(tm('passwordChangeSuccess'), tm('passwordChangeSuccess'));
        onClose();
      }
      // Errors: global API error toast.
    } catch {
      // Same.
    } finally {
      setSaving(false);
    }
  };
  const err = (k: 'newPassword' | 'confirmPassword') => (errors[k] ? t(`form.errors.${errors[k]}`) : undefined);

  return (
    <Modal
      open={open}
      title={t('password.title')}
      onClose={() => (saving ? undefined : onClose())}
      closeLabel={t('confirm.close')}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={outlineBtn}>
            {t('form.cancel')}
          </button>
          <button type="button" onClick={submit} disabled={saving} className={primaryBtn}>
            {saving ? t('password.changing') : t('password.submit')}
          </button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
      >
        <p className="m-0 text-[15px] text-ar-ink-2">{t('password.hint', { name: staffName(staff) })}</p>
        <Field label={t('password.new')} error={err('newPassword')} hint={t('form.passwordHint')}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput id={id} value={pw.newPassword} onChange={(v) => setPw((p) => ({ ...p, newPassword: v }))} autoComplete="new-password" describedBy={describedBy} invalid={invalid} t={t} />
          )}
        </Field>
        <Field label={t('password.confirm')} error={err('confirmPassword')}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput id={id} value={pw.confirmPassword} onChange={(v) => setPw((p) => ({ ...p, confirmPassword: v }))} autoComplete="new-password" describedBy={describedBy} invalid={invalid} t={t} />
          )}
        </Field>
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------

export default function UserPage() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations('users.web') as unknown as T;
  const tm = useTranslations('users.messages');
  const { user } = useAuth();
  const { toastSuccess } = useToast();
  const allowed = canSeeStaffPage(user?.role);
  const id = Number(params?.id);
  const validId = Number.isInteger(id) && id > 0;

  const [staff, setStaff] = useState<StaffDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!validId) {
      setLoading(false);
      return;
    }
    try {
      const res = await usersApi.getUserById(id);
      setStaff(res.success && res.data ? (res.data as StaffDetail) : null);
    } catch {
      setStaff(null);
    } finally {
      setLoading(false);
    }
  }, [id, validId]);

  useEffect(() => {
    if (!user || !allowed) return;
    setLoading(true);
    void load();
  }, [user, allowed, load]);

  if (user && !allowed) return <NoAccess title={t('title')} text={t('noAccess')} />;

  if (loading || !user) {
    return (
      <div className={pageClass} aria-busy="true">
        <Skeleton className="h-5 w-28" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-64 min-w-0 flex-[2_1_480px] rounded-2xl" />
          <Skeleton className="h-64 min-w-0 flex-[1_1_300px] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className={pageClass}>
        <BackLink label={t('title')} />
        <div className={`${cardClass} flex flex-col items-start gap-3 px-5 py-6`}>
          <p className="m-0 text-[15px] text-ar-ink-2">{t('detail.notFound')}</p>
          <button type="button" onClick={() => router.push('/users')} className={outlineBtn}>
            {t('detail.backToList')}
          </button>
        </div>
      </div>
    );
  }

  const name = staffName(staff);
  const active = staff.isActive !== false;
  const manageable = canManageRow(staff, user?.id ? Number(user.id) : null);

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const res =
        confirm === 'activate'
          ? await usersApi.activateUser(staff.id)
          : confirm === 'deactivate'
            ? await usersApi.deactivateUser(staff.id)
            : await usersApi.deleteUser(staff.id);
      if (res.success) {
        const done = tm(confirm === 'activate' ? 'activateSuccess' : confirm === 'deactivate' ? 'deactivateSuccess' : 'deleteSuccess');
        toastSuccess(done, `${done} - "${name}"`);
        if (confirm === 'delete') {
          router.push('/users');
          return;
        }
        setConfirm(null);
        await load();
      }
      // Errors: global API error toast.
    } catch {
      // Same.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={pageClass}>
      <BackLink label={t('title')} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar user={staff} size={48} className="border border-ar-line bg-ar-surface" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="m-0 truncate text-2xl font-bold">{name}</h1>
            <span className="flex flex-wrap items-center gap-2">
              <RoleTag role={staff.role} t={t} />
              <StatusPill active={active} t={t} />
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setChangingPw(true)} className={outlineBtn}>
            {t('detail.changePassword')}
          </button>
          <button type="button" onClick={() => setEditing(true)} className={primaryBtn}>
            {t('edit')}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <section className={`${cardClass} min-w-0 flex-[2_1_480px] px-5 py-[18px]`} aria-labelledby="staff-info-title">
          <h2 id="staff-info-title" className="m-0 mb-2 text-lg font-bold">
            {t('detail.info')}
          </h2>
          <dl className="m-0">
            <Row label={t('form.name')}>{name}</Row>
            <Row label={t('form.email')}>
              {staff.email ? (
                <a href={`mailto:${staff.email}`} className="text-ar-primary-ink no-underline hover:underline">
                  {staff.email}
                </a>
              ) : (
                '—'
              )}
            </Row>
            <Row label={t('form.phone')}>
              {staff.phone ? (
                <a href={`tel:${staff.phone}`} className="tabular-nums text-ar-primary-ink no-underline hover:underline">
                  {staff.phone}
                </a>
              ) : (
                '—'
              )}
            </Row>
            <Row label={t('form.role')}>
              <RoleTag role={staff.role} t={t} />
            </Row>
            <Row label={t('form.outlet')}>
              {staff.outlet?.name ? (
                <span className="flex flex-col">
                  <span>{staff.outlet.name}</span>
                  {staff.outlet.address && <span className="text-sm text-ar-muted">{staff.outlet.address}</span>}
                </span>
              ) : (
                '—'
              )}
            </Row>
            {staff.merchant?.name && <Row label={t('detail.merchant')}>{staff.merchant.name}</Row>}
          </dl>
        </section>

        <aside className={`${cardClass} flex min-w-0 flex-[1_1_300px] flex-col gap-3 px-5 py-[18px]`} aria-labelledby="staff-account-title">
          <h2 id="staff-account-title" className="m-0 text-lg font-bold">
            {t('detail.account')}
          </h2>
          <p className="m-0 text-sm text-ar-ink-2">{active ? t('detail.activeHint') : t('detail.lockedHint')}</p>
          {manageable && (
            <button type="button" onClick={() => setConfirm(active ? 'deactivate' : 'activate')} disabled={busy} className={`${outlineBtn} w-full`}>
              {active ? t('deactivate') : t('activate')}
            </button>
          )}
          <dl className="m-0 flex flex-col gap-2 border-t border-ar-subtle pt-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ar-muted">{t('detail.emailStatus')}</dt>
              <dd className={`m-0 ${staff.emailVerified ? 'text-ar-done' : 'text-ar-late'}`}>{staff.emailVerified ? t('detail.verified') : t('detail.notVerified')}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ar-muted">{t('cols.lastLogin')}</dt>
              <dd className="m-0 tabular-nums text-ar-ink">{fmt(staff.lastLoginAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ar-muted">{t('detail.createdAt')}</dt>
              <dd className="m-0 tabular-nums text-ar-ink">{fmt(staff.createdAt)}</dd>
            </div>
          </dl>
          {manageable && (
            <div className="flex flex-col items-start gap-1 border-t border-ar-subtle pt-3">
              <button type="button" onClick={() => setConfirm('delete')} disabled={busy} className="h-9 rounded-lg px-1 text-sm font-semibold text-ar-danger hover:underline disabled:opacity-50">
                {t('delete')}
              </button>
              <span className="text-xs text-ar-muted">{t('detail.deleteHint')}</span>
            </div>
          )}
        </aside>
      </div>

      <EditDialog
        open={editing}
        staff={staff}
        viewerRole={user?.role}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          void load();
        }}
        t={t}
      />
      <PasswordDialog open={changingPw} staff={staff} onClose={() => setChangingPw(false)} t={t} />

      <Modal
        open={!!confirm}
        title={confirm ? t(`confirm.${confirm}Title`) : ''}
        onClose={() => (busy ? undefined : setConfirm(null))}
        closeLabel={t('confirm.close')}
        footer={
          <>
            <button type="button" onClick={() => setConfirm(null)} disabled={busy} className={outlineBtn}>
              {t('confirm.cancel')}
            </button>
            <button type="button" onClick={runConfirm} disabled={busy} className={confirm === 'activate' ? primaryBtn : dangerBtn}>
              {confirm ? t(confirm) : ''}
            </button>
          </>
        }
      >
        <p className="m-0 text-[15px] text-ar-ink-2">{confirm ? t(`confirm.${confirm}Body`, { name }) : ''}</p>
      </Modal>
    </div>
  );
}

'use client';

/**
 * Đặt online › one request (#1124 PR3): who, phone, outlet, days, items with free / short per item, note.
 * "Xác nhận" opens the create-order page prefilled from POST …/prepare (the order is made there, with bookingRequestId);
 * "Từ chối" asks for a reason (hết đồ / không liên lạc được / khác + text).
 */
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@rentalshop/hooks';
import { bookingRequestsApi, type ShopBookingRequest } from '@rentalshop/utils';
import { ICONS, ShellIcon } from '../../../components/shell/Icon';
import { cardClass, outlineBtn, primaryBtn, Skeleton, type T } from '../../list/parts';
import { fieldClass, Modal } from '../../create/parts';
import { bookingRowView, canSeeBookings, itemAvailability, REJECT_REASONS, rejectBody, type RejectReason } from '../online-model';

export default function OnlineBookingDetailPage() {
  const t = useTranslations('orders.web') as unknown as T;
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = Number(params?.id);
  const [row, setRow] = useState<ShopBookingRequest | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [nonce, setNonce] = useState(0);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState<RejectReason>('OUT_OF_STOCK');
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const allowed = canSeeBookings(user?.role);

  useEffect(() => {
    if (!allowed || !Number.isFinite(id)) return;
    let live = true;
    setState('loading');
    bookingRequestsApi
      .get(id)
      .then((res) => {
        if (!live) return;
        if (res.success && res.data) {
          setRow(res.data);
          setState('ready');
        } else setState('failed');
      })
      .catch(() => live && setState('failed'));
    return () => {
      live = false;
    };
  }, [id, nonce, allowed]);

  const closeReject = useCallback(() => {
    setRejectOpen(false);
    setProblem(null);
  }, []);

  const sendReject = async () => {
    const checked = rejectBody(reason, note);
    if (!checked.ok) {
      setProblem(t('online.noteRequired'));
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      const res = await bookingRequestsApi.reject(id, checked.body);
      if (res.success) {
        setRejectOpen(false);
        setNonce((n) => n + 1);
      } else setProblem(res.message || t('online.actionFailed'));
    } catch {
      setProblem(t('online.actionFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (user && !allowed) {
    return <p className="mx-auto max-w-[1280px] px-8 pt-6 text-ar-muted">{t('online.noAccess')}</p>;
  }

  const view = row ? bookingRowView(row) : null;
  return (
    <div className="mx-auto box-border flex w-full max-w-[880px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <Link href="/orders/online" className="inline-flex items-center gap-1 text-sm font-semibold text-ar-primary-ink no-underline">
        <ShellIcon d={ICONS.chevronLeft} size={16} />
        {t('online.title')}
      </Link>

      {state === 'failed' ? (
        <div role="alert" className={`${cardClass} flex flex-wrap items-center gap-3 px-5 py-4 text-sm text-ar-muted`}>
          <span>{t('online.loadFailed')}</span>
          <button type="button" onClick={() => setNonce((n) => n + 1)} className={outlineBtn}>
            {t('retry')}
          </button>
        </div>
      ) : state === 'loading' || !row || !view ? (
        <div className={`${cardClass} flex flex-col gap-2 px-5 py-4`}>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex flex-col gap-1">
              <h1 className="m-0 text-2xl font-bold">{row.customerName}</h1>
              <span className="text-sm text-ar-muted">
                {row.code} · {t(`online.status.${row.status}`)}
                {view.hoursLeft != null && ` · ${t('online.hoursLeft', { hours: view.hoursLeft })}`}
              </span>
            </span>
            {row.status === 'PENDING' && (
              <span className="flex gap-2">
                <button type="button" onClick={() => setRejectOpen(true)} className={outlineBtn} data-booking-reject>
                  {t('online.reject')}
                </button>
                <button type="button" onClick={() => router.push(`/orders/create?bookingRequestId=${row.id}`)} className={primaryBtn} data-booking-confirm>
                  {t('online.confirm')}
                </button>
              </span>
            )}
            {row.status === 'CONFIRMED' && row.orderId != null && (
              <Link href={`/orders/${row.orderId}`} className={outlineBtn}>
                {t('online.openOrder')}
              </Link>
            )}
          </div>

          <section className={`${cardClass} grid gap-3 px-5 py-4 text-[15px] sm:grid-cols-2`}>
            <Field label={t('online.phone')}>
              <a href={`tel:${row.customerPhone}`} className="font-medium text-ar-primary-ink no-underline">
                {row.customerPhone}
              </a>
            </Field>
            <Field label={t('online.outlet')}>{row.outlet?.name || '—'}</Field>
            <Field label={t('online.days')}>{view.range}</Field>
            <Field label={t('online.customer')}>{row.customer ? t('online.customerKnown') : t('online.customerNew')}</Field>
            {row.note && (
              <div className="sm:col-span-2">
                <Field label={t('online.note')}>{row.note}</Field>
              </div>
            )}
            {row.status === 'REJECTED' && row.rejectReason && (
              <div className="sm:col-span-2">
                <Field label={t('online.rejectedBecause')}>
                  {t(`online.reasons.${row.rejectReason}`)}
                  {row.rejectNote ? ` — ${row.rejectNote}` : ''}
                </Field>
              </div>
            )}
          </section>

          <section className={`${cardClass} overflow-hidden`}>
            <h2 className="m-0 border-b border-ar-line-soft px-5 py-3 text-base font-bold">{t('online.items', { count: row.itemCount })}</h2>
            <ul className="m-0 list-none p-0">
              {row.items.map((item) => {
                const a = row.status === 'PENDING' ? itemAvailability({ shortDay: item.shortDay ?? null }) : null;
                return (
                  <li key={item.productId} className="flex items-center gap-3 border-t border-ar-subtle px-5 py-3 first:border-t-0">
                    <span className="min-w-0 flex-1 text-[15px] font-medium">{item.productName}</span>
                    <span className="text-[15px]">× {item.quantity}</span>
                    {a && (
                      <span data-availability={a.kind} className={`text-sm font-semibold ${a.kind === 'free' ? 'text-ar-done' : 'text-ar-danger'}`}>
                        {a.kind === 'free' ? t('online.free') : t('online.shortOn', { day: a.day })}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <Modal
        open={rejectOpen}
        title={t('online.rejectTitle')}
        onClose={closeReject}
        closeLabel={t('online.close')}
        footer={
          <>
            <button type="button" onClick={closeReject} className={outlineBtn}>
              {t('online.cancel')}
            </button>
            <button type="button" onClick={() => void sendReject()} disabled={busy} className={primaryBtn} data-booking-reject-send>
              {t('online.reject')}
            </button>
          </>
        }
      >
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 text-sm text-ar-muted">{t('online.rejectHint')}</legend>
          {REJECT_REASONS.map((r) => (
            <label key={r} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-ar-line px-3 text-[15px]">
              <input type="radio" name="reject-reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
              {t(`online.reasons.${r}`)}
            </label>
          ))}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder={reason === 'OTHER' ? t('online.notePlaceholderRequired') : t('online.notePlaceholder')}
            className={`${fieldClass} h-auto py-2`}
            aria-label={t('online.note')}
          />
          {problem && (
            <p role="alert" className="m-0 text-sm text-ar-danger">
              {problem}
            </p>
          )}
        </fieldset>
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-sm text-ar-muted">{label}</span>
      <span>{children}</span>
    </span>
  );
}

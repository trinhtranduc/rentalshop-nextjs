'use client';

/**
 * Chi tiết đơn (#516). `[id]` is the order number. Data from GET /api/orders/by-number/[n]; the
 * receipt is the shared one from @rentalshop/ui. Giao đồ / Nhận trả / Huỷ / Xoá dialogs are ../detail/dialogs
 * (#560, iOS rows). Progress, next step, payment and history come from ../orders-model (unit-tested).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  COLLATERAL_CODES,
  ReceiptPreviewModal,
  collateralKey,
  useFormatCurrency,
  useToast,
} from '@rentalshop/ui';
import { useAuth, useCommonTranslations, useDedupedApi, useOrderTranslations, usePermissions } from '@rentalshop/hooks';
import { formatDateKeyInTimeZone, getLocalDateKey, ordersApi, SHOP_TIMEZONE } from '@rentalshop/utils';
import type { OrderWithDetails } from '@rentalshop/types';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import {
  buildHistory,
  buildNextStep,
  buildPaySummary,
  buildProgress,
  customerNameOf,
  formatDayLabel,
  type OrderDetailLike,
} from '../orders-model';
import { StatusTag, cardClass, outlineBtn, primaryBtn, type T } from '../list/parts';
import {
  ActionMenu,
  CustomerCard,
  DetailSkeleton,
  HistoryCard,
  ItemsCard,
  NextStepCard,
  NotesCard,
  PaymentCard,
  ProgressCard,
  createdLabel,
  type ItemView,
  type NoteView,
} from '../detail/sections';
import { SettingsEditor, SettingsSummary, type PendingFiles, type SettingsForm } from '../detail/settings';
import { DangerDialog, HandOverDialog, ReturnDialog, type DialogItem } from '../detail/dialogs';
import { scheduleRange } from '../detail/actions-model';

type AnyOrder = OrderWithDetails & { customerName?: string; customerPhone?: string };

interface ItemLike {
  id?: number;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  rentalDays?: number;
  pricingType?: string;
  productName?: string;
  barcode?: string;
  productImages?: unknown;
  product?: { name?: string; barcode?: string; images?: unknown } | null;
}

type UpdateInput = Parameters<typeof ordersApi.updateOrder>[1];
type ReceiptProps = React.ComponentProps<typeof ReceiptPreviewModal>;

const images = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x) : []);

function settingsOf(order: AnyOrder): SettingsForm {
  return {
    damageFee: order.damageFee || 0,
    securityDeposit: order.securityDeposit || 0,
    collateralType: order.collateralType || 'Other',
    collateralDetails: order.collateralDetails || '',
    notes: order.notes || '',
    notesImages: images(order.notesImages),
  };
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderNumber = String(params.id || '');
  const t = useTranslations('orders.web') as unknown as T;
  const to = useOrderTranslations();
  const tc = useCommonTranslations();
  const money = useFormatCurrency();
  const { toastSuccess, toastError } = useToast();
  const { user } = useAuth();
  const { canDeleteOrders } = usePermissions();

  const weekdays = useMemo(() => t('weekdays').split(','), [t]);
  const todayKey = useMemo(() => formatDateKeyInTimeZone(new Date(), SHOP_TIMEZONE), []);

  const { data, loading, error, refetch } = useDedupedApi({
    filters: { orderNumber },
    fetchFn: async () => {
      const result = await ordersApi.getOrderByNumber(orderNumber);
      if (!result.success || !result.data) throw new Error(result.error || 'ORDER_NOT_FOUND');
      return result.data;
    },
    enabled: !!orderNumber,
    staleTime: 60000,
    cacheTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  const order = (data || null) as AnyOrder | null;

  // Collateral, fees and notes; the dialogs read the saved values
  const settings = useMemo(() => (order ? settingsOf(order) : null), [order]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [busy, setBusy] = useState(false);
  const [handover, setHandover] = useState(false);
  const [takeBack, setTakeBack] = useState(false);
  const [receipt, setReceipt] = useState(false);
  const [confirm, setConfirm] = useState<'cancel' | 'delete' | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);
  const [readySaving, setReadySaving] = useState(false);
  useEffect(() => setReady(order ? !!order.isReadyToDeliver : null), [order]);
  const settingsRef = useRef<HTMLDivElement>(null);

  if (loading && !order) return <DetailSkeleton />;

  if (!order || !settings) {
    const notFound = !!error && /not.?found/i.test(error.message || '');
    return (
      <div className="mx-auto box-border flex w-full max-w-[640px] flex-col gap-4 px-4 pb-12 pt-10 text-ar-ink sm:px-8">
        <div className={`${cardClass} flex flex-col items-start gap-4 p-6`} role="alert">
          <h1 className="m-0 text-xl font-bold">{notFound || !error ? t('detail.notFound') : t('detail.loadFailed')}</h1>
          <div className="flex flex-wrap gap-2">
            <Link href="/orders" className={outlineBtn}>
              {t('detail.backToList')}
            </Link>
            {error && !notFound && (
              <button type="button" onClick={() => refetch()} className={primaryBtn}>
                {t('retry')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const detail = order as unknown as OrderDetailLike;
  const isRent = order.orderType === 'RENT';
  const status = order.status as string;
  const name = customerNameOf({ customerName: order.customerName, customer: order.customer });
  const by = (order.createdBy || {}) as { firstName?: string; lastName?: string; name?: string };
  const createdBy = by.name?.trim() || [by.firstName, by.lastName].filter(Boolean).join(' ').trim();
  const steps = buildProgress(detail, todayKey, getLocalDateKey);
  const next = buildNextStep(detail, todayKey, getLocalDateKey);
  const pay = buildPaySummary(detail);
  const history = buildHistory(detail);

  const canEdit = (isRent && status === 'RESERVED') || (!isRent && status === 'COMPLETED');
  const canCancel = canDeleteOrders && !['PICKUPED', 'RETURNED', 'CANCELLED'].includes(status);
  const canDelete = canDeleteOrders && status === 'CANCELLED';
  const settingsOpen = isRent && status !== 'CANCELLED';

  const dialogItems: DialogItem[] = [];
  const items: ItemView[] = ((order.orderItems || []) as unknown as ItemLike[]).map((item, i) => {
    const itemName: string = item.product?.name || item.productName || '—';
    const qty = item.quantity || 1;
    const unit = item.unitPrice || 0;
    const pricing = String(item.pricingType || 'FIXED').toUpperCase();
    const days = Math.max(1, item.rentalDays || 1);
    const parts: string[] = [];
    if (qty > 1) parts.push(t('detail.items.qty', { count: qty }));
    const code = item.product?.barcode || item.barcode;
    if (code) parts.push(t('detail.items.code', { code }));
    if (isRent && pricing === 'DAILY') parts.push(t('detail.items.daily'), t('detail.items.perDay', { amount: money(unit), days }));
    else if (isRent) parts.push(t('detail.items.fixed'), money(unit));
    else if (qty > 1) parts.push(money(unit));
    const image = images(item.productImages)[0] || images(item.product?.images)[0] || null;
    dialogItems.push({ id: item.id ?? i, name: itemName, qty, image });
    return {
      id: item.id ?? i,
      name: itemName,
      image,
      sub: parts.join(' · '),
      total: item.totalPrice || qty * unit,
    };
  });

  const notes: NoteView[] = (
    [
      { key: 'notes', label: t('detail.notes.general'), text: order.notes || '', images: images(order.notesImages) },
      { key: 'pickup', label: t('detail.notes.pickup'), text: order.pickupNotes || '', images: images(order.pickupNotesImages) },
      { key: 'return', label: t('detail.notes.return'), text: order.returnNotes || '', images: images(order.returnNotesImages) },
      { key: 'damage', label: t('detail.notes.damage'), text: order.damageNotes || '', images: images(order.damageNotesImages), danger: true },
    ] as NoteView[]
  ).filter((n) => n.text.trim() || n.images.length > 0);

  const code = collateralKey(settings.collateralType);
  const collateralLabel = code && code !== 'OTHER' ? to(`detailSettings.collateral.${code}`) : '';
  // Papers for the dialogs: details that only repeat the type ("ID Card" next to CCCD) are not shown twice
  const papersDetails = collateralKey(settings.collateralDetails) === code ? '' : settings.collateralDetails.trim();
  const papers = [collateralLabel, papersDetails].filter(Boolean).join(' · ');
  const range = scheduleRange(detail, getLocalDateKey);
  const lateDays = next?.kind === 'return' ? next.lateDays : 0;
  // "T5 08/10" stays on one line
  const day = (key: string) => formatDayLabel(key, weekdays).replace(/ /g, ' ');
  const dialogSubtitle = (late: number) =>
    [
      name,
      `#${order.orderNumber}`,
      late > 0 ? t('detail.dialog.lateDays', { days: late }) : range ? `${day(range.from)} → ${day(range.to)}` : '',
    ]
      .filter(Boolean)
      .join(' · ');

  const done = async (ok: boolean) => {
    if (ok) {
      await refetch();
      toastSuccess(tc('messages.updateSuccess'), to('messages.updateSuccess'));
    }
  };

  const changeStatus = async (call: () => Promise<{ success: boolean }>) => {
    setBusy(true);
    try {
      const res = await call();
      await done(res.success);
    } catch {
      // useGlobalErrorHandler shows the API error
    } finally {
      setBusy(false);
    }
  };

  const confirmPickup = () => changeStatus(() => ordersApi.pickupOrder(order.id));
  const confirmReturn = (overrides?: { damageFee?: number }) =>
    changeStatus(async () => {
      const fee = overrides?.damageFee ?? settings.damageFee ?? 0;
      // returnOrder only changes the status: save the damage fee from the dialog first
      if (fee !== (order.damageFee || 0)) {
        const saved = await ordersApi.updateOrderSettings(order.id, { damageFee: fee });
        if (!saved.success) return saved;
      }
      return ordersApi.returnOrder(order.id);
    });

  const toggleReady = async (value: boolean) => {
    setReady(value);
    setReadySaving(true);
    try {
      const res = await ordersApi.updateOrder(order.id, { isReadyToDeliver: value } as UpdateInput);
      if (!res.success) throw new Error(res.error);
      await refetch();
    } catch {
      setReady(!value);
      toastError(t('detail.readyFailed'));
    } finally {
      setReadySaving(false);
    }
  };

  const saveSettings = async (s: SettingsForm, pending: PendingFiles) => {
    setSaving(true);
    try {
      const res = await ordersApi.updateOrderSettings(order.id, s);
      if (!res.success) throw new Error(res.error || 'save failed');
      if (pending.notesImages?.length) {
        const upload = await ordersApi.updateOrder(order.id, {} as UpdateInput, pending);
        if (!upload.success) throw new Error(upload.error || 'upload failed');
      }
      setEditing(false);
      await refetch();
      toastSuccess(to('detail.settingsSaved'), to('detail.settingsSavedMessage'));
    } catch {
      // useGlobalErrorHandler shows the API error
    } finally {
      setSaving(false);
    }
  };

  const editNotes = () => {
    setEditing(true);
    requestAnimationFrame(() => settingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const enabled = {
    damageFee: isRent && (status === 'PICKUPED' || status === 'RETURNED'),
    securityDeposit: isRent && ['RESERVED', 'PICKUPED', 'RETURNED'].includes(status),
    collateral: isRent && ['RESERVED', 'PICKUPED', 'RETURNED'].includes(status),
  };
  const collateralOptions = [...COLLATERAL_CODES, 'Other'].map((value) => ({
    value,
    label: to(`detailSettings.collateral.${value === 'Other' ? 'OTHER' : value}`),
  }));

  const menu = [
    ...(canCancel ? [{ label: t('detail.cancel'), onSelect: () => setConfirm('cancel'), danger: true }] : []),
    ...(canDelete ? [{ label: t('detail.delete'), onSelect: () => setConfirm('delete'), danger: true }] : []),
  ];

  const subline = [
    `#${order.orderNumber}`,
    [t('detail.created', { time: createdLabel(order.createdAt, getLocalDateKey, weekdays) }), createdBy ? t('detail.by', { name: createdBy }) : '']
      .filter(Boolean)
      .join(' '),
    order.outlet?.name || '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <Link href="/orders" className="flex min-h-8 items-center gap-1 self-start text-sm font-semibold text-ar-primary-ink no-underline hover:underline">
        <ShellIcon d={ICONS.chevronLeft} size={16} />
        {t('detail.back')}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusTag status={status} t={t} />
            <h1 className="m-0 text-2xl font-bold text-ar-ink">{name || t('row.walkIn')}</h1>
            <span className="text-sm text-ar-muted">{t(isRent ? 'detail.rent' : 'detail.sale')}</span>
          </div>
          <span className="text-sm tabular-nums text-ar-muted">{subline}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setReceipt(true)} className={outlineBtn}>
            {t('detail.print')}
          </button>
          {canEdit && (
            <Link href={`/orders/${order.orderNumber}/edit`} className={outlineBtn}>
              {t('detail.edit')}
            </Link>
          )}
          <ActionMenu label={t('detail.more')} items={menu} />
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-4">
          <ProgressCard steps={steps} weekdays={weekdays} t={t} />
          <ItemsCard
            title={t(isRent ? 'detail.items.rent' : 'detail.items.sale')}
            items={items}
            ready={isRent && status === 'RESERVED' ? ready : null}
            onReady={toggleReady}
            readySaving={readySaving}
            t={t}
            money={money}
          />
          {editing ? (
            <div ref={settingsRef} className="scroll-mt-4">
              <SettingsEditor
                initial={settings}
                enabled={enabled}
                collateralOptions={collateralOptions}
                saving={saving}
                onSave={saveSettings}
                onCancel={() => setEditing(false)}
                t={t}
                to={to as unknown as T}
              />
            </div>
          ) : (
            <NotesCard notes={notes} onEdit={settingsOpen ? editNotes : null} t={t} />
          )}
          <HistoryCard events={history} toDayKey={getLocalDateKey} t={t} money={money} />
        </div>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          {next && (
            <NextStepCard
              next={next}
              busy={busy}
              onAct={() => (next.kind === 'pickup' ? setHandover(true) : setTakeBack(true))}
              weekdays={weekdays}
              t={t}
              money={money}
            />
          )}
          <PaymentCard summary={pay} collateralLabel={collateralLabel} t={t} money={money} />
          {settingsOpen && (
            <SettingsSummary settings={settings} collateralLabel={collateralLabel} onEdit={editNotes} t={t} to={to as unknown as T} money={money} />
          )}
          <CustomerCard
            id={order.customer?.id ?? order.customerId ?? null}
            name={name}
            phone={order.customer?.phone || order.customerPhone || ''}
            email={order.customer?.email || ''}
            t={t}
          />
        </div>
      </div>

      <HandOverDialog
        open={handover}
        onClose={() => setHandover(false)}
        order={detail}
        subtitle={dialogSubtitle(0)}
        items={dialogItems}
        papers={papers}
        onConfirm={confirmPickup}
        t={t}
        money={money}
      />
      <ReturnDialog
        open={takeBack}
        onClose={() => setTakeBack(false)}
        order={detail}
        subtitle={dialogSubtitle(lateDays)}
        items={dialogItems}
        papers={papers}
        initialDamageFee={settings.damageFee}
        lateDays={lateDays}
        onConfirm={(damageFee) => confirmReturn({ damageFee })}
        t={t}
        money={money}
      />

      <DangerDialog
        open={confirm === 'cancel'}
        title={t('detail.dialog.cancel.title')}
        message={t('detail.dialog.cancel.message', { number: `#${order.orderNumber}` })}
        keepLabel={t('detail.dialog.cancel.keep')}
        confirmLabel={t('detail.dialog.cancel.confirm')}
        closeLabel={t('detail.dialog.close')}
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          await changeStatus(() => ordersApi.cancelOrder(order.id));
          setConfirm(null);
        }}
      />
      <DangerDialog
        open={confirm === 'delete'}
        title={t('detail.dialog.delete.title')}
        message={t('detail.dialog.delete.message', { number: `#${order.orderNumber}` })}
        keepLabel={t('detail.dialog.delete.keep')}
        confirmLabel={t('detail.dialog.delete.confirm')}
        closeLabel={t('detail.dialog.close')}
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          setBusy(true);
          try {
            const res = await ordersApi.deleteOrder(order.id);
            if (res.success) {
              toastSuccess(tc('messages.deleteSuccess'), to('messages.deleteSuccess'));
              router.push('/orders');
            }
          } catch {
            // useGlobalErrorHandler shows the API error
          } finally {
            setBusy(false);
            setConfirm(null);
          }
        }}
      />

      <ReceiptPreviewModal
        isOpen={receipt}
        onClose={() => setReceipt(false)}
        order={order as unknown as ReceiptProps['order']}
        outlet={order.outlet as unknown as ReceiptProps['outlet']}
        merchant={(user?.merchant as unknown as ReceiptProps['merchant']) || null}
      />
    </div>
  );
}

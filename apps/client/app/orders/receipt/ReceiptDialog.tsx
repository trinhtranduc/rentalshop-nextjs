'use client';

/**
 * Hoá đơn dialog of the shop web (#562), opened after Tạo đơn and from In on the order page. Replaces the
 * shared `ReceiptPreviewModal` here only (admin keeps it) and takes the same props, so a call site only
 * changes its import. Shell tokens (light/dark), the slip on white paper, In + Đóng; full screen on a phone.
 *
 * In prints with `window.print()`: while the dialog is open a print stylesheet hides every other child of
 * <body> and the dialog chrome, so only the slip prints, on the paper width chosen in Cài đặt → Máy in
 * (80mm by default, same CSS as before; 58mm since #623).
 */
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { collateralKey } from '@rentalshop/ui';
import { useOrderTranslations } from '@rentalshop/hooks';
import { outletsApi } from '@rentalshop/utils';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import { outlineBtn, primaryBtn } from '../list/parts';
import { buildReceipt, type ReceiptOrderInput, type ReceiptOutletInput } from './receipt-model';
import { ReceiptSlip, SLIP_58_CSS, SLIP_CSS } from './ReceiptSlip';
import { usePrintSettings } from '../../components/usePrintSettings';

type Tr = (key: string, values?: Record<string, string | number>) => string;

const PRINTER = 'M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z';

/** Paper wide, as long as the slip (an invalid `80mm auto` made browsers fall back to A4 / Letter). */
const pageCss = (heightMm: number | null, widthMm: 80 | 58 = 80) =>
  `@media print { @page { size: ${widthMm}mm ${heightMm ? `${heightMm}mm` : 'auto'}; margin: 0; } }`;

const PRINT_CSS = `
@media print {
  html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
  body > *:not(.ar-receipt-root) { display: none !important; }
  .ar-receipt-root, .ar-receipt-root .rc-panel, .ar-receipt-root .rc-body {
    position: static !important; display: block !important; inset: auto !important; width: auto !important;
    height: auto !important; max-height: none !important; overflow: visible !important; padding: 0 !important;
    margin: 0 !important; background: #fff !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important;
  }
  .ar-receipt-root .rc-chrome { display: none !important; }
  .ar-receipt-root .rc-paper { box-shadow: none !important; margin: 0 !important; }
}
`;

type OrderInput = ReceiptOrderInput & { outletId?: number | null; outlet?: (ReceiptOutletInput & { id?: number | null }) | null };

export interface ReceiptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderInput | null;
  outlet?: (ReceiptOutletInput & { id?: number | null }) | null;
  merchant?: { name?: string | null; phone?: string | null; address?: string | null } | null;
}

/** The order has no outlet phone/address (create response): load the caller's outlets once to find them. */
function useOutletDetails(open: boolean, order: OrderInput | null, outlet: ReceiptPreviewModalProps['outlet']) {
  const [details, setDetails] = useState<ReceiptOutletInput | null>(null);
  const outletId = order?.outlet?.id ?? order?.outletId ?? outlet?.id ?? null;
  const known = !!(order?.outlet?.phone || order?.outlet?.address || outlet?.phone || outlet?.address);
  useEffect(() => {
    if (!open || known || outletId == null) return;
    let live = true;
    outletsApi
      .getOutletsPaginated(1, 100)
      .then((res) => {
        if (!live || !res.success) return;
        const data = res.data as unknown;
        const list = (Array.isArray(data) ? data : ((data as { outlets?: unknown[] } | null)?.outlets ?? [])) as Array<ReceiptOutletInput & { id?: number }>;
        const found = list.find((o) => o.id === outletId);
        if (found) setDetails({ name: found.name, phone: found.phone, address: found.address, printNote: found.printNote });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [open, known, outletId]);
  return details;
}

export function ReceiptPreviewModal({ isOpen, onClose, order, outlet, merchant }: ReceiptPreviewModalProps) {
  const t = useTranslations('orders.web.receipt') as unknown as Tr;
  const to = useOrderTranslations();
  const titleId = useId();
  const printRef = useRef<HTMLButtonElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [heightMm, setHeightMm] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [{ billWidth }] = usePrintSettings();

  const outletDetails = useOutletDetails(isOpen, order, outlet);
  // "{n} ngày" stays a template: the model fills in each line's days
  const words = useMemo(
    () => ({ perDay: t('units.perDay'), days: t('units.days', { n: '{n}' }), perHour: t('units.perHour'), hours: t('units.hours', { n: '{n}' }) }),
    [t]
  );
  const model = useMemo(
    () => (order ? buildReceipt(order, { outlet, outletDetails, merchant }, words) : null),
    [order, outlet, outletDetails, merchant, words]
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    printRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [isOpen, onClose]);

  // Page length follows the slip (CSS px → mm at 96 dpi, rounded up)
  useEffect(() => {
    const el = paperRef.current?.querySelector<HTMLElement>('[data-receipt-content]');
    if (!isOpen || !el) return;
    const measure = () => setHeightMm(Math.ceil((el.offsetHeight * 25.4) / 96) + 1);
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [isOpen, model, mounted, billWidth]);

  if (!isOpen || !model || !mounted) return null;

  const collateralLabel = (type: string | null | undefined) => {
    const code = collateralKey(type);
    return code && code !== 'OTHER' ? to(`detailSettings.collateral.${code}`) : '';
  };

  return createPortal(
    <div className="ar-theme ar-receipt-root fixed inset-0 z-[60] flex items-stretch justify-center sm:items-center sm:p-4">
      <style>{SLIP_CSS + (billWidth === 58 ? SLIP_58_CSS : '') + PRINT_CSS + pageCss(heightMm, billWidth)}</style>
      <div className="rc-chrome absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="rc-panel relative flex h-full w-full flex-col bg-ar-surface text-ar-ink shadow-xl sm:h-auto sm:max-h-[92vh] sm:max-w-[520px] sm:rounded-2xl"
      >
        <div className="rc-chrome flex items-center justify-between gap-3 border-b border-ar-line-soft px-5 py-4">
          <h2 id={titleId} className="m-0 text-lg font-bold">
            {model.orderNumber ? t('title', { number: model.orderNumber }) : t('titleNoNumber')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] text-ar-muted hover:bg-ar-subtle"
          >
            <ShellIcon d={ICONS.close} size={18} />
          </button>
        </div>
        <div className="rc-body min-h-0 flex-1 overflow-y-auto bg-ar-subtle px-4 py-6">
          <div ref={paperRef} className="rc-paper mx-auto w-fit max-w-full rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.10)]">
            <ReceiptSlip model={model} t={t} collateralLabel={collateralLabel} width={billWidth} />
          </div>
        </div>
        <div className="rc-chrome flex items-center gap-2 border-t border-ar-line-soft px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <span className="mr-auto hidden text-sm text-ar-muted sm:inline">{t('paper', { width: billWidth })}</span>
          <button type="button" onClick={onClose} className={`${outlineBtn} flex-1 sm:flex-none`}>
            {t('close')}
          </button>
          <button ref={printRef} type="button" onClick={() => window.print()} className={`${primaryBtn} flex-1 sm:flex-none`}>
            <ShellIcon d={PRINTER} size={18} />
            {t('print')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

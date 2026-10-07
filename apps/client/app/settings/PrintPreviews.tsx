'use client';

/**
 * Phiếu in previews and test prints (#626): the real slip and label components with sample data, so what
 * the shop sees here is what the printer gets. Test prints go through the same print paths as orders and In tem.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { collateralKey } from '@rentalshop/ui';
import { useOrderTranslations } from '@rentalshop/hooks';
import { buildReceipt, type ReceiptOutletInput } from '../orders/receipt/receipt-model';
import { ReceiptSlip, SLIP_58_CSS, SLIP_CSS } from '../orders/receipt/ReceiptSlip';
import { ReceiptPreviewModal } from '../orders/receipt/ReceiptDialog';
import { LABEL_SCREEN_CSS, LabelPage, LabelPrintRoot } from '../products/labels/LabelSheet';
import { useShopToday } from '../hooks/useShopToday';
import type { LabelLayout } from '../../lib/print-settings';
import { sampleLabels, sampleReceiptOrder } from './print-preview-model';

type Tr = (key: string, values?: Record<string, string | number>) => string;

function useSampleOrder() {
  const todayKey = useShopToday();
  return useMemo(() => sampleReceiptOrder(todayKey), [todayKey]);
}

/** The sample rental bill at the chosen paper width, with this outlet's header and the note being typed. */
export function BillPreview({ outlet, width }: { outlet: ReceiptOutletInput; width: 80 | 58 }) {
  const t = useTranslations('orders.web.receipt') as unknown as Tr;
  const to = useOrderTranslations();
  const order = useSampleOrder();
  const words = useMemo(
    () => ({ perDay: t('units.perDay'), days: t('units.days', { n: '{n}' }), perHour: t('units.perHour'), hours: t('units.hours', { n: '{n}' }) }),
    [t],
  );
  const model = useMemo(() => buildReceipt(order, { outlet }, words), [order, outlet, words]);
  const collateralLabel = (type: string | null | undefined) => {
    const code = collateralKey(type);
    return code && code !== 'OTHER' ? to(`detailSettings.collateral.${code}`) : '';
  };
  return (
    <div className="max-h-[560px] overflow-y-auto rounded-xl bg-ar-subtle px-3 py-5">
      <style>{SLIP_CSS + (width === 58 ? SLIP_58_CSS : '')}</style>
      <div className="mx-auto w-fit max-w-full rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.10)]">
        <ReceiptSlip model={model} t={t} collateralLabel={collateralLabel} width={width} />
      </div>
    </div>
  );
}

/** "In thử" for the bill: the order Hoá đơn dialog with the sample order, so the print path is the real one. */
export function BillTestPrint({ outlet, open, onClose }: { outlet: ReceiptOutletInput; open: boolean; onClose: () => void }) {
  const order = useSampleOrder();
  return <ReceiptPreviewModal isOpen={open} onClose={onClose} order={order} outlet={outlet} />;
}

/** The sample label at real size (one per position, so 2-up shows two). Drawn 1 mm = 1 mm on screen. */
export function LabelPreview({ layout }: { layout: LabelLayout }) {
  const labels = useMemo(() => sampleLabels(layout.perRow), [layout.perRow]);
  return (
    <div className="flex items-center justify-center overflow-x-auto rounded-xl bg-ar-subtle p-5">
      <style>{LABEL_SCREEN_CSS}</style>
      <div className="shadow-[0_1px_3px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.10)]">
        <LabelPage labels={labels} layout={layout} />
      </div>
    </div>
  );
}

/**
 * "In thử" for labels: mounts the In tem print copy with one sample page, opens the print dialog,
 * and unmounts after printing so the label print rules never affect other prints.
 */
export function useLabelTestPrint(layout: LabelLayout) {
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    // let the portal mount before the dialog opens
    const id = window.setTimeout(() => window.print(), 50);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('afterprint', done);
    };
  }, [printing]);
  const node = printing ? <LabelPrintRoot labels={sampleLabels(layout.perRow)} layout={layout} /> : null;
  return { start: () => setPrinting(true), printing, node };
}

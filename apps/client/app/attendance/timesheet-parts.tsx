'use client';

/** Bảng công pieces shared with the person page (#908): grid cell, Excel export dialog. */
import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@rentalshop/ui';
import { attendanceApi } from '@rentalshop/utils';
import type { AttendanceExportPart } from '@rentalshop/types';
import { addMonths, monthLabel, type CellKind } from './attendance-model';
import { Dialog, DialogFooter, Seg, useBusy, type AttT } from './parts';

export const CELL_CLASS: Record<CellKind, string> = {
  ok: 'bg-[#EFF6FF] text-[#1E40AF]',
  late: 'bg-[#FEF3C7] text-[#92400E]',
  ot: 'bg-[#EDE9FE] text-[#5B21B6]',
  miss: 'bg-[#FEE2E2] text-[#B91C1C]',
  fake: 'bg-white text-[#B91C1C] outline outline-[1.5px] outline-dashed outline-[#B91C1C]',
  absent: 'bg-transparent font-normal text-[#94A3B8]',
  we: 'bg-transparent text-[#CBD5E1] cursor-default',
  empty: '',
};

export function Cell({ kind, text, title }: { kind: CellKind; text: string; title?: string }) {
  return (
    <span title={title} className={`inline-block min-w-[24px] rounded-[5px] px-[3px] py-[2px] text-xs font-semibold ${CELL_CLASS[kind]}`}>
      {text}
    </span>
  );
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportDialog({ open, onClose, outletId, month }: { open: boolean; onClose: () => void; outletId: number; month: string }) {
  const t = useTranslations('attendance') as unknown as AttT;
  const { toastError } = useToast();
  const [pick, setPick] = useState(month);
  const [parts, setParts] = useState<AttendanceExportPart[]>(['grid', 'scans', 'edits']);
  const { busy, run } = useBusy();
  React.useEffect(() => {
    if (open) setPick(month);
  }, [open, month]);
  const toggle = (p: AttendanceExportPart) => setParts((list) => (list.includes(p) ? list.filter((x) => x !== p) : [...list, p]));
  const go = () =>
    run(async () => {
      try {
        const blob = await attendanceApi.exportTimesheet(outletId, pick, parts);
        download(blob, `cham-cong-${pick}.xlsx`);
        onClose();
      } catch {
        toastError(t('export.failed'));
      }
    });
  return (
    <Dialog
      open={open}
      title={t('export.title')}
      onClose={onClose}
      footer={<DialogFooter onCancel={onClose} onOk={go} okLabel={t('export.download')} busy={busy} okDisabled={parts.length === 0} />}
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ar-ink-2">{t('export.month')}</span>
        <Seg
          options={[addMonths(month, -1), month].map((m) => ({ value: m, label: t('common.month', { month: monthLabel(m) }) }))}
          value={pick}
          onChange={setPick}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ar-ink-2">{t('export.parts')}</span>
        {(['grid', 'scans', 'edits'] as AttendanceExportPart[]).map((p) => (
          <label key={p} className="flex items-center gap-2 py-1 text-sm">
            <input type="checkbox" checked={parts.includes(p)} onChange={() => toggle(p)} /> {t(`export.${p}`)}
          </label>
        ))}
      </div>
    </Dialog>
  );
}


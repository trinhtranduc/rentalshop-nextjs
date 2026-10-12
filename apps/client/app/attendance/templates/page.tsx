'use client';

/**
 * Mẫu ca (#908, #907 rule 19): shift templates of an outlet; hide a used one, delete an unused one.
 */
import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@rentalshop/ui';
import { attendanceApi } from '@rentalshop/utils';
import type { ShiftColor, ShiftTemplate } from '@rentalshop/types';
import { SHIFT_COLORS, chipClass, isTime, listOf, shiftRange } from '../attendance-model';
import {
  AttendanceFrame,
  Dialog,
  DialogFooter,
  Field,
  Note,
  OutletPicker,
  PageHead,
  Pill,
  Seg,
  cardClass,
  inputClass,
  must,
  primaryBtn,
  smallBtn,
  smallDangerBtn,
  tdClass,
  thClass,
  useBusy,
  useLoad,
  type AttT,
  type OutletOption,
} from '../parts';

type DialogState = { kind: 'form'; tpl: ShiftTemplate | null } | { kind: 'hide' | 'delete'; tpl: ShiftTemplate } | null;

function TemplateForm({ open, tpl, outletId, onClose, onDone }: { open: boolean; tpl: ShiftTemplate | null; outletId: number; onClose: () => void; onDone: () => void }) {
  const t = useTranslations('attendance') as unknown as AttT;
  const { toastSuccess } = useToast();
  const { busy, run } = useBusy();
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [brk, setBrk] = useState('0');
  const [color, setColor] = useState<ShiftColor>('blue');
  useEffect(() => {
    if (!open) return;
    setName(tpl?.name || '');
    setStart(tpl?.startTime || '');
    setEnd(tpl?.endTime || '');
    setBrk(String(tpl?.breakMinutes ?? 0));
    setColor((tpl?.color as ShiftColor) || 'blue');
  }, [open, tpl]);
  const minutes = Number(brk);
  const valid = name.trim().length > 0 && isTime(start) && isTime(end) && start !== end && Number.isInteger(minutes) && minutes >= 0 && minutes <= 600;
  const save = () =>
    run(async () => {
      const body = { outletId, name: name.trim(), startTime: start, endTime: end, breakMinutes: minutes, color };
      await must(tpl ? attendanceApi.updateTemplate(Number(tpl.id), body) : attendanceApi.createTemplate(body));
      toastSuccess(t('templateForm.saved'));
      onClose();
      onDone();
    });
  return (
    <Dialog
      open={open}
      title={tpl ? t('templateForm.editTitle') : t('templateForm.newTitle')}
      onClose={onClose}
      footer={<DialogFooter onCancel={onClose} onOk={save} okLabel={tpl ? t('common.save') : t('templateForm.create')} busy={busy} okDisabled={!valid} />}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t('templateForm.name')} full>
          <input className={inputClass} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t('templateForm.start')}>
          <input type="time" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label={t('templateForm.end')}>
          <input type="time" className={inputClass} value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
        <Field label={t('templateForm.break')}>
          <input type="number" min={0} max={600} step={5} className={inputClass} value={brk} onChange={(e) => setBrk(e.target.value)} />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ar-ink-2">{t('templateForm.color')}</span>
          <Seg label={t('templateForm.color')} options={SHIFT_COLORS.map((c) => ({ value: c, label: t(`templateForm.colors.${c}`) }))} value={color} onChange={setColor} />
        </div>
      </div>
      <Note>
        {t('templateForm.overnight')}
        {tpl ? ` ${t('templateForm.editNote')}` : ''}
      </Note>
    </Dialog>
  );
}

function Templates({ outlet, outlets }: { outlet: OutletOption; outlets: OutletOption[] }) {
  const t = useTranslations('attendance') as unknown as AttT;
  const { toastSuccess } = useToast();
  const { busy, run } = useBusy();
  const [dialog, setDialog] = useState<DialogState>(null);
  const list = useLoad<ShiftTemplate[]>(async () => listOf<ShiftTemplate>(await must(attendanceApi.listTemplates(outlet.id)), 'templates'), [outlet.id]);
  const rows = list.data || [];
  const close = () => setDialog(null);
  const act = (fn: () => Promise<unknown>, msg: string) =>
    run(async () => {
      await fn();
      toastSuccess(msg);
      close();
      list.reload();
    });

  return (
    <>
      <PageHead title={t('templates.title')} sub={t('templates.subtitle', { outlet: outlet.name })}>
        <OutletPicker outlets={outlets} outlet={outlet} />
        <button type="button" className={primaryBtn} onClick={() => setDialog({ kind: 'form', tpl: null })}>
          {t('templates.add')}
        </button>
      </PageHead>
      <div className={`${cardClass} overflow-x-auto p-0`}>
        {!list.data ? (
          <p className="m-0 px-5 py-6 text-ar-muted">{list.error ? t('common.loadFailed') : t('common.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="m-0 px-5 py-8 text-center text-ar-muted">{t('templates.empty')}</p>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {(['shift', 'time', 'break', 'used'] as const).map((c) => (
                  <th key={c} className={thClass}>
                    {t(`templates.col.${c}`)}
                  </th>
                ))}
                <th className={thClass} />
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id} className={x.isActive ? undefined : 'opacity-60'}>
                  <td className={tdClass}>
                    <span className={`inline-block rounded-lg px-[7px] py-1 text-xs ${chipClass(x.color)}`}>{x.name}</span>
                  </td>
                  <td className={tdClass}>{shiftRange(x.startTime, x.endTime)}</td>
                  <td className={tdClass}>{t('templates.minutes', { n: x.breakMinutes })}</td>
                  <td className={tdClass}>{x.isActive ? (x.used ? t('templates.used') : t('templates.unused')) : <Pill tone="gray">{t('templates.hidden')}</Pill>}</td>
                  <td className={tdClass}>
                    <span className="flex flex-wrap gap-1">
                      <button type="button" className={smallBtn} onClick={() => setDialog({ kind: 'form', tpl: x })}>
                        {t('templates.edit')}
                      </button>
                      {!x.isActive ? (
                        <button
                          type="button"
                          className={smallBtn}
                          disabled={busy}
                          onClick={() => act(() => must(attendanceApi.setTemplateActive(Number(x.id), true)), t('templates.shown'))}
                        >
                          {t('templates.show')}
                        </button>
                      ) : x.used ? (
                        <button type="button" className={smallBtn} onClick={() => setDialog({ kind: 'hide', tpl: x })}>
                          {t('templates.hide')}
                        </button>
                      ) : (
                        <button type="button" className={smallDangerBtn} onClick={() => setDialog({ kind: 'delete', tpl: x })}>
                          {t('templates.delete')}
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="m-0 text-[13px] text-ar-muted">{t('templates.hint')}</p>

      <TemplateForm open={dialog?.kind === 'form'} tpl={dialog?.kind === 'form' ? dialog.tpl : null} outletId={outlet.id} onClose={close} onDone={list.reload} />
      <Dialog
        open={dialog?.kind === 'hide'}
        title={dialog?.kind === 'hide' ? t('templateHide.title', { name: dialog.tpl.name }) : ''}
        sub={t('templateHide.sub')}
        onClose={close}
        footer={
          <DialogFooter
            onCancel={close}
            busy={busy}
            okLabel={t('templateHide.confirm')}
            onOk={() => dialog?.kind === 'hide' && act(() => must(attendanceApi.setTemplateActive(Number(dialog.tpl.id), false)), t('templateHide.saved'))}
          />
        }
      >
        <Note>{t('templateHide.note')}</Note>
      </Dialog>
      <Dialog
        open={dialog?.kind === 'delete'}
        title={dialog?.kind === 'delete' ? t('templateDelete.title', { name: dialog.tpl.name }) : ''}
        sub={t('templateDelete.sub')}
        onClose={close}
        footer={
          <DialogFooter
            onCancel={close}
            danger
            busy={busy}
            okLabel={t('templateDelete.confirm')}
            onOk={() => dialog?.kind === 'delete' && act(() => must(attendanceApi.deleteTemplate(Number(dialog.tpl.id))), t('templateDelete.saved'))}
          />
        }
      />
    </>
  );
}

export default function AttendanceTemplatesPage() {
  return <AttendanceFrame>{({ outlet, outlets }) => <Templates outlet={outlet} outlets={outlets} />}</AttendanceFrame>;
}

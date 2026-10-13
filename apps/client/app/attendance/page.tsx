'use client';

/**
 * Bảng công (#908, #907 rule 26): month grid per outlet, KPIs, Excel export, month lock.
 */
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useToast } from '@rentalshop/ui';
import { attendanceApi } from '@rentalshop/utils';
import type { AttendanceTimesheet, EffectiveShiftDay, TimesheetUser } from '@rentalshop/types';
import {
  addMonths,
  cellKind,
  formatHours,
  isMonthKey,
  lastDayOfMonth,
  lockDisplay,
  monthDays,
  monthLabel,
  monthOf,
  normalizeDays,
  personId,
  personName,
  rowTotals,
  scheduledSet,
  todayKey,
} from './attendance-model';
import {
  AttendanceFrame,
  Dialog,
  DialogFooter,
  Kpi,
  MonthNav,
  Note,
  OutletPicker,
  PageHead,
  cardClass,
  must,
  outlineBtn,
  useBusy,
  useLoad,
  useQueryState,
  type AttT,
  type OutletOption,
} from './parts';
import { Cell, ExportDialog } from './timesheet-parts';

function LockDialog({
  open,
  onClose,
  locked,
  outletId,
  month,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  locked: boolean;
  outletId: number;
  month: string;
  onDone: () => void;
}) {
  const t = useTranslations('attendance') as unknown as AttT;
  const { toastSuccess } = useToast();
  const { busy, run } = useBusy();
  const label = monthLabel(month);
  const go = () =>
    run(async () => {
      await must(locked ? attendanceApi.unlockMonth(outletId, month) : attendanceApi.lockMonth(outletId, month));
      toastSuccess(t(locked ? 'lock.unlocked' : 'lock.locked', { month: label }));
      onClose();
      onDone();
    });
  return (
    <Dialog
      open={open}
      title={t(locked ? 'lock.unlockTitle' : 'lock.title', { month: label })}
      onClose={onClose}
      footer={<DialogFooter onCancel={onClose} onOk={go} okLabel={t(locked ? 'lock.unlockConfirm' : 'lock.confirm')} busy={busy} />}
    >
      <Note tone="w">{t(locked ? 'lock.unlockBody' : 'lock.body')}</Note>
    </Dialog>
  );
}

function Timesheet({ outlet, outlets, role }: { outlet: OutletOption; outlets: OutletOption[]; role: string }) {
  const t = useTranslations('attendance') as unknown as AttT;
  const tc = useTranslations('common') as unknown as AttT;
  const { params, set } = useQueryState();
  const today = todayKey();
  const month = isMonthKey(params.get('month')) ? (params.get('month') as string) : monthOf(today);
  const days = useMemo(() => monthDays(month), [month]);
  const [dialog, setDialog] = useState<'export' | 'lock' | null>(null);

  const sheet = useLoad<AttendanceTimesheet>(() => must(attendanceApi.timesheet(outlet.id, month)), [outlet.id, month]);
  // "Vắng" needs the schedule of past days only
  const shiftTo = lastDayOfMonth(month) < today ? lastDayOfMonth(month) : today;
  const shifts = useLoad<EffectiveShiftDay[]>(
    `${month}-01` < today
      ? async () => (await must(attendanceApi.listShifts(outlet.id, `${month}-01`, shiftTo))).items || []
      : null,
    [outlet.id, month, shiftTo],
  );
  const scheduled = useMemo(() => scheduledSet(shifts.data), [shifts.data]);

  const data = sheet.data;
  const users: TimesheetUser[] = data?.users || [];
  const locked = !!data?.locked;
  const lock = lockDisplay(locked, role);
  const personHref = (u: TimesheetUser, day?: string) =>
    `/attendance/person?outletId=${outlet.id}&month=${month}&userId=${personId(u)}${day ? `&day=${day}` : ''}`;

  return (
    <>
      <PageHead
        title={t('timesheet.title', { month: monthLabel(month) })}
        sub={data ? t('timesheet.subtitle', { count: users.length, lock: t(locked ? 'timesheet.locked' : 'timesheet.unlocked') }) : undefined}
      >
        <OutletPicker outlets={outlets} outlet={outlet} />
        <MonthNav month={month} onChange={(d) => set({ month: addMonths(month, d) })} />
        <button type="button" className={outlineBtn} onClick={() => setDialog('export')}>
          {t('common.exportXlsx')}
        </button>
        {lock.showLock && (
          <button type="button" className={outlineBtn} onClick={() => setDialog('lock')}>
            {t('timesheet.lock')}
          </button>
        )}
        {lock.showUnlock && (
          <button type="button" className={outlineBtn} onClick={() => setDialog('lock')}>
            🔒 {t('timesheet.unlock')}
          </button>
        )}
      </PageHead>

      {sheet.error ? (
        <div role="alert" className={`${cardClass} flex items-center gap-3 px-5 py-6 text-ar-muted`}>
          {t('common.loadFailed')}
          <button type="button" className={outlineBtn} onClick={sheet.reload}>
            {t('common.retry')}
          </button>
        </div>
      ) : !data ? (
        <p className="m-0 text-ar-muted">{t('common.loading')}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            <Kpi label={t('timesheet.kpi.totalHours')} value={t('common.hours', { hours: formatHours(data.summary?.totalHours) })} />
            <Kpi label={t('timesheet.kpi.pairs')} value={data.summary?.pairs ?? 0} />
            <Kpi label={t('timesheet.kpi.missingOut')} value={data.summary?.missingOut ?? 0} tone="red" />
            <Kpi label={t('timesheet.kpi.suspected')} value={data.summary?.suspected ?? 0} tone="red" />
          </div>

          <div className={`${cardClass} overflow-x-auto p-0`}>
            {users.length === 0 ? (
              <p className="m-0 px-5 py-8 text-center text-ar-muted">{t('timesheet.empty')}</p>
            ) : (
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-[1] whitespace-nowrap border-b border-ar-line bg-ar-surface-muted py-1.5 pl-2.5 pr-1 text-left font-semibold text-ar-muted">
                      {t('timesheet.col.staff')}
                    </th>
                    {days.map((d) => (
                      <th key={d.key} className={`border-b border-ar-line bg-ar-surface-muted px-[3px] py-1.5 text-center font-semibold ${d.sunday ? 'text-[#CBD5E1]' : 'text-ar-muted'}`}>
                        {d.day}
                      </th>
                    ))}
                    <th className="border-b border-ar-line bg-ar-surface-muted px-1.5 py-1.5 text-center font-semibold text-ar-muted">{t('timesheet.col.hours')}</th>
                    <th className="border-b border-ar-line bg-ar-surface-muted px-1.5 py-1.5 text-center font-semibold text-ar-muted">{t('timesheet.col.days')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const map = normalizeDays(u.days);
                    const totals = rowTotals(u);
                    const id = personId(u);
                    return (
                      <tr key={id}>
                        <td className="sticky left-0 z-[1] whitespace-nowrap border-b border-ar-line-soft bg-ar-surface py-1.5 pl-2.5 pr-1 text-left">
                          <Link href={personHref(u)} className="font-semibold text-ar-primary underline">
                            {personName(u)} ›
                          </Link>
                          {u.role && (
                            <>
                              <br />
                              <small className="text-ar-muted">{tc(`roles.${u.role}`)}</small>
                            </>
                          )}
                        </td>
                        {days.map((d) => {
                          const day = map[d.key];
                          const kind = cellKind(day, { scheduled: scheduled.has(`${id}|${d.key}`), past: d.key < today, sunday: d.sunday });
                          const text =
                            kind === 'miss' ? '!' : kind === 'absent' ? t('timesheet.absent') : kind === 'we' ? '·' : kind === 'empty' ? '' : formatHours(day?.hours);
                          return (
                            <td key={d.key} className="border-b border-ar-line-soft px-[3px] py-1.5 text-center">
                              {kind === 'empty' ? null : kind === 'we' || kind === 'absent' ? (
                                <Cell kind={kind} text={text} />
                              ) : (
                                <Link href={personHref(u, d.key)} className="no-underline">
                                  <Cell kind={kind} text={text} title={kind === 'miss' ? t('timesheet.legend.miss') : undefined} />
                                </Link>
                              )}
                            </td>
                          );
                        })}
                        <td className="border-b border-ar-line-soft px-1.5 py-1.5 text-center font-bold tabular-nums">{formatHours(totals.hours)}</td>
                        <td className="border-b border-ar-line-soft px-1.5 py-1.5 text-center font-bold tabular-nums">{totals.dayCredits}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex flex-wrap gap-3.5 text-xs text-ar-muted">
            <span>
              <Cell kind="ok" text="4" /> {t('timesheet.legend.ok')}
            </span>
            <span>
              <Cell kind="late" text="4" /> {t('timesheet.legend.late')}
            </span>
            <span>
              <Cell kind="ot" text="5" /> {t('timesheet.legend.ot')}
            </span>
            <span>
              <Cell kind="miss" text="!" /> {t('timesheet.legend.miss')}
            </span>
            <span>
              <Cell kind="fake" text="4" /> {t('timesheet.legend.fake')}
            </span>
            <span>
              <Cell kind="absent" text={t('timesheet.absent')} /> {t('timesheet.legend.absent')}
            </span>
            <span>
              <Cell kind="we" text="·" /> {t('timesheet.legend.sunday')}
            </span>
            <span>{t('timesheet.legend.hint')}</span>
          </div>
        </>
      )}

      <ExportDialog open={dialog === 'export'} onClose={() => setDialog(null)} outletId={outlet.id} month={month} />
      {(lock.showLock || lock.showUnlock) && (
        <LockDialog open={dialog === 'lock'} onClose={() => setDialog(null)} locked={locked} outletId={outlet.id} month={month} onDone={sheet.reload} />
      )}
    </>
  );
}

export default function AttendanceTimesheetPage() {
  return <AttendanceFrame>{({ access, outlets, outlet }) => <Timesheet outlet={outlet} outlets={outlets} role={access.role} />}</AttendanceFrame>;
}

'use client';

/**
 * Chi tiết theo người (#908, #907 rules 28–29): every scan of one person in a month, map, edit, add a record.
 */
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useToast } from '@rentalshop/ui';
import { attendanceApi } from '@rentalshop/utils';
import type { AttendancePersonMonth, AttendancePersonRow, AttendanceSettings, AttendanceTimesheet } from '@rentalshop/types';
import {
  addMonths,
  canEditPerson,
  dayOf,
  editButtonRecords,
  editSummaryText,
  filterRows,
  formatHours,
  groupRowsByDay,
  isDayKey,
  isMonthKey,
  isNextDayOf,
  isOvernight,
  isTime,
  lockDisplay,
  monthLabel,
  monthOf,
  normalizeDays,
  personId,
  personName,
  recordTimes,
  recordTimesToIso,
  shiftText,
  shortDate,
  shortDayLabel,
  timeOf,
  todayKey,
  type RowFilter,
} from '../attendance-model';
import {
  AttendanceFrame,
  Dialog,
  DialogFooter,
  Field,
  Kpi,
  MonthNav,
  Note,
  PageHead,
  Pill,
  cardClass,
  inputClass,
  must,
  outlineBtn,
  Select,
  primaryBtn,
  smallBtn,
  tdClass,
  thClass,
  useBusy,
  useLoad,
  useQueryState,
  weekdayLabels,
  type AttendanceAccess,
  type AttT,
  type OutletOption,
} from '../parts';
import { ExportDialog } from '../timesheet-parts';
import OutletMap from '../OutletMap';
import { useBreadcrumbTail } from '../../components/shell/breadcrumb-tail';

type DialogState =
  | { kind: 'map'; row: AttendancePersonRow }
  | { kind: 'edit'; recordId: number }
  | { kind: 'add'; day?: string }
  | { kind: 'export' }
  | null;

const RESULT_TONE: Record<string, string> = { ACCEPTED: 'ok', REJECTED: 'bad', AUTO_CLOSED: 'bad', EDITED: 'blue' };

function RecordDialog({
  open,
  mode,
  name,
  day: initialDay,
  checkIn,
  checkOut,
  onClose,
  onSave,
  onAddOther,
}: {
  open: boolean;
  mode: 'edit' | 'add';
  name: string;
  day: string;
  checkIn: string;
  checkOut: string;
  onClose: () => void;
  onSave: (v: { day: string; checkIn: string; checkOut: string; reason: string }) => Promise<boolean>;
  onAddOther?: () => void;
}) {
  const t = useTranslations('attendance') as unknown as AttT;
  const [day, setDay] = useState(initialDay);
  const [inT, setIn] = useState(checkIn);
  const [outT, setOut] = useState(checkOut);
  const [reason, setReason] = useState('');
  const { busy, run } = useBusy();
  useEffect(() => {
    if (!open) return;
    setDay(initialDay);
    setIn(checkIn);
    setOut(checkOut);
    setReason('');
  }, [open, initialDay, checkIn, checkOut]);
  const valid = isDayKey(day) && isTime(inT) && isTime(outT) && reason.trim().length > 0 && reason.trim().length <= 500;
  const save = () => run(async () => (await onSave({ day, checkIn: inT, checkOut: outT, reason: reason.trim() })) && onClose());
  const current = checkIn ? t('edit.current', { in: checkIn, out: checkOut ? t('edit.outAt', { time: checkOut }) : t('edit.noOut') }) : undefined;
  return (
    <Dialog
      open={open}
      title={mode === 'edit' ? t('edit.title', { name, date: shortDate(initialDay) }) : t('add.title', { name })}
      sub={mode === 'edit' ? current : t('add.sub')}
      onClose={onClose}
      footer={
        <DialogFooter
          onCancel={onClose}
          onOk={save}
          okLabel={mode === 'edit' ? t('common.save') : t('add.confirm')}
          busy={busy}
          okDisabled={!valid}
          extra={
            mode === 'edit' && onAddOther ? (
              <button type="button" className={outlineBtn} onClick={onAddOther}>
                {t('edit.addOther')}
              </button>
            ) : undefined
          }
        />
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {mode === 'add' && (
          <>
            <Field label={t('add.date')}>
              <input type="date" className={inputClass} value={day} onChange={(e) => setDay(e.target.value)} />
            </Field>
            <span className="hidden sm:block" />
          </>
        )}
        <Field label={t('edit.checkIn')}>
          <input type="time" className={inputClass} value={inT} onChange={(e) => setIn(e.target.value)} />
        </Field>
        <Field label={t('edit.checkOut')}>
          <span className="flex items-center gap-2">
            <input type="time" className={inputClass} value={outT} onChange={(e) => setOut(e.target.value)} />
            {/* #924 an out time at or before the in time is saved on the next day */}
            {isTime(inT) && isTime(outT) && isOvernight(inT, outT) && (
              <span className="whitespace-nowrap text-[13px] font-semibold text-ar-primary">{t('person.nextDay')}</span>
            )}
          </span>
        </Field>
        <Field label={t('edit.reason')} full>
          <input
            className={inputClass}
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            placeholder={mode === 'edit' ? t('edit.reasonPlaceholder') : t('add.reasonPlaceholder')}
          />
        </Field>
      </div>
      {mode === 'edit' && <Note>{t('edit.note')}</Note>}
    </Dialog>
  );
}

function MapDialog({ row, name, settings, onClose, reasonText }: { row: AttendancePersonRow | null; name: string; settings: AttendanceSettings | null; onClose: () => void; reasonText: (r: AttendancePersonRow) => string }) {
  const t = useTranslations('attendance') as unknown as AttT;
  const center = settings?.latitude != null && settings?.longitude != null ? { lat: settings.latitude, lng: settings.longitude } : null;
  const point = row?.latitude != null && row?.longitude != null ? { lat: row.latitude, lng: row.longitude } : null;
  const ok = row?.result === 'ACCEPTED';
  return (
    <Dialog
      open={!!row}
      title={row ? t('map.title', { name, when: `${shortDate(row.dateKey || dayOf(row.at))} ${timeOf(row.at)}` }) : ''}
      onClose={onClose}
      footer={
        <button type="button" className={primaryBtn} onClick={onClose}>
          {t('common.close')}
        </button>
      }
    >
      {row && (
        <>
          <OutletMap center={center} radiusM={settings?.radiusM || 100} point={point} pointOk={ok} label={t('map.label')} />
          <p className="m-0 text-[13px] text-ar-muted">
            {point && <span className="font-mono text-xs">{`${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`}</span>}
            {row.distanceM != null && ` · ${t('map.distance', { m: Math.round(row.distanceM) })}`}
            {row.accuracyM != null && ` · ${t('map.gps', { m: Math.round(row.accuracyM) })}`}
            {' · '}
            <b className={ok ? 'text-[#047857]' : 'text-[#B91C1C]'}>{ok ? t('map.accepted') : t('map.rejected', { reason: reasonText(row) })}</b>
          </p>
        </>
      )}
    </Dialog>
  );
}

function Person({ access, outlet }: { access: AttendanceAccess; outlet: OutletOption }) {
  const t = useTranslations('attendance') as unknown as AttT;
  const { toastSuccess } = useToast();
  const { params, set } = useQueryState();
  const today = todayKey();
  const month = isMonthKey(params.get('month')) ? (params.get('month') as string) : monthOf(today);
  const focusDay = params.get('day');
  const labels = weekdayLabels(t);
  const [filter, setFilter] = useState<RowFilter>('all');
  const [dialog, setDialog] = useState<DialogState>(null);

  const sheet = useLoad<AttendanceTimesheet>(() => must(attendanceApi.timesheet(outlet.id, month)), [outlet.id, month]);
  const people = useMemo(() => (sheet.data?.users || []).map((u) => ({ id: personId(u), name: personName(u), days: normalizeDays(u.days) })), [sheet.data]);
  const userId = Number(params.get('userId')) || people[0]?.id || 0;
  const person = people.find((p) => p.id === userId) || null;
  // #960 top bar: "Chấm công › Bảng công › <name>"
  useBreadcrumbTail(person?.name);
  const detail = useLoad<AttendancePersonMonth>(userId ? () => must(attendanceApi.personMonth(userId, outlet.id, month)) : null, [userId, outlet.id, month]);
  const settings = useLoad<AttendanceSettings>(() => must(attendanceApi.getSettings(outlet.id)), [outlet.id]);

  const locked = !!(sheet.data?.locked ?? detail.data?.locked);
  const canEdit = lockDisplay(locked, access.role).canEditRecords && canEditPerson(access.role, access.callerId, userId);
  const name = person?.name || personName(detail.data?.user) || '';
  const rows = useMemo(() => detail.data?.rows || [], [detail.data]);
  const groups = useMemo(() => groupRowsByDay(filterRows(rows, filter)), [rows, filter]);
  const s = detail.data?.summary;

  useEffect(() => {
    if (!focusDay || !detail.data) return;
    document.getElementById(`day-${focusDay}`)?.scrollIntoView({ block: 'center' });
  }, [focusDay, detail.data]);

  const reasonText = (r: AttendancePersonRow) => {
    if (r.errorCode === 'OUT_OF_RANGE') return t('person.error.OUT_OF_RANGE', { radius: settings.data?.radiusM ?? 100 });
    const known = ['GPS_INACCURATE', 'MOCK_LOCATION', 'QR_EXPIRED', 'QR_WRONG_OUTLET', 'ATTENDANCE_NOT_CONFIGURED'];
    return r.errorCode && known.includes(r.errorCode) ? t(`person.error.${r.errorCode}`) : t('person.error.other');
  };

  const noteOf = (r: AttendancePersonRow) => {
    const parts: React.ReactNode[] = [];
    if (r.result === 'REJECTED') parts.push(reasonText(r));
    if (r.result === 'AUTO_CLOSED') parts.push(t('person.forgotOut'));
    if (r.lateMinutes) parts.push(<Pill key="late" tone="late">{t('person.late', { n: r.lateMinutes })}</Pill>);
    if (r.earlyMinutes) parts.push(<Pill key="early" tone="late">{t('person.early', { n: r.earlyMinutes })}</Pill>);
    if (r.overtimeMinutes) parts.push(<Pill key="ot" tone="ot">{t('person.overtime', { n: r.overtimeMinutes })}</Pill>);
    if (r.suspectReasons && r.suspectReasons.length > 0) {
      parts.push(<Pill key="fake" tone="bad">{t('person.suspected')}</Pill>);
      parts.push(r.suspectReasons.map((x) => (['ZERO_ACCURACY', 'SAME_COORDS', 'SPEED'].includes(x) ? t(`person.reason.${x}`) : x)).join(', '));
    }
    // #924 who edited and the times (before → after for an edit)
    if (r.kind === 'EDIT') {
      parts.push(
        editSummaryText(r, {
          checkIn: (time) => t('person.editIn', { time }),
          checkOut: (time) => t('person.editOut', { time }),
          nextDay: t('person.nextDay'),
        })
      );
    } else if (r.note) parts.push(r.note);
    return parts.map((p, i) => (
      <React.Fragment key={i}>
        {i > 0 && ' '}
        {p}
      </React.Fragment>
    ));
  };

  const saveRecord = async (v: { day: string; checkIn: string; checkOut: string; reason: string }, recordId?: number) => {
    const times = recordTimesToIso(v.day, v.checkIn, v.checkOut);
    if (!times) return false;
    const res = recordId
      ? await attendanceApi.editRecord(recordId, { ...times, reason: v.reason })
      : await attendanceApi.addRecord({ outletId: outlet.id, userId, ...times, reason: v.reason });
    if (!res.success) return false;
    toastSuccess(recordId ? t('edit.saved') : t('add.added'));
    detail.reload();
    sheet.reload();
    return true;
  };

  const editing = dialog?.kind === 'edit' ? recordTimes(rows, dialog.recordId) : null;

  return (
    <>
      <Link href={`/attendance?outletId=${outlet.id}&month=${month}`} className="text-[13px] font-semibold text-ar-primary no-underline">
        {t('person.back', { month: monthLabel(month) })}
      </Link>
      <PageHead title={t('person.title')} sub={outlet.name}>
        <Select
          aria-label={t('person.pick')}
          value={userId || ''}
          onChange={(e) => set({ userId: Number(e.target.value), day: null })}
          className="border-ar-primary font-semibold text-ar-primary"
        >
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              👤 {p.name}
            </option>
          ))}
        </Select>
        <MonthNav month={month} onChange={(d) => set({ month: addMonths(month, d), day: null })} />
        <Select aria-label={t('person.filter.label')} value={filter} onChange={(e) => setFilter(e.target.value as RowFilter)} className="border-ar-line">
          {(['all', 'rejected', 'suspected'] as RowFilter[]).map((f) => (
            <option key={f} value={f}>
              {t(`person.filter.${f}`)}
            </option>
          ))}
        </Select>
        {canEdit && userId > 0 && (
          <button type="button" className={outlineBtn} onClick={() => setDialog({ kind: 'add' })}>
            {t('person.add')}
          </button>
        )}
        <button type="button" className={outlineBtn} onClick={() => setDialog({ kind: 'export' })}>
          {t('common.exportXlsx')}
        </button>
      </PageHead>

      {!sheet.data && !sheet.error ? (
        <p className="m-0 text-ar-muted">{t('common.loading')}</p>
      ) : people.length === 0 ? (
        <p className={`${cardClass} m-0 px-5 py-6 text-ar-muted`}>{t('person.noStaff')}</p>
      ) : detail.error ? (
        <div role="alert" className={`${cardClass} flex items-center gap-3 px-5 py-6 text-ar-muted`}>
          {t('common.loadFailed')}
          <button type="button" className={outlineBtn} onClick={detail.reload}>
            {t('common.retry')}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-6">
            <Kpi label={t('person.kpi.days')} value={s?.days ?? '–'} />
            <Kpi label={t('person.kpi.hours')} value={s ? formatHours(s.hours) : '–'} />
            <Kpi label={t('person.kpi.lateEarly')} value={s ? (s.lateCount || 0) + (s.earlyCount || 0) : '–'} tone="amber" />
            <Kpi label={t('person.kpi.overtime')} value={s?.overtimeCount ?? '–'} tone="violet" />
            <Kpi label={t('person.kpi.missingOut')} value={s?.missingOut ?? '–'} tone="red" />
            <Kpi label={t('person.kpi.suspected')} value={s?.suspected ?? '–'} tone="red" />
          </div>

          <div className={`${cardClass} overflow-x-auto p-0`}>
            {!detail.data ? (
              <p className="m-0 px-5 py-6 text-ar-muted">{t('common.loading')}</p>
            ) : groups.length === 0 ? (
              <p className="m-0 px-5 py-8 text-center text-ar-muted">{t('person.empty')}</p>
            ) : (
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    {(['day', 'time', 'kind', 'result', 'distance', 'gps', 'coords', 'shift', 'note'] as const).map((c) => (
                      <th key={c} className={thClass}>
                        {t(`person.col.${c}`)}
                      </th>
                    ))}
                    <th className={thClass} />
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => {
                    const dayHours = person?.days[g.day]?.hours;
                    const shift = g.rows.map((r) => shiftText(r.shift)).find(Boolean) || '';
                    // #918: one "Sửa" per record (normal, manual or auto-closed), on its first row of the day
                    const editIds = editButtonRecords(g.rows);
                    return g.rows.map((r, i) => {
                      const sameDay = dayOf(r.at) === g.day;
                      // #924 an overnight out reads "02:00:00 (hôm sau)"
                      const timeLabel = sameDay
                        ? timeOf(r.at, true)
                        : r.kind === 'OUT' && isNextDayOf(r.at, g.day)
                          ? `${timeOf(r.at, true)} ${t('person.nextDay')}`
                          : `${shortDate(dayOf(r.at)).slice(0, 5)} ${timeOf(r.at)}`;
                      const hasCoords = r.latitude != null && r.longitude != null;
                      const editId = canEdit ? editIds[i] : null;
                      return (
                        <tr key={`${g.day}-${i}`} id={i === 0 ? `day-${g.day}` : undefined} className={focusDay === g.day ? 'bg-ar-primary-soft' : undefined}>
                          {i === 0 && (
                            <td rowSpan={g.rows.length} className={`${tdClass} whitespace-nowrap`}>
                              <b>{shortDayLabel(g.day, labels)}</b>
                              {dayHours != null && (
                                <>
                                  <br />
                                  <small className="text-ar-muted">{t('common.hours', { hours: formatHours(dayHours) })}</small>
                                </>
                              )}
                            </td>
                          )}
                          <td className={tdClass}>{timeLabel}</td>
                          <td className={tdClass}>{t(`person.kind.${r.kind}`)}</td>
                          <td className={tdClass}>
                            <Pill tone={RESULT_TONE[r.result] || 'gray'}>{t(`person.result.${r.result}`)}</Pill>
                          </td>
                          <td className={tdClass}>{r.distanceM != null ? `${Math.round(r.distanceM)} m` : '—'}</td>
                          <td className={tdClass}>{r.accuracyM != null ? `±${Math.round(r.accuracyM)} m` : '—'}</td>
                          <td className={`${tdClass} font-mono text-xs`}>{hasCoords ? `${Number(r.latitude).toFixed(4)}, ${Number(r.longitude).toFixed(4)}` : '—'}</td>
                          {i === 0 && (
                            <td rowSpan={g.rows.length} className={tdClass}>
                              {shift}
                            </td>
                          )}
                          <td className={tdClass}>{noteOf(r)}</td>
                          <td className={`${tdClass} whitespace-nowrap`}>
                            <span className="flex gap-1">
                              {hasCoords && (
                                <button type="button" className={smallBtn} onClick={() => setDialog({ kind: 'map', row: r })}>
                                  {t('person.map')}
                                </button>
                              )}
                              {editId != null && (
                                <button type="button" className={smallBtn} onClick={() => setDialog({ kind: 'edit', recordId: editId })}>
                                  {t('person.edit')}
                                </button>
                              )}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <MapDialog row={dialog?.kind === 'map' ? dialog.row : null} name={name} settings={settings.data} onClose={() => setDialog(null)} reasonText={reasonText} />
      <RecordDialog
        open={dialog?.kind === 'edit'}
        mode="edit"
        name={name}
        day={editing?.day || today}
        checkIn={editing?.checkIn || ''}
        checkOut={editing?.checkOut || ''}
        onClose={() => setDialog(null)}
        onSave={(v) => saveRecord(v, dialog?.kind === 'edit' ? dialog.recordId : undefined)}
        onAddOther={() => setDialog({ kind: 'add', day: editing?.day })}
      />
      <RecordDialog
        open={dialog?.kind === 'add'}
        mode="add"
        name={name}
        day={(dialog?.kind === 'add' && dialog.day) || (today.startsWith(month) ? today : `${month}-01`)}
        checkIn=""
        checkOut=""
        onClose={() => setDialog(null)}
        onSave={(v) => saveRecord(v)}
      />
      <ExportDialog open={dialog?.kind === 'export'} onClose={() => setDialog(null)} outletId={outlet.id} month={month} />
    </>
  );
}

export default function AttendancePersonPage() {
  return <AttendanceFrame>{({ access, outlet }) => <Person access={access} outlet={outlet} />}</AttendanceFrame>;
}

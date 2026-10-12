'use client';

/**
 * Xếp ca (#908, #907 rules 20–23): week grid of effective shifts, one-day changes, weekly rules.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@rentalshop/ui';
import { addDaysToDateKey, attendanceApi, usersApi } from '@rentalshop/utils';
import type { EffectiveSchedule, EffectiveShift, ShiftRule, ShiftTemplate } from '@rentalshop/types';
import {
  chipClass,
  isDayKey,
  isRuleCurrent,
  isTime,
  lastDayOfMonth,
  listOf,
  monthOf,
  personName,
  recurringPreview,
  ruleConflicts,
  shiftRange,
  shortDate,
  shortDayLabel,
  todayKey,
  weekCellState,
  weekDays,
  weekStart,
  weekdaysLabel,
} from '../attendance-model';
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
  outlineBtn,
  primaryBtn,
  smallBtn,
  smallDangerBtn,
  tdClass,
  thClass,
  useBusy,
  useLoad,
  useQueryState,
  weekdayLabels,
  type AttT,
  type OutletOption,
} from '../parts';

interface Staff {
  id: number;
  name: string;
  role?: string;
}

type DialogState =
  | { kind: 'day'; user: Staff; date: string; shifts: EffectiveShift[]; locked: boolean }
  | { kind: 'assign' }
  | { kind: 'ruleEdit' | 'ruleStop' | 'ruleDelete'; rule: ShiftRule }
  | null;

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

function DayDialog({
  state,
  templates,
  outletId,
  onClose,
  onDone,
}: {
  state: Extract<DialogState, { kind: 'day' }> | null;
  templates: ShiftTemplate[];
  outletId: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations('attendance') as unknown as AttT;
  const { toastSuccess } = useToast();
  const labels = weekdayLabels(t);
  const { busy, run } = useBusy();
  const active = templates.filter((x) => x.isActive);
  const cur = state?.shifts[0];
  const [pick, setPick] = useState<number | 'custom' | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  useEffect(() => {
    if (!state) return;
    setPick(cur?.templateId != null ? Number(cur.templateId) : cur ? 'custom' : null);
    setStart(cur && cur.templateId == null ? cur.start : '');
    setEnd(cur && cur.templateId == null ? cur.end : '');
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return <Dialog open={false} title="" onClose={onClose} footer={null} />;
  const title = `${state.user.name} · ${shortDayLabel(state.date, labels)}`;
  if (state.locked) {
    return (
      <Dialog
        open
        title={title}
        onClose={onClose}
        footer={
          <button type="button" className={primaryBtn} onClick={onClose}>
            {t('common.close')}
          </button>
        }
      >
        <Note tone="w">{t('day.lockedBody')}</Note>
      </Dialog>
    );
  }
  const send = (body: Parameters<typeof attendanceApi.setDay>[0]) =>
    run(async () => {
      await must(attendanceApi.setDay(body));
      toastSuccess(t('day.saved', { date: shortDate(state.date) }));
      onClose();
      onDone();
    });
  const base = { outletId, userId: state.user.id, date: state.date };
  const valid = pick === 'custom' ? isTime(start) && isTime(end) && start !== end : typeof pick === 'number';
  const save = () =>
    send(pick === 'custom' ? { ...base, custom: { startTime: start, endTime: end, breakMinutes: 0 } } : { ...base, templateId: pick as number });
  const sub = cur
    ? `${t('day.current', { shift: `${cur.name} ${shiftRange(cur.start, cur.end)}`, source: t(cur.source === 'DAY' ? 'day.sourceDay' : 'day.sourceRule') })} · ${t('day.editable')}`
    : `${t('day.none')} · ${t('day.editable')}`;
  return (
    <Dialog
      open
      title={title}
      sub={sub}
      onClose={onClose}
      footer={
        <DialogFooter
          onCancel={onClose}
          onOk={save}
          okLabel={t('common.save')}
          busy={busy}
          okDisabled={!valid}
          extra={
            cur ? (
              <button type="button" className={`${outlineBtn} text-ar-danger`} disabled={busy} onClick={() => send({ ...base, off: true })}>
                {t('day.clear')}
              </button>
            ) : undefined
          }
        />
      }
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ar-ink-2">{t('day.pick')}</span>
        <Seg<number | 'custom'>
          label={t('day.pick')}
          options={[...active.map((x) => ({ value: Number(x.id) as number | 'custom', label: x.name })), { value: 'custom', label: t('day.custom') }]}
          value={pick}
          onChange={setPick}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('day.customStart')}>
          <input
            type="time"
            className={inputClass}
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              setPick('custom');
            }}
          />
        </Field>
        <Field label={t('day.customEnd')}>
          <input
            type="time"
            className={inputClass}
            value={end}
            onChange={(e) => {
              setEnd(e.target.value);
              setPick('custom');
            }}
          />
        </Field>
      </div>
      <Note>{t('day.note', { name: state.user.name })}</Note>
    </Dialog>
  );
}

function AssignDialog({
  open,
  templates,
  staff,
  rules,
  outletId,
  today,
  onClose,
  onDone,
}: {
  open: boolean;
  templates: ShiftTemplate[];
  staff: Staff[];
  rules: ShiftRule[];
  outletId: number;
  today: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations('attendance') as unknown as AttT;
  const tc = useTranslations('common') as unknown as AttT;
  const { toastSuccess } = useToast();
  const labels = weekdayLabels(t);
  const { busy, run } = useBusy();
  const active = templates.filter((x) => x.isActive);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [users, setUsers] = useState<number[]>([]);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState('');
  useEffect(() => {
    if (!open) return;
    setTemplateId(active[0] ? Number(active[0].id) : null);
    setUsers([]);
    setDays([1, 2, 3, 4, 5]);
    setFrom(today);
    setTo('');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const tpl = active.find((x) => Number(x.id) === templateId) || null;
  const toggle = <V,>(list: V[], v: V) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const nameOf = (id: number) => staff.find((s) => s.id === id)?.name || `#${id}`;
  const tplOf = (id: number) => templates.find((x) => Number(x.id) === id);
  const preview = recurringPreview({
    names: users.map(nameOf),
    shift: tpl ? `${tpl.name} ${shiftRange(tpl.startTime, tpl.endTime)}` : '',
    weekdays: days,
    startDate: from,
    endDate: to || null,
    labels,
  });
  const conflicts = ruleConflicts(rules, users, days, today);
  const valid = !!tpl && users.length > 0 && days.length > 0 && isDayKey(from) && from >= today && (!to || (isDayKey(to) && to >= from));
  const save = () =>
    run(async () => {
      await must(attendanceApi.createRules({ outletId, templateId: Number(tpl!.id), userIds: users, weekdays: [...days].sort(), startDate: from, endDate: to || null }));
      toastSuccess(t('assign.saved'));
      onClose();
      onDone();
    });
  return (
    <Dialog
      open={open}
      wide
      title={t('assign.title')}
      sub={t('assign.sub')}
      onClose={onClose}
      footer={<DialogFooter onCancel={onClose} onOk={save} okLabel={t('assign.confirm')} busy={busy} okDisabled={!valid} />}
    >
      {active.length === 0 ? (
        <Note tone="w">{t('assign.noTemplates')}</Note>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ar-ink-2">{t('assign.shift')}</span>
            <Seg
              label={t('assign.shift')}
              options={active.map((x) => ({ value: Number(x.id), label: `${x.name} ${shiftRange(x.startTime, x.endTime)}` }))}
              value={templateId}
              onChange={setTemplateId}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-ar-ink-2">{t('assign.staff')}</span>
            {staff.map((s) => (
              <label key={s.id} className="flex items-center gap-2 py-1 text-sm">
                <input type="checkbox" checked={users.includes(s.id)} onChange={() => setUsers((l) => toggle(l, s.id))} /> {s.name}
                {s.role && <small className="text-ar-muted">· {tc(`roles.${s.role}`)}</small>}
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ar-ink-2">{t('assign.weekdays')}</span>
            <Seg label={t('assign.weekdays')} options={ALL_DAYS.map((d) => ({ value: d, label: labels[d - 1] }))} value={days} onChange={(d) => setDays((l) => toggle(l, d))} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('assign.from')}>
              <input type="date" className={inputClass} min={today} value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label={t('assign.to')}>
              <input type="date" className={inputClass} min={from} value={to} onChange={(e) => setTo(e.target.value)} placeholder={t('assign.toPlaceholder')} />
            </Field>
          </div>
          <Note>
            <b>{t('assign.preview')}</b>
            {users.length > 0 && tpl && days.length > 0 && (
              <>
                {' · '}
                {t('assign.previewLine', { names: preview.names, shift: preview.shift, days: preview.days, from: preview.from })}
                {preview.to ? t('assign.previewTo', { to: preview.to }) : ''}.
              </>
            )}
            {conflicts.map((c, i) => {
              const ct = tplOf(c.templateId);
              return (
                <React.Fragment key={i}>
                  <br />
                  {t('assign.conflict', { name: nameOf(c.userId), shift: ct?.name || '', days: weekdaysLabel(c.weekdays, labels, '/') })}
                </React.Fragment>
              );
            })}
            {conflicts.length > 0 && (
              <>
                {' '}
                {t('assign.keep')}
              </>
            )}
          </Note>
        </>
      )}
    </Dialog>
  );
}

function RuleDialog({
  state,
  templates,
  staffName,
  today,
  onClose,
  onDone,
}: {
  state: Extract<DialogState, { rule: ShiftRule }> | null;
  templates: ShiftTemplate[];
  staffName: (id: number) => string;
  today: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations('attendance') as unknown as AttT;
  const { toastSuccess } = useToast();
  const labels = weekdayLabels(t);
  const { busy, run } = useBusy();
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [days, setDays] = useState<number[]>([]);
  const [date, setDate] = useState('');
  useEffect(() => {
    if (!state) return;
    setTemplateId(Number(state.rule.templateId));
    setDays([...state.rule.weekdays]);
    setDate(state.kind === 'ruleStop' ? lastDayOfMonth(monthOf(today)) : addDaysToDateKey(today, 1));
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return <Dialog open={false} title="" onClose={onClose} footer={null} />;
  const rule = state.rule;
  const name = staffName(Number(rule.userId));
  const shiftName = templates.find((x) => Number(x.id) === Number(rule.templateId))?.name || '';
  const choices = templates.filter((x) => x.isActive || Number(x.id) === Number(rule.templateId));
  const act = (fn: () => Promise<unknown>, msg: string) =>
    run(async () => {
      await fn();
      toastSuccess(msg);
      onClose();
      onDone();
    });
  if (state.kind === 'ruleDelete') {
    return (
      <Dialog
        open
        title={t('ruleDelete.title', { name })}
        onClose={onClose}
        footer={<DialogFooter onCancel={onClose} danger busy={busy} okLabel={t('ruleDelete.confirm')} onOk={() => act(() => must(attendanceApi.deleteRule(Number(rule.id))), t('ruleDelete.saved'))} />}
      >
        <Note tone="w">{t('ruleDelete.note', { shift: shiftName })}</Note>
      </Dialog>
    );
  }
  if (state.kind === 'ruleStop') {
    const valid = isDayKey(date) && date >= today;
    return (
      <Dialog
        open
        title={t('ruleStop.title', { name })}
        onClose={onClose}
        footer={
          <DialogFooter
            onCancel={onClose}
            busy={busy}
            okDisabled={!valid}
            okLabel={t('ruleStop.confirm')}
            onOk={() => act(() => must(attendanceApi.stopRule(Number(rule.id), date)), t('ruleStop.saved'))}
          />
        }
      >
        <Field label={t('ruleStop.last')}>
          <input type="date" className={inputClass} min={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {valid && <Note>{t('ruleStop.note', { next: shortDate(addDaysToDateKey(date, 1)), name, shift: shiftName })}</Note>}
      </Dialog>
    );
  }
  const valid = templateId != null && days.length > 0 && isDayKey(date) && date >= today;
  return (
    <Dialog
      open
      title={t('ruleEdit.title', { name })}
      onClose={onClose}
      footer={
        <DialogFooter
          onCancel={onClose}
          busy={busy}
          okDisabled={!valid}
          okLabel={t('common.save')}
          onOk={() =>
            act(() => must(attendanceApi.updateRule(Number(rule.id), { templateId: templateId as number, weekdays: [...days].sort(), effectiveFrom: date })), t('ruleEdit.saved'))
          }
        />
      }
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ar-ink-2">{t('ruleEdit.shift')}</span>
        <Seg label={t('ruleEdit.shift')} options={choices.map((x) => ({ value: Number(x.id), label: x.name }))} value={templateId} onChange={setTemplateId} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ar-ink-2">{t('ruleEdit.weekdays')}</span>
        <Seg
          label={t('ruleEdit.weekdays')}
          options={ALL_DAYS.map((d) => ({ value: d, label: labels[d - 1] }))}
          value={days}
          onChange={(d) => setDays((l) => (l.includes(d) ? l.filter((x) => x !== d) : [...l, d]))}
        />
      </div>
      <Field label={t('ruleEdit.from')}>
        <input type="date" className={inputClass} min={today} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Note>{t('ruleEdit.note')}</Note>
    </Dialog>
  );
}

function Shifts({ outlet, outlets }: { outlet: OutletOption; outlets: OutletOption[] }) {
  const t = useTranslations('attendance') as unknown as AttT;
  const tc = useTranslations('common') as unknown as AttT;
  const labels = weekdayLabels(t);
  const { params, set } = useQueryState();
  const today = todayKey();
  const start = weekStart(isDayKey(params.get('week')) ? (params.get('week') as string) : today);
  const days = weekDays(start);
  const [dialog, setDialog] = useState<DialogState>(null);

  // Role labels only; the rows are the outlet users the schedule API returns
  const roles = useLoad<Record<number, string>>(async () => {
    const data = await must(usersApi.searchUsers({ outletId: outlet.id, limit: 100 }));
    const map: Record<number, string> = {};
    for (const u of listOf<{ id: number; role?: string }>(data, 'users')) if (u.role) map[Number(u.id)] = u.role;
    return map;
  }, [outlet.id]);
  const templates = useLoad<ShiftTemplate[]>(async () => listOf<ShiftTemplate>(await must(attendanceApi.listTemplates(outlet.id)), 'templates'), [outlet.id]);
  const rules = useLoad<ShiftRule[]>(async () => listOf<ShiftRule>(await must(attendanceApi.listRules(outlet.id)), 'rules'), [outlet.id]);
  const week = useLoad<EffectiveSchedule>(() => must(attendanceApi.listShifts(outlet.id, days[0], days[6])), [outlet.id, start]);

  const cells = useMemo(() => {
    const map = new Map<string, { shifts: EffectiveShift[]; locked: boolean }>();
    for (const d of week.data?.items || []) map.set(`${d.userId}|${d.date}`, { shifts: d.shifts || [], locked: !!d.locked });
    return map;
  }, [week.data]);
  const people: Staff[] = useMemo(
    () => (week.data?.users || []).map((u) => ({ id: Number(u.id), name: u.name || personName(u), role: roles.data?.[Number(u.id)] })),
    [week.data, roles.data],
  );
  const staffName = (id: number) => people.find((p) => p.id === id)?.name || `#${id}`;
  const tplName = (id: number) => (templates.data || []).find((x) => Number(x.id) === Number(id))?.name || '';
  const current = (rules.data || []).filter((r) => isRuleCurrent(r, today));
  const reload = () => {
    week.reload();
    rules.reload();
  };

  return (
    <>
      <PageHead
        title={t('shifts.title')}
        sub={t('shifts.subtitle', { from: shortDate(days[0]).slice(0, 5), to: shortDate(days[6]), today: shortDayLabel(today, labels) })}
      >
        <OutletPicker outlets={outlets} outlet={outlet} />
        <button type="button" className={outlineBtn} onClick={() => set({ week: addDaysToDateKey(start, -7) })}>
          {t('shifts.prevWeek')}
        </button>
        <button type="button" className={outlineBtn} onClick={() => set({ week: addDaysToDateKey(start, 7) })}>
          {t('shifts.nextWeek')}
        </button>
        <button type="button" className={primaryBtn} onClick={() => setDialog({ kind: 'assign' })}>
          {t('shifts.assign')}
        </button>
      </PageHead>
      <div className="flex flex-wrap gap-2">
        <Pill tone="blue">{t('shifts.legendRepeat')}</Pill>
        <Pill tone="gray">{t('shifts.legendLock')}</Pill>
        <Pill tone="gray">{t('shifts.legendEdited')}</Pill>
      </div>

      <div className={`${cardClass} overflow-x-auto p-0`}>
        {!week.data ? (
          <p className="m-0 px-5 py-6 text-ar-muted">{week.error ? t('common.loadFailed') : t('common.loading')}</p>
        ) : people.length === 0 ? (
          <p className="m-0 px-5 py-8 text-center text-ar-muted">{t('shifts.empty')}</p>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className={thClass}>{t('shifts.col.staff')}</th>
                {days.map((d) => (
                  <th key={d} className={`${thClass} ${d === today ? 'text-ar-primary' : ''}`}>
                    {shortDayLabel(d, labels)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <td className={tdClass}>
                    <b>{p.name}</b>
                    {p.role && (
                      <>
                        <br />
                        <small className="text-ar-muted">{tc(`roles.${p.role}`)}</small>
                      </>
                    )}
                  </td>
                  {days.map((d) => {
                    const cell = cells.get(`${p.id}|${d}`);
                    const shifts = cell?.shifts || [];
                    const base = weekCellState(d, today, shifts);
                    const state = cell?.locked ? { ...base, locked: true, canAdd: false } : base;
                    return (
                      <td key={d} className={`${tdClass} min-w-[96px]`}>
                        <span className="flex flex-col items-start gap-1">
                          {shifts.map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setDialog({ kind: 'day', user: p, date: d, shifts, locked: state.locked })}
                              className={`rounded-lg px-[7px] py-1 text-xs ${chipClass(s.color)} ${state.locked ? 'opacity-55' : ''}`}
                            >
                              {s.name} {shiftRange(s.start, s.end, true)}
                              {state.locked ? ' 🔒' : ''}
                              {s.source === 'DAY' ? ' ✎' : ''}
                            </button>
                          ))}
                          {state.canAdd && (
                            <button
                              type="button"
                              aria-label={`${t('shifts.addShift')} · ${p.name} · ${shortDayLabel(d, labels)}`}
                              onClick={() => setDialog({ kind: 'day', user: p, date: d, shifts: [], locked: false })}
                              className="px-1 text-base text-[#CBD5E1] hover:text-ar-primary"
                            >
                              +
                            </button>
                          )}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={`${cardClass} overflow-x-auto p-0`}>
        <div className="flex flex-wrap justify-between gap-2 px-3 py-2.5">
          <b>{t('shifts.rules')}</b>
          <span className="text-[13px] text-ar-muted">{t('shifts.rulesHint')}</span>
        </div>
        {current.length === 0 ? (
          <p className="m-0 px-5 pb-6 text-ar-muted">{rules.data ? t('shifts.rulesEmpty') : t('common.loading')}</p>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {(['staff', 'shift', 'weekdays', 'from', 'to'] as const).map((c) => (
                  <th key={c} className={thClass}>
                    {t(`shifts.col.${c}`)}
                  </th>
                ))}
                <th className={thClass} />
              </tr>
            </thead>
            <tbody>
              {current.map((r) => (
                <tr key={r.id}>
                  <td className={tdClass}>{staffName(Number(r.userId))}</td>
                  <td className={tdClass}>{tplName(r.templateId)}</td>
                  <td className={tdClass}>{[...r.weekdays].sort((a, b) => a - b).map((d) => labels[d - 1]).join(', ')}</td>
                  <td className={tdClass}>{shortDate(r.startDate)}</td>
                  <td className={tdClass}>{r.endDate ? shortDate(r.endDate) : t('shifts.noEnd')}</td>
                  <td className={tdClass}>
                    <span className="flex flex-wrap gap-1">
                      <button type="button" className={smallBtn} onClick={() => setDialog({ kind: 'ruleEdit', rule: r })}>
                        {t('shifts.edit')}
                      </button>
                      <button type="button" className={smallBtn} onClick={() => setDialog({ kind: 'ruleStop', rule: r })}>
                        {t('shifts.stop')}
                      </button>
                      <button type="button" className={smallDangerBtn} onClick={() => setDialog({ kind: 'ruleDelete', rule: r })}>
                        {t('shifts.delete')}
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DayDialog state={dialog?.kind === 'day' ? dialog : null} templates={templates.data || []} outletId={outlet.id} onClose={() => setDialog(null)} onDone={reload} />
      <AssignDialog
        open={dialog?.kind === 'assign'}
        templates={templates.data || []}
        staff={people}
        rules={rules.data || []}
        outletId={outlet.id}
        today={today}
        onClose={() => setDialog(null)}
        onDone={reload}
      />
      <RuleDialog
        state={dialog && 'rule' in dialog ? dialog : null}
        templates={templates.data || []}
        staffName={staffName}
        today={today}
        onClose={() => setDialog(null)}
        onDone={reload}
      />
    </>
  );
}

export default function AttendanceShiftsPage() {
  return <AttendanceFrame>{({ outlet, outlets }) => <Shifts outlet={outlet} outlets={outlets} />}</AttendanceFrame>;
}

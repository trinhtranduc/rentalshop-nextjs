/**
 * #908 attendance web: pure model (month grid colours, Vắng, lock display, recurring preview, VN times).
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh; results must match.
 */
import { describe, expect, it, jest } from '@jest/globals';

// The @rentalshop/utils barrel pulls in React files; the model only needs the civil-day helpers
jest.mock('@rentalshop/utils', () => ({
  ...(jest.requireActual('../packages/utils/src/core/date-range') as object),
  ...(jest.requireActual('../packages/utils/src/core/shop-day') as object),
  SHOP_TIMEZONE: 'Asia/Ho_Chi_Minh',
}));
import {
  addMonths,
  assignStartDefault,
  defaultOutlet,
  editButtonRecords,
  workedUserIds,
  canEditPerson,
  canEditMember,
  canUseAttendanceWeb,
  cellKind,
  formatHours,
  filterRows,
  groupRowsByDay,
  hasAttendance,
  lockDisplay,
  modulesOf,
  monthDays,
  normalizeDays,
  recordTimes,
  recordTimesToIso,
  recurringPreview,
  ruleConflicts,
  scheduledSet,
  shiftRange,
  shortDayLabel,
  timeOf,
  todayKey,
  wallTimeToIso,
  weekCellState,
  weekDays,
  weekStart,
  weekdayOf,
  weekdaysLabel,
} from '../apps/client/app/attendance/attendance-model';

const VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

describe('access', () => {
  it('reads merchant.modules and checks attendance', () => {
    expect(modulesOf({ merchant: { modules: ['attendance'] } })).toEqual(['attendance']);
    expect(modulesOf({ merchant: {} })).toEqual([]);
    expect(modulesOf(null)).toEqual([]);
    expect(hasAttendance(['attendance'])).toBe(true);
    expect(hasAttendance([])).toBe(false);
  });

  it('only the owner and the outlet admin use the web screens', () => {
    expect(canUseAttendanceWeb('MERCHANT')).toBe(true);
    expect(canUseAttendanceWeb('OUTLET_ADMIN')).toBe(true);
    expect(canUseAttendanceWeb('OUTLET_STAFF')).toBe(false);
    expect(canUseAttendanceWeb('OUTLET_INVENTORY')).toBe(false);
  });

  it('lock display: only the owner locks or unlocks; a locked month has no edits', () => {
    expect(lockDisplay(false, 'MERCHANT')).toEqual({ showLock: true, showUnlock: false, canEditRecords: true });
    expect(lockDisplay(true, 'MERCHANT')).toEqual({ showLock: false, showUnlock: true, canEditRecords: false });
    expect(lockDisplay(false, 'OUTLET_ADMIN')).toEqual({ showLock: false, showUnlock: false, canEditRecords: true });
    expect(lockDisplay(true, 'OUTLET_ADMIN')).toEqual({ showLock: false, showUnlock: false, canEditRecords: false });
  });

  it('an outlet admin does not edit their own records (Q-D)', () => {
    expect(canEditPerson('OUTLET_ADMIN', 5, 5)).toBe(false);
    expect(canEditPerson('OUTLET_ADMIN', 5, 6)).toBe(true);
    expect(canEditPerson('MERCHANT', 5, 5)).toBe(true);
    expect(canEditPerson('OUTLET_STAFF', 5, 6)).toBe(false);
  });
});

describe('days, weeks, months', () => {
  it('today is the Vietnam day at the 17:00Z boundary', () => {
    expect(todayKey(new Date('2026-10-12T16:59:59Z'))).toBe('2026-10-12');
    expect(todayKey(new Date('2026-10-12T17:00:00Z'))).toBe('2026-10-13');
  });

  it('weekday 1 = Monday … 7 = Sunday', () => {
    expect(weekdayOf('2026-10-12')).toBe(1);
    expect(weekdayOf('2026-10-18')).toBe(7);
  });

  it('month days, Sundays and month end', () => {
    const days = monthDays('2026-10');
    expect(days).toHaveLength(31);
    expect(days.filter((d) => d.sunday).map((d) => d.day)).toEqual([4, 11, 18, 25]);
    expect(monthDays('2028-02')).toHaveLength(29);
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });

  it('weeks run Monday to Sunday across a month end', () => {
    expect(weekStart('2026-11-01')).toBe('2026-10-26');
    expect(weekDays('2026-10-26')).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
    expect(shortDayLabel('2026-10-13', VI)).toBe('T3 13/10');
  });
});

describe('timesheet grid', () => {
  const day = (hours: number, flags = {}) => ({ hours, dayCredit: hours > 0 ? 1 : 0, flags });
  const base = { scheduled: false, past: true, sunday: false };

  it('colours: missing out > suspected > overtime > late / early > on time', () => {
    expect(cellKind(day(0, { missingOut: true, suspected: true }), base)).toBe('miss');
    expect(cellKind(day(4, { suspected: true, overtime: true }), base)).toBe('fake');
    expect(cellKind(day(5, { overtime: true, late: true }), base)).toBe('ot');
    expect(cellKind(day(4, { late: true }), base)).toBe('late');
    expect(cellKind(day(4, { early: true }), base)).toBe('late');
    expect(cellKind(day(4), base)).toBe('ok');
  });

  it('Vắng only for a scheduled past day with no hours; a dot on an empty Sunday', () => {
    expect(cellKind(undefined, { scheduled: true, past: true, sunday: false })).toBe('absent');
    expect(cellKind(undefined, { scheduled: true, past: false, sunday: false })).toBe('empty');
    expect(cellKind(undefined, { scheduled: false, past: true, sunday: true })).toBe('we');
    expect(cellKind(day(0), { scheduled: true, past: true, sunday: true })).toBe('absent');
    expect(cellKind(undefined, base)).toBe('empty');
  });

  it('formats hours with a comma and one decimal', () => {
    expect(formatHours(4)).toBe('4');
    expect(formatHours(8.5)).toBe('8,5');
    expect(formatHours(3.84)).toBe('3,8');
    expect(formatHours(null)).toBe('0');
  });

  it('days may come keyed or as a list', () => {
    expect(normalizeDays([{ date: '2026-10-01', ...day(4) }])['2026-10-01'].hours).toBe(4);
    expect(normalizeDays({ '2026-10-02': day(3) })['2026-10-02'].hours).toBe(3);
  });

  it('scheduled set from the effective schedule', () => {
    const set = scheduledSet([
      { userId: 1, date: '2026-10-01', shifts: [{ name: 'Sáng', start: '08:00', end: '12:00', color: 'blue', source: 'RULE', locked: true }] },
      { userId: 2, date: '2026-10-01', shifts: [] },
    ]);
    expect(set.has('1|2026-10-01')).toBe(true);
    expect(set.has('2|2026-10-01')).toBe(false);
  });
});

describe('schedule', () => {
  it('weekday labels compress runs of three or more', () => {
    expect(weekdaysLabel([1, 2, 3, 4, 5], VI)).toBe('T2–T6');
    expect(weekdaysLabel([1, 3, 5], VI)).toBe('T2, T4, T6');
    expect(weekdaysLabel([7, 1, 2], VI)).toBe('T2, T3, CN');
    expect(weekdaysLabel([1, 2, 3, 6, 7], VI)).toBe('T2–T4, T7, CN');
  });

  it('recurring preview text parts', () => {
    expect(
      recurringPreview({ names: ['Lan', 'Hoa'], shift: 'Sáng 08:00–12:00', weekdays: [1, 2, 3, 4, 5], startDate: '2026-10-12', labels: VI }),
    ).toEqual({ names: 'Lan, Hoa', shift: 'Sáng 08:00–12:00', days: 'T2–T6', from: '12/10/26', to: null });
    expect(recurringPreview({ names: [], shift: '', weekdays: [6], startDate: '2026-10-12', endDate: '2026-10-31', labels: VI }).to).toBe('31/10/26');
  });

  it('conflicts: current rules of chosen users on chosen weekdays', () => {
    const rules = [
      { id: 1, outletId: 1, userId: 3, templateId: 2, weekdays: [5, 1, 3], startDate: '2026-10-05', endDate: null },
      { id: 2, outletId: 1, userId: 3, templateId: 9, weekdays: [6], startDate: '2026-10-05', endDate: null },
      { id: 3, outletId: 1, userId: 4, templateId: 2, weekdays: [1], startDate: '2026-10-01', endDate: '2026-10-11' },
      { id: 4, outletId: 1, userId: 5, templateId: 2, weekdays: [1], startDate: '2026-10-01', endDate: null },
    ];
    expect(ruleConflicts(rules, [3, 4], [1, 2, 3, 4, 5], '2026-10-12')).toEqual([{ userId: 3, templateId: 2, weekdays: [1, 3, 5] }]);
  });

  it('week cell: past days and worked shifts are locked', () => {
    const s = { name: 'Sáng', start: '08:00', end: '12:00', color: 'blue', source: 'RULE' as const, locked: false };
    expect(weekCellState('2026-10-11', '2026-10-12', [s])).toEqual({ past: true, locked: true, canAdd: false });
    expect(weekCellState('2026-10-12', '2026-10-12', [{ ...s, locked: true }])).toEqual({ past: false, locked: true, canAdd: false });
    expect(weekCellState('2026-10-12', '2026-10-12', [s])).toEqual({ past: false, locked: false, canAdd: false });
    expect(weekCellState('2026-10-13', '2026-10-12', [])).toEqual({ past: false, locked: false, canAdd: true });
    expect(shiftRange('13:00', '17:30', true)).toBe('13–17:30');
  });
});

describe('record times in the shop zone', () => {
  it('VN wall clock → ISO at the day boundary', () => {
    expect(wallTimeToIso('2026-10-13', '00:00')).toBe('2026-10-12T17:00:00.000Z');
    expect(wallTimeToIso('2026-10-13', '23:59')).toBe('2026-10-13T16:59:00.000Z');
    expect(wallTimeToIso('2026-10-13', '25:00')).toBeNull();
  });

  it('an out time before the in time is the next day', () => {
    expect(recordTimesToIso('2026-10-15', '13:00', '17:30')).toEqual({
      checkInAt: '2026-10-15T06:00:00.000Z',
      checkOutAt: '2026-10-15T10:30:00.000Z',
    });
    expect(recordTimesToIso('2026-10-31', '22:00', '02:00')).toEqual({
      checkInAt: '2026-10-31T15:00:00.000Z',
      checkOutAt: '2026-10-31T19:00:00.000Z',
    });
  });

  it('shows an instant as VN time with seconds', () => {
    expect(timeOf('2026-10-13T01:05:12Z', true)).toBe('08:05:12');
    expect(timeOf('2026-10-12T16:59:59Z')).toBe('23:59');
  });

  it('shows newest VN work days and event times first; an edit stays under its record day', () => {
    const rows = [
      { at: '2026-10-15T06:00:05Z', kind: 'IN' as const, result: 'ACCEPTED' as const, recordId: 7 },
      { at: '2026-10-15T16:59:59Z', kind: 'OUT' as const, result: 'AUTO_CLOSED' as const, recordId: 7 },
      { at: '2026-10-16T02:12:00Z', kind: 'EDIT' as const, result: 'EDITED' as const, recordId: 7 },
      { at: '2026-10-12T17:30:00Z', kind: 'IN' as const, result: 'REJECTED' as const },
    ];
    const groups = groupRowsByDay(rows);
    expect(groups.map((g) => g.day)).toEqual(['2026-10-15', '2026-10-13']);
    expect(groups[0].rows.map((r) => r.kind)).toEqual(['EDIT', 'OUT', 'IN']);
    expect(rows.map((r) => r.kind)).toEqual(['IN', 'OUT', 'EDIT', 'IN']);
    expect(recordTimes(rows, 7)).toEqual({ day: '2026-10-15', checkIn: '13:00', checkOut: '' });
  });

  it('an auto-close stamped on a later read and a cross-midnight OUT stay on the IN day', () => {
    const rows = [
      { at: '2026-10-20T15:00:00Z', kind: 'IN' as const, result: 'ACCEPTED' as const, recordId: 9 },
      { at: '2026-10-20T19:00:00Z', kind: 'OUT' as const, result: 'ACCEPTED' as const, recordId: 9 },
      { at: '2026-10-21T01:00:00Z', kind: 'IN' as const, result: 'ACCEPTED' as const, recordId: 10 },
      { at: '2026-10-23T02:00:00Z', kind: 'OUT' as const, result: 'AUTO_CLOSED' as const, recordId: 10 },
    ];
    const groups = groupRowsByDay(rows);
    expect(groups.map((g) => [g.day, g.rows.length])).toEqual([
      ['2026-10-21', 2],
      ['2026-10-20', 2],
    ]);
    expect(groups[1].rows.map((r) => r.kind)).toEqual(['OUT', 'IN']);
    expect(recordTimes(rows, 9)).toEqual({ day: '2026-10-20', checkIn: '22:00', checkOut: '02:00' });
  });
});

describe('#918 rows by work day, edit any record, assign / lock, default outlet', () => {
  const manual = [
    // a manual record of 05/10 added on 12/10: only its EDIT row, with the API dateKey
    {
      at: '2026-10-12T03:00:00Z', kind: 'EDIT' as const, result: 'EDITED' as const, recordId: 3, dateKey: '2026-10-05',
      after: { checkInAt: '2026-10-05T01:00:00.000Z', checkOutAt: '2026-10-05T10:30:00.000Z', status: 'DONE' },
    },
  ];

  it('a manual record sits under its work day and its times come from the edit', () => {
    expect(groupRowsByDay(manual).map((g) => g.day)).toEqual(['2026-10-05']);
    expect(recordTimes(manual, 3)).toEqual({ day: '2026-10-05', checkIn: '08:00', checkOut: '17:30' });
  });

  it('the latest edit wins over the scans', () => {
    const rows = [
      { at: '2026-10-15T01:00:00Z', kind: 'IN' as const, result: 'ACCEPTED' as const, recordId: 7, dateKey: '2026-10-15' },
      { at: '2026-10-15T10:00:00Z', kind: 'OUT' as const, result: 'ACCEPTED' as const, recordId: 7, dateKey: '2026-10-15' },
      { at: '2026-10-16T02:00:00Z', kind: 'EDIT' as const, result: 'EDITED' as const, recordId: 7, dateKey: '2026-10-15', after: { checkInAt: '2026-10-15T00:30:00Z', checkOutAt: '2026-10-15T10:00:00Z', status: 'DONE' } },
      { at: '2026-10-17T02:00:00Z', kind: 'EDIT' as const, result: 'EDITED' as const, recordId: 7, dateKey: '2026-10-15', after: { checkInAt: '2026-10-15T00:45:00Z', checkOutAt: '2026-10-15T11:00:00Z', status: 'DONE' } },
    ];
    expect(recordTimes(rows, 7)).toEqual({ day: '2026-10-15', checkIn: '07:45', checkOut: '18:00' });
  });

  it('one Sửa per record: on its first row, never on a rejected scan', () => {
    const rows = [
      { at: '2026-10-15T00:59:00Z', kind: 'IN' as const, result: 'REJECTED' as const, dateKey: '2026-10-15' },
      { at: '2026-10-15T01:00:00Z', kind: 'IN' as const, result: 'ACCEPTED' as const, recordId: 7, dateKey: '2026-10-15' },
      { at: '2026-10-15T05:00:00Z', kind: 'OUT' as const, result: 'ACCEPTED' as const, recordId: 7, dateKey: '2026-10-15' },
      { at: '2026-10-15T06:00:00Z', kind: 'IN' as const, result: 'ACCEPTED' as const, recordId: 8, dateKey: '2026-10-15' },
      { at: '2026-10-15T16:59:59Z', kind: 'OUT' as const, result: 'AUTO_CLOSED' as const, recordId: 8, dateKey: '2026-10-15' },
    ];
    expect(editButtonRecords(rows)).toEqual([null, 7, null, 8, null]);
    expect(editButtonRecords(manual)).toEqual([3]);
  });

  it("today's cell of someone who already worked is locked, no +", () => {
    expect(weekCellState('2026-10-12', '2026-10-12', [], true)).toEqual({ past: false, locked: true, canAdd: false });
    expect(weekCellState('2026-10-12', '2026-10-12', [], false)).toEqual({ past: false, locked: false, canAdd: true });
    expect(weekCellState('2026-10-13', '2026-10-12', [], false)).toEqual({ past: false, locked: false, canAdd: true });
  });

  it('who worked on a day: a timesheet cell exists for that day (an open record counts)', () => {
    const users = [
      { userId: 7, days: { '2026-10-12': { hours: 0, dayCredit: 0 } } },
      { userId: 8, days: { '2026-10-11': { hours: 8, dayCredit: 1 } } },
      { id: 9, days: [{ date: '2026-10-12', hours: 4, dayCredit: 1 }] },
    ] as any;
    expect([...workedUserIds(users, '2026-10-12')].sort()).toEqual([7, 9]);
    expect(workedUserIds(null, '2026-10-12').size).toBe(0);
  });

  it('Gán ca starts tomorrow (VN day key)', () => {
    expect(assignStartDefault('2026-10-12')).toBe('2026-10-13');
    expect(assignStartDefault('2026-10-31')).toBe('2026-11-01');
  });

  it('outlet: the one in the URL, else the default outlet, else the first', () => {
    const outlets = [{ id: 2, name: 'Outlet 2' }, { id: 1, name: 'Main', isDefault: true }];
    expect(defaultOutlet(outlets, 2)?.id).toBe(2);
    expect(defaultOutlet(outlets, null)?.id).toBe(1);
    expect(defaultOutlet(outlets, 99)?.id).toBe(1);
    expect(defaultOutlet([{ id: 5, name: 'A' }, { id: 6, name: 'B' }], 0)?.id).toBe(5);
    expect(defaultOutlet([], 1)).toBeNull();
  });
});

describe('#927 who must clock in: who can change a row', () => {
  it('the owner changes every row; an outlet admin every row but the owner; others none', () => {
    for (const r of ['OUTLET_STAFF', 'OUTLET_INVENTORY', 'OUTLET_ADMIN', 'MERCHANT']) expect(canEditMember('MERCHANT', r)).toBe(true);
    expect(canEditMember('OUTLET_ADMIN', 'OUTLET_STAFF')).toBe(true);
    expect(canEditMember('OUTLET_ADMIN', 'OUTLET_ADMIN')).toBe(true);
    expect(canEditMember('outlet_admin', 'OUTLET_INVENTORY')).toBe(true);
    expect(canEditMember('OUTLET_ADMIN', 'MERCHANT')).toBe(false);
    expect(canEditMember('OUTLET_STAFF', 'OUTLET_STAFF')).toBe(false);
    expect(canEditMember(null, 'OUTLET_STAFF')).toBe(false);
  });
});


describe('#991 recorded person events', () => {
  const rows = [
    { at: '2026-10-15T01:00:00Z', kind: 'IN' as const, result: 'ACCEPTED' as const, recordId: 7 },
    { at: '2026-10-15T10:00:00Z', kind: 'OUT' as const, result: 'ACCEPTED' as const, recordId: 7, suspectReasons: ['SAME_COORDS'] },
    ...['ATTENDANCE_NOT_CONFIGURED', 'QR_EXPIRED', 'GPS_INACCURATE', 'OUT_OF_RANGE', 'QR_WRONG_OUTLET', 'MOCK_LOCATION'].map((errorCode) =>
      ({ at: '2026-10-15T00:55:00Z', kind: 'IN' as const, result: 'REJECTED' as const, errorCode, suspectReasons: ['ZERO_ACCURACY'] })),
    { at: '2026-10-16T02:00:00Z', kind: 'EDIT' as const, result: 'EDITED' as const, recordId: 7, dateKey: '2026-10-15', after: { checkInAt: '2026-10-15T00:45:00Z', checkOutAt: '2026-10-15T11:00:00Z', status: 'DONE' } },
    { at: '2026-10-15T16:59:59Z', kind: 'OUT' as const, result: 'AUTO_CLOSED' as const, recordId: 8 },
  ];

  it('hides failed scans while preserving recorded work, edits and missing-out events', () => {
    expect(filterRows(rows, 'all')).toEqual([rows[0], rows[1], rows[8], rows[9]]);
    expect(groupRowsByDay(filterRows(rows, 'all'))[0].rows.map((r) => r.result)).toEqual(['EDITED', 'AUTO_CLOSED', 'ACCEPTED', 'ACCEPTED']);
  });

  it('suspected only includes successful events and raw edits still determine record times', () => {
    expect(filterRows(rows, 'suspected')).toEqual([rows[1]]);
    expect(recordTimes(rows, 7)).toEqual({ day: '2026-10-15', checkIn: '07:45', checkOut: '18:00' });
    expect(rows).toHaveLength(10);
    expect(rows[8].result).toBe('EDITED');
  });

  it('error-only and empty histories have no visible events', () => {
    expect(filterRows(rows.filter((r) => r.result === 'REJECTED'), 'all')).toEqual([]);
    expect(filterRows([], 'all')).toEqual([]);
  });
});

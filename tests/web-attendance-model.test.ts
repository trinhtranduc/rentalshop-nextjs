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
  canEditPerson,
  canUseAttendanceWeb,
  cellKind,
  formatHours,
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

  it('groups rows by VN day; an edit sits under its record day', () => {
    const rows = [
      { at: '2026-10-15T06:00:05Z', kind: 'IN' as const, result: 'ACCEPTED' as const, recordId: 7 },
      { at: '2026-10-15T16:59:59Z', kind: 'OUT' as const, result: 'AUTO_CLOSED' as const, recordId: 7 },
      { at: '2026-10-16T02:12:00Z', kind: 'EDIT' as const, result: 'EDITED' as const, recordId: 7 },
      { at: '2026-10-12T17:30:00Z', kind: 'IN' as const, result: 'REJECTED' as const },
    ];
    const groups = groupRowsByDay(rows);
    expect(groups.map((g) => g.day)).toEqual(['2026-10-13', '2026-10-15']);
    expect(groups[1].rows.map((r) => r.kind)).toEqual(['IN', 'OUT', 'EDIT']);
    expect(recordTimes(rows, 7)).toEqual({ day: '2026-10-15', checkIn: '13:00', checkOut: '' });
  });
});

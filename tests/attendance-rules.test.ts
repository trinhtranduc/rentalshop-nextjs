/**
 * #907 attendance module, pure rules (apps/api/lib/attendance/*).
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh; results must be identical.
 * VN midnight = 17:00:00Z of the previous UTC day.
 */
import { describe, expect, it } from '@jest/globals';
import { haversineMeters } from '../apps/api/lib/attendance/geo';
import { scanKindLabel, scanResultLabel } from '../apps/api/lib/attendance/export-labels';
import {
  buildAttendanceQrCode,
  parseAttendanceQrCode,
  verifyAttendanceQrCode,
} from '../apps/api/lib/attendance/qr-code';
import {
  instantAt,
  matchShiftForInstant,
  recordCloseTime,
  recordHours,
  shiftDeltas,
  suspectReasons,
  vnDateKey,
  weekdayOfDateKey,
} from '../apps/api/lib/attendance/rules';
import {
  diffSchedules,
  effectiveSchedule,
  effectiveShiftsForDay,
  isDayLocked,
  rulesOverlap,
  type ScheduleDayChange,
  type ScheduleRule,
  type ScheduleTemplate,
} from '../apps/api/lib/attendance/schedule';
import { MODULES, resolveActiveModules } from '../packages/constants/src/modules';

const SECRET = 'test-secret';
const at = (iso: string) => new Date(iso);

describe('module catalog (#907 rule 1-2)', () => {
  const now = at('2026-10-12T05:00:00Z');
  it('attendance exists and requires nothing', () => {
    const a = MODULES.find((m) => m.key === 'attendance');
    expect(a).toBeDefined();
    expect(a!.requires).toEqual([]);
  });
  it('enabled with no end date is active; disabled or expired is not', () => {
    expect(resolveActiveModules([{ key: 'attendance', enabled: true, endsAt: null }], now)).toEqual(['attendance']);
    expect(resolveActiveModules([{ key: 'attendance', enabled: false, endsAt: null }], now)).toEqual([]);
    expect(resolveActiveModules([{ key: 'attendance', enabled: true, endsAt: at('2026-10-12T04:59:59Z') }], now)).toEqual([]);
    expect(resolveActiveModules([{ key: 'attendance', enabled: true, endsAt: at('2026-10-12T05:00:01Z') }], now)).toEqual(['attendance']);
  });
  it('unknown keys are ignored; a module whose requirement is off is off', () => {
    const catalog = [
      { key: 'attendance', requires: [] as string[] },
      { key: 'payroll', requires: ['attendance'] },
    ];
    expect(resolveActiveModules([{ key: 'nope', enabled: true, endsAt: null }], now)).toEqual([]);
    expect(
      resolveActiveModules([{ key: 'payroll', enabled: true, endsAt: null }], now, catalog)
    ).toEqual([]);
    expect(
      resolveActiveModules(
        [
          { key: 'payroll', enabled: true, endsAt: null },
          { key: 'attendance', enabled: true, endsAt: null },
        ],
        now,
        catalog
      ).sort()
    ).toEqual(['attendance', 'payroll']);
  });
});

describe('geo (#907 rule 13.7)', () => {
  it('haversine: same point 0, ~111 m per 0.001° latitude', () => {
    expect(haversineMeters(10.7769, 106.7009, 10.7769, 106.7009)).toBe(0);
    const d = haversineMeters(10.7769, 106.7009, 10.7779, 106.7009);
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });
});

describe('QR code (#907 rule 10)', () => {
  const setting = { outletId: 3, qrVersion: 2, qrMode: 'DAILY' as const };

  it('daily code carries the VN day and dies at 00:00 VN (17:00:00Z)', () => {
    const made = buildAttendanceQrCode({ ...setting, now: at('2026-10-12T16:59:59Z'), secret: SECRET });
    expect(made.validDate).toBe('2026-10-12');
    expect(made.code.startsWith('a1.3.2.D.2026-10-12.')).toBe(true);
    expect(verifyAttendanceQrCode(made.code, setting, at('2026-10-12T16:59:59Z'), SECRET)).toBe(true);
    expect(verifyAttendanceQrCode(made.code, setting, at('2026-10-12T17:00:00Z'), SECRET)).toBe(false);
    // 06:59 VN on the 12th is still the 12th VN
    expect(verifyAttendanceQrCode(made.code, setting, at('2026-10-11T17:00:00Z'), SECRET)).toBe(true);
    expect(verifyAttendanceQrCode(made.code, setting, at('2026-10-11T16:59:59Z'), SECRET)).toBe(false);
  });

  it('fixed code has dateKey 0 and dies on a new version or a mode change', () => {
    const fixed = { ...setting, qrMode: 'FIXED' as const };
    const made = buildAttendanceQrCode({ ...fixed, now: at('2026-10-12T05:00:00Z'), secret: SECRET });
    expect(made.validDate).toBeNull();
    expect(made.code.startsWith('a1.3.2.F.0.')).toBe(true);
    expect(verifyAttendanceQrCode(made.code, fixed, at('2027-03-01T05:00:00Z'), SECRET)).toBe(true);
    expect(verifyAttendanceQrCode(made.code, { ...fixed, qrVersion: 3 }, at('2026-10-12T05:00:00Z'), SECRET)).toBe(false);
    expect(verifyAttendanceQrCode(made.code, { ...fixed, qrMode: 'DAILY' }, at('2026-10-12T05:00:00Z'), SECRET)).toBe(false);
  });

  it('a tampered, malformed or other-secret code is rejected; unknown outlet setting rejects', () => {
    const made = buildAttendanceQrCode({ ...setting, now: at('2026-10-12T05:00:00Z'), secret: SECRET });
    const now = at('2026-10-12T05:00:00Z');
    expect(verifyAttendanceQrCode(made.code.replace('a1.3.', 'a1.4.'), { ...setting, outletId: 4 }, now, SECRET)).toBe(false);
    expect(verifyAttendanceQrCode(made.code, setting, now, 'other-secret')).toBe(false);
    expect(verifyAttendanceQrCode('hello', setting, now, SECRET)).toBe(false);
    expect(verifyAttendanceQrCode(made.code, null, now, SECRET)).toBe(false);
    expect(verifyAttendanceQrCode(made.code, { ...setting, qrVersion: 0 }, now, SECRET)).toBe(false);
  });

  it('parse returns the parts or null', () => {
    expect(parseAttendanceQrCode('a1.3.2.D.2026-10-12.abc')).toEqual({
      outletId: 3,
      qrVersion: 2,
      qrMode: 'DAILY',
      dateKey: '2026-10-12',
      signature: 'abc',
    });
    expect(parseAttendanceQrCode('a1.x.2.D.2026-10-12.abc')).toBeNull();
    expect(parseAttendanceQrCode('a2.3.2.D.2026-10-12.abc')).toBeNull();
    expect(parseAttendanceQrCode('a1.3.2.Q.0.abc')).toBeNull();
  });
});

describe('VN day and time helpers', () => {
  it('vnDateKey at the 16:59:59Z / 17:00:00Z boundary', () => {
    expect(vnDateKey(at('2026-10-12T16:59:59Z'))).toBe('2026-10-12');
    expect(vnDateKey(at('2026-10-12T17:00:00Z'))).toBe('2026-10-13');
    expect(vnDateKey(at('2026-10-31T17:00:00Z'))).toBe('2026-11-01');
  });
  it('instantAt is the VN wall time', () => {
    expect(instantAt('2026-10-13', '08:00').toISOString()).toBe('2026-10-13T01:00:00.000Z');
    expect(instantAt('2026-10-13', '00:00').toISOString()).toBe('2026-10-12T17:00:00.000Z');
  });
  it('weekday 1 = Monday … 7 = Sunday', () => {
    expect(weekdayOfDateKey('2026-10-12')).toBe(1);
    expect(weekdayOfDateKey('2026-10-18')).toBe(7);
    expect(weekdayOfDateKey('2026-11-01')).toBe(7);
  });
});

describe('close time, hours, late / early / overtime (#907 rules 18, 25, 27)', () => {
  it('no shift or a same-day shift closes at the end of the VN day', () => {
    expect(recordCloseTime({ dateKey: '2026-10-12', shiftStart: null, shiftEnd: null }).toISOString()).toBe(
      '2026-10-12T16:59:59.999Z'
    );
    expect(recordCloseTime({ dateKey: '2026-10-31', shiftStart: '08:00', shiftEnd: '12:00' }).toISOString()).toBe(
      '2026-10-31T16:59:59.999Z'
    );
  });
  it('a cross-midnight shift closes 4 h after its end on the next VN day', () => {
    // 22:00 → 06:00 on 2026-10-31 VN; end = 2026-11-01 06:00 VN = 2026-10-31T23:00Z; +4h
    expect(recordCloseTime({ dateKey: '2026-10-31', shiftStart: '22:00', shiftEnd: '06:00' }).toISOString()).toBe(
      '2026-11-01T03:00:00.000Z'
    );
  });
  it('hours = (out − in) − break, floor 0, 2 decimals', () => {
    expect(recordHours(at('2026-10-12T01:00:00Z'), at('2026-10-12T05:20:00Z'), 30)).toBe(3.83);
    expect(recordHours(at('2026-10-12T01:00:00Z'), at('2026-10-12T01:10:00Z'), 30)).toBe(0);
    expect(recordHours(at('2026-10-12T01:00:00Z'), null, 0)).toBe(0);
  });
  it('late / early / overtime minutes against the snapshot', () => {
    const snap = { dateKey: '2026-10-12', shiftStart: '08:00', shiftEnd: '12:00' };
    // in 08:07 VN, out 11:50 VN
    expect(shiftDeltas(snap, at('2026-10-12T01:07:00Z'), at('2026-10-12T04:50:00Z'))).toEqual({
      lateMinutes: 7,
      earlyMinutes: 10,
      overtimeMinutes: 0,
    });
    // in 07:55, out 12:40
    expect(shiftDeltas(snap, at('2026-10-12T00:55:00Z'), at('2026-10-12T05:40:00Z'))).toEqual({
      lateMinutes: 0,
      earlyMinutes: 0,
      overtimeMinutes: 40,
    });
    expect(shiftDeltas({ dateKey: '2026-10-12', shiftStart: null, shiftEnd: null }, at('2026-10-12T01:07:00Z'), null)).toEqual({
      lateMinutes: 0,
      earlyMinutes: 0,
      overtimeMinutes: 0,
    });
  });
});

describe('shift matching on IN (#907 rule 17)', () => {
  const morning = { templateId: 1, name: 'Ca sáng', start: '08:00', end: '12:00', breakMinutes: 0, color: 'blue', source: 'RULE' as const };
  const night = { templateId: 2, name: 'Ca đêm', start: '22:00', end: '06:00', breakMinutes: 30, color: 'purple', source: 'RULE' as const };

  it('window is [start − 3 h, end]', () => {
    const days = [{ dateKey: '2026-10-12', shifts: [morning] }];
    expect(matchShiftForInstant(at('2026-10-11T22:00:00Z'), days)?.shift.name).toBe('Ca sáng'); // 05:00 VN
    expect(matchShiftForInstant(at('2026-10-11T21:59:59Z'), days)).toBeNull(); // 04:59:59 VN
    expect(matchShiftForInstant(at('2026-10-12T05:00:00Z'), days)?.dateKey).toBe('2026-10-12'); // 12:00 VN
    expect(matchShiftForInstant(at('2026-10-12T05:00:01Z'), days)).toBeNull();
  });

  it("a cross-midnight shift of the previous day counts and keeps that day's key", () => {
    const days = [
      { dateKey: '2026-10-11', shifts: [night] },
      { dateKey: '2026-10-12', shifts: [morning] },
    ];
    // 01:00 VN on the 12th
    const m = matchShiftForInstant(at('2026-10-11T18:00:00Z'), days);
    expect(m?.dateKey).toBe('2026-10-11');
    expect(m?.shift.name).toBe('Ca đêm');
  });
});

describe('suspected fake (#907 rule 16)', () => {
  const prev = { latitude: 10.7769, longitude: 106.7009, accuracy: 10, at: at('2026-10-12T01:00:00Z') };
  it('accuracy exactly 0', () => {
    expect(suspectReasons({ latitude: 10.7, longitude: 106.7, accuracy: 0, at: at('2026-10-12T02:00:00Z') }, null)).toEqual([
      'ZERO_ACCURACY',
    ]);
  });
  it('same coordinates as the previous accepted scan', () => {
    expect(suspectReasons({ ...prev, accuracy: 8, at: at('2026-10-12T05:00:00Z') }, prev)).toEqual(['SAME_COORDS']);
  });
  it('speed > 50 m/s only when the distance exceeds both accuracies', () => {
    // ~1.1 km in 10 s
    expect(
      suspectReasons({ latitude: 10.7869, longitude: 106.7009, accuracy: 10, at: at('2026-10-12T01:00:10Z') }, prev)
    ).toEqual(['SPEED']);
    // 111 m in 1 s but accuracies 80 + 80 cover it
    expect(
      suspectReasons({ latitude: 10.7779, longitude: 106.7009, accuracy: 80, at: at('2026-10-12T01:00:01Z') }, { ...prev, accuracy: 80 })
    ).toEqual([]);
    expect(suspectReasons({ latitude: 10.7779, longitude: 106.7009, accuracy: 10, at: at('2026-10-12T04:00:00Z') }, prev)).toEqual([]);
  });
});

describe('weekly schedule: rules + one-day changes (#907 rules 20-23)', () => {
  const templates: ScheduleTemplate[] = [
    { id: 1, name: 'Ca sáng', startTime: '08:00', endTime: '12:00', breakMinutes: 0, color: 'blue' },
    { id: 2, name: 'Ca chiều', startTime: '13:00', endTime: '17:30', breakMinutes: 30, color: 'orange' },
  ];
  const rules: ScheduleRule[] = [
    { id: 10, userId: 7, templateId: 1, weekdays: [1, 2, 3, 4, 5], startDate: '2026-10-12', endDate: null },
    { id: 11, userId: 7, templateId: 2, weekdays: [6], startDate: '2026-10-12', endDate: '2026-10-31' },
  ];

  it('rules repeat on their weekdays inside [startDate, endDate]', () => {
    expect(effectiveShiftsForDay(7, '2026-10-12', rules, [], templates).map((s) => s.name)).toEqual(['Ca sáng']);
    expect(effectiveShiftsForDay(7, '2026-10-17', rules, [], templates).map((s) => s.name)).toEqual(['Ca chiều']);
    expect(effectiveShiftsForDay(7, '2026-10-18', rules, [], templates)).toEqual([]);
    expect(effectiveShiftsForDay(7, '2026-11-07', rules, [], templates)).toEqual([]); // after endDate
    expect(effectiveShiftsForDay(7, '2026-10-09', rules, [], templates)).toEqual([]); // before startDate
    expect(effectiveShiftsForDay(8, '2026-10-12', rules, [], templates)).toEqual([]);
  });

  it('a one-day change replaces the rules on that day only', () => {
    const changes: ScheduleDayChange[] = [
      { userId: 7, dateKey: '2026-10-13', off: false, templateId: 2, startTime: null, endTime: null, breakMinutes: null },
      { userId: 7, dateKey: '2026-10-14', off: true, templateId: null, startTime: null, endTime: null, breakMinutes: null },
      { userId: 7, dateKey: '2026-10-15', off: false, templateId: null, startTime: '09:00', endTime: '11:00', breakMinutes: 15 },
    ];
    expect(effectiveShiftsForDay(7, '2026-10-13', rules, changes, templates).map((s) => [s.name, s.source])).toEqual([
      ['Ca chiều', 'DAY'],
    ]);
    expect(effectiveShiftsForDay(7, '2026-10-14', rules, changes, templates)).toEqual([]);
    const custom = effectiveShiftsForDay(7, '2026-10-15', rules, changes, templates);
    expect(custom).toEqual([
      expect.objectContaining({ templateId: null, start: '09:00', end: '11:00', breakMinutes: 15, source: 'DAY' }),
    ]);
    expect(effectiveShiftsForDay(7, '2026-10-16', rules, changes, templates).map((s) => s.name)).toEqual(['Ca sáng']);
  });

  it('effectiveSchedule lists every user × day with shifts, across a month end', () => {
    const rows = effectiveSchedule({ userIds: [7], from: '2026-10-30', to: '2026-11-02', rules, dayChanges: [], templates });
    expect(rows.map((r) => [r.date, r.shifts.map((s) => s.name)])).toEqual([
      ['2026-10-30', ['Ca sáng']],
      ['2026-10-31', ['Ca chiều']],
      ['2026-11-02', ['Ca sáng']],
    ]);
  });

  it('day lock: past days and worked days', () => {
    const worked = new Set(['7:2026-10-12']);
    expect(isDayLocked(7, '2026-10-11', '2026-10-12', worked)).toBe(true);
    expect(isDayLocked(7, '2026-10-12', '2026-10-12', worked)).toBe(true);
    expect(isDayLocked(8, '2026-10-12', '2026-10-12', worked)).toBe(false);
    expect(isDayLocked(7, '2026-10-13', '2026-10-12', worked)).toBe(false);
  });

  it('overlap: same user, shared weekday, overlapping dates and times', () => {
    const t = new Map(templates.map((x) => [x.id, x]));
    const a = rules[0];
    expect(rulesOverlap(a, { ...a, id: 99, templateId: 1 }, t)).toBe(true);
    expect(rulesOverlap(a, { ...a, id: 99, templateId: 2 }, t)).toBe(false); // 08-12 vs 13-17:30
    expect(rulesOverlap(a, { ...a, id: 99, weekdays: [6, 7] }, t)).toBe(false);
    expect(rulesOverlap({ ...a, endDate: '2026-10-20' }, { ...a, id: 99, startDate: '2026-10-21' }, t)).toBe(false);
    expect(rulesOverlap(a, { ...a, id: 99, userId: 8 }, t)).toBe(false);
  });

  it('diff lists the future days whose shifts changed', () => {
    const before = effectiveSchedule({ userIds: [7], from: '2026-10-12', to: '2026-10-18', rules, dayChanges: [], templates });
    const after = effectiveSchedule({
      userIds: [7],
      from: '2026-10-12',
      to: '2026-10-18',
      rules,
      dayChanges: [{ userId: 7, dateKey: '2026-10-15', off: false, templateId: 2, startTime: null, endTime: null, breakMinutes: null }],
      templates,
    });
    const diff = diffSchedules(before, after);
    expect(diff).toEqual([
      expect.objectContaining({ userId: 7, date: '2026-10-15' }),
    ]);
    expect(diff[0].before.map((s) => s.name)).toEqual(['Ca sáng']);
    expect(diff[0].after.map((s) => s.name)).toEqual(['Ca chiều']);
  });
});

describe('#918 Excel "Chi tiết" labels are Vietnamese', () => {
  it('kind and result', () => {
    expect(scanKindLabel('IN')).toBe('Vào');
    expect(scanKindLabel('OUT')).toBe('Ra');
    expect(scanKindLabel(null)).toBe('');
    expect(scanResultLabel('ACCEPTED')).toBe('Ghi nhận');
    expect(scanResultLabel('OUT_OF_RANGE')).toBe('Từ chối · Ngoài vùng');
    expect(scanResultLabel('GPS_INACCURATE')).toBe('Từ chối · GPS chưa chính xác');
    expect(scanResultLabel('MOCK_LOCATION')).toBe('Từ chối · Vị trí giả');
    expect(scanResultLabel('QR_EXPIRED')).toBe('Từ chối · Mã QR hết hiệu lực');
    expect(scanResultLabel('QR_WRONG_OUTLET')).toBe('Từ chối · Mã QR của chi nhánh khác');
    expect(scanResultLabel('ATTENDANCE_NOT_CONFIGURED')).toBe('Từ chối · Chi nhánh chưa cài vị trí');
    expect(scanResultLabel('SOMETHING_NEW')).toBe('Từ chối · SOMETHING_NEW');
  });
});

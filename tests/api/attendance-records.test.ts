/**
 * #907 settings / QR / kiosk link, records and edits, month lock, timesheet, person month, me.
 * Spec rules 7-9, 11, 26-30, 32, 33.
 */
jest.mock('next/server', () => require('../helpers/attendance-route-mocks').nextServerModule);
jest.mock('@rentalshop/auth/server', () => require('../helpers/attendance-route-mocks').authServerModule);
jest.mock('@rentalshop/database', () => require('../helpers/attendance-route-mocks').databaseModule);
jest.mock('@rentalshop/utils', () => require('../helpers/attendance-route-mocks').utilsModule());

import { mockDb, params, req, resetAttendanceMocks, setCaller } from '../helpers/attendance-route-mocks';
import { GET as getSettings, PUT as putSettings } from '../../apps/api/app/api/attendance/settings/route';
import { POST as makeQr } from '../../apps/api/app/api/attendance/settings/qr/route';
import { POST as makeKiosk } from '../../apps/api/app/api/attendance/settings/kiosk-link/route';
import { PATCH as patchRecord } from '../../apps/api/app/api/attendance/records/[id]/route';
import { POST as addRecord } from '../../apps/api/app/api/attendance/records/route';
import { POST as lockMonth } from '../../apps/api/app/api/attendance/months/lock/route';
import { POST as unlockMonth } from '../../apps/api/app/api/attendance/months/unlock/route';
import { GET as timesheet } from '../../apps/api/app/api/attendance/timesheet/route';
import { GET as personMonth } from '../../apps/api/app/api/attendance/people/[userId]/month/route';
import { GET as me } from '../../apps/api/app/api/attendance/me/route';

const SETTING = {
  outletId: 1,
  merchantId: 2,
  latitude: 10.7769,
  longitude: 106.7009,
  radiusM: 100,
  qrMode: 'DAILY',
  qrVersion: 0,
  qrCreatedAt: null,
  kioskToken: null,
  kioskTokenAt: null,
};

describe('outlet settings, QR and kiosk link (#907 rules 7-9, 11)', () => {
  beforeEach(() => {
    resetAttendanceMocks();
    mockDb.attendance.getSetting.mockResolvedValue(null);
    mockDb.attendance.upsertSetting.mockImplementation(async (outletId: number, merchantId: number, d: any) => ({ ...SETTING, ...d }));
  });

  it('missing row → defaults (radius 100, DAILY, not generated)', async () => {
    setCaller('MERCHANT');
    const res: any = await getSettings(req('/api/attendance/settings?outletId=1'));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      outletId: 1,
      latitude: null,
      longitude: null,
      radiusM: 100,
      qrMode: 'DAILY',
      qr: { generated: false, code: null, validDate: null, createdAt: null },
      kioskToken: null,
    });
  });

  it('without outletId lists the outlets in scope with a badge state', async () => {
    setCaller('MERCHANT');
    mockDb.attendance.listOutlets.mockResolvedValue([{ id: 1, name: 'A' }, { id: 2, name: 'B' }]);
    mockDb.attendance.listSettings.mockResolvedValue([{ ...SETTING, qrVersion: 2, qrMode: 'FIXED' }]);
    const res: any = await getSettings(req('/api/attendance/settings'));
    expect(res.body.data).toEqual([
      { outletId: 1, configured: true, qrMode: 'FIXED', generated: true },
      { outletId: 2, configured: false, qrMode: 'DAILY', generated: false },
    ]);
  });

  it('OUTLET_ADMIN: qrMode yes, coordinates / radius no (403); another outlet 403; another merchant 404', async () => {
    setCaller('OUTLET_ADMIN', { id: 8 });
    const coords: any = await putSettings(req('/api/attendance/settings', { outletId: 1, radiusM: 200 }));
    expect(coords.status).toBe(403);
    const mode: any = await putSettings(req('/api/attendance/settings', { outletId: 1, qrMode: 'FIXED' }));
    expect(mode.status).toBe(200);
    const other: any = await putSettings(req('/api/attendance/settings', { outletId: 2, qrMode: 'FIXED' }));
    expect(other.status).toBe(403);
    const foreign: any = await putSettings(req('/api/attendance/settings', { outletId: 55, qrMode: 'FIXED' }));
    expect(foreign.status).toBe(404);
  });

  it('MERCHANT: radius 50–500 and valid coordinates', async () => {
    setCaller('MERCHANT');
    expect((await putSettings(req('/api/attendance/settings', { outletId: 1, radiusM: 40 }))).status).toBe(400);
    expect((await putSettings(req('/api/attendance/settings', { outletId: 1, latitude: 91, longitude: 0 }))).status).toBe(400);
    const ok: any = await putSettings(req('/api/attendance/settings', { outletId: 1, latitude: 10.5, longitude: 106.6, radiusM: 150 }));
    expect(ok.status).toBe(200);
    expect(mockDb.attendance.upsertSetting).toHaveBeenCalledWith(1, 2, { latitude: 10.5, longitude: 106.6, radiusM: 150 });
  });

  it('changing qrMode of a generated code makes a new code (version + 1)', async () => {
    setCaller('MERCHANT');
    mockDb.attendance.getSetting.mockResolvedValue({ ...SETTING, qrVersion: 3 });
    await putSettings(req('/api/attendance/settings', { outletId: 1, qrMode: 'FIXED' }));
    expect(mockDb.attendance.upsertSetting).toHaveBeenCalledWith(1, 2, expect.objectContaining({ qrMode: 'FIXED', qrVersion: 4 }));
  });

  it('POST qr bumps the version and returns the code; staff 403', async () => {
    setCaller('OUTLET_ADMIN', { id: 8 });
    mockDb.attendance.bumpQrVersion.mockResolvedValue({ ...SETTING, qrVersion: 1, qrCreatedAt: new Date() });
    const res: any = await makeQr(req('/api/attendance/settings/qr', { outletId: 1 }));
    expect(res.status).toBe(200);
    expect(mockDb.attendance.bumpQrVersion).toHaveBeenCalledWith(1, 2);
    expect(res.body.data.qr.generated).toBe(true);
    expect(res.body.data.qr.code.startsWith('a1.1.1.D.')).toBe(true);
    setCaller('OUTLET_STAFF', { id: 7 });
    expect((await makeQr(req('/api/attendance/settings/qr', { outletId: 1 }))).status).toBe(403);
  });

  it('POST kiosk-link stores a new 256-bit token', async () => {
    setCaller('MERCHANT');
    mockDb.attendance.setKioskToken.mockImplementation(async (o: number, m: number, token: string) => ({ ...SETTING, kioskToken: token }));
    const res: any = await makeKiosk(req('/api/attendance/settings/kiosk-link', { outletId: 1 }));
    expect(res.status).toBe(200);
    const token = mockDb.attendance.setKioskToken.mock.calls[0][2];
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(res.body.data.kioskToken).toBe(token);
  });

  it('module off → 403 MODULE_NOT_ENABLED on settings too', async () => {
    setCaller('MERCHANT');
    mockDb.merchantModules.isActive.mockResolvedValue(false);
    const res: any = await getSettings(req('/api/attendance/settings?outletId=1'));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MODULE_NOT_ENABLED');
  });
});

describe('records: manual edits with a reason (#907 rules 29, 33)', () => {
  const RECORD = {
    id: 5,
    merchantId: 2,
    outletId: 1,
    userId: 7,
    dateKey: '2026-10-12',
    checkInAt: new Date('2026-10-12T01:00:00Z'),
    checkOutAt: null,
    status: 'MISSING_OUT',
    shiftName: null,
    shiftStart: null,
    shiftEnd: null,
    shiftBreak: null,
  };

  beforeEach(() => {
    resetAttendanceMocks();
    setCaller('OUTLET_ADMIN', { id: 8 });
    mockDb.attendance.getRecord.mockImplementation(async (id: number, merchantId: number) =>
      id === 5 && merchantId === 2 ? RECORD : id === 6 && merchantId === 2 ? { ...RECORD, id: 6, userId: 8 } : null
    );
    mockDb.attendance.updateRecordWithEdit.mockImplementation(async (id: number, d: any) => ({ ...RECORD, ...d }));
    mockDb.attendance.createRecordWithEdit.mockImplementation(async (d: any) => ({ id: 9, ...d }));
  });

  it('a reason is required (1–500 chars)', async () => {
    const res: any = await patchRecord(req('/api/attendance/records/5', { checkOutAt: '2026-10-12T12:00:00+07:00' }), params({ id: '5' }));
    expect(res.status).toBe(400);
    const empty: any = await patchRecord(req('/api/attendance/records/5', { checkOutAt: '2026-10-12T12:00:00+07:00', reason: '' }), params({ id: '5' }));
    expect(empty.status).toBe(400);
  });

  it('closes a missing-out record: status DONE, edit row with before / after / reason / editor', async () => {
    const res: any = await patchRecord(
      req('/api/attendance/records/5', { checkOutAt: '2026-10-12T12:00:00+07:00', reason: 'Quên ra ca' }),
      params({ id: '5' })
    );
    expect(res.status).toBe(200);
    const [id, data, edit] = mockDb.attendance.updateRecordWithEdit.mock.calls[0];
    expect(id).toBe(5);
    expect(data).toEqual(expect.objectContaining({ checkOutAt: new Date('2026-10-12T05:00:00Z'), status: 'DONE' }));
    expect(edit).toEqual(expect.objectContaining({ editedById: 8, reason: 'Quên ra ca' }));
    expect(edit.before).toEqual(expect.objectContaining({ status: 'MISSING_OUT' }));
    expect(edit.after).toEqual(expect.objectContaining({ status: 'DONE' }));
  });

  it('checkOut must be after checkIn and at most 24 h later', async () => {
    const before: any = await patchRecord(
      req('/api/attendance/records/5', { checkOutAt: '2026-10-12T07:00:00+07:00', reason: 'x' }),
      params({ id: '5' })
    );
    expect(before.status).toBe(400);
    const long: any = await patchRecord(
      req('/api/attendance/records/5', { checkOutAt: '2026-10-13T09:00:00+07:00', reason: 'x' }),
      params({ id: '5' })
    );
    expect(long.status).toBe(400);
  });

  it('locked month → 409 MONTH_LOCKED', async () => {
    mockDb.attendance.isMonthLocked.mockResolvedValue(true);
    const res: any = await patchRecord(
      req('/api/attendance/records/5', { checkOutAt: '2026-10-12T12:00:00+07:00', reason: 'x' }),
      params({ id: '5' })
    );
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('MONTH_LOCKED');
    expect(mockDb.attendance.isMonthLocked).toHaveBeenCalledWith(1, '2026-10');
  });

  it('OUTLET_ADMIN cannot edit their own record (403); staff cannot edit (403); other merchant 404', async () => {
    const own: any = await patchRecord(req('/api/attendance/records/6', { checkOutAt: '2026-10-12T12:00:00+07:00', reason: 'x' }), params({ id: '6' }));
    expect(own.status).toBe(403);
    setCaller('OUTLET_STAFF', { id: 7 });
    const staff: any = await patchRecord(req('/api/attendance/records/5', { checkOutAt: '2026-10-12T12:00:00+07:00', reason: 'x' }), params({ id: '5' }));
    expect(staff.status).toBe(403);
    setCaller('MERCHANT');
    const foreign: any = await patchRecord(req('/api/attendance/records/99', { checkOutAt: '2026-10-12T12:00:00+07:00', reason: 'x' }), params({ id: '99' }));
    expect(foreign.status).toBe(404);
  });

  it('POST adds a manual DONE record for a user of the outlet', async () => {
    const res: any = await addRecord(
      req('/api/attendance/records', {
        outletId: 1,
        userId: 7,
        checkInAt: '2026-10-12T08:00:00+07:00',
        checkOutAt: '2026-10-12T12:00:00+07:00',
        reason: 'Máy hỏng',
      })
    );
    expect(res.status).toBe(200);
    const [data, edit] = mockDb.attendance.createRecordWithEdit.mock.calls[0];
    expect(data).toEqual(
      expect.objectContaining({ merchantId: 2, outletId: 1, userId: 7, dateKey: '2026-10-12', status: 'DONE', source: 'MANUAL' })
    );
    expect(edit).toEqual(expect.objectContaining({ reason: 'Máy hỏng', editedById: 8, before: null }));
  });
});

describe('month lock (#907 rule 30)', () => {
  beforeEach(() => resetAttendanceMocks());

  it('MERCHANT only; both write an AuditLog', async () => {
    setCaller('OUTLET_ADMIN', { id: 8 });
    expect((await lockMonth(req('/api/attendance/months/lock', { outletId: 1, month: '2026-10' }))).status).toBe(403);
    setCaller('MERCHANT');
    mockDb.attendance.lockMonth.mockResolvedValue({ outletId: 1, month: '2026-10' });
    mockDb.attendance.unlockMonth.mockResolvedValue(1);
    expect((await lockMonth(req('/api/attendance/months/lock', { outletId: 1, month: '2026-10' }))).status).toBe(200);
    expect((await unlockMonth(req('/api/attendance/months/unlock', { outletId: 1, month: '2026-10' }))).status).toBe(200);
    expect(mockDb.auditLogs.create).toHaveBeenCalledTimes(2);
    expect(mockDb.auditLogs.create.mock.calls.map((c: any[]) => c[0].action)).toEqual(['ATTENDANCE_MONTH_LOCKED', 'ATTENDANCE_MONTH_UNLOCKED']);
    expect((await lockMonth(req('/api/attendance/months/lock', { outletId: 1, month: '2026-13' }))).status).toBe(400);
  });
});

describe('timesheet and person month (#907 rules 26-28, 33)', () => {
  const recs = [
    {
      id: 1, userId: 7, outletId: 1, dateKey: '2026-10-12', status: 'DONE', shiftName: 'Ca sáng', shiftStart: '08:00', shiftEnd: '12:00', shiftBreak: 30,
      checkInAt: new Date('2026-10-12T01:10:00Z'), checkOutAt: new Date('2026-10-12T05:00:00Z'), suspectedFake: false, suspectReasons: null, autoClosedAt: null,
    },
    {
      id: 2, userId: 7, outletId: 1, dateKey: '2026-10-13', status: 'MISSING_OUT', shiftName: null, shiftStart: null, shiftEnd: null, shiftBreak: null,
      checkInAt: new Date('2026-10-13T01:00:00Z'), checkOutAt: null, suspectedFake: true, suspectReasons: ['ZERO_ACCURACY'], autoClosedAt: new Date('2026-10-13T16:59:59.999Z'),
    },
  ];

  beforeEach(() => {
    resetAttendanceMocks();
    mockDb.attendance.listRecords.mockResolvedValue(recs);
    mockDb.attendance.listScans.mockResolvedValue([
      { id: 1, at: new Date('2026-10-12T01:10:00Z'), action: 'IN', result: 'ACCEPTED', latitude: 10.7, longitude: 106.7, accuracy: 8, distanceM: 12, recordId: 1 },
      { id: 2, at: new Date('2026-10-12T01:09:00Z'), action: 'IN', result: 'OUT_OF_RANGE', latitude: 10.8, longitude: 106.7, accuracy: 8, distanceM: 350, recordId: null },
      { id: 3, at: new Date('2026-10-12T05:00:00Z'), action: 'OUT', result: 'ACCEPTED', latitude: 10.7, longitude: 106.7, accuracy: 8, distanceM: 12, recordId: 1 },
      { id: 4, at: new Date('2026-10-13T01:00:00Z'), action: 'IN', result: 'ACCEPTED', latitude: 10.7, longitude: 106.7, accuracy: 0, distanceM: 2, recordId: 2 },
    ]);
    mockDb.attendance.listEdits.mockResolvedValue([]);
  });

  it('per user per day: hours − break, dayCredit, flags; totals and summary', async () => {
    setCaller('MERCHANT');
    const res: any = await timesheet(req('/api/attendance/timesheet?outletId=1&month=2026-10'));
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.locked).toBe(false);
    const u = d.users.find((x: any) => x.userId === 7);
    expect(u.days['2026-10-12']).toEqual({
      hours: 3.33,
      dayCredit: 1,
      flags: { late: true, early: false, overtime: false, missingOut: false, suspected: false },
    });
    expect(u.days['2026-10-13']).toEqual(
      expect.objectContaining({ hours: 0, dayCredit: 0, flags: expect.objectContaining({ missingOut: true, suspected: true }) })
    );
    expect(u.totals).toEqual({ hours: 3.33, dayCredits: 1 });
    expect(d.summary).toEqual({ totalHours: 3.33, pairs: 1, missingOut: 1, suspected: 1 });
    // the active users of the outlet are listed even without records
    expect(d.users.map((x: any) => x.userId).sort()).toEqual([7, 8]);
    expect(mockDb.attendance.autoCloseOverdue).toHaveBeenCalledWith({ outletId: 1 }, expect.any(Date));
  });

  it('staff cannot read the timesheet', async () => {
    setCaller('OUTLET_STAFF', { id: 7 });
    expect((await timesheet(req('/api/attendance/timesheet?outletId=1&month=2026-10'))).status).toBe(403);
  });

  it('person month: rows in time order with rejected scans and auto-close; staff self only', async () => {
    setCaller('OUTLET_STAFF', { id: 7 });
    const other: any = await personMonth(req('/api/attendance/people/8/month?outletId=1&month=2026-10'), params({ userId: '8' }));
    expect(other.status).toBe(403);
    const res: any = await personMonth(req('/api/attendance/people/7/month?outletId=1&month=2026-10'), params({ userId: '7' }));
    expect(res.status).toBe(200);
    const rows = res.body.data.rows;
    expect(rows.map((r: any) => [r.kind, r.result])).toEqual([
      ['IN', 'REJECTED'],
      ['IN', 'ACCEPTED'],
      ['OUT', 'ACCEPTED'],
      ['IN', 'ACCEPTED'],
      ['OUT', 'AUTO_CLOSED'],
    ]);
    expect(rows[0]).toEqual(expect.objectContaining({ errorCode: 'OUT_OF_RANGE', distanceM: 350, latitude: 10.8 }));
    expect(rows[1]).toEqual(expect.objectContaining({ lateMinutes: 10 }));
    expect(res.body.data.summary).toEqual(
      expect.objectContaining({ days: 1, hours: 3.33, lateCount: 1, missingOut: 1, suspected: 1 })
    );
  });

  it('#918 every row has dateKey: the record day for its scans, auto-close and edits; else the VN day of at', async () => {
    setCaller('MERCHANT');
    const manual = {
      id: 3, userId: 7, outletId: 1, dateKey: '2026-10-05', status: 'DONE', source: 'MANUAL', shiftName: null, shiftStart: null, shiftEnd: null,
      shiftBreak: null, checkInAt: new Date('2026-10-05T01:00:00Z'), checkOutAt: new Date('2026-10-05T10:00:00Z'), suspectedFake: false,
      suspectReasons: null, autoClosedAt: null,
    };
    const night = {
      id: 4, userId: 7, outletId: 1, dateKey: '2026-10-20', status: 'DONE', shiftName: null, shiftStart: null, shiftEnd: null, shiftBreak: null,
      checkInAt: new Date('2026-10-20T15:00:00Z'), checkOutAt: new Date('2026-10-20T19:00:00Z'), suspectedFake: false, suspectReasons: null,
      autoClosedAt: null,
    };
    mockDb.attendance.listRecords.mockResolvedValue([...recs, manual, night]);
    mockDb.attendance.listScans.mockResolvedValue([
      { id: 1, at: new Date('2026-10-12T01:10:00Z'), action: 'IN', result: 'ACCEPTED', latitude: 10.7, longitude: 106.7, accuracy: 8, distanceM: 12, recordId: 1 },
      // 00:30 on 13/10 in Vietnam, still 12/10 in UTC
      { id: 5, at: new Date('2026-10-12T17:30:00Z'), action: 'IN', result: 'OUT_OF_RANGE', latitude: 10.8, longitude: 106.7, accuracy: 8, distanceM: 350, recordId: null },
      { id: 6, at: new Date('2026-10-20T15:00:00Z'), action: 'IN', result: 'ACCEPTED', latitude: 10.7, longitude: 106.7, accuracy: 8, distanceM: 5, recordId: 4 },
      // cross-midnight OUT: 02:00 on 21/10 (VN) belongs to the record of 20/10
      { id: 7, at: new Date('2026-10-20T19:00:00Z'), action: 'OUT', result: 'ACCEPTED', latitude: 10.7, longitude: 106.7, accuracy: 8, distanceM: 5, recordId: 4 },
      // linked to a record outside the month → VN day of at
      { id: 8, at: new Date('2026-10-01T00:30:00Z'), action: 'OUT', result: 'ACCEPTED', latitude: 10.7, longitude: 106.7, accuracy: 8, distanceM: 5, recordId: 99 },
    ]);
    mockDb.attendance.listEdits.mockResolvedValue([
      // a manual record of 05/10 added on 12/10
      { id: 1, recordId: 3, createdAt: new Date('2026-10-12T03:00:00Z'), reason: 'Quên quét', before: null, after: { checkInAt: '2026-10-05T01:00:00.000Z', checkOutAt: '2026-10-05T10:00:00.000Z', status: 'DONE' }, editedById: 2 },
    ]);
    const res: any = await personMonth(req('/api/attendance/people/7/month?outletId=1&month=2026-10'), params({ userId: '7' }));
    expect(res.status).toBe(200);
    const rows = res.body.data.rows;
    for (const r of rows) expect(r.dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const pick = (fn: (r: any) => boolean) => rows.find(fn);
    expect(pick((r) => r.kind === 'EDIT' && r.recordId === 3)).toEqual(expect.objectContaining({ dateKey: '2026-10-05', at: new Date('2026-10-12T03:00:00Z') }));
    expect(pick((r) => r.result === 'REJECTED').dateKey).toBe('2026-10-13');
    expect(pick((r) => r.kind === 'OUT' && r.recordId === 4).dateKey).toBe('2026-10-20');
    expect(pick((r) => r.result === 'AUTO_CLOSED').dateKey).toBe('2026-10-13');
    expect(pick((r) => r.kind === 'IN' && r.recordId === 1).dateKey).toBe('2026-10-12');
    expect(pick((r) => r.recordId === 99).dateKey).toBe('2026-10-01');
  });

  it('a user of another merchant → 404', async () => {
    setCaller('MERCHANT');
    const res: any = await personMonth(req('/api/attendance/people/99/month?outletId=1&month=2026-10'), params({ userId: '99' }));
    expect(res.status).toBe(404);
  });
});

describe('GET /api/attendance/me (#907 rule 32)', () => {
  beforeEach(() => resetAttendanceMocks());

  it('open record, today shifts and status for the app row', async () => {
    setCaller('OUTLET_STAFF', { id: 7 });
    mockDb.attendance.findOpenRecord.mockResolvedValue({ id: 3, checkInAt: new Date(), status: 'OPEN', dateKey: 'x', outletId: 1 });
    mockDb.attendance.lastRecord.mockResolvedValue({ id: 3, checkInAt: new Date(), checkOutAt: null, status: 'OPEN' });
    const res: any = await me(req('/api/attendance/me'));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        enabled: true,
        openRecord: expect.objectContaining({ id: 3 }),
        today: expect.objectContaining({ shifts: [], status: 'IN_SHIFT' }),
        lastAction: expect.objectContaining({ action: 'IN' }),
      })
    );
  });

  it('module off → 403', async () => {
    setCaller('OUTLET_STAFF', { id: 7 });
    mockDb.merchantModules.isActive.mockResolvedValue(false);
    expect((await me(req('/api/attendance/me'))).status).toBe(403);
  });
});

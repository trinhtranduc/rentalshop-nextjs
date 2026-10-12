/**
 * #907 POST /api/attendance/punch and GET /api/attendance/kiosk/qr.
 * Spec rules 3, 12, 13 (order of checks), 14 (every scan logged), 15 (IN/OUT), 17 (response).
 */
jest.mock('next/server', () => require('../helpers/attendance-route-mocks').nextServerModule);
jest.mock('@rentalshop/auth/server', () => require('../helpers/attendance-route-mocks').authServerModule);
jest.mock('@rentalshop/database', () => require('../helpers/attendance-route-mocks').databaseModule);
jest.mock('@rentalshop/utils', () => require('../helpers/attendance-route-mocks').utilsModule());

import { mockDb, req, resetAttendanceMocks, setCaller } from '../helpers/attendance-route-mocks';
import { buildAttendanceQrCode } from '../../apps/api/lib/attendance/qr-code';
import { POST as punch } from '../../apps/api/app/api/attendance/punch/route';
import { GET as kioskQr } from '../../apps/api/app/api/attendance/kiosk/qr/route';

const SHOP = { latitude: 10.7769, longitude: 106.7009 };
const setting = (over: any = {}) => ({
  outletId: 1,
  merchantId: 2,
  latitude: SHOP.latitude,
  longitude: SHOP.longitude,
  radiusM: 100,
  qrMode: 'DAILY',
  qrVersion: 1,
  qrCreatedAt: new Date('2026-10-01T00:00:00Z'),
  kioskToken: 'tok',
  kioskTokenAt: new Date('2026-10-01T00:00:00Z'),
  ...over,
});
const codeFor = (outletId = 1, over: any = {}) =>
  buildAttendanceQrCode({
    outletId,
    qrVersion: 1,
    qrMode: 'DAILY',
    now: new Date(),
    secret: process.env.JWT_SECRET as string,
    ...over,
  }).code;
const body = (over: any = {}) => ({ code: codeFor(), ...SHOP, accuracy: 12, isMock: false, ...over });

const lastScan = () => mockDb.attendance.createScan.mock.calls.at(-1)?.[0];

describe('POST /api/attendance/punch: order of checks (#907 rule 13)', () => {
  beforeEach(() => {
    resetAttendanceMocks();
    setCaller('OUTLET_STAFF', { id: 7 });
    mockDb.attendance.getSetting.mockImplementation(async (outletId: number) => setting({ outletId }));
  });

  it('1. module off → 403 MODULE_NOT_ENABLED and no scan row', async () => {
    mockDb.merchantModules.isActive.mockResolvedValue(false);
    const res: any = await punch(req('/api/attendance/punch', body()));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MODULE_NOT_ENABLED');
    expect(mockDb.attendance.createScan).not.toHaveBeenCalled();
    expect(mockDb.attendance.punch).not.toHaveBeenCalled();
  });

  it('a malformed body is 400 and not logged', async () => {
    const res: any = await punch(req('/api/attendance/punch', { code: 'x' }));
    expect(res.status).toBe(400);
    expect(mockDb.attendance.createScan).not.toHaveBeenCalled();
  });

  it('2. isMock → 422 MOCK_LOCATION before the QR is checked; the scan is logged', async () => {
    const res: any = await punch(req('/api/attendance/punch', body({ isMock: true, code: 'garbage' })));
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('MOCK_LOCATION');
    expect(lastScan()).toEqual(
      expect.objectContaining({ userId: 7, merchantId: 2, result: 'MOCK_LOCATION', action: 'IN', latitude: SHOP.latitude, accuracy: 12 })
    );
  });

  it('3. bad signature, old version or another day → 422 QR_EXPIRED (logged)', async () => {
    for (const code of ['garbage', codeFor(1, { qrVersion: 0 }), codeFor(1).slice(0, -2) + 'xx']) {
      const res: any = await punch(req('/api/attendance/punch', body({ code })));
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('QR_EXPIRED');
    }
    mockDb.attendance.getSetting.mockResolvedValue(setting({ qrVersion: 2 }));
    const old: any = await punch(req('/api/attendance/punch', body()));
    expect(old.body.code).toBe('QR_EXPIRED');
    const yesterday = codeFor(1, { now: new Date(Date.now() - 86400000) });
    mockDb.attendance.getSetting.mockResolvedValue(setting());
    const stale: any = await punch(req('/api/attendance/punch', body({ code: yesterday })));
    expect(stale.body.code).toBe('QR_EXPIRED');
    expect(lastScan().result).toBe('QR_EXPIRED');
  });

  it('4. QR of another outlet → 422 QR_WRONG_OUTLET; MERCHANT may punch at any own outlet', async () => {
    const res: any = await punch(req('/api/attendance/punch', body({ code: codeFor(2) })));
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('QR_WRONG_OUTLET');
    expect(lastScan()).toEqual(expect.objectContaining({ result: 'QR_WRONG_OUTLET' }));

    setCaller('MERCHANT', { id: 10 });
    mockDb.attendance.punch.mockResolvedValue({
      action: 'IN',
      record: { id: 5, outletId: 2, dateKey: '2026-10-12', checkInAt: new Date(), checkOutAt: null, status: 'OPEN' },
    });
    const ok: any = await punch(req('/api/attendance/punch', body({ code: codeFor(2) })));
    expect(ok.status).toBe(200);
  });

  it('a QR of an outlet of another merchant is QR_WRONG_OUTLET too', async () => {
    mockDb.attendance.getSetting.mockImplementation(async (outletId: number) => setting({ outletId, merchantId: 99 }));
    const res: any = await punch(req('/api/attendance/punch', body({ code: codeFor(55) })));
    expect(res.body.code).toBe('QR_WRONG_OUTLET');
  });

  it('5. outlet without coordinates → 422 ATTENDANCE_NOT_CONFIGURED', async () => {
    mockDb.attendance.getSetting.mockResolvedValue(setting({ latitude: null, longitude: null }));
    const res: any = await punch(req('/api/attendance/punch', body()));
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('ATTENDANCE_NOT_CONFIGURED');
  });

  it('6. accuracy > 100 m → 422 GPS_INACCURATE with data.accuracyM', async () => {
    const res: any = await punch(req('/api/attendance/punch', body({ accuracy: 180 })));
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('GPS_INACCURATE');
    expect(res.body.data).toEqual({ accuracyM: 180 });
  });

  it('7. farther than the radius → 422 OUT_OF_RANGE with distance and radius', async () => {
    const res: any = await punch(req('/api/attendance/punch', body({ latitude: SHOP.latitude + 0.003 })));
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('OUT_OF_RANGE');
    expect(res.body.data.radiusM).toBe(100);
    expect(res.body.data.distanceM).toBeGreaterThan(300);
    expect(lastScan()).toEqual(expect.objectContaining({ result: 'OUT_OF_RANGE', distanceM: res.body.data.distanceM }));
    expect(mockDb.attendance.punch).not.toHaveBeenCalled();
  });

  it('the intended action of a rejected scan follows the open record (OUT when one is open)', async () => {
    mockDb.attendance.findOpenRecord.mockResolvedValue({ id: 3, status: 'OPEN' });
    await punch(req('/api/attendance/punch', body({ isMock: true })));
    expect(lastScan().action).toBe('OUT');
    expect(mockDb.attendance.autoCloseOverdue).toHaveBeenCalledWith({ userId: 7 }, expect.any(Date));
  });

  it('accepted: one transactional punch with the distance; response carries action and minutes', async () => {
    mockDb.attendance.punch.mockResolvedValue({
      action: 'OUT',
      record: {
        id: 5,
        outletId: 1,
        dateKey: '2026-10-12',
        shiftName: 'Ca sáng',
        shiftStart: '08:00',
        shiftEnd: '12:00',
        shiftBreak: 0,
        checkInAt: new Date('2026-10-12T01:07:00Z'),
        checkOutAt: new Date('2026-10-12T05:40:00Z'),
        status: 'DONE',
      },
    });
    const res: any = await punch(req('/api/attendance/punch', body({ latitude: SHOP.latitude + 0.0001 })));
    expect(res.status).toBe(200);
    const input = mockDb.attendance.punch.mock.calls[0][0];
    expect(input).toEqual(
      expect.objectContaining({ merchantId: 2, outletId: 1, userId: 7, accuracy: 12, distanceM: expect.any(Number) })
    );
    expect(input.distanceM).toBeGreaterThan(5);
    expect(input.distanceM).toBeLessThan(20);
    expect(typeof input.suspect).toBe('function');
    expect(res.body.data).toEqual(
      expect.objectContaining({
        action: 'OUT',
        distanceM: input.distanceM,
        accuracyM: 12,
        lateMinutes: 7,
        earlyMinutes: 0,
        overtimeMinutes: 40,
        shift: expect.objectContaining({ name: 'Ca sáng', start: '08:00', end: '12:00' }),
      })
    );
    expect(res.body.data.record.id).toBe(5);
    // rejected-scan logging is not used for an accepted punch (the transaction writes it)
    expect(mockDb.attendance.createScan).not.toHaveBeenCalled();
  });

  it('IN links to the shift whose window [start − 3 h, end] contains now', async () => {
    const now = new Date();
    const vnMinutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + 7 * 60) % 1440;
    const hhmm = (m: number) => `${String(Math.floor(((m + 1440) % 1440) / 60)).padStart(2, '0')}:${String(((m + 1440) % 1440) % 60).padStart(2, '0')}`;
    // a shift starting in one hour and lasting two
    const start = hhmm(vnMinutes + 60);
    const end = hhmm(vnMinutes + 180);
    mockDb.attendance.getScheduleData.mockResolvedValue({
      rules: [{ id: 1, userId: 7, templateId: 4, weekdays: [1, 2, 3, 4, 5, 6, 7], startDate: '2020-01-01', endDate: null }],
      dayChanges: [],
      templates: [{ id: 4, name: 'Ca test', startTime: start, endTime: end, breakMinutes: 15, color: 'blue' }],
    });
    mockDb.attendance.punch.mockResolvedValue({
      action: 'IN',
      record: { id: 6, outletId: 1, dateKey: 'x', checkInAt: now, checkOutAt: null, status: 'OPEN' },
    });
    await punch(req('/api/attendance/punch', body()));
    const plan = mockDb.attendance.punch.mock.calls[0][0].inPlan;
    expect(plan).toEqual(
      expect.objectContaining({ shiftTemplateId: 4, shiftName: 'Ca test', shiftStart: start, shiftEnd: end, shiftBreak: 15 })
    );
    expect(plan.closeAt).toBeInstanceOf(Date);
  });

  it.each(['ADMIN', 'OPS'])('%s cannot punch', async (role) => {
    setCaller(role, { merchantId: null });
    const res: any = await punch(req('/api/attendance/punch', body()));
    expect(res.status).toBe(403);
  });
});

describe('GET /api/attendance/kiosk/qr (#907 rule 12)', () => {
  const kreq = (token?: string) => req('/api/attendance/kiosk/qr', undefined, token ? { 'x-kiosk-token': token } : {});

  beforeEach(() => {
    resetAttendanceMocks();
    mockDb.attendance.findSettingByKioskToken.mockImplementation(async (t: string) =>
      t === 'tok' ? { ...setting(), outlet: { id: 1, name: 'Chi nhánh chính', merchantId: 2 } } : null
    );
    mockDb.attendance.recentPunches.mockResolvedValue([
      { at: new Date('2026-10-12T01:00:00Z'), action: 'IN', firstName: 'Bình' },
    ]);
  });

  it('no or unknown token → 401 UNAUTHORIZED', async () => {
    expect((await kioskQr(kreq())).status).toBe(401);
    const res: any = await kioskQr(kreq('nope'));
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('module off → 403 MODULE_NOT_ENABLED', async () => {
    mockDb.merchantModules.isActive.mockResolvedValue(false);
    const res: any = await kioskQr(kreq('tok'));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MODULE_NOT_ENABLED');
    expect(mockDb.merchantModules.isActive).toHaveBeenCalledWith(2, 'attendance');
  });

  it('no coordinates or no QR yet → 422 ATTENDANCE_NOT_CONFIGURED', async () => {
    mockDb.attendance.findSettingByKioskToken.mockResolvedValue({ ...setting({ qrVersion: 0 }), outlet: { id: 1, name: 'A', merchantId: 2 } });
    expect((await kioskQr(kreq('tok'))).body.code).toBe('ATTENDANCE_NOT_CONFIGURED');
    mockDb.attendance.findSettingByKioskToken.mockResolvedValue({ ...setting({ latitude: null }), outlet: { id: 1, name: 'A', merchantId: 2 } });
    expect((await kioskQr(kreq('tok'))).status).toBe(422);
  });

  it('returns the current code, refresh hint and the last punches (first name only)', async () => {
    const res: any = await kioskQr(kreq('tok'));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        outlet: { id: 1, name: 'Chi nhánh chính' },
        qrMode: 'DAILY',
        refreshAfterSec: 60,
        validDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        recent: [{ name: 'Bình', action: 'IN', at: new Date('2026-10-12T01:00:00Z') }],
      })
    );
    expect(res.body.data.code.startsWith('a1.1.1.D.')).toBe(true);
    expect(mockDb.attendance.recentPunches).toHaveBeenCalledWith(1, expect.any(Date), 5);
  });
});

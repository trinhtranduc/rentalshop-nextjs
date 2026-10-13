/**
 * #927 the shop picks who must clock in. `User.attendanceRequired` null = role default
 * (OUTLET_STAFF / OUTLET_INVENTORY yes, OUTLET_ADMIN / MERCHANT no).
 * Members list and toggle, /me.required, punch IN / OUT, scheduling guards, shifts and timesheet lists.
 */
jest.mock('next/server', () => require('../helpers/attendance-route-mocks').nextServerModule);
jest.mock('@rentalshop/auth/server', () => require('../helpers/attendance-route-mocks').authServerModule);
jest.mock('@rentalshop/database', () => ({
  ...require('../helpers/attendance-route-mocks').databaseModule,
  createNotificationsForUsers: async (ids: number[]) => ids.length,
}));
jest.mock('@rentalshop/utils', () => require('../helpers/attendance-route-mocks').utilsModule());
jest.mock('../../apps/api/lib/push-notifications', () => ({ sendPushToUsers: async () => ({ sent: 0, failed: 0 }) }));

import { mockDb, params, req, resetAttendanceMocks, setCaller } from '../helpers/attendance-route-mocks';
import { addDaysToDateKey, formatDateKeyInTimeZone } from '../../packages/utils/src/core/date-range';
import { buildAttendanceQrCode } from '../../apps/api/lib/attendance/qr-code';
import { GET as listMembers, PUT as putMember } from '../../apps/api/app/api/attendance/members/route';
import { GET as me } from '../../apps/api/app/api/attendance/me/route';
import { POST as punch } from '../../apps/api/app/api/attendance/punch/route';
import { POST as createRules } from '../../apps/api/app/api/attendance/shift-rules/route';
import { PUT as putRule } from '../../apps/api/app/api/attendance/shift-rules/[id]/route';
import { PUT as putDay } from '../../apps/api/app/api/attendance/shifts/day/route';
import { GET as getShifts } from '../../apps/api/app/api/attendance/shifts/route';
import { GET as timesheet } from '../../apps/api/app/api/attendance/timesheet/route';

const today = formatDateKeyInTimeZone(new Date(), 'Asia/Ho_Chi_Minh');
const inThreeDays = addDaysToDateKey(today, 3);
const month = today.slice(0, 7);

const MEMBERS = [
  { id: 7, firstName: 'Lan', lastName: 'Tran', role: 'OUTLET_STAFF', outletId: 1, attendanceRequired: null },
  { id: 11, firstName: 'Tú', lastName: 'Le', role: 'OUTLET_INVENTORY', outletId: 1, attendanceRequired: null },
  { id: 12, firstName: 'Hoa', lastName: 'Vo', role: 'OUTLET_STAFF', outletId: 1, attendanceRequired: false },
  { id: 8, firstName: 'Minh', lastName: 'Ng', role: 'OUTLET_ADMIN', outletId: 1, attendanceRequired: null },
  { id: 3, firstName: 'Chủ', lastName: 'Shop', role: 'MERCHANT', outletId: null, attendanceRequired: null },
];
const byId = (id: number) => MEMBERS.find((u) => u.id === id) ?? null;
const T1 = { id: 1, merchantId: 2, outletId: 1, name: 'Ca sáng', startTime: '08:00', endTime: '12:00', breakMinutes: 0, color: 'blue', isActive: true };

beforeEach(() => {
  resetAttendanceMocks();
  mockDb.attendance.listMembers.mockResolvedValue(MEMBERS);
  mockDb.attendance.getUserInMerchant.mockImplementation(async (id: number, merchantId: number) =>
    merchantId === 2 && byId(id) ? { ...byId(id), merchantId: 2, isActive: true } : null
  );
  mockDb.attendance.setRequired.mockImplementation(async (id: number, value: boolean | null) => ({ ...byId(id), attendanceRequired: value }));
  mockDb.attendance.getTemplate.mockImplementation(async (id: number) => (id === 1 ? T1 : null));
  mockDb.attendance.listRules.mockResolvedValue([]);
  mockDb.attendance.createRules.mockImplementation(async (rows: any[]) => rows.map((r, i) => ({ id: 100 + i, ...r })));
  mockDb.attendance.upsertDayChange.mockImplementation(async (d: any) => ({ ...d }));
});

describe('GET /api/attendance/members (#927)', () => {
  it('lists the outlet people and the owner with required / isDefault from the role default', async () => {
    setCaller('MERCHANT', { id: 3 });
    const res: any = await listMembers(req('/api/attendance/members?outletId=1'));
    expect(res.status).toBe(200);
    expect(mockDb.attendance.listMembers).toHaveBeenCalledWith(1, 2);
    expect(res.body.data.items).toEqual([
      { userId: 7, name: 'Lan Tran', role: 'OUTLET_STAFF', required: true, isDefault: true },
      { userId: 11, name: 'Tú Le', role: 'OUTLET_INVENTORY', required: true, isDefault: true },
      { userId: 12, name: 'Hoa Vo', role: 'OUTLET_STAFF', required: false, isDefault: false },
      { userId: 8, name: 'Minh Ng', role: 'OUTLET_ADMIN', required: false, isDefault: true },
      { userId: 3, name: 'Chủ Shop', role: 'MERCHANT', required: false, isDefault: true },
    ]);
  });

  it('OUTLET_ADMIN reads its own outlet only; staff cannot', async () => {
    setCaller('OUTLET_ADMIN', { id: 8 });
    expect((await listMembers(req('/api/attendance/members?outletId=1'))).status).toBe(200);
    expect((await listMembers(req('/api/attendance/members?outletId=2'))).status).toBe(403);
    expect((await listMembers(req('/api/attendance/members?outletId=55'))).status).toBe(404);
    setCaller('OUTLET_STAFF', { id: 7 });
    expect((await listMembers(req('/api/attendance/members?outletId=1'))).status).toBe(403);
    setCaller('OUTLET_INVENTORY', { id: 11 });
    expect((await listMembers(req('/api/attendance/members?outletId=1'))).status).toBe(403);
  });

  it('missing outletId → 400; module off → 403 MODULE_NOT_ENABLED', async () => {
    setCaller('MERCHANT', { id: 3 });
    expect((await listMembers(req('/api/attendance/members'))).status).toBe(400);
    mockDb.merchantModules.isActive.mockResolvedValue(false);
    const off: any = await listMembers(req('/api/attendance/members?outletId=1'));
    expect(off.status).toBe(403);
    expect(off.body.code).toBe('MODULE_NOT_ENABLED');
  });
});

describe('PUT /api/attendance/members (#927)', () => {
  it('stores the choice; the role default is stored as null so isDefault comes back', async () => {
    setCaller('MERCHANT', { id: 3 });
    const on: any = await putMember(req('/api/attendance/members', { outletId: 1, userId: 8, required: true }));
    expect(on.status).toBe(200);
    expect(mockDb.attendance.setRequired).toHaveBeenLastCalledWith(8, true);
    expect(on.body.data).toEqual({ userId: 8, name: 'Minh Ng', role: 'OUTLET_ADMIN', required: true, isDefault: false });

    const back: any = await putMember(req('/api/attendance/members', { outletId: 1, userId: 12, required: true }));
    expect(mockDb.attendance.setRequired).toHaveBeenLastCalledWith(12, null);
    expect(back.body.data).toEqual(expect.objectContaining({ userId: 12, required: true, isDefault: true }));

    const off: any = await putMember(req('/api/attendance/members', { outletId: 1, userId: 7, required: false }));
    expect(mockDb.attendance.setRequired).toHaveBeenLastCalledWith(7, false);
    expect(off.body.data).toEqual(expect.objectContaining({ userId: 7, required: false, isDefault: false }));
  });

  it('the owner may pick themselves; an OUTLET_ADMIN may not change the owner (shop-wide flag)', async () => {
    setCaller('MERCHANT', { id: 3 });
    expect((await putMember(req('/api/attendance/members', { outletId: 1, userId: 3, required: true }))).status).toBe(200);
    setCaller('OUTLET_ADMIN', { id: 8 });
    const owner: any = await putMember(req('/api/attendance/members', { outletId: 1, userId: 3, required: true }));
    expect(owner.status).toBe(403);
    const self: any = await putMember(req('/api/attendance/members', { outletId: 1, userId: 8, required: true }));
    expect(self.status).toBe(200);
  });

  it('validation, another outlet, a user who is not a member, staff', async () => {
    setCaller('MERCHANT', { id: 3 });
    expect((await putMember(req('/api/attendance/members', { outletId: 1, userId: 7, required: 'yes' }))).status).toBe(400);
    expect((await putMember(req('/api/attendance/members', { outletId: 1, userId: 7 }))).status).toBe(400);
    const stranger: any = await putMember(req('/api/attendance/members', { outletId: 1, userId: 99, required: true }));
    expect(stranger.status).toBe(404);
    expect(stranger.body.code).toBe('USER_NOT_FOUND');
    mockDb.attendance.getUserInMerchant.mockResolvedValue({ ...byId(7), outletId: 2, merchantId: 2 });
    expect((await putMember(req('/api/attendance/members', { outletId: 1, userId: 7, required: true }))).status).toBe(404);
    setCaller('OUTLET_ADMIN', { id: 8 });
    expect((await putMember(req('/api/attendance/members', { outletId: 2, userId: 7, required: true }))).status).toBe(403);
    setCaller('OUTLET_STAFF', { id: 7 });
    expect((await putMember(req('/api/attendance/members', { outletId: 1, userId: 7, required: false }))).status).toBe(403);
    expect(mockDb.attendance.setRequired).not.toHaveBeenCalled();
  });
});

describe('GET /api/attendance/me adds required (#927)', () => {
  it.each([
    [7, 'OUTLET_STAFF', true],
    [12, 'OUTLET_STAFF', false],
    [8, 'OUTLET_ADMIN', false],
    [3, 'MERCHANT', false],
  ])('user %i (%s) → required %s', async (id, role, required) => {
    setCaller(role as string, { id: id as number });
    mockDb.attendance.lastRecord.mockResolvedValue(null);
    const res: any = await me(req('/api/attendance/me'));
    expect(res.status).toBe(200);
    expect(res.body.data.required).toBe(required);
    expect(res.body.data.enabled).toBe(true);
  });
});

describe('punch (#927): IN needs the flag, OUT closes an open record anyway', () => {
  const SHOP = { latitude: 10.7769, longitude: 106.7009 };
  const secret = () => process.env.JWT_SECRET as string;
  const setting = { id: 1, outletId: 1, merchantId: 2, latitude: SHOP.latitude, longitude: SHOP.longitude, radiusM: 100, qrMode: 'DAILY', qrVersion: 1 };
  const body = () => ({
    code: buildAttendanceQrCode({ outletId: 1, qrVersion: 1, qrMode: 'DAILY', now: new Date(), secret: secret() }).code,
    ...SHOP,
    accuracy: 10,
    isMock: false,
  });

  beforeEach(() => {
    mockDb.attendance.getSetting.mockResolvedValue(setting);
    mockDb.attendance.punch.mockImplementation(async (p: any) => ({
      action: p.open ? 'OUT' : 'IN',
      record: { id: 5, outletId: 1, userId: p.userId, dateKey: today, checkInAt: new Date(), checkOutAt: null, status: 'OPEN' },
    }));
  });

  it('not chosen, no open record → 403 ATTENDANCE_NOT_REQUIRED, nothing written', async () => {
    setCaller('OUTLET_STAFF', { id: 12 });
    const res: any = await punch(req('/api/attendance/punch', body()));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ATTENDANCE_NOT_REQUIRED');
    expect(mockDb.attendance.punch).not.toHaveBeenCalled();
    expect(mockDb.attendance.createScan).not.toHaveBeenCalled();
  });

  it('owner and outlet admin follow the role default (not chosen) unless picked', async () => {
    setCaller('OUTLET_ADMIN', { id: 8 });
    expect((await punch(req('/api/attendance/punch', body()))).body.code).toBe('ATTENDANCE_NOT_REQUIRED');
    setCaller('MERCHANT', { id: 3 });
    expect((await punch(req('/api/attendance/punch', body()))).body.code).toBe('ATTENDANCE_NOT_REQUIRED');
    mockDb.attendance.getUserInMerchant.mockResolvedValue({ ...byId(3), merchantId: 2, attendanceRequired: true });
    expect((await punch(req('/api/attendance/punch', body()))).status).toBe(200);
  });

  it('not chosen with an open record → the OUT goes through', async () => {
    setCaller('OUTLET_STAFF', { id: 12 });
    mockDb.attendance.findOpenRecord.mockResolvedValue({ id: 5, status: 'OPEN', userId: 12, outletId: 1, dateKey: today, checkInAt: new Date() });
    mockDb.attendance.punch.mockResolvedValue({
      action: 'OUT',
      record: { id: 5, outletId: 1, userId: 12, dateKey: today, checkInAt: new Date(Date.now() - 3600e3), checkOutAt: new Date(), status: 'DONE' },
    });
    const res: any = await punch(req('/api/attendance/punch', body()));
    expect(res.status).toBe(200);
    expect(res.body.data.action).toBe('OUT');
  });

  it('chosen staff (role default) → 200 IN', async () => {
    setCaller('OUTLET_STAFF', { id: 7 });
    expect((await punch(req('/api/attendance/punch', body()))).status).toBe(200);
  });
});

describe('scheduling a person who is not chosen → 409 ATTENDANCE_NOT_REQUIRED (#927)', () => {
  beforeEach(() => setCaller('MERCHANT', { id: 3 }));

  it('weekly rule: names who; nothing created', async () => {
    const res: any = await createRules(
      req('/api/attendance/shift-rules', { outletId: 1, templateId: 1, userIds: [7, 12, 8], weekdays: [1, 2, 3], startDate: inThreeDays })
    );
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ATTENDANCE_NOT_REQUIRED');
    expect(res.body.data).toEqual({
      users: [{ id: 12, name: 'Hoa Vo' }, { id: 8, name: 'Minh Ng' }],
      messageParams: { names: 'Hoa Vo, Minh Ng' },
    });
    expect(mockDb.attendance.createRules).not.toHaveBeenCalled();
    const ok: any = await createRules(
      req('/api/attendance/shift-rules', { outletId: 1, templateId: 1, userIds: [7, 11], weekdays: [1, 2, 3], startDate: inThreeDays })
    );
    expect(ok.status).toBe(200);
  });

  it('the owner can be scheduled once chosen (any outlet of the shop)', async () => {
    const before: any = await createRules(
      req('/api/attendance/shift-rules', { outletId: 1, templateId: 1, userIds: [3], weekdays: [1], startDate: inThreeDays })
    );
    expect(before.body.code).toBe('ATTENDANCE_NOT_REQUIRED');
    mockDb.attendance.getUserInMerchant.mockResolvedValue({ ...byId(3), merchantId: 2, attendanceRequired: true });
    setCaller('OUTLET_ADMIN', { id: 8 });
    const after: any = await createRules(
      req('/api/attendance/shift-rules', { outletId: 1, templateId: 1, userIds: [3], weekdays: [1], startDate: inThreeDays })
    );
    expect(after.status).toBe(200);
  });

  it('one-day change to a shift or custom hours → 409; "off" still allowed', async () => {
    const tpl: any = await putDay(req('/api/attendance/shifts/day', { outletId: 1, userId: 12, date: inThreeDays, templateId: 1 }));
    expect(tpl.status).toBe(409);
    expect(tpl.body.code).toBe('ATTENDANCE_NOT_REQUIRED');
    const custom: any = await putDay(
      req('/api/attendance/shifts/day', { outletId: 1, userId: 12, date: inThreeDays, custom: { startTime: '08:00', endTime: '12:00', breakMinutes: 0 } })
    );
    expect(custom.status).toBe(409);
    const off: any = await putDay(req('/api/attendance/shifts/day', { outletId: 1, userId: 12, date: inThreeDays, off: true }));
    expect(off.status).toBe(200);
    expect(mockDb.attendance.upsertDayChange).toHaveBeenCalledTimes(1);
  });

  it('changing a weekly rule of a person who is not chosen → 409', async () => {
    mockDb.attendance.getRule.mockResolvedValue({ id: 50, merchantId: 2, outletId: 1, userId: 12, templateId: 1, weekdays: [1], startDate: today, endDate: null });
    const res: any = await putRule(req('/api/attendance/shift-rules/50', { weekdays: [2], effectiveFrom: inThreeDays }), params({ id: '50' }));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ATTENDANCE_NOT_REQUIRED');
    expect(mockDb.attendance.replaceRule).not.toHaveBeenCalled();
  });
});

describe('lists follow the flag plus people with records in the period (#927)', () => {
  const rec = (userId: number, dateKey: string) => ({
    id: userId * 10, userId, outletId: 1, dateKey, status: 'DONE', shiftStart: null, shiftEnd: null, shiftBreak: null,
    checkInAt: new Date(`${dateKey}T01:00:00Z`), checkOutAt: new Date(`${dateKey}T05:00:00Z`), suspectedFake: false, suspectReasons: null, autoClosedAt: null,
  });

  it('Bảng công: chosen members + Hoa (not chosen) who has records this month; not Minh / owner', async () => {
    setCaller('MERCHANT', { id: 3 });
    mockDb.attendance.listRecords.mockResolvedValue([rec(12, `${month}-01`)]);
    mockDb.attendance.findUsersByIds.mockResolvedValue([]);
    const res: any = await timesheet(req(`/api/attendance/timesheet?outletId=1&month=${month}`));
    expect(res.status).toBe(200);
    expect(res.body.data.users.map((u: any) => u.userId)).toEqual([7, 11, 12]);
    expect(mockDb.attendance.listMembers).toHaveBeenCalledWith(1, 2);
  });

  it('Xếp ca (manager view): chosen members + people with records in from..to', async () => {
    setCaller('OUTLET_ADMIN', { id: 8 });
    mockDb.attendance.listRecords.mockResolvedValue([rec(8, today)]);
    const res: any = await getShifts(req(`/api/attendance/shifts?outletId=1&from=${today}&to=${inThreeDays}`));
    expect(res.status).toBe(200);
    expect(res.body.data.users.map((u: any) => u.id)).toEqual([7, 11, 8]);
    expect(mockDb.attendance.listRecords).toHaveBeenCalledWith(expect.objectContaining({ outletId: 1, from: today, to: inThreeDays }));
  });

  it('a person asking for their own week still gets it (no list filter for userId / staff)', async () => {
    setCaller('OUTLET_STAFF', { id: 12 });
    const res: any = await getShifts(req(`/api/attendance/shifts?outletId=1&from=${today}&to=${today}`));
    expect(res.status).toBe(200);
    expect(res.body.data.users.map((u: any) => u.id)).toEqual([12]);
  });
});

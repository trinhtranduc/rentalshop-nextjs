/**
 * #907 shift templates, weekly rules, one-day changes and the SHIFT_CHANGED notification.
 * Spec rules 19-24, 33.
 */
jest.mock('next/server', () => require('../helpers/attendance-route-mocks').nextServerModule);
jest.mock('@rentalshop/auth/server', () => require('../helpers/attendance-route-mocks').authServerModule);
jest.mock('@rentalshop/database', () => ({
  ...require('../helpers/attendance-route-mocks').databaseModule,
  createNotificationsForUsers: (...args: any[]) => mockCreateNotifications(...args),
}));
jest.mock('@rentalshop/utils', () => require('../helpers/attendance-route-mocks').utilsModule());
const mockCreateNotifications = jest.fn(async (ids: number[]) => ids.length);
const mockSendPush = jest.fn(async () => ({ sent: 0, failed: 0 }));
jest.mock('../../apps/api/lib/push-notifications', () => ({
  sendPushToUsers: (...args: any[]) => (mockSendPush as any)(...args),
}));

import { mockDb, params, req, resetAttendanceMocks, setCaller } from '../helpers/attendance-route-mocks';
import { addDaysToDateKey, formatDateKeyInTimeZone } from '../../packages/utils/src/core/date-range';
import { POST as createRules } from '../../apps/api/app/api/attendance/shift-rules/route';
import { PUT as putRule, DELETE as deleteRule } from '../../apps/api/app/api/attendance/shift-rules/[id]/route';
import { POST as stopRule } from '../../apps/api/app/api/attendance/shift-rules/[id]/stop/route';
import { PUT as putDay } from '../../apps/api/app/api/attendance/shifts/day/route';
import { GET as getShifts } from '../../apps/api/app/api/attendance/shifts/route';
import { DELETE as deleteTemplate, PATCH as patchTemplate } from '../../apps/api/app/api/attendance/shift-templates/[id]/route';
import { POST as createTemplate } from '../../apps/api/app/api/attendance/shift-templates/route';

const today = formatDateKeyInTimeZone(new Date(), 'Asia/Ho_Chi_Minh');
const yesterday = addDaysToDateKey(today, -1);
const inThreeDays = addDaysToDateKey(today, 3);

const T1 = { id: 1, merchantId: 2, outletId: 1, name: 'Ca sáng', startTime: '08:00', endTime: '12:00', breakMinutes: 0, color: 'blue', isActive: true };
const T2 = { id: 2, merchantId: 2, outletId: 1, name: 'Ca chiều', startTime: '13:00', endTime: '17:30', breakMinutes: 30, color: 'orange', isActive: true };

describe('shift templates (#907 rule 19)', () => {
  beforeEach(() => {
    resetAttendanceMocks();
    setCaller('OUTLET_ADMIN', { id: 8 });
    mockDb.attendance.getTemplate.mockImplementation(async (id: number, merchantId: number) =>
      merchantId === 2 ? [T1, T2].find((t) => t.id === id) ?? null : null
    );
  });

  it('create validates HH:mm, break and color', async () => {
    mockDb.attendance.createTemplate.mockImplementation(async (d: any) => ({ id: 3, ...d }));
    const bad: any = await createTemplate(
      req('/api/attendance/shift-templates', { outletId: 1, name: 'X', startTime: '8:00', endTime: '12:00', breakMinutes: 0, color: 'blue' })
    );
    expect(bad.status).toBe(400);
    const ok: any = await createTemplate(
      req('/api/attendance/shift-templates', { outletId: 1, name: 'Ca đêm', startTime: '22:00', endTime: '06:00', breakMinutes: 30, color: 'purple' })
    );
    expect(ok.status).toBe(200);
    expect(mockDb.attendance.createTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ merchantId: 2, outletId: 1, name: 'Ca đêm', startTime: '22:00', endTime: '06:00' })
    );
  });

  it('staff cannot manage templates', async () => {
    setCaller('OUTLET_STAFF', { id: 7 });
    const res: any = await createTemplate(
      req('/api/attendance/shift-templates', { outletId: 1, name: 'X', startTime: '08:00', endTime: '12:00', breakMinutes: 0, color: 'blue' })
    );
    expect(res.status).toBe(403);
  });

  it('DELETE a used template → 409 SHIFT_TEMPLATE_IN_USE; unused is deleted', async () => {
    mockDb.attendance.isTemplateUsed.mockResolvedValue(true);
    const res: any = await deleteTemplate(req('/api/attendance/shift-templates/1'), params({ id: '1' }));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SHIFT_TEMPLATE_IN_USE');
    expect(mockDb.attendance.deleteTemplate).not.toHaveBeenCalled();

    mockDb.attendance.isTemplateUsed.mockResolvedValue(false);
    const ok: any = await deleteTemplate(req('/api/attendance/shift-templates/1'), params({ id: '1' }));
    expect(ok.status).toBe(200);
    expect(mockDb.attendance.deleteTemplate).toHaveBeenCalledWith(1);
  });

  it('PATCH isActive hides a template; another merchant template → 404', async () => {
    mockDb.attendance.updateTemplate.mockImplementation(async (id: number, d: any) => ({ ...T1, ...d }));
    const ok: any = await patchTemplate(req('/api/attendance/shift-templates/1', { isActive: false }), params({ id: '1' }));
    expect(ok.status).toBe(200);
    expect(mockDb.attendance.updateTemplate).toHaveBeenCalledWith(1, { isActive: false });
    const missing: any = await patchTemplate(req('/api/attendance/shift-templates/9', { isActive: false }), params({ id: '9' }));
    expect(missing.status).toBe(404);
  });
});

describe('weekly rules (#907 rules 20, 22, 24)', () => {
  beforeEach(() => {
    resetAttendanceMocks();
    setCaller('MERCHANT');
    mockDb.attendance.getTemplate.mockImplementation(async (id: number) => [T1, T2].find((t) => t.id === id) ?? null);
    mockDb.attendance.listRules.mockResolvedValue([]);
    mockDb.attendance.createRules.mockImplementation(async (rows: any[]) => rows.map((r, i) => ({ id: 100 + i, ...r })));
  });

  const ruleBody = (over: any = {}) => ({
    outletId: 1,
    templateId: 1,
    userIds: [7],
    weekdays: [1, 2, 3, 4, 5, 6, 7],
    startDate: today,
    ...over,
  });

  it('startDate before today (VN) → 409 SHIFT_LOCKED', async () => {
    const res: any = await createRules(req('/api/attendance/shift-rules', ruleBody({ startDate: yesterday })));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SHIFT_LOCKED');
    expect(mockDb.attendance.createRules).not.toHaveBeenCalled();
  });

  it('overlapping times with another rule of the same user on a shared weekday → 409 SHIFT_OVERLAP', async () => {
    mockDb.attendance.listRules.mockResolvedValue([
      { id: 50, userId: 7, outletId: 1, templateId: 1, weekdays: [3], startDate: '2026-01-01', endDate: null },
    ]);
    const res: any = await createRules(req('/api/attendance/shift-rules', ruleBody()));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SHIFT_OVERLAP');
    // an afternoon rule does not overlap a morning one
    const ok: any = await createRules(req('/api/attendance/shift-rules', ruleBody({ templateId: 2 })));
    expect(ok.status).toBe(200);
  });

  it('one rule row per user; users must belong to the outlet (else 404)', async () => {
    const res: any = await createRules(req('/api/attendance/shift-rules', ruleBody({ userIds: [7, 8] })));
    expect(res.status).toBe(200);
    expect(mockDb.attendance.createRules.mock.calls[0][0]).toHaveLength(2);
    const bad: any = await createRules(req('/api/attendance/shift-rules', ruleBody({ userIds: [7, 99] })));
    expect(bad.status).toBe(404);
  });

  it('a change in the coming days notifies each affected user (row + push, string data)', async () => {
    mockDb.attendance.getScheduleData
      .mockResolvedValueOnce({ rules: [], dayChanges: [], templates: [T1, T2] })
      .mockResolvedValueOnce({
        rules: [{ id: 100, userId: 7, templateId: 1, weekdays: [1, 2, 3, 4, 5, 6, 7], startDate: inThreeDays, endDate: null }],
        dayChanges: [],
        templates: [T1, T2],
      });
    const res: any = await createRules(req('/api/attendance/shift-rules', ruleBody({ startDate: inThreeDays })));
    expect(res.status).toBe(200);
    expect(mockCreateNotifications).toHaveBeenCalledTimes(1);
    const [ids, input] = mockCreateNotifications.mock.calls[0] as any[];
    expect(ids).toEqual([7]);
    expect(input.type).toBe('SHIFT_CHANGED');
    expect(input.title).toBe('Lịch ca thay đổi');
    expect(input.body).toMatch(/Ca sáng 08:00–12:00/);
    for (const v of Object.values(input.data)) expect(typeof v).toBe('string');
    expect(input.data.outletId).toBe('1');
    expect(input.data.dates.split(',')[0]).toBe(inThreeDays);
    expect(mockSendPush).toHaveBeenCalledWith([7], expect.objectContaining({ title: 'Lịch ca thay đổi' }));
  });

  it('no visible change in the coming days → no notification', async () => {
    mockDb.attendance.getScheduleData.mockResolvedValue({ rules: [], dayChanges: [], templates: [T1, T2] });
    const res: any = await createRules(req('/api/attendance/shift-rules', ruleBody({ startDate: addDaysToDateKey(today, 40) })));
    expect(res.status).toBe(200);
    expect(mockCreateNotifications).not.toHaveBeenCalled();
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('PUT ends the old rule the day before effectiveFrom and starts a new one; past effectiveFrom → SHIFT_LOCKED', async () => {
    const rule = { id: 50, merchantId: 2, userId: 7, outletId: 1, templateId: 1, weekdays: [1, 2, 3], startDate: '2026-01-01', endDate: null };
    mockDb.attendance.getRule.mockResolvedValue(rule);
    mockDb.attendance.replaceRule.mockResolvedValue({ old: { ...rule, endDate: addDaysToDateKey(inThreeDays, -1) }, created: { ...rule, id: 51, templateId: 2, startDate: inThreeDays } });
    const locked: any = await putRule(req('/api/attendance/shift-rules/50', { templateId: 2, effectiveFrom: yesterday }), params({ id: '50' }));
    expect(locked.status).toBe(409);
    expect(locked.body.code).toBe('SHIFT_LOCKED');
    const ok: any = await putRule(req('/api/attendance/shift-rules/50', { templateId: 2, effectiveFrom: inThreeDays }), params({ id: '50' }));
    expect(ok.status).toBe(200);
    expect(mockDb.attendance.replaceRule).toHaveBeenCalledWith(
      50,
      addDaysToDateKey(inThreeDays, -1),
      expect.objectContaining({ templateId: 2, weekdays: [1, 2, 3], startDate: inThreeDays, endDate: null, userId: 7 })
    );
  });

  it('stop needs lastDate ≥ today; DELETE ends a running rule yesterday and removes a future one', async () => {
    const running = { id: 50, merchantId: 2, userId: 7, outletId: 1, templateId: 1, weekdays: [1], startDate: '2026-01-01', endDate: null };
    mockDb.attendance.getRule.mockResolvedValue(running);
    mockDb.attendance.updateRule.mockImplementation(async (id: number, d: any) => ({ ...running, ...d }));
    const locked: any = await stopRule(req('/api/attendance/shift-rules/50/stop', { lastDate: yesterday }), params({ id: '50' }));
    expect(locked.body.code).toBe('SHIFT_LOCKED');
    const stopped: any = await stopRule(req('/api/attendance/shift-rules/50/stop', { lastDate: inThreeDays }), params({ id: '50' }));
    expect(stopped.status).toBe(200);
    expect(mockDb.attendance.updateRule).toHaveBeenCalledWith(50, { endDate: inThreeDays });

    mockDb.attendance.updateRule.mockClear();
    await deleteRule(req('/api/attendance/shift-rules/50'), params({ id: '50' }));
    expect(mockDb.attendance.updateRule).toHaveBeenCalledWith(50, { endDate: yesterday });

    mockDb.attendance.getRule.mockResolvedValue({ ...running, startDate: inThreeDays });
    await deleteRule(req('/api/attendance/shift-rules/50'), params({ id: '50' }));
    expect(mockDb.attendance.deleteRule).toHaveBeenCalledWith(50);
  });

  it('another merchant rule → 404', async () => {
    mockDb.attendance.getRule.mockResolvedValue(null);
    const res: any = await stopRule(req('/api/attendance/shift-rules/77/stop', { lastDate: inThreeDays }), params({ id: '77' }));
    expect(res.status).toBe(404);
  });
});

describe('one-day changes and the schedule view (#907 rules 21-23)', () => {
  beforeEach(() => {
    resetAttendanceMocks();
    setCaller('OUTLET_ADMIN', { id: 8 });
    mockDb.attendance.getTemplate.mockImplementation(async (id: number) => [T1, T2].find((t) => t.id === id) ?? null);
    mockDb.attendance.upsertDayChange.mockImplementation(async (d: any) => ({ id: 1, ...d }));
  });

  it('a past day → 409 SHIFT_LOCKED', async () => {
    const res: any = await putDay(req('/api/attendance/shifts/day', { outletId: 1, userId: 7, date: yesterday, off: true }));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SHIFT_LOCKED');
  });

  it('a worked day (record today) → 409 SHIFT_LOCKED', async () => {
    mockDb.attendance.workedDays.mockResolvedValue([`7:${today}`]);
    const res: any = await putDay(req('/api/attendance/shifts/day', { outletId: 1, userId: 7, date: today, templateId: 2 }));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SHIFT_LOCKED');
  });

  it('a future day: template, custom hours or off; exactly one of them', async () => {
    const t: any = await putDay(req('/api/attendance/shifts/day', { outletId: 1, userId: 7, date: inThreeDays, templateId: 2 }));
    expect(t.status).toBe(200);
    expect(mockDb.attendance.upsertDayChange).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 7, dateKey: inThreeDays, off: false, templateId: 2, merchantId: 2, outletId: 1, createdById: 8 })
    );
    const c: any = await putDay(
      req('/api/attendance/shifts/day', { outletId: 1, userId: 7, date: inThreeDays, custom: { startTime: '09:00', endTime: '11:00', breakMinutes: 0 } })
    );
    expect(c.status).toBe(200);
    const both: any = await putDay(req('/api/attendance/shifts/day', { outletId: 1, userId: 7, date: inThreeDays, templateId: 2, off: true }));
    expect(both.status).toBe(400);
  });

  it('staff: own schedule only; another user → 403', async () => {
    setCaller('OUTLET_STAFF', { id: 7 });
    mockDb.attendance.getScheduleData.mockResolvedValue({
      rules: [{ id: 1, userId: 7, templateId: 1, weekdays: [1, 2, 3, 4, 5, 6, 7], startDate: today, endDate: null }],
      dayChanges: [],
      templates: [T1],
    });
    const other: any = await getShifts(req(`/api/attendance/shifts?outletId=1&from=${today}&to=${today}&userId=8`));
    expect(other.status).toBe(403);
    const own: any = await getShifts(req(`/api/attendance/shifts?outletId=1&from=${today}&to=${inThreeDays}`));
    expect(own.status).toBe(200);
    expect(own.body.data.items.every((i: any) => i.userId === 7)).toBe(true);
    expect(own.body.data.items[0].shifts[0]).toEqual(
      expect.objectContaining({ templateId: 1, name: 'Ca sáng', start: '08:00', end: '12:00', color: 'blue', source: 'RULE', locked: false })
    );
    const staffChange: any = await putDay(req('/api/attendance/shifts/day', { outletId: 1, userId: 7, date: inThreeDays, off: true }));
    expect(staffChange.status).toBe(403);
  });

  it('range over 62 days → 400; another merchant outlet → 404', async () => {
    setCaller('MERCHANT');
    const long: any = await getShifts(req(`/api/attendance/shifts?outletId=1&from=${today}&to=${addDaysToDateKey(today, 62)}`));
    expect(long.status).toBe(400);
    const other: any = await getShifts(req(`/api/attendance/shifts?outletId=55&from=${today}&to=${today}`));
    expect(other.status).toBe(404);
  });
});

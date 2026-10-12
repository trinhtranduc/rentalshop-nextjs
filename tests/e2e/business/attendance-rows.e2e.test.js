/**
 * BF-ATT-R — #918 attendance additive API fields through the real API on the local seeded database.
 * - Person month: every row has `dateKey`; a manual record of an earlier day added today sits on its work day
 *   (its EDIT row keeps `at` = the time of the edit).
 * - SHIFT_LOCKED says who: a weekly rule from today for someone who already worked today → 409 with
 *   `data.users` (id, name), `data.dates`, `data.messageParams.names`.
 * Subject: the Nhân viên kho (OUTLET_INVENTORY) of the staff outlet, so BF-ATT (staff) is not disturbed.
 * Runs under TZ=UTC and TZ=Asia/Ho_Chi_Minh on the same database; every check holds on a second run.
 */
const { Session, describeE2E, must, request, vnDateKey, addDays, vnAt } = require('../helpers/api');
const S = require('../helpers/subscription');

describeE2E('BF-ATT-R attendance rows by work day and SHIFT_LOCKED names (#918)', () => {
  let admin;
  let s;
  let worker;
  let merchantId;
  let outletId;
  const today = vnDateKey();
  const workDay = addDays(today, -3);
  const month = workDay.slice(0, 7);

  const setModule = (enabled, endDate) =>
    admin.put(`/api/merchants/${merchantId}/modules/attendance`, endDate === undefined ? { enabled } : { enabled, endDate });

  beforeAll(async () => {
    s = await Session.login('merchant');
    worker = await Session.login('inventory');
    admin = await S.login({ email: 'admin@rentalshop.com', password: 'admin123' }, S.WEB_HEADERS);
    merchantId = s.user.merchantId;
    outletId = worker.user.outletId;
    expect((await setModule(true, null)).status).toBe(200);
  });

  afterAll(async () => {
    if (admin && merchantId) await setModule(false, null);
  });

  test('BF-ATT-R01 a manual record of an earlier day sits on its work day; every row has dateKey', async () => {
    const created = await must(
      s.post('/api/attendance/records', {
        outletId,
        userId: worker.user.id,
        checkInAt: vnAt(workDay, '08:00').toISOString(),
        checkOutAt: vnAt(workDay, '17:30').toISOString(),
        reason: 'e2e #918 quên quét',
      }),
      'add record'
    );
    expect(created.dateKey).toBe(workDay);

    const detail = await must(s.get(`/api/attendance/people/${worker.user.id}/month?outletId=${outletId}&month=${month}`), 'person month');
    expect(detail.rows.length).toBeGreaterThan(0);
    for (const r of detail.rows) expect(r.dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const edit = detail.rows.find((r) => r.kind === 'EDIT' && r.recordId === created.id);
    expect(edit).toBeDefined();
    expect(edit.dateKey).toBe(workDay);
    // `at` keeps its meaning: the time of the edit (today), not the work day
    expect(vnDateKey(new Date(edit.at))).toBe(today);
    // the worker reads the same rows for themselves
    const own = await must(worker.get(`/api/attendance/people/${worker.user.id}/month?outletId=${outletId}&month=${month}`), 'own month');
    expect(own.rows.find((r) => r.kind === 'EDIT' && r.recordId === created.id).dateKey).toBe(workDay);
  });

  test('BF-ATT-R02 SHIFT_LOCKED from today names who already worked today', async () => {
    await must(
      s.post('/api/attendance/records', {
        outletId,
        userId: worker.user.id,
        checkInAt: vnAt(today, '00:05').toISOString(),
        checkOutAt: vnAt(today, '00:10').toISOString(),
        reason: 'e2e #918 đã vào ca hôm nay',
      }),
      'record today'
    );
    const tpl = await must(
      s.post('/api/attendance/shift-templates', { outletId, name: 'Ca e2e 918', startTime: '08:00', endTime: '12:00', breakMinutes: 0, color: 'blue' }),
      'template'
    );
    const res = await s.post('/api/attendance/shift-rules', {
      outletId,
      templateId: tpl.id,
      userIds: [worker.user.id],
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      startDate: today,
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SHIFT_LOCKED');
    expect(res.body.data.dates).toEqual([today]);
    expect(res.body.data.users).toEqual([{ id: worker.user.id, name: expect.any(String) }]);
    expect(res.body.data.users[0].name.length).toBeGreaterThan(0);
    expect(res.body.data.messageParams).toEqual({ names: res.body.data.users[0].name });

    // a past day lists the users of the request
    const past = await s.post('/api/attendance/shift-rules', {
      outletId,
      templateId: tpl.id,
      userIds: [worker.user.id],
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      startDate: addDays(today, -1),
    });
    expect(past.status).toBe(409);
    expect(past.body.data).toEqual(expect.objectContaining({ dates: [addDays(today, -1)], users: [expect.objectContaining({ id: worker.user.id })] }));

    // tomorrow is open; then clean up so a second run starts the same way
    const ok = await must(
      s.post('/api/attendance/shift-rules', {
        outletId,
        templateId: tpl.id,
        userIds: [worker.user.id],
        weekdays: [1, 2, 3, 4, 5, 6, 7],
        startDate: addDays(today, 1),
      }),
      'rule from tomorrow'
    );
    for (const rule of ok) await must(request(s.token, 'DELETE', `/api/attendance/shift-rules/${rule.id}`), 'delete rule');
    await must(request(s.token, 'DELETE', `/api/attendance/shift-templates/${tpl.id}`), 'delete template');
  });
});

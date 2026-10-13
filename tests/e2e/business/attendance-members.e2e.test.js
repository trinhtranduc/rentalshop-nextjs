/**
 * BF-ATT-M — #927 the shop picks who must clock in, through the real API on the local seeded database.
 * A fresh shop (createWorld): owner, staff, kho, an outlet admin and a second staff. Defaults by role
 * (staff / kho yes, outlet admin / owner no), PUT stores the choice (back to the role default = isDefault),
 * /me.required, punch IN 403 / OUT of an open record allowed, scheduling 409, Xếp ca / Bảng công lists.
 * Runs under TZ=UTC and TZ=Asia/Ho_Chi_Minh on the same database: every run builds its own shop.
 */
const { describeE2E, must, vnDateKey, addDays } = require('../helpers/api');
const S = require('../helpers/subscription');

const SHOP = { latitude: 10.7769, longitude: 106.7009 };
const brief = (r) => ({ status: r.status, code: r.body?.code });

describeE2E('BF-ATT-M who must clock in (#927)', () => {
  let world;
  let admin;
  let m;
  let oa;
  let st;
  let st2;
  let kho;
  let ids;
  let code;
  let templateId;
  const today = vnDateKey();
  const tomorrow = addDays(today, 1);
  const month = today.slice(0, 7);
  const all = [1, 2, 3, 4, 5, 6, 7];
  const punch = (session) => session.post('/api/attendance/punch', { code, ...SHOP, accuracy: 12, isMock: false });
  const members = async (session = m) => (await must(session.get(`/api/attendance/members?outletId=${world.outletId}`), 'members')).items;
  const pick = (session, userId, required) => session.put('/api/attendance/members', { outletId: world.outletId, userId, required });

  beforeAll(async () => {
    world = S.createWorld('ATTM', { limits: { outlets: 2, users: 10 } });
    const id = world.id;
    world.oa = { email: `sub.${id}.oa@e2e.test`, password: S.PASSWORD };
    world.staff2 = { email: `sub.${id}.staff2@e2e.test`, password: S.PASSWORD };
    S.createUser(world.merchantId, world.outletId, 'OUTLET_ADMIN', world.oa.email, 'Quanly');
    S.createUser(world.merchantId, world.outletId, 'OUTLET_STAFF', world.staff2.email, 'Nhanvien2');
    admin = await S.login({ email: 'admin@rentalshop.com', password: 'admin123' }, S.WEB_HEADERS);
    m = await S.login(world.merchant);
    oa = await S.login(world.oa);
    st = await S.login(world.staff);
    st2 = await S.login(world.staff2);
    kho = await S.login(world.kho);
    ids = { m: m.user.id, oa: oa.user.id, st: st.user.id, st2: st2.user.id, kho: kho.user.id };
    await must(admin.put(`/api/merchants/${world.merchantId}/modules/attendance`, { enabled: true }), 'module on');
    code = (await must(m.post('/api/attendance/settings/qr', { outletId: world.outletId }), 'qr')).qr.code;
    await must(m.put('/api/attendance/settings', { outletId: world.outletId, ...SHOP, radiusM: 100 }), 'location');
    templateId = (
      await must(
        m.post('/api/attendance/shift-templates', { outletId: world.outletId, name: 'Ca sáng M', startTime: '08:00', endTime: '12:00', breakMinutes: 0, color: 'blue' }),
        'template'
      )
    ).id;
  });

  afterAll(async () => {
    if (admin && world) await admin.put(`/api/merchants/${world.merchantId}/modules/attendance`, { enabled: false });
  });

  test('BF-ATT-M01 defaults by role: staff / kho chosen, outlet admin / owner not; isDefault everywhere', async () => {
    const items = await members();
    const of = (id) => items.find((x) => x.userId === id);
    expect(of(ids.st)).toMatchObject({ role: 'OUTLET_STAFF', required: true, isDefault: true });
    expect(of(ids.kho)).toMatchObject({ role: 'OUTLET_INVENTORY', required: true, isDefault: true });
    expect(of(ids.oa)).toMatchObject({ role: 'OUTLET_ADMIN', required: false, isDefault: true });
    expect(of(ids.m)).toMatchObject({ role: 'MERCHANT', required: false, isDefault: true });
    for (const x of items) expect(Object.keys(x).sort()).toEqual(['isDefault', 'name', 'required', 'role', 'userId']);
    // staff / kho first, then outlet admin, then owner
    expect(items.map((x) => x.role)).toEqual(['OUTLET_STAFF', 'OUTLET_INVENTORY', 'OUTLET_STAFF', 'OUTLET_ADMIN', 'MERCHANT']);
    expect((await must(st.get('/api/attendance/me'), 'me st')).required).toBe(true);
    expect((await must(oa.get('/api/attendance/me'), 'me oa')).required).toBe(false);
    expect((await must(m.get('/api/attendance/me'), 'me m')).required).toBe(false);
  });

  test('BF-ATT-M02 permissions: staff 403; OUTLET_ADMIN own outlet, not the owner row', async () => {
    expect((await st.get(`/api/attendance/members?outletId=${world.outletId}`)).status).toBe(403);
    expect((await pick(kho, ids.kho, false)).status).toBe(403);
    expect((await members(oa)).length).toBe(5);
    expect(brief(await pick(oa, ids.m, true))).toEqual({ status: 403, code: 'INSUFFICIENT_PERMISSIONS' });
    expect(brief(await pick(m, 999999999, true))).toEqual({ status: 404, code: 'USER_NOT_FOUND' });
    expect((await pick(m, ids.st, 'yes')).status).toBe(400);
  });

  test('BF-ATT-M03 not chosen: punch IN 403, scheduling 409 with names; Xếp ca / Bảng công leave them out', async () => {
    const off = await must(pick(oa, ids.st2, false), 'st2 off');
    expect(off).toMatchObject({ userId: ids.st2, required: false, isDefault: false });
    expect((await must(st2.get('/api/attendance/me'), 'me st2')).required).toBe(false);
    expect(brief(await punch(st2))).toEqual({ status: 403, code: 'ATTENDANCE_NOT_REQUIRED' });
    expect(brief(await punch(oa))).toEqual({ status: 403, code: 'ATTENDANCE_NOT_REQUIRED' });

    const rule = await m.post('/api/attendance/shift-rules', { outletId: world.outletId, templateId, userIds: [ids.st, ids.st2], weekdays: all, startDate: tomorrow });
    expect(brief(rule)).toEqual({ status: 409, code: 'ATTENDANCE_NOT_REQUIRED' });
    expect(rule.body.data.users).toEqual([{ id: ids.st2, name: 'Nhanvien2 E2E' }]);
    expect(rule.body.data.messageParams).toEqual({ names: 'Nhanvien2 E2E' });
    expect(brief(await oa.put('/api/attendance/shifts/day', { outletId: world.outletId, userId: ids.st2, date: tomorrow, templateId }))).toEqual({
      status: 409,
      code: 'ATTENDANCE_NOT_REQUIRED',
    });
    expect((await oa.put('/api/attendance/shifts/day', { outletId: world.outletId, userId: ids.st2, date: tomorrow, off: true })).status).toBe(200);

    const week = await must(m.get(`/api/attendance/shifts?outletId=${world.outletId}&from=${today}&to=${addDays(today, 6)}`), 'shifts');
    expect(week.users.map((u) => u.id).sort((a, b) => a - b)).toEqual([ids.st, ids.kho].sort((a, b) => a - b));
    const sheet = await must(m.get(`/api/attendance/timesheet?outletId=${world.outletId}&month=${month}`), 'sheet');
    expect(sheet.users.map((u) => u.userId).sort((a, b) => a - b)).toEqual([ids.st, ids.kho].sort((a, b) => a - b));
  });

  test('BF-ATT-M04 chosen again: back to the role default; owner chosen → in the lists, punches, can be scheduled', async () => {
    const back = await must(pick(m, ids.st2, true), 'st2 back');
    expect(back).toMatchObject({ required: true, isDefault: true });
    await must(m.post('/api/attendance/shift-rules', { outletId: world.outletId, templateId, userIds: [ids.st2], weekdays: [1], startDate: tomorrow }), 'rule st2');

    expect(await must(pick(m, ids.m, true), 'owner on')).toMatchObject({ required: true, isDefault: false });
    expect((await must(m.get('/api/attendance/me'), 'me m')).required).toBe(true);
    await must(oa.post('/api/attendance/shift-rules', { outletId: world.outletId, templateId, userIds: [ids.m], weekdays: [2], startDate: tomorrow }), 'rule owner by oa');
    const inRes = await must(punch(m), 'owner in');
    expect(inRes.action).toBe('IN');
    const week = await must(oa.get(`/api/attendance/shifts?outletId=${world.outletId}&from=${today}&to=${addDays(today, 6)}`), 'shifts');
    expect(week.users.map((u) => u.id)).toEqual(expect.arrayContaining([ids.st, ids.kho, ids.st2, ids.m]));
    expect(week.users.map((u) => u.id)).not.toContain(ids.oa);

    // un-pick the owner while their record is open: the OUT still closes it; the day stays in Bảng công
    await must(pick(m, ids.m, false), 'owner off');
    expect(brief(await punch(m)).status).toBe(200);
    const sheet = await must(m.get(`/api/attendance/timesheet?outletId=${world.outletId}&month=${month}`), 'sheet');
    expect(sheet.users.map((u) => u.userId)).toEqual(expect.arrayContaining([ids.m, ids.st, ids.kho, ids.st2]));
    expect(sheet.users.map((u) => u.userId)).not.toContain(ids.oa);
    expect(brief(await punch(m))).toEqual({ status: 403, code: 'ATTENDANCE_NOT_REQUIRED' });
  });
});

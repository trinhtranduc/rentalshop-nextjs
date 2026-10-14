/**
 * BF-ATT — attendance module part 1 (#907) through the real API on the local seeded database.
 * Module switch (admin) → outlet location, QR (daily / fixed, new code kills the old), kiosk link →
 * punch checks (mock, QR, wrong outlet, GPS, distance) and IN / OUT → timesheet, person month, edits with a
 * reason, month lock, export → shift templates, weekly rules, one-day changes, locks, SHIFT_CHANGED inbox row.
 * Runs twice on the same database (TZ=UTC and TZ=Asia/Ho_Chi_Minh): the first step removes the staff's rules.
 */
const { Session, describeE2E, must, request, vnDateKey, addDays } = require('../helpers/api');
const S = require('../helpers/subscription');

const SHOP = { latitude: 10.7769, longitude: 106.7009 };
const brief = (r) => ({ status: r.status, code: r.body?.code });

describeE2E('BF-ATT attendance module (#907)', () => {
  let admin;
  let s;
  let staff;
  let merchantId;
  let outletId;
  let otherOutletId = null;
  let code;
  let kioskToken;
  let recordId;
  let templateId;
  const today = vnDateKey();
  const tomorrow = addDays(today, 1);
  const month = today.slice(0, 7);

  const punch = (session, over = {}) =>
    session.post('/api/attendance/punch', { code, ...SHOP, accuracy: 12, isMock: false, ...over });
  const setModule = (enabled, endDate) =>
    admin.put(`/api/merchants/${merchantId}/modules/attendance`, endDate === undefined ? { enabled } : { enabled, endDate });

  beforeAll(async () => {
    s = await Session.login('merchant');
    staff = await Session.login('staff');
    admin = await S.login({ email: 'admin@rentalshop.com', password: 'admin123' }, S.WEB_HEADERS);
    merchantId = s.user.merchantId;
    outletId = staff.user.outletId;
    const outlets = await must(s.get('/api/outlets?limit=50'), 'outlets');
    const list = outlets.outlets || outlets.items || outlets;
    otherOutletId = (list.find((o) => o.id !== outletId && o.isActive !== false) || {}).id || null;
  });

  afterAll(async () => {
    if (admin && merchantId) await setModule(false, null);
  });

  test('BF-ATT-01 module off: every attendance route answers 403 MODULE_NOT_ENABLED', async () => {
    expect((await setModule(false, null)).status).toBe(200);
    for (const r of [
      await s.get(`/api/attendance/settings?outletId=${outletId}`),
      await staff.get('/api/attendance/me'),
      await punch(staff, { code: 'a1.1.1.F.0.x' }),
    ]) {
      expect(brief(r)).toEqual({ status: 403, code: 'MODULE_NOT_ENABLED' });
    }
    const profile = await must(staff.get('/api/users/profile'), 'profile');
    // #967: the seed plan has loyalty, so `modules` may list 'loyalty' too; attendance is what this case checks
    expect(profile.merchant.modules).not.toContain('attendance');
  });

  test('BF-ATT-02 only ADMIN switches it; OPS-like roles and the merchant cannot; profile lists it', async () => {
    const byMerchant = await s.put(`/api/merchants/${merchantId}/modules/attendance`, { enabled: true });
    expect(byMerchant.status).toBe(403);
    const on = await setModule(true, addDays(today, 30));
    expect(on.status).toBe(200);
    expect(on.body.data).toMatchObject({ key: 'attendance', enabled: true, endDate: addDays(today, 30), active: true });
    const listed = await must(admin.get(`/api/merchants/${merchantId}/modules`), 'modules');
    expect(listed).toEqual([{ key: 'attendance', enabled: true, endDate: addDays(today, 30), active: true }]);
    const profile = await must(staff.get('/api/users/profile'), 'profile');
    expect(profile.merchant.modules).toContain('attendance');
    // an end date in the past switches it off
    await setModule(true, addDays(today, -1));
    expect((await staff.get('/api/attendance/me')).status).toBe(403);
    await setModule(true, null);
  });

  test('BF-ATT-03 clean start: earlier rules of the staff are removed or ended', async () => {
    const rules = await must(s.get(`/api/attendance/shift-rules?outletId=${outletId}`), 'rules');
    for (const r of rules.filter((x) => x.userId === staff.user.id && (!x.endDate || x.endDate >= today))) {
      expect((await request(s.token, 'DELETE', `/api/attendance/shift-rules/${r.id}`)).status).toBe(200);
    }
    await request(s.token, 'DELETE', `/api/attendance/shifts/day?outletId=${outletId}&userId=${staff.user.id}&date=${tomorrow}`);
  });

  test('BF-ATT-04 outlet location: MERCHANT sets it; staff cannot read settings', async () => {
    const saved = await must(s.put('/api/attendance/settings', { outletId, ...SHOP, radiusM: 100 }), 'settings');
    expect(saved).toMatchObject({ outletId, latitude: SHOP.latitude, longitude: SHOP.longitude, radiusM: 100 });
    expect((await staff.get(`/api/attendance/settings?outletId=${outletId}`)).status).toBe(403);
    expect(brief(await s.put('/api/attendance/settings', { outletId, radiusM: 20 })).status).toBe(400);
  });

  test('BF-ATT-05 kiosk link without a QR → 422; QR made → kiosk shows the same code', async () => {
    const withLink = await must(s.post('/api/attendance/settings/kiosk-link', { outletId }), 'kiosk link');
    kioskToken = withLink.kioskToken;
    expect(kioskToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const before = await request(null, 'GET', '/api/attendance/kiosk/qr', { headers: { 'X-Kiosk-Token': kioskToken } });
    if (!withLink.qr.generated) expect(brief(before)).toEqual({ status: 422, code: 'ATTENDANCE_NOT_CONFIGURED' });
    if (withLink.qrMode !== 'DAILY') await must(s.put('/api/attendance/settings', { outletId, qrMode: 'DAILY' }), 'daily');
    const made = await must(s.post('/api/attendance/settings/qr', { outletId }), 'qr');
    expect(made.qr).toMatchObject({ generated: true, validDate: today });
    code = made.qr.code;
    expect(code.startsWith(`a1.${outletId}.`)).toBe(true);
    const kiosk = await request(null, 'GET', '/api/attendance/kiosk/qr', { headers: { 'X-Kiosk-Token': kioskToken } });
    expect(kiosk.status).toBe(200);
    expect(kiosk.body.data).toMatchObject({ code, qrMode: 'DAILY', validDate: today, refreshAfterSec: 60 });
    expect((await request(null, 'GET', '/api/attendance/kiosk/qr', { headers: { 'X-Kiosk-Token': 'nope' } })).status).toBe(401);
  });

  test('BF-ATT-06 a new code kills the old one; FIXED mode makes a code without a day', async () => {
    const old = code;
    code = (await must(s.post('/api/attendance/settings/qr', { outletId }), 'new qr')).qr.code;
    expect(brief(await punch(staff, { code: old }))).toEqual({ status: 422, code: 'QR_EXPIRED' });
    const fixed = await must(s.put('/api/attendance/settings', { outletId, qrMode: 'FIXED' }), 'fixed');
    expect(fixed.qr.code).toMatch(new RegExp(`^a1\\.${outletId}\\.\\d+\\.F\\.0\\.`));
    expect(brief(await punch(staff, { code }))).toEqual({ status: 422, code: 'QR_EXPIRED' });
    code = fixed.qr.code;
  });

  test('BF-ATT-07 rejected punches: mock, GPS accuracy, distance, wrong outlet', async () => {
    expect(brief(await punch(staff, { isMock: true }))).toEqual({ status: 422, code: 'MOCK_LOCATION' });
    const gps = await punch(staff, { accuracy: 180 });
    expect(brief(gps)).toEqual({ status: 422, code: 'GPS_INACCURATE' });
    expect(gps.body.data).toEqual({ accuracyM: 180 });
    const far = await punch(staff, { latitude: SHOP.latitude + 0.004 });
    expect(brief(far)).toEqual({ status: 422, code: 'OUT_OF_RANGE' });
    expect(far.body.data.radiusM).toBe(100);
    expect(far.body.data.distanceM).toBeGreaterThan(400);
    if (otherOutletId) {
      await must(s.put('/api/attendance/settings', { outletId: otherOutletId, ...SHOP }), 'other outlet');
      const otherCode = (await must(s.post('/api/attendance/settings/qr', { outletId: otherOutletId }), 'other qr')).qr.code;
      expect(brief(await punch(staff, { code: otherCode }))).toEqual({ status: 422, code: 'QR_WRONG_OUTLET' });
    }
  });

  test('BF-ATT-08 punch in, punch out (server time); kiosk lists the punch', async () => {
    const me0 = await must(staff.get('/api/attendance/me'), 'me');
    if (me0.openRecord) await must(punch(staff), 'close a leftover open record');
    const inRes = await must(punch(staff, { latitude: SHOP.latitude + 0.0001 }), 'in');
    expect(inRes.action).toBe('IN');
    expect(inRes.distanceM).toBeGreaterThan(5);
    expect(inRes.distanceM).toBeLessThan(20);
    expect(inRes.record).toMatchObject({ status: 'OPEN', dateKey: today, outletId });
    const me = await must(staff.get('/api/attendance/me'), 'me');
    expect(me.today.status).toBe('IN_SHIFT');
    const outRes = await must(punch(staff), 'out');
    expect(outRes.action).toBe('OUT');
    expect(outRes.record).toMatchObject({ id: inRes.record.id, status: 'DONE' });
    recordId = outRes.record.id;
    const kiosk = await request(null, 'GET', '/api/attendance/kiosk/qr', { headers: { 'X-Kiosk-Token': kioskToken } });
    expect(kiosk.body.data.recent[0]).toMatchObject({ name: staff.user.firstName, action: 'OUT' });
  });

  test('BF-ATT-09 timesheet and person month: the pair counts; rejected scans keep their coordinates', async () => {
    const sheet = await must(s.get(`/api/attendance/timesheet?outletId=${outletId}&month=${month}`), 'timesheet');
    const row = sheet.users.find((u) => u.userId === staff.user.id);
    expect(row.days[today]).toMatchObject({ dayCredit: 1 });
    expect(sheet.summary.pairs).toBeGreaterThanOrEqual(1);
    expect((await staff.get(`/api/attendance/timesheet?outletId=${outletId}&month=${month}`)).status).toBe(403);

    const mine = await must(staff.get(`/api/attendance/people/${staff.user.id}/month?outletId=${outletId}&month=${month}`), 'person month');
    const rejected = mine.rows.find((r) => r.result === 'REJECTED' && r.errorCode === 'OUT_OF_RANGE');
    expect(rejected).toMatchObject({ kind: 'IN' });
    expect(rejected.latitude).toBeCloseTo(SHOP.latitude + 0.004, 6);
    expect(rejected.longitude).toBeCloseTo(SHOP.longitude, 6);
    expect(mine.rows.some((r) => r.result === 'ACCEPTED' && r.kind === 'OUT' && r.recordId === recordId)).toBe(true);
    const other = await staff.get(`/api/attendance/people/${s.user.id}/month?outletId=${outletId}&month=${month}`);
    expect(other.status).toBe(403);
  });

  test('BF-ATT-10 edit with a reason (history kept); add a manual pair; month lock blocks edits', async () => {
    const rec = recordId;
    const checkIn = new Date(`${today}T08:00:00+07:00`).toISOString();
    const checkOut = `${today}T10:30:00+07:00`;
    expect((await s.patch(`/api/attendance/records/${rec}`, { checkOutAt: checkOut })).status).toBe(400);
    const edited = await must(s.patch(`/api/attendance/records/${rec}`, { checkInAt: checkIn, checkOutAt: checkOut, reason: 'Sửa giờ e2e' }), 'edit');
    expect(edited).toMatchObject({ status: 'DONE' });
    expect(edited.hours).toBeGreaterThan(0);
    const manual = await must(
      s.post('/api/attendance/records', {
        outletId,
        userId: staff.user.id,
        checkInAt: `${today}T13:00:00+07:00`,
        checkOutAt: `${today}T14:00:00+07:00`,
        reason: 'Quên chấm e2e',
      }),
      'manual'
    );
    expect(manual).toMatchObject({ source: 'MANUAL', status: 'DONE', dateKey: today });
    const history = await must(s.get(`/api/attendance/people/${staff.user.id}/month?outletId=${outletId}&month=${month}`), 'history');
    expect(history.rows.some((r) => r.kind === 'EDIT' && r.note === 'Sửa giờ e2e')).toBe(true);

    expect((await must(s.post('/api/attendance/months/lock', { outletId, month }), 'lock')).locked).toBe(true);
    expect(brief(await s.patch(`/api/attendance/records/${rec}`, { checkOutAt: checkOut, reason: 'x' }))).toEqual({ status: 409, code: 'MONTH_LOCKED' });
    expect((await must(s.get(`/api/attendance/timesheet?outletId=${outletId}&month=${month}`), 'ts')).locked).toBe(true);
    await must(s.post('/api/attendance/months/unlock', { outletId, month }), 'unlock');
  });

  test('BF-ATT-11 Excel export has the three sheets', async () => {
    const res = await fetch(`${process.env.E2E_API_URL.replace(/\/+$/, '')}/api/attendance/timesheet/export?outletId=${outletId}&month=${month}`, {
      headers: { Authorization: `Bearer ${s.token}` },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('spreadsheetml');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(0, 2).toString()).toBe('PK');
    const text = buf.toString('latin1');
    expect(text).toContain('xl/worksheets/sheet3.xml');
  });

  test('BF-ATT-12 templates, weekly rule, overlap, locks, one-day change and the SHIFT_CHANGED inbox row', async () => {
    const t = await must(
      s.post('/api/attendance/shift-templates', { outletId, name: 'Ca e2e', startTime: '08:00', endTime: '12:00', breakMinutes: 30, color: 'green' }),
      'template'
    );
    templateId = t.id;
    const all = [1, 2, 3, 4, 5, 6, 7];
    expect(brief(await s.post('/api/attendance/shift-rules', { outletId, templateId, userIds: [staff.user.id], weekdays: all, startDate: addDays(today, -1) })))
      .toEqual({ status: 409, code: 'SHIFT_LOCKED' });
    const rules = await must(s.post('/api/attendance/shift-rules', { outletId, templateId, userIds: [staff.user.id], weekdays: all, startDate: tomorrow }), 'rule');
    expect(rules).toHaveLength(1);
    expect(brief(await s.post('/api/attendance/shift-rules', { outletId, templateId, userIds: [staff.user.id], weekdays: [3], startDate: tomorrow })))
      .toEqual({ status: 409, code: 'SHIFT_OVERLAP' });

    // today is worked (BF-ATT-08) and yesterday is past
    expect(brief(await s.put('/api/attendance/shifts/day', { outletId, userId: staff.user.id, date: today, off: true }))).toEqual({ status: 409, code: 'SHIFT_LOCKED' });
    expect(brief(await s.put('/api/attendance/shifts/day', { outletId, userId: staff.user.id, date: addDays(today, -1), off: true })).code).toBe('SHIFT_LOCKED');
    await must(s.put('/api/attendance/shifts/day', { outletId, userId: staff.user.id, date: tomorrow, off: true }), 'day off');

    const view = await must(staff.get(`/api/attendance/shifts?outletId=${outletId}&from=${tomorrow}&to=${addDays(tomorrow, 2)}`), 'shifts');
    expect(view.items.find((i) => i.date === tomorrow)).toMatchObject({ userId: staff.user.id, off: true, shifts: [] });
    expect(view.items.find((i) => i.date === addDays(tomorrow, 1)).shifts[0]).toMatchObject({ name: 'Ca e2e', start: '08:00', end: '12:00', source: 'RULE', locked: false });
    expect((await staff.get(`/api/attendance/shifts?outletId=${outletId}&from=${tomorrow}&to=${tomorrow}&userId=${s.user.id}`)).status).toBe(403);

    const inbox = await must(staff.get('/api/notifications?limit=20'), 'inbox');
    const list = inbox.notifications || inbox.items || inbox;
    const row = list.find((n) => n.type === 'SHIFT_CHANGED');
    expect(row).toBeTruthy();
    expect(row.title).toBe('Lịch ca thay đổi');
    for (const v of Object.values(row.data)) expect(typeof v).toBe('string');
    expect(row.data.orderId).toBeUndefined();

    expect(brief(await request(s.token, 'DELETE', `/api/attendance/shift-templates/${templateId}`))).toEqual({ status: 409, code: 'SHIFT_TEMPLATE_IN_USE' });
    await must(s.patch(`/api/attendance/shift-templates/${templateId}`, { isActive: false }), 'hide');
  });

  test('BF-ATT-13 module off keeps the data: routes 403, admin can turn it back on', async () => {
    await setModule(false, null);
    expect(brief(await punch(staff))).toEqual({ status: 403, code: 'MODULE_NOT_ENABLED' });
    await setModule(true, null);
    const sheet = await must(s.get(`/api/attendance/timesheet?outletId=${outletId}&month=${month}`), 'timesheet');
    expect(sheet.summary.pairs).toBeGreaterThanOrEqual(2);
  });
});

/**
 * BF-ATT-X — extra attendance scenarios from the #906 module e2e. A fresh merchant (helpers/subscription.js world:
 * merchant, OUTLET_ADMIN, two OUTLET_STAFF, an OPS user) so every case starts from an empty attendance state in
 * both time zones. Rows the API has no endpoint for (an IN left open from yesterday) are set with psql (local DB only).
 */
const crypto = require('crypto');

const signQr = (payload) => {
  const secret = process.env.E2E_JWT_SECRET || 'e2e-local-jwt-secret';
  const key = crypto.createHmac('sha256', secret).update('attendance-qr-v1').digest();
  return `${payload}.${crypto.createHmac('sha256', key).update(payload).digest().subarray(0, 16).toString('base64url')}`;
};

(S.hasDb ? describeE2E : describe.skip)('BF-ATT-X attendance module, extra scenarios (#906)', () => {
  let world;
  let admin;
  let ops;
  let m;
  let oa;
  let st;
  let st2;
  let ids;
  let code;
  let kiosk1;
  const today = vnDateKey();
  const tomorrow = addDays(today, 1);
  const yesterday = addDays(today, -1);
  const month = today.slice(0, 7);
  const kioskGet = (token) => request(null, 'GET', '/api/attendance/kiosk/qr', { headers: { 'X-Kiosk-Token': token } });
  const punch = (session, over = {}) =>
    session.post('/api/attendance/punch', { code, ...SHOP, accuracy: 12, isMock: false, ...over });
  const setModule = (enabled, endDate) =>
    admin.put(`/api/merchants/${world.merchantId}/modules/attendance`, endDate === undefined ? { enabled } : { enabled, endDate });
  const sheetRow = async (userId, mon = month) => {
    const sheet = await must(m.get(`/api/attendance/timesheet?outletId=${world.outletId}&month=${mon}`), 'timesheet');
    return { sheet, row: sheet.users.find((u) => u.userId === userId) };
  };

  beforeAll(async () => {
    world = S.createWorld('ATT', { limits: { outlets: 3, users: 10 } });
    const id = world.id;
    world.oa = { email: `sub.${id}.oa@e2e.test`, password: S.PASSWORD };
    world.staff2 = { email: `sub.${id}.staff2@e2e.test`, password: S.PASSWORD };
    world.ops = { email: `sub.${id}.ops@e2e.test`, password: S.PASSWORD };
    S.createUser(world.merchantId, world.outletId, 'OUTLET_ADMIN', world.oa.email, 'Quanly');
    S.createUser(world.merchantId, world.outletId, 'OUTLET_STAFF', world.staff2.email, 'Nhanvien2');
    S.createUser(null, null, 'OPS', world.ops.email, 'Ops');
    admin = await S.login({ email: 'admin@rentalshop.com', password: 'admin123' }, S.WEB_HEADERS);
    ops = await S.login(world.ops, S.WEB_HEADERS);
    m = await S.login(world.merchant);
    oa = await S.login(world.oa);
    st = await S.login(world.staff);
    st2 = await S.login(world.staff2);
    ids = { m: m.user.id, oa: oa.user.id, st: st.user.id, st2: st2.user.id };
  });

  afterAll(async () => {
    if (admin && world) await setModule(false, null);
  });

  test('BF-ATT-X01 module off: every attendance route (manager and staff) answers 403 MODULE_NOT_ENABLED', async () => {
    const o = world.outletId;
    const calls = [
      m.get(`/api/attendance/settings?outletId=${o}`),
      m.get('/api/attendance/settings'),
      m.put('/api/attendance/settings', { outletId: o, qrMode: 'FIXED' }),
      m.post('/api/attendance/settings/qr', { outletId: o }),
      m.post('/api/attendance/settings/kiosk-link', { outletId: o }),
      m.get(`/api/attendance/shift-templates?outletId=${o}`),
      m.get(`/api/attendance/shift-rules?outletId=${o}`),
      m.get(`/api/attendance/shifts?outletId=${o}&from=${today}&to=${today}`),
      m.get(`/api/attendance/timesheet?outletId=${o}&month=${month}`),
      m.get(`/api/attendance/people/${ids.st}/month?outletId=${o}&month=${month}`),
      m.post('/api/attendance/months/lock', { outletId: o, month }),
      m.get('/api/attendance/me'),
      st.get('/api/attendance/me'),
      st.post('/api/attendance/punch', { code: 'a1.1.1.F.0.x', ...SHOP, accuracy: 10, isMock: false }),
      st.get(`/api/attendance/people/${ids.st}/month?outletId=${o}&month=${month}`),
    ];
    for (const r of await Promise.all(calls)) expect(brief(r)).toEqual({ status: 403, code: 'MODULE_NOT_ENABLED' });
  });

  test('BF-ATT-X02 OPS reads the module list but cannot switch it; ADMIN end date is inclusive (today = still on)', async () => {
    expect((await ops.get(`/api/merchants/${world.merchantId}/modules`)).status).toBe(200);
    expect((await ops.put(`/api/merchants/${world.merchantId}/modules/attendance`, { enabled: true })).status).toBe(403);
    expect((await m.put(`/api/merchants/${world.merchantId}/modules/attendance`, { enabled: true })).status).toBe(403);
    const on = await must(setModule(true, today), 'on until today');
    expect(on).toMatchObject({ enabled: true, endDate: today, active: true });
    expect((await st.get('/api/attendance/me')).status).toBe(200);
    expect((await must(st.get('/api/users/profile'), 'profile')).merchant.modules).toEqual(['attendance']);
    await must(setModule(true, null), 'on');
  });

  test('BF-ATT-X03 not configured: kiosk 422 before a QR / location; punch without coordinates → ATTENDANCE_NOT_CONFIGURED', async () => {
    const list = await must(m.get('/api/attendance/settings'), 'list');
    expect(list.find((x) => x.outletId === world.outletId)).toMatchObject({ configured: false, generated: false, qrMode: 'DAILY' });
    const fresh = await must(m.get(`/api/attendance/settings?outletId=${world.outletId}`), 'settings');
    expect(fresh).toMatchObject({ radiusM: 100, qrMode: 'DAILY' });
    expect(fresh.qr.generated).toBe(false);
    kiosk1 = (await must(m.post('/api/attendance/settings/kiosk-link', { outletId: world.outletId }), 'kiosk')).kioskToken;
    expect(brief(await kioskGet(kiosk1))).toEqual({ status: 422, code: 'ATTENDANCE_NOT_CONFIGURED' });
    // a code for version 0 (never generated) is not a valid code
    expect(brief(await punch(st, { code: signQr(`a1.${world.outletId}.0.D.${today}`) }))).toEqual({ status: 422, code: 'QR_EXPIRED' });
    code = (await must(m.post('/api/attendance/settings/qr', { outletId: world.outletId }), 'qr')).qr.code;
    expect(brief(await kioskGet(kiosk1))).toEqual({ status: 422, code: 'ATTENDANCE_NOT_CONFIGURED' });
    expect(brief(await punch(st))).toEqual({ status: 422, code: 'ATTENDANCE_NOT_CONFIGURED' });
    await must(m.put('/api/attendance/settings', { outletId: world.outletId, ...SHOP, radiusM: 100 }), 'location');
    expect((await kioskGet(kiosk1)).status).toBe(200);
  });

  test('BF-ATT-X04 DAILY code: signed for yesterday (VN day changed) → QR_EXPIRED; same payload for today is the live code', async () => {
    const [, o, v] = code.split('.');
    expect(signQr(`a1.${o}.${v}.D.${today}`)).toBe(code);
    expect(brief(await punch(st, { code: signQr(`a1.${o}.${v}.D.${yesterday}`) }))).toEqual({ status: 422, code: 'QR_EXPIRED' });
    expect(brief(await punch(st, { code: signQr(`a1.${o}.${v}.D.${tomorrow}`) }))).toEqual({ status: 422, code: 'QR_EXPIRED' });
    expect(brief(await punch(st, { code: `${code.slice(0, -2)}xx` }))).toEqual({ status: 422, code: 'QR_EXPIRED' });
  });

  test('BF-ATT-X05 FIXED code dies after "Tạo mã mới" and after the mode changes back to DAILY', async () => {
    const fixed1 = (await must(oa.put('/api/attendance/settings', { outletId: world.outletId, qrMode: 'FIXED' }), 'fixed')).qr.code;
    expect(fixed1).toMatch(/\.F\.0\./);
    const fixed2 = (await must(oa.post('/api/attendance/settings/qr', { outletId: world.outletId }), 'new fixed')).qr.code;
    expect(fixed2).not.toBe(fixed1);
    expect(brief(await punch(st, { code: fixed1 }))).toEqual({ status: 422, code: 'QR_EXPIRED' });
    const daily = (await must(oa.put('/api/attendance/settings', { outletId: world.outletId, qrMode: 'DAILY' }), 'daily')).qr.code;
    expect(brief(await punch(st, { code: fixed2 }))).toEqual({ status: 422, code: 'QR_EXPIRED' });
    code = daily;
  });

  test('BF-ATT-X06 kiosk link works without login; a new link kills the old one at once', async () => {
    const k = await kioskGet(kiosk1);
    expect(k.status).toBe(200);
    expect(k.body.data).toMatchObject({ code, qrMode: 'DAILY', validDate: today, outlet: { id: world.outletId } });
    const kiosk2 = (await must(oa.post('/api/attendance/settings/kiosk-link', { outletId: world.outletId }), 'new kiosk')).kioskToken;
    expect(kiosk2).not.toBe(kiosk1);
    expect(brief(await kioskGet(kiosk1)).status).toBe(401);
    expect((await kioskGet(kiosk2)).status).toBe(200);
  });

  test('BF-ATT-X07 GPS: accuracy 101 m rejected, 100 m ok edge; out of range answers distance and radius', async () => {
    const g = await punch(st, { accuracy: 101 });
    expect(brief(g)).toEqual({ status: 422, code: 'GPS_INACCURATE' });
    expect(g.body.data).toEqual({ accuracyM: 101 });
    const far = await punch(st, { latitude: SHOP.latitude + 0.0015 });
    expect(brief(far)).toEqual({ status: 422, code: 'OUT_OF_RANGE' });
    expect(far.body.data.radiusM).toBe(100);
    expect(far.body.data.distanceM).toBeGreaterThan(150);
    expect(far.body.data.distanceM).toBeLessThan(190);
    expect(brief(await punch(st, { isMock: true }))).toEqual({ status: 422, code: 'MOCK_LOCATION' });
  });

  test('BF-ATT-X08 several IN / OUT pairs in one day', async () => {
    const actions = [];
    for (let i = 0; i < 4; i += 1) actions.push((await must(punch(st, { accuracy: 100, latitude: SHOP.latitude + 0.00001 * i }), `punch ${i}`)).action);
    expect(actions).toEqual(['IN', 'OUT', 'IN', 'OUT']);
    const { row, sheet } = await sheetRow(ids.st);
    expect(row.days[today].dayCredit).toBe(1);
    expect(sheet.summary.pairs).toBeGreaterThanOrEqual(2);
    const me = await must(st.get('/api/attendance/me'), 'me');
    expect(me.openRecord).toBeNull();
  });

  test('BF-ATT-X09 forgot to clock out: an IN left open past its day becomes MISSING_OUT, 0 h; next punch is a new IN', async () => {
    const inRes = await must(punch(st2), 'in');
    expect(inRes.action).toBe('IN');
    // move the open record to yesterday and its close time into the past (no API can do this)
    S.sql(`UPDATE "AttendanceRecord" SET "dateKey" = '${yesterday}', "checkInAt" = "checkInAt" - interval '1 day',
           "closeAt" = (now() at time zone 'utc') - interval '1 minute' WHERE id = ${inRes.record.id} AND "merchantId" = ${world.merchantId}`);
    const me = await must(st2.get('/api/attendance/me'), 'me');
    expect(me.openRecord).toBeNull();
    const { row } = await sheetRow(ids.st2, yesterday.slice(0, 7));
    expect(row.days[yesterday]).toMatchObject({ hours: 0 });
    expect(row.days[yesterday].flags.missingOut).toBe(true);
    const detail = await must(m.get(`/api/attendance/people/${ids.st2}/month?outletId=${world.outletId}&month=${yesterday.slice(0, 7)}`), 'detail');
    expect(detail.rows.some((r) => r.result === 'AUTO_CLOSED')).toBe(true);
    const again = await must(punch(st2), 'again');
    expect(again.action).toBe('IN');
    expect(again.record.id).not.toBe(inRes.record.id);
    expect((await must(punch(st2), 'out')).action).toBe('OUT');
  });

  test('BF-ATT-X10 rules: one shift for several staff is fine; same user overlapping → SHIFT_OVERLAP; non-overlapping ok', async () => {
    const mk = (name, startTime, endTime) =>
      must(m.post('/api/attendance/shift-templates', { outletId: world.outletId, name, startTime, endTime, breakMinutes: 0, color: 'blue' }), name);
    const a = await mk('Ca sáng X', '08:00', '12:00');
    const b = await mk('Ca giữa X', '10:00', '14:00');
    const c = await mk('Ca chiều X', '13:00', '17:00');
    const all = [1, 2, 3, 4, 5, 6, 7];
    const both = await must(m.post('/api/attendance/shift-rules', { outletId: world.outletId, templateId: a.id, userIds: [ids.st, ids.st2], weekdays: all, startDate: tomorrow }), 'both');
    expect(both).toHaveLength(2);
    expect(brief(await m.post('/api/attendance/shift-rules', { outletId: world.outletId, templateId: b.id, userIds: [ids.st], weekdays: [1, 2], startDate: tomorrow })))
      .toEqual({ status: 409, code: 'SHIFT_OVERLAP' });
    await must(m.post('/api/attendance/shift-rules', { outletId: world.outletId, templateId: c.id, userIds: [ids.st], weekdays: all, startDate: tomorrow }), 'afternoon');
    const view = await must(m.get(`/api/attendance/shifts?outletId=${world.outletId}&from=${tomorrow}&to=${tomorrow}`), 'shifts');
    const st1Day = view.items.find((i) => i.userId === ids.st && i.date === tomorrow);
    expect(st1Day.shifts.map((x) => x.name)).toEqual(['Ca sáng X', 'Ca chiều X']);
    expect(view.items.find((i) => i.userId === ids.st2 && i.date === tomorrow).shifts.map((x) => x.name)).toEqual(['Ca sáng X']);

    // one-day change: staff2 tomorrow → Ca chiều; then back to the rule
    await must(oa.put('/api/attendance/shifts/day', { outletId: world.outletId, userId: ids.st2, date: tomorrow, templateId: c.id }), 'day change');
    let v = await must(st2.get(`/api/attendance/shifts?outletId=${world.outletId}&from=${tomorrow}&to=${tomorrow}`), 'mine');
    expect(v.items[0].shifts).toEqual([expect.objectContaining({ name: 'Ca chiều X', source: 'DAY' })]);
    await must(request(oa.token, 'DELETE', `/api/attendance/shifts/day?outletId=${world.outletId}&userId=${ids.st2}&date=${tomorrow}`), 'undo');
    v = await must(st2.get(`/api/attendance/shifts?outletId=${world.outletId}&from=${tomorrow}&to=${tomorrow}`), 'mine 2');
    expect(v.items[0].shifts).toEqual([expect.objectContaining({ name: 'Ca sáng X', source: 'RULE' })]);
    // past day locked; a worked day (today, BF-ATT-X08) locked
    expect(brief(await m.put('/api/attendance/shifts/day', { outletId: world.outletId, userId: ids.st2, date: yesterday, off: true })).code).toBe('SHIFT_LOCKED');
    expect(brief(await m.put('/api/attendance/shifts/day', { outletId: world.outletId, userId: ids.st, date: today, off: true }))).toEqual({ status: 409, code: 'SHIFT_LOCKED' });

    // templates: used → 409 on delete; hide ok and a hidden one cannot be picked; unused delete ok
    expect(brief(await request(m.token, 'DELETE', `/api/attendance/shift-templates/${a.id}`))).toEqual({ status: 409, code: 'SHIFT_TEMPLATE_IN_USE' });
    await must(m.patch(`/api/attendance/shift-templates/${b.id}`, { isActive: false }), 'hide');
    expect((await m.put('/api/attendance/shifts/day', { outletId: world.outletId, userId: ids.st2, date: addDays(today, 3), templateId: b.id })).status).toBe(400);
    const d = await mk('Ca thừa X', '18:00', '20:00');
    expect((await request(m.token, 'DELETE', `/api/attendance/shift-templates/${d.id}`)).status).toBe(200);
  });

  test('BF-ATT-X11 SHIFT_CHANGED inbox row: title, data values are all strings, no orderId', async () => {
    const inbox = await must(st2.get('/api/notifications?limit=20'), 'inbox');
    const list = inbox.notifications || inbox.items || inbox;
    const rows = list.filter((n) => n.type === 'SHIFT_CHANGED');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    for (const row of rows) {
      expect(row.title).toBe('Lịch ca thay đổi');
      expect(Object.keys(row.data).length).toBeGreaterThan(0);
      for (const val of Object.values(row.data)) expect(typeof val).toBe('string');
      expect(row.data.orderId).toBeUndefined();
    }
  });

  test('BF-ATT-X12 manual pair hours (no shift: OUT − IN), edit needs a reason, OUTLET_ADMIN not on own records', async () => {
    const yMonth = yesterday.slice(0, 7);
    const manual = await must(
      oa.post('/api/attendance/records', {
        outletId: world.outletId, userId: ids.st, checkInAt: `${yesterday}T08:00:00+07:00`, checkOutAt: `${yesterday}T10:30:00+07:00`, reason: 'Quên chấm',
      }),
      'manual'
    );
    expect(manual).toMatchObject({ source: 'MANUAL', status: 'DONE', dateKey: yesterday, hours: 2.5 });
    const { row } = await sheetRow(ids.st, yMonth);
    expect(row.days[yesterday]).toMatchObject({ hours: 2.5, dayCredit: 1 });
    expect(row.totals.hours).toBeGreaterThanOrEqual(2.5);
    expect((await oa.patch(`/api/attendance/records/${manual.id}`, { checkOutAt: `${yesterday}T11:00:00+07:00` })).status).toBe(400);
    expect((await oa.patch(`/api/attendance/records/${manual.id}`, { checkOutAt: `${yesterday}T11:00:00+07:00`, reason: '' })).status).toBe(400);
    expect(brief(await oa.patch(`/api/attendance/records/${manual.id}`, { checkInAt: `${yesterday}T12:00:00+07:00`, reason: 'sai' })).status).toBe(400);
    const edited = await must(oa.patch(`/api/attendance/records/${manual.id}`, { checkOutAt: `${yesterday}T11:00:00+07:00`, reason: 'Về muộn' }), 'edit');
    expect(edited.hours).toBe(3);

    // OUTLET_ADMIN punches for themselves (#927: once the owner chose them), then cannot edit or add their own record; the owner can
    await must(m.put('/api/attendance/members', { outletId: world.outletId, userId: ids.oa, required: true }), 'pick oa');
    const pIn = await must(punch(oa), 'oa in');
    await must(punch(oa), 'oa out');
    expect((await oa.patch(`/api/attendance/records/${pIn.record.id}`, { checkOutAt: new Date().toISOString(), reason: 'tự sửa' })).status).toBe(403);
    expect((await oa.post('/api/attendance/records', { outletId: world.outletId, userId: ids.oa, checkInAt: `${yesterday}T08:00:00+07:00`, checkOutAt: `${yesterday}T09:00:00+07:00`, reason: 'tự thêm' })).status).toBe(403);
    await must(m.patch(`/api/attendance/records/${pIn.record.id}`, { checkInAt: new Date(Date.now() - 3600e3).toISOString(), reason: 'chủ sửa' }), 'owner edit');
  });

  test('BF-ATT-X13 OUTLET_ADMIN: no coordinates / radius, no month lock; locked month blocks edit and add (MONTH_LOCKED)', async () => {
    expect((await oa.put('/api/attendance/settings', { outletId: world.outletId, radiusM: 200 })).status).toBe(403);
    expect((await oa.put('/api/attendance/settings', { outletId: world.outletId, ...SHOP })).status).toBe(403);
    expect((await oa.post('/api/attendance/months/lock', { outletId: world.outletId, month })).status).toBe(403);
    expect((await must(m.post('/api/attendance/months/lock', { outletId: world.outletId, month }), 'lock')).locked).toBe(true);
    const rec = (await must(m.get(`/api/attendance/people/${ids.st}/month?outletId=${world.outletId}&month=${month}`), 'rows')).rows.find((r) => r.recordId)?.recordId;
    expect(brief(await oa.patch(`/api/attendance/records/${rec}`, { checkOutAt: new Date().toISOString(), reason: 'x' }))).toEqual({ status: 409, code: 'MONTH_LOCKED' });
    expect(brief(await m.post('/api/attendance/records', { outletId: world.outletId, userId: ids.st, checkInAt: `${today}T01:00:00+07:00`, checkOutAt: `${today}T02:00:00+07:00`, reason: 'x' })))
      .toEqual({ status: 409, code: 'MONTH_LOCKED' });
    expect((await oa.post('/api/attendance/months/unlock', { outletId: world.outletId, month })).status).toBe(403);
    await must(m.post('/api/attendance/months/unlock', { outletId: world.outletId, month }), 'unlock');
  });

  test('BF-ATT-X14 staff see only their own data; person month includes rejected scans with coordinates', async () => {
    const o = world.outletId;
    for (const r of await Promise.all([
      st.get(`/api/attendance/settings?outletId=${o}`),
      st.get(`/api/attendance/timesheet?outletId=${o}&month=${month}`),
      st.get(`/api/attendance/shift-rules?outletId=${o}`),
      st.post('/api/attendance/shift-templates', { outletId: o, name: 'x', startTime: '08:00', endTime: '09:00', breakMinutes: 0, color: 'blue' }),
      st.post('/api/attendance/records', { outletId: o, userId: ids.st, checkInAt: `${yesterday}T08:00:00+07:00`, checkOutAt: `${yesterday}T09:00:00+07:00`, reason: 'x' }),
      st.post('/api/attendance/settings/qr', { outletId: o }),
      st.post('/api/attendance/settings/kiosk-link', { outletId: o }),
      st.post('/api/attendance/months/lock', { outletId: o, month }),
      st.get(`/api/attendance/people/${ids.st2}/month?outletId=${o}&month=${month}`),
      st.get(`/api/attendance/shifts?outletId=${o}&from=${tomorrow}&to=${tomorrow}&userId=${ids.st2}`),
    ])) {
      expect(r.status).toBe(403);
    }
    const mine = await must(st.get(`/api/attendance/people/${ids.st}/month?outletId=${o}&month=${month}`), 'mine');
    const gps = mine.rows.find((r) => r.result === 'REJECTED' && r.errorCode === 'GPS_INACCURATE');
    expect(gps).toMatchObject({ accuracyM: 101 });
    expect(gps.latitude).toBeCloseTo(SHOP.latitude, 6);
    const far = mine.rows.find((r) => r.result === 'REJECTED' && r.errorCode === 'OUT_OF_RANGE');
    expect(far.distanceM).toBeGreaterThan(150);
    expect(far.latitude).toBeCloseTo(SHOP.latitude + 0.0015, 6);
    expect(mine.summary).toBeTruthy();
  });

  test('BF-ATT-X15 another merchant\'s outlet, user, template and record → 404', async () => {
    const otherOutlet = Number(S.sql(`SELECT id FROM "Outlet" WHERE "merchantId" <> ${world.merchantId} ORDER BY id LIMIT 1`));
    const otherUser = Number(S.sql(`SELECT id FROM "User" WHERE "merchantId" <> ${world.merchantId} AND role = 'OUTLET_STAFF' ORDER BY id LIMIT 1`));
    const otherTpl = Number(S.sql(`SELECT coalesce(max(id), 0) FROM "ShiftTemplate" WHERE "merchantId" <> ${world.merchantId}`));
    const otherRec = Number(S.sql(`SELECT coalesce(max(id), 0) FROM "AttendanceRecord" WHERE "merchantId" <> ${world.merchantId}`));
    expect((await m.get(`/api/attendance/settings?outletId=${otherOutlet}`)).status).toBe(404);
    expect((await m.get(`/api/attendance/timesheet?outletId=${otherOutlet}&month=${month}`)).status).toBe(404);
    expect((await m.get(`/api/attendance/people/${otherUser}/month?outletId=${world.outletId}&month=${month}`)).status).toBe(404);
    if (otherTpl) expect((await m.patch(`/api/attendance/shift-templates/${otherTpl}`, { isActive: false })).status).toBe(404);
    if (otherRec) expect((await m.patch(`/api/attendance/records/${otherRec}`, { checkOutAt: new Date().toISOString(), reason: 'x' })).status).toBe(404);
    expect((await m.post('/api/attendance/shift-rules', { outletId: world.outletId, templateId: otherTpl || 999999, userIds: [ids.st], weekdays: [1], startDate: addDays(today, 5) })).status).toBe(404);
  });
});

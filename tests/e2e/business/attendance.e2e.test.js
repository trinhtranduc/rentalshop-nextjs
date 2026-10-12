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
    expect(profile.merchant.modules).toEqual([]);
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
    expect(profile.merchant.modules).toEqual(['attendance']);
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

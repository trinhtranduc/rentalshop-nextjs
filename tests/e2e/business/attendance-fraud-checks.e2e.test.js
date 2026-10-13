/**
 * BF-ATT-F — #949 attendance fraud checks through the real API on the local seeded database.
 * A fresh shop (createWorld) with a second outlet: owner, staff, kho and an outlet admin at outlet 1.
 * 1. A repeat punch at the same full-precision GPS point (17 digits) is flagged SAME_COORDS.
 * 2. A code of outlet 2 scanned by outlet-1 people → 422 QR_WRONG_OUTLET with data { qrOutlet, allowedOutlets };
 *    the refused scan lands under outlet 1, so the owner and the outlet admin see it in Chi tiết theo người.
 * Runs under TZ=UTC and TZ=Asia/Ho_Chi_Minh on the same database: every run builds its own shop.
 */
const { describeE2E, must, vnDateKey } = require('../helpers/api');
const S = require('../helpers/subscription');

const SHOP = { latitude: 10.7769, longitude: 106.7009 };
const brief = (r) => ({ status: r.status, code: r.body?.code });

(S.hasDb ? describeE2E : describe.skip)('BF-ATT-F attendance fraud checks (#949)', () => {
  let world;
  let admin;
  let m;
  let oa;
  let st;
  let kho;
  let outlet2;
  let code1;
  let code2;
  const today = vnDateKey();
  const month = today.slice(0, 7);
  const punch = (session, code, over = {}) =>
    session.post('/api/attendance/punch', { code, ...SHOP, accuracy: 12, isMock: false, ...over });
  const setModule = (enabled) => admin.put(`/api/merchants/${world.merchantId}/modules/attendance`, { enabled });

  beforeAll(async () => {
    world = S.createWorld('ATTF', { limits: { outlets: 3, users: 10 } });
    world.oa = { email: `sub.${world.id}.oa@e2e.test`, password: S.PASSWORD };
    S.createUser(world.merchantId, world.outletId, 'OUTLET_ADMIN', world.oa.email, 'Quanly');
    outlet2 = Number(
      S.sql(
        `INSERT INTO "Outlet"(name, address, "isDefault", "merchantId", "updatedAt")
         VALUES ('E2E outlet two ${world.id}', 'Ha Noi', false, ${world.merchantId}, now()) RETURNING id`
      )
    );
    admin = await S.login({ email: 'admin@rentalshop.com', password: 'admin123' }, S.WEB_HEADERS);
    m = await S.login(world.merchant);
    oa = await S.login(world.oa);
    st = await S.login(world.staff);
    kho = await S.login(world.kho);
    await must(setModule(true), 'module on');
    for (const outletId of [world.outletId, outlet2]) {
      await must(m.put('/api/attendance/settings', { outletId, ...SHOP, radiusM: 100 }), 'location');
    }
    code1 = (await must(m.post('/api/attendance/settings/qr', { outletId: world.outletId }), 'qr 1')).qr.code;
    code2 = (await must(m.post('/api/attendance/settings/qr', { outletId: outlet2 }), 'qr 2')).qr.code;
  });

  afterAll(async () => {
    if (admin && world) await setModule(false);
  });

  test('BF-ATT-F01 same full-precision GPS point twice → the second punch is flagged SAME_COORDS', async () => {
    const point = { latitude: 10.776912345678912, longitude: 106.70091234567891 };
    const inRes = await must(punch(st, code1, point), 'in');
    expect(inRes.action).toBe('IN');
    const outRes = await must(punch(st, code1, point), 'out');
    expect(outRes.action).toBe('OUT');
    expect(outRes.record.suspectReasons).toContain('SAME_COORDS');
  });

  test('BF-ATT-F02 code of another outlet → QR_WRONG_OUTLET naming the code\'s outlet and the scanner\'s outlet', async () => {
    const res = await punch(st, code2, { latitude: 10.7771, longitude: 106.7011 });
    expect(brief(res)).toEqual({ status: 422, code: 'QR_WRONG_OUTLET' });
    expect(res.body.data).toEqual({
      qrOutlet: { id: outlet2, name: `E2E outlet two ${world.id}` },
      allowedOutlets: [{ id: world.outletId, name: `E2E outlet ${world.id}` }],
    });
    const byKho = await punch(kho, code2);
    expect(brief(byKho)).toEqual({ status: 422, code: 'QR_WRONG_OUTLET' });
    expect(byKho.body.data.allowedOutlets).toEqual([{ id: world.outletId, name: `E2E outlet ${world.id}` }]);
  });

  test('BF-ATT-F03 the refused scan is under the scanner\'s outlet: owner and outlet admin see it (Bị từ chối)', async () => {
    const stored = S.sql(
      `SELECT "outletId" || ',' || coalesce("qrOutletId"::text, '') FROM "AttendanceScan"
       WHERE "userId" = ${st.user.id} AND result = 'QR_WRONG_OUTLET' ORDER BY id DESC LIMIT 1`
    );
    expect(stored).toBe(`${world.outletId},${outlet2}`);
    for (const session of [m, oa, st]) {
      const view = await must(session.get(`/api/attendance/people/${st.user.id}/month?outletId=${world.outletId}&month=${month}`), 'person month');
      const row = view.rows.find((r) => r.result === 'REJECTED' && r.errorCode === 'QR_WRONG_OUTLET');
      expect(row).toBeTruthy();
      expect(row.latitude).toBeCloseTo(10.7771, 6);
      expect(row.longitude).toBeCloseTo(106.7011, 6);
      expect(row.qrOutlet).toEqual({ id: outlet2, name: `E2E outlet two ${world.id}` });
    }
  });
});

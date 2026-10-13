/**
 * BF-ATT-T — four ready-made shift templates per branch (#959), through the real API on the local seeded database.
 * A fresh merchant per run (helpers/subscription.js world), so both time-zone runs start with branches that were never
 * seeded. Extra branches are inserted with psql (local DB only).
 */
const { describeE2E, must, request } = require('../helpers/api');
const S = require('../helpers/subscription');

const DEFAULTS = [
  { name: 'Ca sáng', startTime: '08:00', endTime: '12:00', breakMinutes: 0, color: 'blue' },
  { name: 'Hành chính', startTime: '08:00', endTime: '17:00', breakMinutes: 60, color: 'green' },
  { name: 'Ca chiều', startTime: '13:00', endTime: '17:00', breakMinutes: 0, color: 'orange' },
  { name: 'Ca tối', startTime: '18:00', endTime: '22:00', breakMinutes: 0, color: 'purple' },
];
const shape = (t) => ({ name: t.name, startTime: t.startTime, endTime: t.endTime, breakMinutes: t.breakMinutes, color: t.color });

(S.hasDb ? describeE2E : describe.skip)('BF-ATT-T ready-made shift templates (#959)', () => {
  let world;
  let admin;
  let m;
  const list = (outletId) => must(m.get(`/api/attendance/shift-templates?outletId=${outletId}`), 'templates');
  const dbCount = (outletId) => Number(S.sql(`SELECT count(*) FROM "ShiftTemplate" WHERE "outletId" = ${outletId}`));
  const marked = (outletId) =>
    S.sql(`SELECT ("templatesSeededAt" IS NOT NULL)::text FROM "AttendanceSetting" WHERE "outletId" = ${outletId}`) === 'true';
  const newOutlet = (label) =>
    Number(
      S.sql(
        `INSERT INTO "Outlet"(name, address, "merchantId", "updatedAt")
         VALUES ('E2E ${label} ${world.id}', 'Ha Noi', ${world.merchantId}, (now() at time zone 'utc')) RETURNING id`
      )
    );

  beforeAll(async () => {
    world = S.createWorld('ATT959', { limits: { outlets: 5, users: 10 } });
    admin = await S.login({ email: 'admin@rentalshop.com', password: 'admin123' }, S.WEB_HEADERS);
    m = await S.login(world.merchant);
    await must(admin.put(`/api/merchants/${world.merchantId}/modules/attendance`, { enabled: true }), 'module on');
  });

  afterAll(async () => {
    if (admin && world) await admin.put(`/api/merchants/${world.merchantId}/modules/attendance`, { enabled: false });
  });

  test('BF-ATT-T01 a new branch sees the four ready-made templates, all active and unused', async () => {
    expect(dbCount(world.outletId)).toBe(0);
    const items = await list(world.outletId);
    expect(items.map(shape)).toEqual(DEFAULTS);
    for (const t of items) expect(t).toMatchObject({ isActive: true, used: false, outletId: world.outletId });
    expect(marked(world.outletId)).toBe(true);
    // a second load adds nothing
    expect(await list(world.outletId)).toHaveLength(4);
  });

  test('BF-ATT-T02 they edit like any template; deleting them all never brings them back', async () => {
    const items = await list(world.outletId);
    const morning = items.find((t) => t.name === 'Ca sáng');
    const edited = await must(m.put(`/api/attendance/shift-templates/${morning.id}`, { ...shape(morning), name: 'Ca sáng sớm', startTime: '07:00' }), 'edit');
    expect(edited).toMatchObject({ name: 'Ca sáng sớm', startTime: '07:00', endTime: '12:00' });
    for (const t of items) {
      expect((await request(m.token, 'DELETE', `/api/attendance/shift-templates/${t.id}`)).status).toBe(200);
    }
    expect(await list(world.outletId)).toEqual([]);
    expect(await list(world.outletId)).toEqual([]);
    expect(dbCount(world.outletId)).toBe(0);
  });

  test('BF-ATT-T03 parallel first loads of a new branch create exactly four', async () => {
    const outletId = newOutlet('parallel');
    const results = await Promise.all(Array.from({ length: 6 }, () => m.get(`/api/attendance/shift-templates?outletId=${outletId}`)));
    for (const r of results) expect(r.status).toBe(200);
    expect(dbCount(outletId)).toBe(4);
    expect((await list(outletId)).map(shape)).toEqual(DEFAULTS);
  });

  test('BF-ATT-T04 a branch that already has a template gets none; only the mark is written', async () => {
    const outletId = newOutlet('existing');
    await must(
      m.post('/api/attendance/shift-templates', { outletId, name: 'Ca riêng', startTime: '09:00', endTime: '15:00', breakMinutes: 0, color: 'blue' }),
      'own template'
    );
    const items = await list(outletId);
    expect(items.map((t) => t.name)).toEqual(['Ca riêng']);
    expect(marked(outletId)).toBe(true);
    // deleting it later does not seed either
    expect((await request(m.token, 'DELETE', `/api/attendance/shift-templates/${items[0].id}`)).status).toBe(200);
    expect(await list(outletId)).toEqual([]);
  });
});

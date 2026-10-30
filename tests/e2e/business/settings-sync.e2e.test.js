/**
 * SETTINGS-SYNC (#1315, epic #1309): shop / outlet settings changed by the owner are read back by every role,
 * and only the right role can change them. Each case changes a value, reads it with the OTHER roles, tries a
 * write with the roles that must not have it (403, value unchanged), and changes it back (no stale cache).
 *
 * Accounts (helpers/api.js): merchant (MERCHANT), outletAdmin / staff / inventory (same outlet A),
 * outletAdminOther / staffOther (another outlet B of the same merchant).
 *
 * Current API behaviour is asserted. Where the owner's target rule (#1308, bank accounts) is stricter, the case name
 * says "[today]" and the comment names the rule that is not built yet.
 */
const { Session, describeE2E, must, request, uniqueName } = require('../helpers/api');

describeE2E('SETTINGS-SYNC shop and outlet settings across roles', () => {
  let m, oa, st, inv, oaB, stB;
  let outletA, outletB, merchantId;
  const orig = {};
  const readers = () => ({ outletAdmin: oa, staff: st, inventory: inv, outletAdminOther: oaB, staffOther: stB });
  const profileOf = async (s) => (await must(s.get('/api/users/profile'), 'profile')).user || (await must(s.get('/api/users/profile'), 'profile'));
  const listOf = (d) => (Array.isArray(d) ? d : d?.outlets || d?.items || []);
  const outletRow = async (s, id) => listOf(await must(s.get('/api/outlets?limit=50'), 'outlets')).find((o) => o.id === id);
  const currencyOf = async (s) => (await must(s.get('/api/settings/currency'), 'currency')).currency;
  const depositOf = async (s) => must(s.get('/api/settings/deposit'), 'deposit');
  const overlapOf = async (s) => (await profileOf(s)).merchant.allowOverlappingOrders;
  const shareNoteOf = async (s) => (await profileOf(s)).merchant.shareOrderNote;
  const oldAppsOf = async (s) => (await profileOf(s)).merchant.blockPricing.oldApps;
  const bankList = async (s, outletId) => (await must(s.get(`/api/merchants/${merchantId}/outlets/${outletId}/bank-accounts`), 'bank list')) || [];
  const expect403 = (r) => expect({ status: r.status, success: r.body?.success }).toEqual({ status: 403, success: false });

  beforeAll(async () => {
    m = await Session.login('merchant');
    oa = await Session.login('outletAdmin');
    st = await Session.login('staff');
    inv = await Session.login('inventory');
    oaB = await Session.login('outletAdminOther');
    stB = await Session.login('staffOther');
    expect(m.user.role).toBe('MERCHANT');
    expect(oa.user.role).toBe('OUTLET_ADMIN');
    expect(st.user.role).toBe('OUTLET_STAFF');
    expect(inv.user.role).toBe('OUTLET_INVENTORY');
    outletA = st.user.outletId;
    outletB = stB.user.outletId;
    expect(outletA).toBeTruthy();
    expect(outletB).toBeTruthy();
    expect(outletB).not.toBe(outletA);
    expect(oa.user.outletId).toBe(outletA);
    expect(oaB.user.outletId).toBe(outletB);
    merchantId = (await profileOf(m)).merchantId || m.user.merchantId;

    orig.currency = await currencyOf(m);
    orig.deposit = await depositOf(m);
    orig.overlap = await overlapOf(m);
    orig.shareNote = await shareNoteOf(m);
    orig.oldApps = await oldAppsOf(m);
    orig.outletA = await outletRow(m, outletA);
    orig.outletB = await outletRow(m, outletB);
  });

  afterAll(async () => {
    // put the shop back the way the seed had it
    await m.put('/api/settings/currency', { currency: orig.currency });
    await m.put('/api/settings/deposit', { depositMode: orig.deposit.depositMode, cancellationPolicy: orig.deposit.cancellationPolicy || '' });
    await m.put('/api/settings/merchant', { allowOverlappingOrders: orig.overlap });
    await m.put('/api/settings/merchant', { shareOrderNote: orig.shareNote });
    for (const o of [orig.outletA, orig.outletB]) {
      await m.put(`/api/outlets?outletId=${o.id}`, { printNote: o.printNote ?? '', printBankQr: o.printBankQr ?? false });
    }
  });

  // ------------------------------------------------------------------ currency (Merchant.currency, whole shop)

  test('SS-CUR-01 owner changes the currency; every role of every outlet reads it, and again after changing back', async () => {
    const other = orig.currency === 'VND' ? 'USD' : 'VND';
    for (const target of [other, orig.currency]) {
      const r = await m.put('/api/settings/currency', { currency: target });
      expect(r.status).toBe(200);
      expect(await currencyOf(m)).toBe(target);
      for (const [name, s] of Object.entries(readers())) {
        expect({ role: name, currency: await currencyOf(s) }).toEqual({ role: name, currency: target });
      }
    }
  });

  test('SS-CUR-02 manager, staff, inventory cannot change the currency: 403 INSUFFICIENT_PERMISSIONS, value unchanged', async () => {
    const other = orig.currency === 'VND' ? 'USD' : 'VND';
    for (const [name, s] of Object.entries(readers())) {
      const r = await s.put('/api/settings/currency', { currency: other });
      expect403(r);
      expect({ role: name, code: r.body.code }).toEqual({ role: name, code: 'INSUFFICIENT_PERMISSIONS' });
      expect(await currencyOf(m)).toBe(orig.currency);
    }
  });

  // ------------------------------------------------------------------ deposit (/api/settings/deposit)

  test('SS-DEP-01 owner changes the deposit mode and policy; every role reads them, and again after changing back', async () => {
    const mode = orig.deposit.depositMode === 'STAGED' ? 'ONE_TIME' : 'STAGED';
    const policy = uniqueName('Chinh sach coc');
    const r1 = await m.put('/api/settings/deposit', { depositMode: mode, cancellationPolicy: policy });
    expect(r1.status).toBe(200);
    for (const [name, s] of Object.entries(readers())) {
      const d = await depositOf(s);
      expect({ role: name, mode: d.depositMode, policy: d.cancellationPolicy }).toEqual({ role: name, mode, policy });
    }
    const back = orig.deposit.cancellationPolicy || '';
    const r2 = await m.put('/api/settings/deposit', { depositMode: orig.deposit.depositMode, cancellationPolicy: back });
    expect(r2.status).toBe(200);
    for (const [name, s] of Object.entries(readers())) {
      const d = await depositOf(s);
      expect({ role: name, mode: d.depositMode, policy: d.cancellationPolicy }).toEqual({ role: name, mode: orig.deposit.depositMode, policy: back });
    }
  });

  test('SS-DEP-02 manager, staff, inventory cannot change the deposit: 403, value unchanged', async () => {
    for (const [name, s] of Object.entries(readers())) {
      const r = await s.put('/api/settings/deposit', { depositMode: 'STAGED', cancellationPolicy: `x-${name}` });
      expect403(r);
      expect({ role: name, code: r.body.code }).toEqual({ role: name, code: 'INSUFFICIENT_PERMISSIONS' });
    }
    const d = await depositOf(m);
    expect(d.depositMode).toBe(orig.deposit.depositMode);
    expect(d.cancellationPolicy).toBe(orig.deposit.cancellationPolicy);
  });

  // ------------------------------------------------------------------ allowOverlappingOrders (#518)

  test('SS-OVL-01 owner flips "Cho trùng lịch"; every role reads it from /api/users/profile, and again after flipping back', async () => {
    for (const target of [!orig.overlap, orig.overlap]) {
      const r = await m.put('/api/settings/merchant', { allowOverlappingOrders: target });
      expect(r.status).toBe(200);
      expect(await overlapOf(m)).toBe(target);
      for (const [name, s] of Object.entries(readers())) {
        expect({ role: name, allow: await overlapOf(s) }).toEqual({ role: name, allow: target });
      }
    }
  });

  test('SS-OVL-02 manager, staff, inventory cannot flip "Cho trùng lịch": 403, value unchanged', async () => {
    for (const [name, s] of Object.entries(readers())) {
      const r = await s.put('/api/settings/merchant', { allowOverlappingOrders: !orig.overlap });
      expect({ role: name, status: r.status, success: r.body?.success }).toEqual({ role: name, status: 403, success: false });
    }
    expect(await overlapOf(m)).toBe(orig.overlap);
    expect(await overlapOf(st)).toBe(orig.overlap);
  });

  // ------------------------------------------------------------------ shareOrderNote (#1344, Merchant.settings)

  test('SS-SHN-01 owner flips "Hiện ghi chú đơn trên ảnh chia sẻ"; every role reads it from /api/users/profile; other settings keys survive', async () => {
    expect(orig.shareNote).toBe(false); // a shop that never set it keeps today's image
    for (const target of [!orig.shareNote, orig.shareNote]) {
      const r = await m.put('/api/settings/merchant', { shareOrderNote: target });
      expect(r.status).toBe(200);
      expect(r.body.data.shareOrderNote).toBe(target);
      expect(await shareNoteOf(m)).toBe(target);
      for (const [name, s] of Object.entries(readers())) {
        expect({ role: name, on: await shareNoteOf(s) }).toEqual({ role: name, on: target });
      }
    }
    // writing the other keys of Merchant.settings (blockPricing, payment) must not lose it
    await must(m.put('/api/settings/merchant', { shareOrderNote: true }), 'on');
    expect((await m.put('/api/settings/merchant', { blockPricing: { oldApps: orig.oldApps } })).status).toBe(200);
    expect((await m.put('/api/settings/deposit', { depositMode: orig.deposit.depositMode, cancellationPolicy: orig.deposit.cancellationPolicy || '' })).status).toBe(200);
    expect(await shareNoteOf(m)).toBe(true);
    expect(await oldAppsOf(m)).toBe(orig.oldApps);
    expect((await depositOf(m)).depositMode).toBe(orig.deposit.depositMode);
    // and the other way round: writing the new key keeps the old ones
    await must(m.put('/api/settings/merchant', { shareOrderNote: false }), 'off');
    expect(await oldAppsOf(m)).toBe(orig.oldApps);
    expect((await depositOf(m)).depositMode).toBe(orig.deposit.depositMode);
  });

  test('SS-SHN-02 manager, staff, inventory cannot flip it: 403 INSUFFICIENT_PERMISSIONS, value unchanged; a non-boolean is 400', async () => {
    for (const [name, s] of Object.entries(readers())) {
      const r = await s.put('/api/settings/merchant', { shareOrderNote: !orig.shareNote });
      expect403(r);
      expect({ role: name, code: r.body.code }).toEqual({ role: name, code: 'INSUFFICIENT_PERMISSIONS' });
    }
    expect(await shareNoteOf(m)).toBe(orig.shareNote);
    expect(await shareNoteOf(st)).toBe(orig.shareNote);
    for (const bad of ['true', 1, null]) {
      const r = await m.put('/api/settings/merchant', { shareOrderNote: bad });
      expect({ bad, status: r.status, code: r.body?.code }).toEqual({ bad, status: 400, code: 'INVALID_INPUT' });
    }
    expect(await shareNoteOf(m)).toBe(orig.shareNote);
  });

  // ------------------------------------------------------------------ print note + bank QR (Outlet.printNote / printBankQr)

  test('SS-PRN-01 owner edits print note and QR of outlet A; manager, staff, inventory read them from /api/outlets and from the order', async () => {
    const orders = await st.listOrders({ limit: '5' });
    expect(orders.length).toBeGreaterThan(0);
    const orderId = orders[0].id;
    const outletOfOrder = async (s) => {
      const d = await must(s.get(`/api/orders/${orderId}`), 'order');
      return (d.order || d).outlet;
    };
    const flipQr = !orig.outletA.printBankQr;
    for (const [note, qr] of [[uniqueName('Ghi chu in'), flipQr], [orig.outletA.printNote ?? '', !flipQr]]) {
      const r = await m.put(`/api/outlets?outletId=${outletA}`, { printNote: note, printBankQr: qr });
      expect(r.status).toBe(200);
      for (const [name, s] of Object.entries({ owner: m, outletAdmin: oa, staff: st, inventory: inv })) {
        const row = await outletRow(s, outletA);
        expect({ role: name, via: 'outlets', note: row.printNote ?? '', qr: row.printBankQr }).toEqual({ role: name, via: 'outlets', note, qr });
        const o = await outletOfOrder(s);
        expect({ role: name, via: 'order', note: o?.printNote ?? '', qr: o?.printBankQr }).toEqual({ role: name, via: 'order', note, qr });
      }
    }
  });

  test('SS-PRN-02 print settings are per outlet: owner edits outlet B, outlet A stays; manager of A cannot touch B (403 FORBIDDEN)', async () => {
    const noteB = uniqueName('Ghi chu B');
    const before = await outletRow(m, outletA);
    expect((await m.put(`/api/outlets?outletId=${outletB}`, { printNote: noteB })).status).toBe(200);
    expect((await outletRow(stB, outletB)).printNote).toBe(noteB);
    expect((await outletRow(oaB, outletB)).printNote).toBe(noteB);
    expect((await outletRow(m, outletA)).printNote ?? '').toBe(before.printNote ?? '');
    const r = await oa.put(`/api/outlets?outletId=${outletB}`, { printNote: 'hack' });
    expect(r.status).toBe(403);
    expect((await outletRow(m, outletB)).printNote).toBe(noteB);
    await m.put(`/api/outlets?outletId=${outletB}`, { printNote: orig.outletB.printNote ?? '' });
  });

  test('SS-PRN-03 staff and inventory cannot edit print settings: 403, value unchanged', async () => {
    const before = await outletRow(m, outletA);
    for (const [name, s] of Object.entries({ staff: st, inventory: inv })) {
      const r = await s.put(`/api/outlets?outletId=${outletA}`, { printNote: `hack-${name}`, printBankQr: !before.printBankQr });
      expect({ role: name, status: r.status }).toEqual({ role: name, status: 403 });
    }
    const after = await outletRow(m, outletA);
    expect({ note: after.printNote ?? '', qr: after.printBankQr }).toEqual({ note: before.printNote ?? '', qr: before.printBankQr });
  });

  test('SS-PRN-04 [today] the manager of the outlet CAN edit its print settings through the API (target rule #1308: owner only, API not changed yet)', async () => {
    const note = uniqueName('QL sua');
    const r = await oa.put(`/api/outlets?outletId=${outletA}`, { printNote: note });
    expect(r.status).toBe(200);
    expect((await outletRow(m, outletA)).printNote).toBe(note);
    expect((await outletRow(st, outletA)).printNote).toBe(note);
    await m.put(`/api/outlets?outletId=${outletA}`, { printNote: orig.outletA.printNote ?? '' });
  });

  // ------------------------------------------------------------------ bank accounts

  describe('bank accounts of outlet A', () => {
    const created = [];
    const account = (suffix) => ({
      accountHolderName: 'NGUYEN VAN E2E',
      accountNumber: `19${Date.now().toString().slice(-8)}${suffix}`,
      bankName: 'Vietcombank',
      bankCode: 'VCB'
    });
    const base = () => `/api/merchants/${merchantId}/outlets/${outletA}/bank-accounts`;
    afterAll(async () => {
      for (const id of created) await request(m.token, 'DELETE', `${base()}/${id}`);
    });

    test('SS-BNK-01 owner adds a bank account; manager, staff, inventory read it', async () => {
      const r = await m.post(base(), account('1'));
      expect(r.status).toBe(201);
      const id = r.body.data.id;
      created.push(id);
      for (const [name, s] of Object.entries({ owner: m, outletAdmin: oa, staff: st, inventory: inv })) {
        const list = await bankList(s, outletA);
        expect({ role: name, seen: list.some((b) => b.id === id) }).toEqual({ role: name, seen: true });
      }
      // another outlet's staff does not see outlet A's accounts through the API scope
      const outside = await stB.get(base());
      expect([403, 404]).toContain(outside.status);
    });

    test('SS-BNK-02 staff and inventory cannot add a bank account: 403, nothing created', async () => {
      const before = (await bankList(m, outletA)).length;
      for (const [name, s] of Object.entries({ staff: st, inventory: inv })) {
        const r = await s.post(base(), account('2'));
        expect({ role: name, status: r.status }).toEqual({ role: name, status: 403 });
      }
      expect((await bankList(m, outletA)).length).toBe(before);
    });

    test('SS-BNK-03 [today] the manager of the outlet CAN add a bank account (target rule: owner only, needs its own issue); outlet B manager is refused', async () => {
      const before = (await bankList(m, outletA)).length;
      const r = await oa.post(base(), account('3'));
      expect(r.status).toBe(201);
      created.push(r.body.data.id);
      expect((await bankList(m, outletA)).some((b) => b.id === r.body.data.id)).toBe(true);
      const foreign = await oaB.post(base(), account('4'));
      expect([403, 404]).toContain(foreign.status); // today 404: the outlet is not visible to another outlet's manager
      expect((await bankList(m, outletA)).length).toBe(before + 1);
    });
  });
});

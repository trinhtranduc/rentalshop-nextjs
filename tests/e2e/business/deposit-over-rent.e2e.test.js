/**
 * BF-DEP (#1490): the deposit is held from booking to return. At hand-over the rent is max(0, total - deposit), so a deposit
 * above the rent never eats into the collateral; at return the excess deposit goes back with the collateral, minus fees.
 * Expected numbers come from the cases the owner approved (2026-11-07), never from the API.
 */
const { Session, describeE2E, futureWindow, rentBody } = require('../helpers/api');

describeE2E('BF-DEP deposit above the rent (#1490)', () => {
  let s;
  beforeAll(async () => {
    s = await Session.login('merchant');
  });

  async function rentOrder({ rent, deposit, collateral }) {
    const product = await s.createProduct({ kind: 'FIXED', price: rent, stock: 2 });
    const customer = await s.createCustomer();
    const w = futureWindow(3);
    const { body } = rentBody({ customer, lines: [{ product }], from: w.from, to: w.to, depositAmount: deposit, securityDeposit: collateral });
    const order = await s.createOrder(body);
    expect(order.totalAmount).toBe(rent);
    expect(order.depositAmount).toBe(deposit);
    return order;
  }
  const hand = (id, collateral) =>
    s.setStatus(id, 'PICKUPED', collateral ? { securityDeposit: collateral, collateralType: 'ID_CARD', collateralDetails: 'CCCD + tien the chan' } : {});

  test('BF-DEP-01 case 2 without collateral: nothing at hand-over, 200.000 back at return, fees come off it', async () => {
    const order = await rentOrder({ rent: 100000, deposit: 300000, collateral: 0 });
    let row = await s.orderRow(order.id);
    expect(row.amountDue).toBe(0);
    expect((await hand(order.id, 0)).status).toBe(200);
    row = await s.orderRow(order.id);
    expect([row.amountDue, row.refundDue]).toEqual([0, 200000]);
    expect((await s.updateOrder(order.id, { lateFee: 50000 })).status).toBe(200);
    row = await s.orderRow(order.id);
    expect([row.amountDue, row.refundDue]).toEqual([0, 150000]);
    expect((await s.updateOrder(order.id, { lateFee: 250000 })).status).toBe(200);
    row = await s.orderRow(order.id);
    expect([row.amountDue, row.refundDue]).toEqual([50000, 0]);
  });

  test('BF-DEP-02 case 2 with collateral: 500.000 asked at hand-over (not 300.000), 700.000 back at return, 650.000 with a 50.000 fee', async () => {
    const order = await rentOrder({ rent: 100000, deposit: 300000, collateral: 500000 });
    let row = await s.orderRow(order.id);
    expect(row.amountDue).toBe(500000);
    expect((await hand(order.id, 500000)).status).toBe(200);
    row = await s.orderRow(order.id);
    expect([row.amountDue, row.refundDue]).toEqual([0, 700000]);
    expect((await s.updateOrder(order.id, { lateFee: 50000 })).status).toBe(200);
    row = await s.orderRow(order.id);
    expect([row.amountDue, row.refundDue]).toEqual([0, 650000]);
  });

  test('BF-DEP-03 case 1 (deposit below the order) is unchanged: 700.000 at hand-over, 500.000 back, 450.000 with a fee', async () => {
    const order = await rentOrder({ rent: 300000, deposit: 100000, collateral: 500000 });
    let row = await s.orderRow(order.id);
    expect(row.amountDue).toBe(700000);
    expect((await hand(order.id, 500000)).status).toBe(200);
    row = await s.orderRow(order.id);
    expect([row.amountDue, row.refundDue]).toEqual([0, 500000]);
    expect((await s.updateOrder(order.id, { lateFee: 50000 })).status).toBe(200);
    row = await s.orderRow(order.id);
    expect([row.amountDue, row.refundDue]).toEqual([0, 450000]);
  });

  test('BF-DEP-04 deposit equal to the rent: nothing to collect, nothing to give back', async () => {
    const order = await rentOrder({ rent: 100000, deposit: 100000, collateral: 0 });
    let row = await s.orderRow(order.id);
    expect(row.amountDue).toBe(0);
    expect((await hand(order.id, 0)).status).toBe(200);
    row = await s.orderRow(order.id);
    expect([row.amountDue, row.refundDue]).toEqual([0, 0]);
  });
});

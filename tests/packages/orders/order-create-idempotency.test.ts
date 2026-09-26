/**
 * Order create idempotency helpers — signature + advisory lock key.
 * Mirrors packages/database/src/order-create-idempotency.ts so the test suite
 * does not need to compile the database package.
 */

const { createHash } = require('crypto');

function orderItemSignature(items) {
  return items
    .map((item) => `${Number(item.productId)}x${Number(item.quantity)}`)
    .sort()
    .join('|');
}

function orderCreateAdvisoryLockKey(params) {
  const payload = [
    params.outletId,
    params.customerId ?? 'null',
    params.createdById,
    params.orderType,
    Math.round(Number(params.totalAmount) * 100),
    orderItemSignature(params.items)
  ].join(':');

  return createHash('sha256').update(payload).digest().readInt32BE(0);
}

describe('order create idempotency', () => {
  it('builds the same item signature regardless of item order', () => {
    const a = orderItemSignature([
      { productId: 2, quantity: 1 },
      { productId: 1, quantity: 3 }
    ]);
    const b = orderItemSignature([
      { productId: 1, quantity: 3 },
      { productId: 2, quantity: 1 }
    ]);
    expect(a).toBe(b);
    expect(a).toBe('1x3|2x1');
  });

  it('uses the same advisory lock key for identical creates', () => {
    const params = {
      outletId: 10,
      customerId: 20,
      createdById: 30,
      orderType: 'RENT',
      totalAmount: 150000.5,
      items: [
        { productId: 1, quantity: 1 },
        { productId: 2, quantity: 2 }
      ]
    };

    expect(orderCreateAdvisoryLockKey(params)).toBe(
      orderCreateAdvisoryLockKey({
        ...params,
        items: [
          { productId: 2, quantity: 2 },
          { productId: 1, quantity: 1 }
        ]
      })
    );
  });

  it('uses different lock keys when composition differs', () => {
    const base = {
      outletId: 10,
      customerId: 20,
      createdById: 30,
      orderType: 'RENT',
      totalAmount: 100000,
      items: [{ productId: 1, quantity: 1 }]
    };

    expect(orderCreateAdvisoryLockKey(base)).not.toBe(
      orderCreateAdvisoryLockKey({ ...base, totalAmount: 100001 })
    );
    expect(orderCreateAdvisoryLockKey(base)).not.toBe(
      orderCreateAdvisoryLockKey({
        ...base,
        items: [{ productId: 1, quantity: 2 }]
      })
    );
  });

  it('normalizes float cents so 100 and 100.0000001 share a lock key', () => {
    const a = orderCreateAdvisoryLockKey({
      outletId: 1,
      customerId: null,
      createdById: 2,
      orderType: 'SALE',
      totalAmount: 100,
      items: [{ productId: 9, quantity: 1 }]
    });
    const b = orderCreateAdvisoryLockKey({
      outletId: 1,
      customerId: null,
      createdById: 2,
      orderType: 'SALE',
      totalAmount: 100.0000001,
      items: [{ productId: 9, quantity: 1 }]
    });
    expect(a).toBe(b);
  });
});

/**
 * Comprehensive Availability Test Cases
 * Brainstormed scenarios covering all edge cases for product rental availability
 * 
 * Formula: effectivelyAvailable = totalStock - conflictingQuantity
 * Overlap: orderPickup < rentalEnd AND orderReturn > rentalStart
 */

// Standard interval overlap check (same as /api/products/[id]/availability)
function hasOverlap(
  orderPickup: Date, orderReturn: Date,
  rentalStart: Date, rentalEnd: Date
): boolean {
  return orderPickup < rentalEnd && orderReturn > rentalStart;
}

interface Order {
  id: number;
  orderType: 'RENT' | 'SALE';
  status: 'RESERVED' | 'PICKUPED' | 'RETURNED' | 'CANCELLED';
  pickupPlanAt: Date;
  returnPlanAt: Date;
  quantity: number;
}

function calculateAvailability(
  totalStock: number,
  orders: Order[],
  rentalStart: Date,
  rentalEnd: Date,
  requestedQty: number,
  excludeOrderId?: number
): { conflictingQty: number; available: number; canFulfill: boolean; conflictOrders: number[] } {
  const activeConflicts = orders.filter(o => {
    if (excludeOrderId && o.id === excludeOrderId) return false;
    if (o.orderType !== 'RENT') return false;
    if (o.status !== 'RESERVED' && o.status !== 'PICKUPED') return false;
    return hasOverlap(o.pickupPlanAt, o.returnPlanAt, rentalStart, rentalEnd);
  });

  const conflictingQty = activeConflicts.reduce((sum, o) => sum + o.quantity, 0);
  const available = Math.max(0, totalStock - conflictingQty);
  return {
    conflictingQty,
    available,
    canFulfill: available >= requestedQty,
    conflictOrders: activeConflicts.map(o => o.id),
  };
}

// ============================================================================
// SCENARIO 1: Basic overlap cases (single order, stock=1)
// ============================================================================
describe('Scenario 1: Single order, stock=1', () => {
  const stock = 1;
  const existingOrder: Order = {
    id: 1, orderType: 'RENT', status: 'RESERVED',
    pickupPlanAt: new Date('2026-07-10T00:00:00Z'),
    returnPlanAt: new Date('2026-07-15T00:00:00Z'),
    quantity: 1,
  };

  it('NO overlap: request completely BEFORE existing order', () => {
    const r = calculateAvailability(stock, [existingOrder],
      new Date('2026-07-01T00:00:00Z'), new Date('2026-07-09T00:00:00Z'), 1);
    expect(r.canFulfill).toBe(true);
    expect(r.conflictingQty).toBe(0);
  });

  it('NO overlap: request completely AFTER existing order', () => {
    const r = calculateAvailability(stock, [existingOrder],
      new Date('2026-07-16T00:00:00Z'), new Date('2026-07-20T00:00:00Z'), 1);
    expect(r.canFulfill).toBe(true);
    expect(r.conflictingQty).toBe(0);
  });

  it('OVERLAP: request starts during existing order', () => {
    const r = calculateAvailability(stock, [existingOrder],
      new Date('2026-07-12T00:00:00Z'), new Date('2026-07-18T00:00:00Z'), 1);
    expect(r.canFulfill).toBe(false);
    expect(r.conflictingQty).toBe(1);
  });

  it('OVERLAP: request ends during existing order', () => {
    const r = calculateAvailability(stock, [existingOrder],
      new Date('2026-07-08T00:00:00Z'), new Date('2026-07-12T00:00:00Z'), 1);
    expect(r.canFulfill).toBe(false);
    expect(r.conflictingQty).toBe(1);
  });

  it('OVERLAP: request completely contains existing order', () => {
    const r = calculateAvailability(stock, [existingOrder],
      new Date('2026-07-05T00:00:00Z'), new Date('2026-07-20T00:00:00Z'), 1);
    expect(r.canFulfill).toBe(false);
    expect(r.conflictingQty).toBe(1);
  });

  it('OVERLAP: existing order completely contains request', () => {
    const r = calculateAvailability(stock, [existingOrder],
      new Date('2026-07-11T00:00:00Z'), new Date('2026-07-14T00:00:00Z'), 1);
    expect(r.canFulfill).toBe(false);
    expect(r.conflictingQty).toBe(1);
  });
});

// ============================================================================
// SCENARIO 2: Boundary conditions (same day pickup/return)
// ============================================================================
describe('Scenario 2: Boundary conditions', () => {
  const stock = 1;
  const order: Order = {
    id: 1, orderType: 'RENT', status: 'RESERVED',
    pickupPlanAt: new Date('2026-07-10T00:00:00Z'),
    returnPlanAt: new Date('2026-07-15T00:00:00Z'),
    quantity: 1,
  };

  it('BOUNDARY: request end = order pickup (same instant) → NO overlap', () => {
    // rentalEnd = orderPickup → orderPickup < rentalEnd? 10 < 10? NO
    const r = calculateAvailability(stock, [order],
      new Date('2026-07-05T00:00:00Z'), new Date('2026-07-10T00:00:00Z'), 1);
    expect(r.canFulfill).toBe(true);
  });

  it('BOUNDARY: request start = order return (same instant) → NO overlap', () => {
    // orderReturn > rentalStart? 15 > 15? NO
    const r = calculateAvailability(stock, [order],
      new Date('2026-07-15T00:00:00Z'), new Date('2026-07-20T00:00:00Z'), 1);
    expect(r.canFulfill).toBe(true);
  });

  it('BOUNDARY: 1ms overlap at start → HAS overlap', () => {
    const r = calculateAvailability(stock, [order],
      new Date('2026-07-05T00:00:00Z'), new Date('2026-07-10T00:00:01Z'), 1);
    // orderPickup(10T00:00:00) < rentalEnd(10T00:00:01)? YES
    // orderReturn(15T00:00:00) > rentalStart(05T00:00:00)? YES
    expect(r.canFulfill).toBe(false);
  });

  it('BOUNDARY: 1ms overlap at end → HAS overlap', () => {
    const r = calculateAvailability(stock, [order],
      new Date('2026-07-14T23:59:59Z'), new Date('2026-07-20T00:00:00Z'), 1);
    // orderPickup(10) < rentalEnd(20)? YES
    // orderReturn(15) > rentalStart(14T23:59:59)? YES
    expect(r.canFulfill).toBe(false);
  });

  it('Same-day rental: order and request on same day', () => {
    const sameDayOrder: Order = {
      id: 2, orderType: 'RENT', status: 'RESERVED',
      pickupPlanAt: new Date('2026-07-10T08:00:00Z'),
      returnPlanAt: new Date('2026-07-10T18:00:00Z'),
      quantity: 1,
    };
    const r = calculateAvailability(stock, [sameDayOrder],
      new Date('2026-07-10T09:00:00Z'), new Date('2026-07-10T17:00:00Z'), 1);
    expect(r.canFulfill).toBe(false); // overlaps within same day
  });
});

// ============================================================================
// SCENARIO 3: Multiple orders, higher stock
// ============================================================================
describe('Scenario 3: Multiple orders, stock=5', () => {
  const stock = 5;
  const orders: Order[] = [
    { id: 1, orderType: 'RENT', status: 'PICKUPED',
      pickupPlanAt: new Date('2026-07-01T00:00:00Z'),
      returnPlanAt: new Date('2026-07-05T00:00:00Z'), quantity: 2 },
    { id: 2, orderType: 'RENT', status: 'RESERVED',
      pickupPlanAt: new Date('2026-07-10T00:00:00Z'),
      returnPlanAt: new Date('2026-07-15T00:00:00Z'), quantity: 3 },
    { id: 3, orderType: 'RENT', status: 'RESERVED',
      pickupPlanAt: new Date('2026-07-20T00:00:00Z'),
      returnPlanAt: new Date('2026-07-25T00:00:00Z'), quantity: 1 },
    { id: 4, orderType: 'RENT', status: 'RETURNED',
      pickupPlanAt: new Date('2026-07-10T00:00:00Z'),
      returnPlanAt: new Date('2026-07-15T00:00:00Z'), quantity: 2 },
  ];

  it('request 06/07-09/07: no active overlap (order 1 ended, order 2 not started)', () => {
    const r = calculateAvailability(stock, orders,
      new Date('2026-07-06T00:00:00Z'), new Date('2026-07-09T00:00:00Z'), 3);
    expect(r.conflictingQty).toBe(0);
    expect(r.available).toBe(5);
    expect(r.canFulfill).toBe(true);
  });

  it('request 03/07-12/07: overlaps order 1 (qty 2) + order 2 (qty 3)', () => {
    const r = calculateAvailability(stock, orders,
      new Date('2026-07-03T00:00:00Z'), new Date('2026-07-12T00:00:00Z'), 1);
    expect(r.conflictingQty).toBe(5); // 2 + 3
    expect(r.available).toBe(0);
    expect(r.canFulfill).toBe(false);
  });

  it('request 12/07-22/07: overlaps order 2 (qty 3) + order 3 (qty 1)', () => {
    const r = calculateAvailability(stock, orders,
      new Date('2026-07-12T00:00:00Z'), new Date('2026-07-22T00:00:00Z'), 1);
    expect(r.conflictingQty).toBe(4); // 3 + 1
    expect(r.available).toBe(1); // 5 - 4
    expect(r.canFulfill).toBe(true);
  });

  it('RETURNED orders never count as conflicts', () => {
    const r = calculateAvailability(stock, orders,
      new Date('2026-07-10T00:00:00Z'), new Date('2026-07-15T00:00:00Z'), 1);
    // Only order 2 (RESERVED, qty 3), NOT order 4 (RETURNED, qty 2)
    expect(r.conflictingQty).toBe(3);
    expect(r.conflictOrders).toEqual([2]);
  });

  it('request qty exceeds remaining stock after conflicts', () => {
    const r = calculateAvailability(stock, orders,
      new Date('2026-07-10T00:00:00Z'), new Date('2026-07-15T00:00:00Z'), 3);
    // available = 5 - 3 = 2, requesting 3
    expect(r.available).toBe(2);
    expect(r.canFulfill).toBe(false);
  });
});

// ============================================================================
// SCENARIO 4: SALE orders behavior
// ============================================================================
describe('Scenario 4: SALE orders do not affect RENT availability', () => {
  const stock = 3;
  const orders: Order[] = [
    { id: 1, orderType: 'SALE', status: 'RESERVED',
      pickupPlanAt: new Date('2026-07-10T00:00:00Z'),
      returnPlanAt: new Date('2026-07-10T00:00:00Z'), quantity: 2 },
    { id: 2, orderType: 'RENT', status: 'RESERVED',
      pickupPlanAt: new Date('2026-07-10T00:00:00Z'),
      returnPlanAt: new Date('2026-07-15T00:00:00Z'), quantity: 1 },
  ];

  it('SALE orders do not count in RENT conflict check', () => {
    const r = calculateAvailability(stock, orders,
      new Date('2026-07-10T00:00:00Z'), new Date('2026-07-15T00:00:00Z'), 2);
    // Only RENT order 2 (qty 1) counts, SALE order 1 ignored
    expect(r.conflictingQty).toBe(1);
    expect(r.available).toBe(2); // 3 - 1
    expect(r.canFulfill).toBe(true);
  });
});

// ============================================================================
// SCENARIO 5: CANCELLED orders behavior
// ============================================================================
describe('Scenario 5: CANCELLED orders never conflict', () => {
  const stock = 1;
  const orders: Order[] = [
    { id: 1, orderType: 'RENT', status: 'CANCELLED',
      pickupPlanAt: new Date('2026-07-10T00:00:00Z'),
      returnPlanAt: new Date('2026-07-15T00:00:00Z'), quantity: 1 },
  ];

  it('CANCELLED order does not block availability', () => {
    const r = calculateAvailability(stock, orders,
      new Date('2026-07-10T00:00:00Z'), new Date('2026-07-15T00:00:00Z'), 1);
    expect(r.conflictingQty).toBe(0);
    expect(r.canFulfill).toBe(true);
  });
});

// ============================================================================
// SCENARIO 6: Edit order (excludeOrderId)
// ============================================================================
describe('Scenario 6: Edit order excludes self', () => {
  const stock = 2;
  const orders: Order[] = [
    { id: 100, orderType: 'RENT', status: 'RESERVED',
      pickupPlanAt: new Date('2026-07-10T00:00:00Z'),
      returnPlanAt: new Date('2026-07-15T00:00:00Z'), quantity: 1 },
    { id: 200, orderType: 'RENT', status: 'RESERVED',
      pickupPlanAt: new Date('2026-07-12T00:00:00Z'),
      returnPlanAt: new Date('2026-07-18T00:00:00Z'), quantity: 1 },
  ];

  it('without exclude: both orders conflict', () => {
    const r = calculateAvailability(stock, orders,
      new Date('2026-07-10T00:00:00Z'), new Date('2026-07-18T00:00:00Z'), 1);
    expect(r.conflictingQty).toBe(2);
    expect(r.available).toBe(0);
    expect(r.canFulfill).toBe(false);
  });

  it('editing order 100: only order 200 conflicts', () => {
    const r = calculateAvailability(stock, orders,
      new Date('2026-07-10T00:00:00Z'), new Date('2026-07-18T00:00:00Z'), 1, 100);
    expect(r.conflictingQty).toBe(1);
    expect(r.available).toBe(1); // 2 - 1
    expect(r.canFulfill).toBe(true);
  });

  it('editing order 200: only order 100 conflicts', () => {
    const r = calculateAvailability(stock, orders,
      new Date('2026-07-10T00:00:00Z'), new Date('2026-07-18T00:00:00Z'), 1, 200);
    expect(r.conflictingQty).toBe(1);
    expect(r.available).toBe(1);
    expect(r.canFulfill).toBe(true);
  });

  it('editing order 100, increase qty to 2: order 200 still conflicts', () => {
    const r = calculateAvailability(stock, orders,
      new Date('2026-07-10T00:00:00Z'), new Date('2026-07-18T00:00:00Z'), 2, 100);
    expect(r.conflictingQty).toBe(1); // order 200 qty=1
    expect(r.available).toBe(1); // 2 - 1 = 1
    expect(r.canFulfill).toBe(false); // 1 < 2
  });
});

// ============================================================================
// SCENARIO 7: Long rental period (weeks/months)
// ============================================================================
describe('Scenario 7: Long rental periods', () => {
  const stock = 3;
  const orders: Order[] = [
    { id: 1, orderType: 'RENT', status: 'RESERVED',
      pickupPlanAt: new Date('2026-07-01T00:00:00Z'),
      returnPlanAt: new Date('2026-07-05T00:00:00Z'), quantity: 1 },
    { id: 2, orderType: 'RENT', status: 'RESERVED',
      pickupPlanAt: new Date('2026-08-01T00:00:00Z'),
      returnPlanAt: new Date('2026-08-10T00:00:00Z'), quantity: 2 },
    { id: 3, orderType: 'RENT', status: 'PICKUPED',
      pickupPlanAt: new Date('2026-09-01T00:00:00Z'),
      returnPlanAt: new Date('2026-09-30T00:00:00Z'), quantity: 1 },
  ];

  it('3-month rental overlaps all 3 orders', () => {
    const r = calculateAvailability(stock, orders,
      new Date('2026-07-01T00:00:00Z'), new Date('2026-09-30T00:00:00Z'), 1);
    expect(r.conflictingQty).toBe(4); // 1 + 2 + 1
    expect(r.available).toBe(0);
    expect(r.canFulfill).toBe(false);
  });

  it('1-month rental in July overlaps only order 1', () => {
    const r = calculateAvailability(stock, orders,
      new Date('2026-07-01T00:00:00Z'), new Date('2026-07-31T00:00:00Z'), 2);
    expect(r.conflictingQty).toBe(1);
    expect(r.available).toBe(2); // 3 - 1
    expect(r.canFulfill).toBe(true);
  });

  it('gap between orders: 06/07-31/07 → no conflicts', () => {
    const r = calculateAvailability(stock, orders,
      new Date('2026-07-06T00:00:00Z'), new Date('2026-07-31T00:00:00Z'), 3);
    expect(r.conflictingQty).toBe(0);
    expect(r.available).toBe(3);
    expect(r.canFulfill).toBe(true);
  });
});

// ============================================================================
// SCENARIO 8: Zero stock / Full stock
// ============================================================================
describe('Scenario 8: Edge stock values', () => {
  it('stock=0: always unavailable', () => {
    const r = calculateAvailability(0, [],
      new Date('2026-07-10T00:00:00Z'), new Date('2026-07-15T00:00:00Z'), 1);
    expect(r.available).toBe(0);
    expect(r.canFulfill).toBe(false);
  });

  it('stock=100, no orders: fully available', () => {
    const r = calculateAvailability(100, [],
      new Date('2026-07-10T00:00:00Z'), new Date('2026-07-15T00:00:00Z'), 50);
    expect(r.available).toBe(100);
    expect(r.canFulfill).toBe(true);
  });

  it('conflicts exceed stock: available = 0 (not negative)', () => {
    const orders: Order[] = [
      { id: 1, orderType: 'RENT', status: 'RESERVED',
        pickupPlanAt: new Date('2026-07-10T00:00:00Z'),
        returnPlanAt: new Date('2026-07-15T00:00:00Z'), quantity: 10 },
    ];
    const r = calculateAvailability(3, orders,
      new Date('2026-07-10T00:00:00Z'), new Date('2026-07-15T00:00:00Z'), 1);
    expect(r.available).toBe(0); // max(0, 3-10)
    expect(r.canFulfill).toBe(false);
  });
});

// ============================================================================
// SCENARIO 9: Real-world rental shop cases (Vietnamese timezone)
// ============================================================================
describe('Scenario 9: Real-world cases (VN timezone UTC+7)', () => {
  const stock = 3;

  it('Áo dài: stock=1, rented 04/05-07/05, new order 10/05-15/10 → available', () => {
    const orders: Order[] = [
      { id: 1, orderType: 'RENT', status: 'PICKUPED',
        pickupPlanAt: new Date('2026-05-03T17:00:00Z'), // 04/05 VN
        returnPlanAt: new Date('2026-05-06T17:00:00Z'), // 07/05 VN
        quantity: 1 },
    ];
    const r = calculateAvailability(1, orders,
      new Date('2026-05-09T17:00:00Z'),  // 10/05 VN
      new Date('2026-10-14T17:00:00Z'),  // 15/10 VN
      1);
    expect(r.canFulfill).toBe(true);
  });

  it('AD quả kem: stock=3, multiple orders, request 08/07-20/07 qty=1', () => {
    const orders: Order[] = [
      { id: 1, orderType: 'RENT', status: 'PICKUPED',
        pickupPlanAt: new Date('2026-06-30T17:00:00Z'), // 01/07 VN
        returnPlanAt: new Date('2026-07-04T17:00:00Z'), // 05/07 VN
        quantity: 1 },
      { id: 2, orderType: 'RENT', status: 'RESERVED',
        pickupPlanAt: new Date('2026-07-16T17:00:00Z'), // 17/07 VN
        returnPlanAt: new Date('2026-07-19T17:00:00Z'), // 20/07 VN
        quantity: 2 },
      { id: 3, orderType: 'RENT', status: 'RESERVED',
        pickupPlanAt: new Date('2026-07-29T17:00:00Z'), // 30/07 VN
        returnPlanAt: new Date('2026-08-02T17:00:00Z'), // 03/08 VN
        quantity: 2 },
    ];
    const r = calculateAvailability(3, orders,
      new Date('2026-07-07T17:00:00Z'),  // 08/07 VN
      new Date('2026-07-19T17:00:00Z'),  // 20/07 VN
      1);
    // Only order 2 overlaps: 17/07 < 20/07 AND 20/07 > 08/07
    expect(r.conflictingQty).toBe(2);
    expect(r.available).toBe(1); // 3 - 2
    expect(r.canFulfill).toBe(true);
  });

  it('AD sui hồng: stock=1, edit order 725881 (31/07-03/08) same dates → no conflict', () => {
    const orders: Order[] = [
      { id: 725881, orderType: 'RENT', status: 'RESERVED',
        pickupPlanAt: new Date('2026-07-30T17:00:00Z'), // 31/07 VN
        returnPlanAt: new Date('2026-08-02T17:00:00Z'), // 03/08 VN
        quantity: 1 },
      { id: 309990, orderType: 'RENT', status: 'RESERVED',
        pickupPlanAt: new Date('2026-08-06T17:00:00Z'), // 07/08 VN
        returnPlanAt: new Date('2026-08-09T17:00:00Z'), // 10/08 VN
        quantity: 1 },
    ];
    const r = calculateAvailability(1, orders,
      new Date('2026-07-30T17:00:00Z'), // 31/07 VN
      new Date('2026-08-02T17:00:00Z'), // 03/08 VN
      1, 725881); // exclude self
    expect(r.conflictingQty).toBe(0);
    expect(r.canFulfill).toBe(true);
  });

  it('Back-to-back rentals: return same day as next pickup → NO overlap', () => {
    // Customer A returns at 10/07 00:00, Customer B picks up at 10/07 00:00
    const orders: Order[] = [
      { id: 1, orderType: 'RENT', status: 'RESERVED',
        pickupPlanAt: new Date('2026-07-08T00:00:00Z'),
        returnPlanAt: new Date('2026-07-10T00:00:00Z'), quantity: 1 },
    ];
    const r = calculateAvailability(1, orders,
      new Date('2026-07-10T00:00:00Z'), // starts exactly when order 1 ends
      new Date('2026-07-12T00:00:00Z'), 1);
    // orderReturn(10) > rentalStart(10)? NO (not strictly greater)
    expect(r.canFulfill).toBe(true);
  });
});

// ============================================================================
// SCENARIO 10: Mixed statuses and order types
// ============================================================================
describe('Scenario 10: Mixed statuses', () => {
  const stock = 5;
  const orders: Order[] = [
    { id: 1, orderType: 'RENT', status: 'RESERVED', quantity: 1,
      pickupPlanAt: new Date('2026-07-10T00:00:00Z'),
      returnPlanAt: new Date('2026-07-15T00:00:00Z') },
    { id: 2, orderType: 'RENT', status: 'PICKUPED', quantity: 2,
      pickupPlanAt: new Date('2026-07-10T00:00:00Z'),
      returnPlanAt: new Date('2026-07-15T00:00:00Z') },
    { id: 3, orderType: 'RENT', status: 'RETURNED', quantity: 3,
      pickupPlanAt: new Date('2026-07-10T00:00:00Z'),
      returnPlanAt: new Date('2026-07-15T00:00:00Z') },
    { id: 4, orderType: 'RENT', status: 'CANCELLED', quantity: 2,
      pickupPlanAt: new Date('2026-07-10T00:00:00Z'),
      returnPlanAt: new Date('2026-07-15T00:00:00Z') },
    { id: 5, orderType: 'SALE', status: 'RESERVED', quantity: 1,
      pickupPlanAt: new Date('2026-07-10T00:00:00Z'),
      returnPlanAt: new Date('2026-07-10T00:00:00Z') },
  ];

  it('only RESERVED + PICKUPED RENT orders count', () => {
    const r = calculateAvailability(stock, orders,
      new Date('2026-07-10T00:00:00Z'), new Date('2026-07-15T00:00:00Z'), 1);
    // Order 1 (RESERVED, qty 1) + Order 2 (PICKUPED, qty 2) = 3
    // Order 3 (RETURNED) → skip
    // Order 4 (CANCELLED) → skip
    // Order 5 (SALE) → skip
    expect(r.conflictingQty).toBe(3);
    expect(r.available).toBe(2); // 5 - 3
    expect(r.conflictOrders).toEqual([1, 2]);
  });
});

// ============================================================================
// SCENARIO 11: Consecutive non-overlapping orders fill entire month
// ============================================================================
describe('Scenario 11: Dense schedule, finding gaps', () => {
  const stock = 1;
  const orders: Order[] = [
    { id: 1, orderType: 'RENT', status: 'RESERVED', quantity: 1,
      pickupPlanAt: new Date('2026-07-01T00:00:00Z'),
      returnPlanAt: new Date('2026-07-05T00:00:00Z') },
    { id: 2, orderType: 'RENT', status: 'RESERVED', quantity: 1,
      pickupPlanAt: new Date('2026-07-05T00:00:00Z'),
      returnPlanAt: new Date('2026-07-10T00:00:00Z') },
    { id: 3, orderType: 'RENT', status: 'RESERVED', quantity: 1,
      pickupPlanAt: new Date('2026-07-15T00:00:00Z'),
      returnPlanAt: new Date('2026-07-20T00:00:00Z') },
  ];

  it('gap 10/07-15/07: available (between order 2 and 3)', () => {
    const r = calculateAvailability(stock, orders,
      new Date('2026-07-10T00:00:00Z'), new Date('2026-07-15T00:00:00Z'), 1);
    // order 2: return=10/07, rentalStart=10/07 → 10 > 10? NO → no overlap
    // order 3: pickup=15/07, rentalEnd=15/07 → 15 < 15? NO → no overlap
    expect(r.canFulfill).toBe(true);
  });

  it('gap 10/07-15/07 with 1ms extension → overlaps order 3', () => {
    const r = calculateAvailability(stock, orders,
      new Date('2026-07-10T00:00:00Z'), new Date('2026-07-15T00:00:01Z'), 1);
    // order 3: pickup=15/07 < rentalEnd=15/07T00:00:01? YES → overlap!
    expect(r.canFulfill).toBe(false);
  });

  it('01/07-20/07 spans all orders → unavailable', () => {
    const r = calculateAvailability(stock, orders,
      new Date('2026-07-01T00:00:00Z'), new Date('2026-07-20T00:00:00Z'), 1);
    expect(r.conflictingQty).toBe(3); // all 3 overlap
    expect(r.canFulfill).toBe(false);
  });
});

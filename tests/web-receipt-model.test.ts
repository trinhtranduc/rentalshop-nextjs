/**
 * #562 shop web Hoá đơn: the lines the slip prints. Per-day lines carry the rental days, money is VND
 * ("2.600.000đ"), days are Vietnam civil days and times Vietnam time — under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  buildReceipt,
  formatVnd,
  formatVnDateTime,
  formatVnDay,
  itemCalcText,
  resolvePrintNote,
  type ReceiptOrderInput,
} from '../apps/client/app/orders/receipt/receipt-model';

const VI = { perDay: '/ngày', days: '{n} ngày', perHour: '/giờ', hours: '{n} giờ' };

// Order 694224 as GET /api/orders/by-number returns it (pickup 17/10, return 11/11 VN days)
const rent: ReceiptOrderInput = {
  orderNumber: '694224',
  orderType: 'RENT',
  createdAt: '2026-10-06T16:02:18.867Z', // 23:02 on 06/10 in Vietnam
  pickupPlanAt: '2026-10-16T17:00:00.000Z',
  returnPlanAt: '2026-11-10T17:00:00.000Z',
  customer: { firstName: 'Agent2', lastName: 'Thử Nghiệm', phone: '0999226856' },
  outlet: { name: 'Rental Shop Demo - Main Branch', printNote: null },
  orderItems: [
    { quantity: 1, unitPrice: 100000, totalPrice: 2600000, rentalDays: 26, pricingType: 'DAILY', productName: null, product: { name: 'Máy xay' } },
    { quantity: 2, unitPrice: 150000, totalPrice: 300000, rentalDays: 1, pricingType: 'FIXED', productName: 'Áo dài đỏ', notes: 'size M' },
  ],
  totalAmount: 2610000,
  discountType: 'percentage',
  discountValue: 10,
  discountAmount: 290000,
  depositAmount: 500000,
  securityDeposit: 2000000,
  collateralType: 'ID_CARD',
  collateralDetails: '0123456789',
  notes: '  Giao trước 9h ',
};

describe('formatVnd', () => {
  it('prints dot thousands and đ', () => {
    expect(formatVnd(2600000)).toBe('2.600.000đ');
    expect(formatVnd(100000)).toBe('100.000đ');
    expect(formatVnd(103)).toBe('103đ');
    expect(formatVnd(0)).toBe('0đ');
    expect(formatVnd(null)).toBe('0đ');
    expect(formatVnd(1234.6)).toBe('1.235đ');
    expect(formatVnd(-50000)).toBe('-50.000đ');
  });
});

describe('Vietnam day and time', () => {
  it('pickup / return are the Vietnam civil day of the stored UTC start', () => {
    expect(formatVnDay('2026-10-16T17:00:00.000Z')).toBe('17/10/2026');
    expect(formatVnDay('2026-11-10T17:00:00.000Z')).toBe('11/11/2026');
  });
  it('created time is Vietnam time, rolling the day over', () => {
    expect(formatVnDateTime('2026-10-06T16:02:18.867Z')).toBe('06/10/2026 23:02');
    expect(formatVnDateTime('2026-10-06T17:30:00.000Z')).toBe('07/10/2026 00:30');
  });
  it('empty or invalid → empty text', () => {
    expect(formatVnDay(null)).toBe('');
    expect(formatVnDateTime('nope')).toBe('');
  });
});

describe('itemCalcText', () => {
  it('a daily rent line carries the days (was "1 x 100,000 = 2,600,000")', () => {
    expect(itemCalcText(rent.orderItems![0], true, VI)).toBe('1 × 100.000đ/ngày × 26 ngày = 2.600.000đ');
  });
  it('a daily line without rentalDays derives them from the total', () => {
    expect(itemCalcText({ quantity: 2, unitPrice: 50000, totalPrice: 300000, pricingType: 'DAILY' }, true, VI)).toBe(
      '2 × 50.000đ/ngày × 3 ngày = 300.000đ'
    );
  });
  it('a per-rental line is quantity × price', () => {
    expect(itemCalcText({ quantity: 1, unitPrice: 100000, totalPrice: 100000, pricingType: 'FIXED' }, true, VI)).toBe('1 × 100.000đ = 100.000đ');
  });
  it('an hourly line shows the hours when it is more than one', () => {
    expect(itemCalcText({ quantity: 1, unitPrice: 20000, totalPrice: 60000, pricingType: 'HOURLY' }, true, VI)).toBe('1 × 20.000đ/giờ × 3 giờ = 60.000đ');
  });
  it('a sale line never shows days', () => {
    expect(itemCalcText({ quantity: 3, unitPrice: 10000, totalPrice: 30000, pricingType: 'DAILY' }, false, VI)).toBe('3 × 10.000đ = 30.000đ');
  });
});

describe('buildReceipt', () => {
  const r = buildReceipt(rent, { merchant: { name: 'Shop', phone: '0900000000', address: '1 Lê Lợi' } }, VI);

  it('header: outlet name, then merchant phone / address when the outlet has none', () => {
    expect(r.shop).toEqual({ name: 'Rental Shop Demo - Main Branch', phone: '0900000000', address: '1 Lê Lợi' });
    expect(r.orderNumber).toBe('694224');
    expect(r.customer).toEqual({ name: 'Agent2 Thử Nghiệm', phone: '0999226856' });
  });

  it('RENT rows in iOS order: cọc, thế chân, giấy tờ, ngày thuê, ngày trả, ngày tạo', () => {
    expect(r.rows).toEqual([
      { key: 'deposit', value: '500.000đ' },
      { key: 'securityDeposit', value: '2.000.000đ' },
      { key: 'collateral', value: '0123456789', collateralType: 'ID_CARD' },
      { key: 'rentDate', value: '17/10/2026' },
      { key: 'returnDate', value: '11/11/2026' },
      { key: 'createdAt', value: '06/10/2026 23:02' },
    ]);
  });

  it('no deposit → value null ("Không cọc"); damage fee printed when set; "Other" collateral without details hidden', () => {
    const x = buildReceipt({ ...rent, depositAmount: 0, securityDeposit: 0, collateralType: 'Other', collateralDetails: '', damageFee: 70000 }, {}, VI);
    expect(x.rows.map((row) => [row.key, row.value])).toEqual([
      ['deposit', null],
      ['damageFee', '70.000đ'],
      ['rentDate', '17/10/2026'],
      ['returnDate', '11/11/2026'],
      ['createdAt', '06/10/2026 23:02'],
    ]);
  });

  it('items, order note, totals with a percentage discount', () => {
    expect(r.items).toEqual([
      { index: 1, name: 'Máy xay', note: '', calc: '1 × 100.000đ/ngày × 26 ngày = 2.600.000đ' },
      { index: 2, name: 'Áo dài đỏ', note: 'size M', calc: '2 × 150.000đ = 300.000đ' },
    ]);
    expect(r.note).toBe('Giao trước 9h');
    expect(r.subtotal).toBe('2.900.000đ');
    expect(r.discount).toBe('290.000đ');
    expect(r.discountPercent).toBe(10);
    expect(r.total).toBe('2.610.000đ');
    expect(r.loyaltyDiscount).toBeNull();
  });

  it('amount discount has no percent; loyalty discount shown; no items → subtotal = total + discounts (#352)', () => {
    const x = buildReceipt({ ...rent, orderItems: [], discountType: 'amount', discountValue: 50000, discountAmount: 50000, loyaltyDiscount: 10000, totalAmount: 940000 }, {}, VI);
    expect(x.discountPercent).toBeNull();
    expect(x.loyaltyDiscount).toBe('10.000đ');
    expect(x.subtotal).toBe('1.000.000đ');
    expect(x.total).toBe('940.000đ');
  });

  it('SALE: only Ngày tạo, no print note, no days on lines', () => {
    const x = buildReceipt({ ...rent, orderType: 'SALE', outlet: { name: 'A', printNote: 'Mang CMND' } }, {}, VI);
    expect(x.isRent).toBe(false);
    expect(x.rows).toEqual([{ key: 'createdAt', value: '06/10/2026 23:02' }]);
    expect(x.printNote).toBeNull();
    expect(x.items[0].calc).toBe('1 × 100.000đ = 2.600.000đ');
  });

  it('just-created order: flattened customer, outletName, outlet details loaded by the dialog', () => {
    const created: ReceiptOrderInput = {
      orderNumber: '123456',
      orderType: 'RENT',
      customerName: 'Lan',
      customerPhone: '0911',
      outletName: 'Chi nhánh 1',
      createdAt: '2026-10-06T02:00:00.000Z',
      totalAmount: 0,
    };
    const x = buildReceipt(created, { outlet: { name: 'Chi nhánh 1', printNote: 'Mang CCCD' }, outletDetails: { phone: '028 1234', address: '12 Hai Bà Trưng' } }, VI);
    expect(x.shop).toEqual({ name: 'Chi nhánh 1', phone: '028 1234', address: '12 Hai Bà Trưng' });
    expect(x.customer).toEqual({ name: 'Lan', phone: '0911' });
    expect(x.printNote).toBe('Mang CCCD');
    expect(x.rows.map((row) => row.key)).toEqual(['deposit', 'createdAt']);
  });

  it('walk-in customer → empty name', () => {
    expect(buildReceipt({ ...rent, customer: null, customerName: null }, {}, VI).customer.name).toBe('');
  });
});

describe('resolvePrintNote (#347)', () => {
  it('order outlet wins, then the outlet prop; blank → none; SALE → none', () => {
    expect(resolvePrintNote({ orderType: 'RENT', outlet: { printNote: '*** Mang CMND' } }, { printNote: 'other' })).toBe('*** Mang CMND');
    expect(resolvePrintNote({ orderType: 'RENT' }, { printNote: 'Dòng 1\nDòng 2' })).toBe('Dòng 1\nDòng 2');
    expect(resolvePrintNote({ orderType: 'RENT', outlet: { printNote: '   ' } }, null)).toBeNull();
    expect(resolvePrintNote({ orderType: 'SALE', outlet: { printNote: 'x' } })).toBeNull();
  });
});

/** #626 Phiếu in previews: the sample bill fills every line; dates stay on the Vietnam day. */
import { describe, expect, it } from '@jest/globals';
import { sampleLabels, sampleReceiptOrder } from '../apps/client/app/settings/print-preview-model';
import { buildReceipt } from '../apps/client/app/orders/receipt/receipt-model';
import { code128Bars } from '../apps/client/app/products/labels/code128';

const WORDS = { perDay: '/ngày', days: '{n} ngày', perHour: '/giờ', hours: '{n} giờ' };

describe('sample bill (#626)', () => {
  it('fills shop, customer, dates, items, money and the note being typed', () => {
    const m = buildReceipt(
      sampleReceiptOrder('2026-10-31'),
      { outlet: { name: 'Chi nhánh 1', phone: '028 1234 5678', address: '12 Lê Lợi', printNote: 'Mang CCCD khi lấy đồ' } },
      WORDS,
    );
    expect(m.isRent).toBe(true);
    expect(m.shop).toMatchObject({ name: 'Chi nhánh 1', phone: '028 1234 5678', address: '12 Lê Lợi' });
    expect(m.customer.name).toContain('Lan');
    expect(m.items).toHaveLength(2);
    expect(m.total).toBe('540.000đ');
    expect(m.printNote).toBe('Mang CCCD khi lấy đồ');
    const rows = Object.fromEntries(m.rows.map((r) => [r.key, r.value]));
    // month end rolls over: pickup 01/11, return 03/11 on the Vietnam day
    expect(rows.rentDate).toContain('01/11/2026');
    expect(rows.returnDate).toContain('03/11/2026');
    expect(rows.collateral !== undefined).toBe(true);
  });

  it('gives one scannable sample label per position', () => {
    expect(sampleLabels(1)).toHaveLength(1);
    expect(sampleLabels(2)).toHaveLength(2);
    expect(sampleLabels(0)).toHaveLength(1);
    expect(code128Bars(sampleLabels(1)[0].code)).not.toBeNull();
  });
});

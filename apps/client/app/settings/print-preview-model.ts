/**
 * Sample data for the Phiếu in previews and test prints (#626). Pure, no @rentalshop/* imports, so Jest loads it.
 * Dates are Vietnam civil days built from a `YYYY-MM-DD` key, written with the +07:00 offset.
 */
import type { ReceiptOrderInput } from '../orders/receipt/receipt-model';
import type { PrintLabel } from '../products/labels/labels-model';

function addDaysKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}

/** A rental with every bill line filled: customer, 3 days, 2 items, 10% discount, deposit, collateral. */
export function sampleReceiptOrder(todayKey: string): ReceiptOrderInput {
  return {
    orderNumber: '123456',
    orderType: 'RENT',
    createdAt: `${todayKey}T09:30:00+07:00`,
    pickupPlanAt: `${addDaysKey(todayKey, 1)}T09:00:00+07:00`,
    returnPlanAt: `${addDaysKey(todayKey, 3)}T18:00:00+07:00`,
    customer: { firstName: 'Nguyễn Thị', lastName: 'Lan', phone: '0901 234 567' },
    orderItems: [
      { productName: 'Áo dài cưới đỏ – size M', quantity: 1, unitPrice: 150000, rentalDays: 3, totalPrice: 450000, pricingType: 'DAILY' },
      { productName: 'Vương miện cô dâu', quantity: 1, unitPrice: 50000, rentalDays: 3, totalPrice: 150000, pricingType: 'DAILY' },
    ],
    totalAmount: 540000,
    discountType: 'percentage',
    discountValue: 10,
    discountAmount: 60000,
    depositAmount: 200000,
    securityDeposit: 500000,
    collateralType: 'ID_CARD',
  };
}

/** One sample label per position on the page (2 on a 2-up roll). */
export function sampleLabels(perRow: number): PrintLabel[] {
  return Array.from({ length: Math.max(1, perRow) }, (_, i) => ({ key: `sample-${i}`, name: 'Áo dài cưới đỏ – size M', code: 'SP000123' }));
}

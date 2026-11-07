/**
 * #1491: doanh thu của đơn thường (không có kế hoạch cọc) bị hủy khi chưa giao và shop giữ phụ thu.
 * Chạy dưới TZ=UTC và TZ=Asia/Ho_Chi_Minh: ngày tính theo giờ Việt Nam.
 *
 * Ví dụ chuẩn: đơn 300.000, tạo 05/01, hủy 08/01.
 *   cọc 300.000, phụ thu 100.000 -> 05/01 thu 300.000, 08/01 hoàn 200.000, doanh thu đơn 100.000
 *   cọc 100.000, phụ thu 100.000 -> 05/01 thu 100.000, không hoàn, doanh thu đơn 100.000
 *   phụ thu 0 (hoặc không gửi)   -> hoàn hết như trước, doanh thu đơn 0
 */
import { calculateOrderRevenueByStatus, getOrderRevenueEvents, shopDayKey } from '../packages/utils/src/core/revenue-calculator';
import { toRevenueOrderData } from '../packages/utils/src/core/revenue-mapping';

const at = (iso: string) => new Date(iso);

/** A plain RENT order row (no deposit plan, no stage payments) as the analytics `select` returns it */
function row(fields: Record<string, any> = {}) {
  return {
    orderType: 'RENT', status: 'CANCELLED', totalAmount: 300_000, depositAmount: 300_000, securityDeposit: 0,
    damageFee: 0, lateFee: 0, pickupTotalAmount: null,
    createdAt: at('2026-01-05T03:00:00Z'), pickupPlanAt: at('2026-01-10T03:00:00Z'), returnPlanAt: at('2026-01-12T03:00:00Z'),
    pickedUpAt: null, returnedAt: null, updatedAt: at('2026-01-08T03:00:00Z'), cancelledAt: at('2026-01-08T03:00:00Z'),
    depositPlan: null, cancelKeptAmount: null, payments: [],
    ...fields,
  };
}

function byDay(events: Array<{ date: Date; revenue: number }>) {
  const days: Record<string, number> = {};
  for (const e of events) days[shopDayKey(e.date)] = (days[shopDayKey(e.date)] || 0) + e.revenue;
  return days;
}
const sum = (events: Array<{ revenue: number }>) => events.reduce((s, e) => s + e.revenue, 0);
const events = (r: Record<string, any>) => getOrderRevenueEvents(toRevenueOrderData(r as any));
const byStatus = (r: Record<string, any>) => calculateOrderRevenueByStatus(toRevenueOrderData(r as any));

describe('cancelling an order that was not handed over, with a fee (#1491)', () => {
  it('case A: deposit 300.000, fee 100.000: 200.000 goes back on 08/01, the order keeps 100.000', () => {
    const r = row({ cancelKeptAmount: 100_000 });
    expect(byDay(events(r))).toEqual({ '2026-01-05': 300_000, '2026-01-08': -200_000 });
    expect(sum(events(r))).toBe(100_000);
    expect(byStatus(r)).toBe(100_000);
  });

  it('case B: deposit 100.000, fee 100.000: nothing goes back, no cancel event', () => {
    const r = row({ depositAmount: 100_000, cancelKeptAmount: 100_000 });
    expect(byDay(events(r))).toEqual({ '2026-01-05': 100_000 });
    expect(events(r).some((e) => e.revenueType === 'RENT_CANCELLED')).toBe(false);
    expect(byStatus(r)).toBe(100_000);
  });

  it('case D: fee 0 or none (old apps): everything goes back, the order has no revenue', () => {
    for (const kept of [0, null]) {
      const r = row({ cancelKeptAmount: kept });
      expect(byDay(events(r))).toEqual({ '2026-01-05': 300_000, '2026-01-08': -300_000 });
      expect(sum(events(r))).toBe(0);
      expect(byStatus(r)).toBe(0);
    }
  });

  it('a fee above the deposit is capped at the deposit (the API refuses it, the calculator never goes negative)', () => {
    const r = row({ depositAmount: 100_000, cancelKeptAmount: 300_000 });
    expect(sum(events(r))).toBe(100_000);
    expect(byStatus(r)).toBe(100_000);
  });

  it('the cancel day comes from updatedAt as before: a fee does not move the deposit day', () => {
    const r = row({ cancelKeptAmount: 100_000, updatedAt: at('2026-01-09T17:30:00Z'), cancelledAt: at('2026-01-09T17:30:00Z') });
    // 17:30Z on 09/01 is 00:30 on 10/01 in Vietnam
    expect(byDay(events(r))).toEqual({ '2026-01-05': 300_000, '2026-01-10': -200_000 });
  });

  it('a fee is ignored for an order that was handed over (the API never stores one)', () => {
    const r = row({ pickedUpAt: at('2026-01-10T03:00:00Z'), updatedAt: at('2026-01-11T03:00:00Z'), cancelledAt: at('2026-01-11T03:00:00Z'), cancelKeptAmount: 100_000 });
    expect(sum(events(r))).toBeGreaterThanOrEqual(0);
  });
});

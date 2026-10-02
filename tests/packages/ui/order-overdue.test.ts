/**
 * Order detail: a picked-up rental past its return day shows "Trễ n ngày" (Vietnam civil days).
 */
import { overdueDays } from '../../../packages/ui/src/components/features/OrderDetail/order-dates';

const now = new Date('2026-10-02T05:00:00.000Z'); // 12:00 on 02/10 in Vietnam

describe('overdueDays', () => {
  it('counts whole Vietnam days after the return day', () => {
    expect(overdueDays({ status: 'PICKUPED', returnPlanAt: '2026-09-29T10:00:00.000Z' }, now)).toBe(3);
  });

  it('due today is not late', () => {
    expect(overdueDays({ status: 'PICKUPED', returnPlanAt: '2026-10-02T10:00:00.000Z' }, now)).toBe(0);
  });

  it('a return at 23:30 on 01/10 Vietnam time (16:30Z) is one day late on 02/10', () => {
    expect(overdueDays({ status: 'PICKUPED', returnPlanAt: '2026-10-01T16:30:00.000Z' }, now)).toBe(1);
  });

  it('only picked-up rentals can be late', () => {
    expect(overdueDays({ status: 'RESERVED', returnPlanAt: '2026-09-29T10:00:00.000Z' }, now)).toBe(0);
    expect(overdueDays({ status: 'RETURNED', returnPlanAt: '2026-09-29T10:00:00.000Z' }, now)).toBe(0);
  });
});

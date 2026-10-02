import { shopDateKey } from '../Availability/availability-days';

const DAY_MS = 24 * 60 * 60 * 1000;
const keyToMs = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Whole Vietnam civil days a picked-up rental is past its return day; 0 when not late. */
export function overdueDays(order: { status?: string | null; returnPlanAt?: string | Date | null }, now: Date = new Date()): number {
  if (order.status !== 'PICKUPED' || !order.returnPlanAt) return 0;
  const due = shopDateKey(order.returnPlanAt);
  const today = shopDateKey(now);
  if (!due || !today) return 0;
  return Math.max(0, Math.round((keyToMs(today) - keyToMs(due)) / DAY_MS));
}

/**
 * #526 shop web Khách hàng: pure mapping from `GET /api/customers` rows to what the list draws,
 * plus the page selection rules. No React and no app imports, so it runs in Jest under any TZ.
 */
import { isDayKey } from '../dashboard/overview-model';
import { parsePage, parsePageSize, PAGE_SIZES, DEFAULT_PAGE_SIZE } from '../orders/orders-model';

export { parsePage, parsePageSize, PAGE_SIZES, DEFAULT_PAGE_SIZE };

export interface CustomerRowLike {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  orderCount?: number | null;
  createdAt?: string | Date | null;
}

/** "Chọn cả N khách" fetches every id in one request and sends them in the export URL. */
export const MAX_SELECT_ALL = 500;

export function parseQuery(raw: string | null | undefined): string {
  return (raw || '').trim().slice(0, 100);
}

export function customerName(c: Pick<CustomerRowLike, 'firstName' | 'lastName'>): string {
  return [c.firstName, c.lastName]
    .map((s) => (s || '').trim())
    .filter(Boolean)
    .join(' ');
}

/** Two letters for the avatar: the last two words ("Vũ Hải Yến" → "HY"), else the first letters of one word. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join('').toUpperCase();
  return words
    .slice(-2)
    .map((w) => Array.from(w)[0])
    .join('')
    .toUpperCase();
}

/** Vietnamese phone grouping: 0912555018 → "0912 555 018"; anything else is shown as typed. */
export function formatPhone(phone: string | null | undefined): string {
  const raw = (phone || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!raw.startsWith('+') && digits.length === 10) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  if (!raw.startsWith('+') && digits.length === 11) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  return raw;
}

export function addressLine(c: Pick<CustomerRowLike, 'address' | 'city' | 'state'>): string {
  const parts: string[] = [];
  for (const p of [c.address, c.city, c.state]) {
    const s = (p || '').trim();
    if (s && !parts.includes(s)) parts.push(s);
  }
  return parts.join(', ');
}

/** "dd/mm/yyyy" of a Vietnam day key. */
export function dayText(key: string | null | undefined): string {
  if (!key || !isDayKey(key)) return '';
  return `${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`;
}

export type PageSelection = 'all' | 'some' | 'none';

export function pageSelection(pageIds: number[], selected: ReadonlySet<number>): PageSelection {
  if (pageIds.length === 0) return 'none';
  const n = pageIds.filter((id) => selected.has(id)).length;
  return n === 0 ? 'none' : n === pageIds.length ? 'all' : 'some';
}

/** Header checkbox: a fully chosen page is cleared, otherwise every row of the page is added. */
export function togglePage(pageIds: number[], selected: ReadonlySet<number>): Set<number> {
  const next = new Set(selected);
  if (pageSelection(pageIds, selected) === 'all') pageIds.forEach((id) => next.delete(id));
  else pageIds.forEach((id) => next.add(id));
  return next;
}

export function toggleOne(id: number, selected: ReadonlySet<number>): Set<number> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function canSelectAll(total: number, selectedCount: number): boolean {
  return total > selectedCount && total <= MAX_SELECT_ALL;
}

export type ExportPeriod = '1month' | '3months' | '6months' | '1year';
export const EXPORT_PERIODS: ExportPeriod[] = ['1month', '3months', '6months', '1year'];

export function exportFileName(todayKey: string, selectedCount: number): string {
  return selectedCount > 0 ? `khach-hang-${todayKey}-${selectedCount}.xlsx` : `khach-hang-${todayKey}.xlsx`;
}

/** Money spent and orders from `GET /api/customers/{id}/orders` (summary.totalAmount leaves out cancelled orders). */
export interface CustomerSummary {
  orders: number | null;
  spent: number | null;
  renting: number | null;
}

export function summaryOf(
  ordersRes: { total?: number | null; summary?: { totalOrders?: number | null; totalAmount?: number | null } | null } | null | undefined,
  rentingTotal: number | null | undefined,
): CustomerSummary {
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  return {
    orders: ordersRes ? num(ordersRes.summary?.totalOrders) ?? num(ordersRes.total) : null,
    spent: ordersRes ? num(ordersRes.summary?.totalAmount) ?? null : null,
    renting: num(rentingTotal),
  };
}

/**
 * Chi nhánh (#545): pure helpers for the shop-web outlets and outlet bank-account pages.
 * No `@rentalshop/*` imports so `tests/web-outlets-model.test.ts` runs them under both TZ.
 */

export const OUTLET_PAGE_SIZES = [10, 20, 50, 100] as const;
export const OUTLET_DEFAULT_PAGE_SIZE = 20;
/** Same limit as the API's `printNote` schema (#347). */
export const PRINT_NOTE_MAX = 500;

export type OutletSortBy = 'name' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

export interface OutletParams {
  q: string;
  page: number;
  limit: number;
  sortBy: OutletSortBy;
  sortOrder: SortOrder;
}

type ParamReader = { get(name: string): string | null };

/** URL → list params. Default: newest first (as the old page), 20 rows. */
export function parseOutletParams(params: ParamReader): OutletParams {
  const page = Math.floor(Number(params.get('page')));
  const limit = Number(params.get('limit'));
  const sortBy = params.get('sortBy');
  const sortOrder = params.get('sortOrder');
  return {
    q: (params.get('q') || '').trim(),
    page: Number.isFinite(page) && page >= 1 ? page : 1,
    limit: (OUTLET_PAGE_SIZES as readonly number[]).includes(limit) ? limit : OUTLET_DEFAULT_PAGE_SIZE,
    sortBy: sortBy === 'name' ? 'name' : 'createdAt',
    sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
  };
}

/** Same column flips; a new column starts ascending (as the old table). */
export function nextSort(current: { sortBy: OutletSortBy; sortOrder: SortOrder }, column: OutletSortBy) {
  return {
    sortBy: column,
    sortOrder: current.sortBy === column && current.sortOrder === 'asc' ? ('desc' as const) : ('asc' as const),
  };
}

export interface OutletLike {
  id: number;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  phone?: string | null;
  description?: string | null;
  printNote?: string | null;
  isActive?: boolean | null;
  isDefault?: boolean | null;
  createdAt?: string | Date | null;
  _count?: { users?: number | null } | null;
}

/** "12 Lê Lợi, Quận 1, TP. HCM": non-empty parts, trimmed, no duplicates in a row. */
export function outletAddress(o: Pick<OutletLike, 'address' | 'city' | 'state' | 'zipCode' | 'country'>): string {
  const parts = [o.address, o.city, o.state, o.zipCode, o.country].map((p) => (p || '').trim()).filter(Boolean);
  return parts.filter((p, i) => i === 0 || p.toLowerCase() !== parts[i - 1].toLowerCase()).join(', ');
}

export interface OutletForm {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  description: string;
  printNote: string;
}

export const EMPTY_OUTLET_FORM: OutletForm = {
  name: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
  description: '',
  printNote: '',
};

export function outletFormFrom(o: OutletLike): OutletForm {
  return {
    name: o.name || '',
    phone: o.phone || '',
    address: o.address || '',
    city: o.city || '',
    state: o.state || '',
    zipCode: o.zipCode || '',
    country: o.country || '',
    description: o.description || '',
    printNote: o.printNote || '',
  };
}

export type OutletFieldError = 'nameRequired' | 'printNoteTooLong';

/** The old forms only required a name; the API caps the print note at 500. */
export function validateOutlet(form: OutletForm): { name?: OutletFieldError; printNote?: OutletFieldError } {
  const errors: { name?: OutletFieldError; printNote?: OutletFieldError } = {};
  if (!form.name.trim()) errors.name = 'nameRequired';
  if (form.printNote.length > PRINT_NOTE_MAX) errors.printNote = 'printNoteTooLong';
  return errors;
}

/** POST /api/outlets body, same fields the old add dialog sent (no print note on create). */
export function outletCreatePayload(form: OutletForm, merchantId: number) {
  return {
    name: form.name.trim(),
    address: form.address.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    zipCode: form.zipCode.trim(),
    country: form.country.trim(),
    phone: form.phone.trim(),
    description: form.description.trim(),
    merchantId,
  };
}

/** PUT /api/outlets?id= body, same fields the old edit dialog sent (blank print note clears it server-side). */
export function outletUpdatePayload(id: number, form: OutletForm) {
  const { name, address, city, state, zipCode, country, phone, description } = outletCreatePayload(form, 0);
  return { id, name, address, city, state, zipCode, country, phone, description, printNote: form.printNote };
}

export type OutletAction = 'view' | 'edit' | 'bank' | 'disable' | 'enable';

/** Row menu: the default outlet can never be paused (as before). */
export function outletActions(o: Pick<OutletLike, 'isDefault' | 'isActive'>, canManage = true): OutletAction[] {
  // #736: a role without outlet.manage (OUTLET_STAFF, OUTLET_INVENTORY) only looks; the API rejects the rest
  if (!canManage) return ['view', 'bank'];
  const base: OutletAction[] = ['view', 'edit', 'bank'];
  if (o.isDefault) return base;
  return [...base, o.isActive === false ? 'enable' : 'disable'];
}

/** "06/10/2026" in the shop's time zone (Vietnam), whatever the browser's zone. */
export function formatOutletDate(value: string | Date | null | undefined, timeZone = 'Asia/Ho_Chi_Minh'): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return `${get('day')}/${get('month')}/${get('year')}`;
}

/** Bank-account route id: a positive integer or null (bad links show the error state, no fetch). */
export function parseOutletId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

/** Account number grouped in fours for reading ("1234 5678 90"); copy uses the raw value. */
export function groupAccountNumber(value: string | null | undefined): string {
  const digits = (value || '').replace(/\s+/g, '');
  return digits.replace(/(.{4})(?=.)/g, '$1 ');
}

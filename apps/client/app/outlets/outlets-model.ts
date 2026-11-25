/**
 * Chi nhánh (#545): pure helpers for the shop-web outlets and outlet bank-account pages.
 * Only the pure link rules come from `@rentalshop/utils` (#1643); `tests/web-outlets-model.test.ts` loads them from source
 * and runs everything under both TZ.
 */

import {
  OUTLET_LINKS_MAX,
  normalizeOutletLink,
  type OutletLink,
  type OutletLinkError,
  type OutletLinkType,
} from '@rentalshop/utils';
import { PAGE_SIZE_PRESETS, parsePageSize } from '../orders/page-size';

export const OUTLET_PAGE_SIZES = PAGE_SIZE_PRESETS;
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
  const sortBy = params.get('sortBy');
  const sortOrder = params.get('sortOrder');
  return {
    q: (params.get('q') || '').trim(),
    page: Number.isFinite(page) && page >= 1 ? page : 1,
    limit: parsePageSize(params.get('limit'), OUTLET_DEFAULT_PAGE_SIZE),
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
  links?: OutletLink[] | null;
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
  /** #1643 */
  links: OutletLinkRow[];
}

/** #1643: one line of the "Liên kết" group; `label` only matters for the `other` type */
export interface OutletLinkRow {
  type: OutletLinkType;
  url: string;
  label: string;
}

export const OUTLET_LINK_TYPE_ORDER: OutletLinkType[] = ['website', 'facebook', 'instagram', 'tiktok', 'youtube', 'zalo', 'other'];

/** Shown in the error under a wrong link: what a right one looks like (addresses are not translated). */
export const OUTLET_LINK_EXAMPLES: Record<OutletLinkType, string> = {
  website: 'https://tenshop.vn',
  facebook: 'https://facebook.com/tenshop',
  instagram: 'https://instagram.com/tenshop',
  tiktok: 'https://tiktok.com/@tenshop',
  youtube: 'https://youtube.com/@tenshop',
  zalo: 'https://zalo.me/0901234567',
  other: 'https://tenshop.vn/dat-lich',
};

export const MAX_OUTLET_LINKS = OUTLET_LINKS_MAX;
export const emptyLinkRow = (type: OutletLinkType = 'website'): OutletLinkRow => ({ type, url: '', label: '' });
const rowIsBlank = (row: OutletLinkRow) => !row.url.trim();

/** Row index → what is wrong. A row with no address is skipped (not an error). */
export function validateLinkRows(rows: OutletLinkRow[]): Record<number, OutletLinkError> {
  const found: Record<number, OutletLinkError> = {};
  rows.forEach((row, index) => {
    if (rowIsBlank(row)) return;
    const result = normalizeOutletLink(row);
    if (!result.ok) found[index] = result.error;
  });
  return found;
}

/** The list the API stores: blank rows dropped, each address normalised, repeats removed, at most 6. */
export function outletLinksPayload(rows: OutletLinkRow[]): OutletLink[] {
  const seen = new Set<string>();
  const links: OutletLink[] = [];
  for (const row of rows) {
    if (rowIsBlank(row)) continue;
    const result = normalizeOutletLink(row);
    if (!result.ok) continue;
    const key = `${result.link.type}|${result.link.url}|${result.link.label ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push(result.link);
  }
  return links.slice(0, OUTLET_LINKS_MAX);
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
  links: [],
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
    links: (o.links || []).map((l) => ({ type: l.type, url: l.url, label: l.label || '' })),
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

/** POST /api/outlets body, same fields the old add dialog sent (no print note on create); `links` only when there are any. */
export function outletCreatePayload(form: OutletForm, merchantId: number) {
  const links = outletLinksPayload(form.links);
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
    ...(links.length > 0 ? { links } : {}),
  };
}

/** PUT /api/outlets?id= body, same fields the old edit dialog sent (blank print note clears it server-side). */
export function outletUpdatePayload(id: number, form: OutletForm) {
  const { name, address, city, state, zipCode, country, phone, description } = outletCreatePayload(form, 0);
  // `links` is always sent on edit so that emptying the group clears them (absent would mean unchanged)
  return { id, name, address, city, state, zipCode, country, phone, description, printNote: form.printNote, links: outletLinksPayload(form.links) };
}

export type OutletAction = 'view' | 'edit' | 'bank' | 'disable' | 'enable';

/** #824: only the shop owner (and the platform admin) adds, pauses, reopens or deletes an outlet. */
export function isOutletOwnerRole(role: string | null | undefined): boolean {
  return role === 'MERCHANT' || role === 'ADMIN';
}

/** #945: Chi nhánh is branch info for the shop owner only (attendance moved to Chấm công → Mã QR & vị trí). */
export function canSeeOutletsPage(role: string | null | undefined): boolean {
  return isOutletOwnerRole(String(role || '').trim().toUpperCase());
}

/**
 * Row menu: the default outlet can never be paused (as before).
 * `canManage` = outlet.manage (edit the info); `canChangeStatus` = owner only (#824: OUTLET_ADMIN edits, no pause).
 */
export function outletActions(
  o: Pick<OutletLike, 'isDefault' | 'isActive'>,
  canManage = true,
  canChangeStatus = canManage,
): OutletAction[] {
  // #736: a role without outlet.manage (OUTLET_STAFF, OUTLET_INVENTORY) only looks; the API rejects the rest
  if (!canManage) return ['view', 'bank'];
  const base: OutletAction[] = ['view', 'edit', 'bank'];
  if (o.isDefault || !canChangeStatus) return base;
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

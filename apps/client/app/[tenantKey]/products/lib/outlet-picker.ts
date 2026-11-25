/**
 * #1643 — pure rules of the public shop page for branches: which branch is shown, whether the picker appears,
 * whether the phone-derived Zalo button stays. No `@rentalshop/*` runtime imports (only types) so tests run under both TZ.
 */
import type { OutletLink } from '@rentalshop/utils';

export interface PickerOutlet {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  city?: string | null;
  links?: OutletLink[] | null;
  isDefault?: boolean | null;
}

/** `?outlet=3` → 3, anything else → null */
export function parseOutletParam(value: string | string[] | null | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string' || !/^\d{1,9}$/.test(raw.trim())) return null;
  const id = Number(raw.trim());
  return id > 0 ? id : null;
}

/** The branch the page shows: the asked one if the shop has it, else the main branch, else the first. */
export function pickOutlet<T extends PickerOutlet>(outlets: T[], wantedId: number | null): T | undefined {
  if (outlets.length === 0) return undefined;
  return (
    (wantedId != null ? outlets.find((o) => o.id === wantedId) : undefined) ??
    outlets.find((o) => o.isDefault === true) ??
    outlets[0]
  );
}

/** Branches in the order of the picker: the main branch first, the rest as the API listed them. */
export function orderOutlets<T extends PickerOutlet>(outlets: T[]): T[] {
  return [...outlets].sort((a, b) => Number(b.isDefault === true) - Number(a.isDefault === true));
}

/** The picker appears from 2 branches (the API sends only active ones) */
export const showsOutletPicker = (outlets: PickerOutlet[]): boolean => outlets.length >= 2;

/** The big "Nhắn Zalo" button (from the phone) stays only while the branch has no Zalo link of its own */
export const showsPhoneZaloButton = (outlet: PickerOutlet | undefined): boolean =>
  !(outlet?.links ?? []).some((l) => l.type === 'zalo');

/** `/shop/products?x=1` + outlet 3 → `?x=1&outlet=3`; the main branch drops the parameter */
export function outletSearch(currentSearch: string, outlet: { id: number; isDefault?: boolean | null }): string {
  const params = new URLSearchParams(currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch);
  if (outlet.isDefault === true) params.delete('outlet');
  else params.set('outlet', String(outlet.id));
  const text = params.toString();
  return text ? `?${text}` : '';
}

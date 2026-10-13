/**
 * #945 "Mã QR & vị trí" routes. No imports: the old `/outlets/[id]/attendance` server page redirects with these.
 */
export const LOCATIONS_HREF = '/attendance/locations';

/** Branch attendance page; a missing or bad id goes to the list. */
export function attendanceLocationHref(outletId: number | string | null | undefined): string {
  const id = Number(outletId);
  return Number.isInteger(id) && id > 0 ? `${LOCATIONS_HREF}/${id}` : LOCATIONS_HREF;
}

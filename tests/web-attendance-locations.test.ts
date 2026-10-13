/**
 * #945 web: "Mã QR & vị trí" moves from Cài đặt → Chi nhánh → Mở › into the Chấm công menu.
 * - the Chấm công tabs gain `locations` for owner / outlet admin while the module is on;
 * - `/attendance/locations` lists branches (QR status, radius), `/attendance/locations/{id}` is the branch page;
 * - the old `/outlets/{id}/attendance` link redirects;
 * - the Chi nhánh page has no attendance column or button.
 */
import { describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('@rentalshop/utils', () => ({
  ...(jest.requireActual('../packages/utils/src/core/date-range') as object),
  ...(jest.requireActual('../packages/utils/src/core/shop-day') as object),
  SHOP_TIMEZONE: 'Asia/Ho_Chi_Minh',
}));
import { attendanceTabs, isAttendanceTabActive, locationRow } from '../apps/client/app/attendance/attendance-model';
import { LOCATIONS_HREF, attendanceLocationHref } from '../apps/client/app/attendance/locations/hrefs';

const app = (p: string) => path.resolve(__dirname, '../apps/client/app', p);
const read = (p: string) => fs.readFileSync(app(p), 'utf8');

describe('attendanceTabs', () => {
  it('owner and outlet admin with the module get the five tabs, locations last', () => {
    for (const role of ['MERCHANT', 'OUTLET_ADMIN', ' outlet_admin ']) {
      expect(attendanceTabs(role, ['attendance']).map((t) => t.key)).toEqual(['timesheet', 'person', 'shifts', 'templates', 'locations']);
    }
    expect(attendanceTabs('MERCHANT', ['attendance']).find((t) => t.key === 'locations')?.href).toBe('/attendance/locations');
  });

  it('no tabs without the module', () => {
    expect(attendanceTabs('MERCHANT', [])).toEqual([]);
    expect(attendanceTabs('OUTLET_ADMIN', ['loyalty'])).toEqual([]);
  });

  it('no tabs for staff, kho or no role', () => {
    for (const role of ['OUTLET_STAFF', 'OUTLET_INVENTORY', '', null, undefined]) {
      expect(attendanceTabs(role, ['attendance'])).toEqual([]);
    }
  });
});

describe('isAttendanceTabActive', () => {
  it('Bảng công only on /attendance itself', () => {
    expect(isAttendanceTabActive('/attendance', '/attendance')).toBe(true);
    expect(isAttendanceTabActive('/attendance/locations', '/attendance')).toBe(false);
  });

  it('Mã QR & vị trí on the list and on a branch page', () => {
    expect(isAttendanceTabActive('/attendance/locations', '/attendance/locations')).toBe(true);
    expect(isAttendanceTabActive('/attendance/locations/12', '/attendance/locations')).toBe(true);
    expect(isAttendanceTabActive('/attendance/locationsx', '/attendance/locations')).toBe(false);
    expect(isAttendanceTabActive(null, '/attendance/locations')).toBe(false);
  });
});

describe('location hrefs', () => {
  it('list and branch page', () => {
    expect(LOCATIONS_HREF).toBe('/attendance/locations');
    expect(attendanceLocationHref(12)).toBe('/attendance/locations/12');
    expect(attendanceLocationHref('7')).toBe('/attendance/locations/7');
  });

  it('a bad id falls back to the list', () => {
    expect(attendanceLocationHref('abc')).toBe('/attendance/locations');
    expect(attendanceLocationHref('0')).toBe('/attendance/locations');
    expect(attendanceLocationHref(undefined)).toBe('/attendance/locations');
  });
});

describe('locationRow', () => {
  const s = (over: Record<string, unknown>) =>
    ({ outletId: 1, latitude: null, longitude: null, radiusM: 100, qrMode: 'DAILY', qr: { generated: false, code: null, validDate: null, createdAt: null }, kioskToken: null, ...over }) as any;

  it('QR status from mode and generated', () => {
    expect(locationRow(s({ qr: { generated: true } })).qr).toBe('daily');
    expect(locationRow(s({ qrMode: 'FIXED', qr: { generated: true } })).qr).toBe('fixed');
    expect(locationRow(s({ qrMode: 'FIXED' })).qr).toBe('none');
  });

  it('radius in metres', () => {
    expect(locationRow(s({ radiusM: 150 })).radiusM).toBe(150);
  });

  it('settings not loaded (or failed): unknown, not "no QR"', () => {
    expect(locationRow(null)).toEqual({ qr: null, radiusM: null });
    expect(locationRow(undefined)).toEqual({ qr: null, radiusM: null });
  });
});

describe('pages', () => {
  it('the old branch attendance URL redirects to the new one', () => {
    const src = read('outlets/[id]/attendance/page.tsx');
    expect(src).not.toMatch(/'use client'/);
    expect(src).toMatch(/import \{ redirect \} from 'next\/navigation'/);
    expect(src).toMatch(/redirect\(attendanceLocationHref\(params\.id\)\)/);
  });

  it('the branch page lives under /attendance/locations/[id] and goes back to the list', () => {
    const src = read('attendance/locations/[id]/page.tsx');
    expect(src).toMatch(/href=\{LOCATIONS_HREF\}/);
    expect(src).toMatch(/<MembersCard /);
    expect(fs.existsSync(app('outlets/[id]/attendance/MembersCard.tsx'))).toBe(false);
  });

  it('the list page opens each branch page', () => {
    const src = read('attendance/locations/page.tsx');
    expect(src).toMatch(/AttendanceFrame/);
    expect(src).toMatch(/attendanceLocationHref\(/);
  });

  it('the Chi nhánh page is branch info only', () => {
    const src = read('outlets/page.tsx');
    expect(src).not.toMatch(/attendance/i);
  });

  it('the Chấm công tab strip reads the tab model', () => {
    expect(read('attendance/parts.tsx')).toMatch(/attendanceTabs\(/);
  });
});

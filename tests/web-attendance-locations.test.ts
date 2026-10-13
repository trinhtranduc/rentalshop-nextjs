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
import { locationRow } from '../apps/client/app/attendance/attendance-model';
import { LOCATIONS_HREF, attendanceLocationHref } from '../apps/client/app/attendance/locations/hrefs';

const app = (p: string) => path.resolve(__dirname, '../apps/client/app', p);
const read = (p: string) => fs.readFileSync(app(p), 'utf8');

// #960: the five screens moved from a tab strip into the sidebar sub-menu (tests/web-shell-nav.test.ts).

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

  it('no attendance page renders the old top tab strip (#960); back links stay', () => {
    for (const p of ['attendance/parts.tsx', 'attendance/page.tsx', 'attendance/person/page.tsx', 'attendance/shifts/page.tsx',
      'attendance/templates/page.tsx', 'attendance/locations/page.tsx', 'attendance/locations/[id]/page.tsx']) {
      expect(read(p)).not.toMatch(/AttendanceTabs|attendanceTabs/);
    }
    expect(read('attendance/locations/[id]/page.tsx')).toMatch(/href=\{LOCATIONS_HREF\}/);
  });

  it('every attendance dropdown uses the shared Select (own chevron, room on the right) (#960)', () => {
    for (const p of ['attendance/parts.tsx', 'attendance/person/page.tsx', 'attendance/locations/[id]/page.tsx']) {
      expect(read(p)).not.toMatch(/<select\s(?!\{\.\.\.props\})/);
    }
    expect(read('attendance/parts.tsx')).toMatch(/appearance-none[^']*pr-9/);
  });
});

describe('Chi nhánh is owner-only again (#945)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { canSeeOutletsPage } = require('../apps/client/app/outlets/outlets-model');

  it('only the shop owner (and platform admin) open the Chi nhánh page', () => {
    expect(canSeeOutletsPage('MERCHANT')).toBe(true);
    expect(canSeeOutletsPage('ADMIN')).toBe(true);
    for (const role of ['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY', '', null, undefined]) {
      expect(canSeeOutletsPage(role)).toBe(false);
    }
  });

  it('a direct /outlets URL shows the no-access card, like the staff page', () => {
    const src = read('outlets/page.tsx');
    expect(src).toMatch(/const allowed = canSeeOutletsPage\(user\?\.role\);/);
    expect(src).toMatch(/if \(user && !allowed\)/);
    expect(src).toMatch(/t\('noAccess'\)/);
  });
});

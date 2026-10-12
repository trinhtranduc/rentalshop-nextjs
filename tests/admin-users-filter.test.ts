/**
 * #884: admin Users page filters by merchant and outlet. Filters live in the URL (`merchantId`, `outletId`);
 * the outlet select waits for a merchant; changing the merchant drops the outlet.
 */
import * as fs from 'fs';
import * as path from 'path';
import { readUserListFilters, userFilterUrlUpdates } from '../apps/admin/app/users/users-filter-url';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');
const params = (q: string) => new URLSearchParams(q);

describe('readUserListFilters', () => {
  it('no params: no merchant, no outlet', () => {
    expect(readUserListFilters(params(''))).toEqual({ merchantId: undefined, outletId: undefined });
  });
  it('reads merchant and outlet ids', () => {
    expect(readUserListFilters(params('merchantId=2&outletId=3'))).toEqual({ merchantId: 2, outletId: 3 });
  });
  it('an outlet without a merchant is ignored', () => {
    expect(readUserListFilters(params('outletId=3'))).toEqual({ merchantId: undefined, outletId: undefined });
  });
  it('junk or non-positive ids are ignored', () => {
    expect(readUserListFilters(params('merchantId=abc&outletId=-1'))).toEqual({ merchantId: undefined, outletId: undefined });
    expect(readUserListFilters(params('merchantId=0'))).toEqual({ merchantId: undefined, outletId: undefined });
    expect(readUserListFilters(params('merchantId=2&outletId=1.5'))).toEqual({ merchantId: 2, outletId: undefined });
  });
});

describe('userFilterUrlUpdates', () => {
  it('a new merchant clears the outlet and goes back to page 1', () => {
    expect(userFilterUrlUpdates({ merchantId: 4 })).toEqual({ page: 1, merchantId: '4', outletId: undefined });
  });
  it('clearing the merchant clears the outlet too', () => {
    expect(userFilterUrlUpdates({ merchantId: undefined })).toEqual({ page: 1, merchantId: undefined, outletId: undefined });
  });
  it('an outlet change keeps the merchant', () => {
    expect(userFilterUrlUpdates({ outletId: 7 })).toEqual({ page: 1, outletId: '7' });
    expect(userFilterUrlUpdates({ outletId: undefined })).toEqual({ page: 1, outletId: undefined });
  });
  it('role and status pass through as before', () => {
    expect(userFilterUrlUpdates({ role: 'MERCHANT' as any, status: 'active' })).toEqual({ page: 1, role: 'MERCHANT', status: 'active' });
  });
});

describe('wiring', () => {
  const page = read('apps/admin/app/users/page.tsx');
  const filters = read('packages/ui/src/components/features/Users/components/UserFilters.tsx');
  const users = read('packages/ui/src/components/features/Users/Users.tsx');

  it('the admin Users page reads the URL helpers and turns the selects on', () => {
    expect(page).toMatch(/readUserListFilters\(searchParams\)/);
    expect(page).toMatch(/userFilterUrlUpdates\(/);
    expect(page).toMatch(/showMerchantOutletFilters/);
    expect(page).toMatch(/merchantId,\s*\n?\s*outletId/);
  });

  it('Users passes the opt-in flag to UserFilters (off by default)', () => {
    expect(users).toMatch(/showMerchantOutletFilters = false/);
    expect(users).toMatch(/showMerchantOutletFilters=\{showMerchantOutletFilters\}/);
  });

  it('the outlet select waits for a merchant and loads that merchant\'s outlets', () => {
    expect(filters).toMatch(/showMerchantOutletFilters = false/);
    expect(filters).toMatch(/getOutletsByMerchant\(/);
    expect(filters).toMatch(/disabled=\{!filters\.merchantId/);
    expect(filters).toMatch(/Select merchant first/);
  });
});

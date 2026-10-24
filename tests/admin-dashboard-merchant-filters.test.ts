/**
 * #1190: dashboard tiles list merchants; numbers match the filter.
 * Basic/Pro are among ACTIVE only. Expiring/Expired use the 7×24h period window.
 */
import * as fs from 'fs';
import * as path from 'path';
import { computeDashboardSubscriptionStats, DASHBOARD_EXPIRING_MS, DASHBOARD_MERCHANT_HREFS } from '../apps/admin/app/dashboard/subscription-stats';
import { resolveMerchantListFilters } from '../packages/database/src/merchant-list-filters';
import { SUBSCRIPTION_EXPIRING_MS } from '../packages/database/src/subscription-list-where';

const NOW = new Date('2026-10-24T12:00:00.000Z');
const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

const rows = [
  { status: 'TRIAL', plan: { name: 'Basic' }, currentPeriodEnd: '2026-11-01T00:00:00.000Z' },
  { status: 'TRIAL', plan: { name: 'Professional' }, currentPeriodEnd: '2026-10-26T00:00:00.000Z' },
  { status: 'ACTIVE', plan: { name: 'Basic' }, currentPeriodEnd: '2026-12-01T00:00:00.000Z' },
  { status: 'ACTIVE', plan: { name: 'Basic' }, currentPeriodEnd: '2026-10-28T00:00:00.000Z' },
  { status: 'ACTIVE', plan: { name: 'Professional' }, currentPeriodEnd: '2026-12-01T00:00:00.000Z' },
  { status: 'CANCELLED', plan: { name: 'Professional' }, currentPeriodEnd: '2026-09-01T00:00:00.000Z' },
  { status: 'ACTIVE', plan: { name: 'Enterprise' }, currentPeriodEnd: '2026-09-01T00:00:00.000Z' },
];

describe('dashboard subscription stats (#1190)', () => {
  it('counts Basic/Pro only among ACTIVE so they can break down Active', () => {
    const stats = computeDashboardSubscriptionStats(rows, NOW);
    expect(stats.active).toBe(4);
    expect(stats.basic).toBe(2);
    expect(stats.pro).toBe(1);
    expect(stats.trial).toBe(2);
    expect(stats.cancelled).toBe(1);
    expect(stats.basic + stats.pro).toBeLessThanOrEqual(stats.active);
  });

  it('expired = period already ended; expiring = period end in the next 7×24h', () => {
    const stats = computeDashboardSubscriptionStats(rows, NOW);
    expect(stats.expired).toBe(2);
    expect(stats.expiring).toBe(2);
    expect(DASHBOARD_EXPIRING_MS).toBe(SUBSCRIPTION_EXPIRING_MS);
  });
});

describe('merchant list URL → Prisma where (#1190)', () => {
  it('status=active is subscription ACTIVE, not shop isActive', () => {
    const resolved = resolveMerchantListFilters({ status: 'active' }, NOW);
    expect(resolved.isActive).toBeUndefined();
    expect(resolved.subscription).toEqual({ status: 'ACTIVE' });
  });

  it('status=inactive is shop isActive false', () => {
    expect(resolveMerchantListFilters({ status: 'inactive' }, NOW)).toEqual({ isActive: false });
  });

  it('status=trial and cancelled map to the enum', () => {
    expect(resolveMerchantListFilters({ status: 'trial' }, NOW).subscription).toEqual({ status: 'TRIAL' });
    expect(resolveMerchantListFilters({ status: 'cancelled' }, NOW).subscription).toEqual({
      status: 'CANCELLED',
    });
  });

  it('Active + Basic filters subscription plan name (not parseInt)', () => {
    expect(resolveMerchantListFilters({ status: 'active', plan: 'Basic' }, NOW).subscription).toEqual({
      status: 'ACTIVE',
      plan: { name: { equals: 'Basic', mode: 'insensitive' } },
    });
  });

  it('plan=Professional matches names that contain pro (same as the Pro chip)', () => {
    expect(resolveMerchantListFilters({ status: 'active', plan: 'Professional' }, NOW).subscription).toEqual({
      status: 'ACTIVE',
      plan: { name: { contains: 'pro', mode: 'insensitive' } },
    });
  });

  it('numeric plan stays planId for old callers', () => {
    expect(resolveMerchantListFilters({ plan: '12' }, NOW)).toEqual({ planId: 12 });
  });

  it('expiring / expired use the #1180 period window', () => {
    const expiring = resolveMerchantListFilters({ status: 'expiring' }, NOW);
    expect(expiring.subscription?.currentPeriodEnd).toEqual({
      gt: NOW,
      lte: new Date(NOW.getTime() + SUBSCRIPTION_EXPIRING_MS),
    });
    expect(resolveMerchantListFilters({ status: 'expired' }, NOW).subscription).toEqual({
      currentPeriodEnd: { lt: NOW },
    });
  });

  it('omitting filters returns an empty resolve (old unfiltered list)', () => {
    expect(resolveMerchantListFilters({}, NOW)).toEqual({});
  });
});

describe('dashboard tiles open the merchant list (#1190)', () => {
  const page = read('apps/admin/app/dashboard/page.tsx');
  const statsSrc = read('apps/admin/app/dashboard/subscription-stats.ts');
  const filters = read('packages/ui/src/components/features/Merchants/components/MerchantFilters.tsx');

  it('does not send Trial/Active/Cancelled/Expiring/Expired to /subscriptions', () => {
    expect(page).not.toContain("/subscriptions?status=TRIAL");
    expect(page).not.toContain("/subscriptions?status=ACTIVE");
    expect(page).not.toContain("/subscriptions?status=CANCELLED");
    expect(page).not.toContain("/subscriptions?bucket=expiring");
    expect(page).not.toContain("/subscriptions?bucket=expired");
  });

  it('uses the merchant hrefs that match the tile filters', () => {
    for (const key of ['all', 'trial', 'active', 'basic', 'pro', 'expiring', 'expired', 'cancelled'] as const) {
      expect(page).toContain(`DASHBOARD_MERCHANT_HREFS.${key}`);
      expect(statsSrc).toContain(DASHBOARD_MERCHANT_HREFS[key]);
    }
  });

  it('merchant status dropdown lists the dashboard buckets', () => {
    for (const value of ['trial', 'active', 'expiring', 'expired', 'cancelled', 'inactive']) {
      expect(filters).toContain(`value="${value}"`);
    }
  });
});

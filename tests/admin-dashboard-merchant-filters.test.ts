/**
 * #1194 / #1196: In use plan chips (Trial/Basic/Pro/Enterprise) are còn hạn; tiles are real hrefs.
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
  { status: 'TRIAL', plan: { name: 'Trial' }, currentPeriodEnd: '2026-11-01T00:00:00.000Z' },
  { status: 'ACTIVE', plan: { name: 'Basic — 6 months' }, currentPeriodEnd: '2026-12-01T00:00:00.000Z' },
];

describe('dashboard subscription stats (#1194 / #1196)', () => {
  it('In use is period not ended; plan chips are among In use only', () => {
    const stats = computeDashboardSubscriptionStats(rows, NOW);
    expect(stats.inUse).toBe(7);
    expect(stats.basic).toBe(4);
    expect(stats.pro).toBe(2);
    expect(stats.enterprise).toBe(0);
    expect(stats.inUseTrial).toBe(1);
    expect(stats.trial).toBe(3);
    expect(stats.cancelled).toBe(1);
    expect(stats.basic + stats.pro + stats.enterprise + stats.inUseTrial).toBe(stats.inUse);
  });

  it('a paid ACTIVE shop whose period already ended is not In use', () => {
    const stats = computeDashboardSubscriptionStats(rows, NOW);
    expect(stats.expired).toBe(2);
    expect(stats.inUse).toBe(7);
  });

  it('expired = period already ended; expiring = period end in the next 7×24h', () => {
    const stats = computeDashboardSubscriptionStats(rows, NOW);
    expect(stats.expired).toBe(2);
    expect(stats.expiring).toBe(2);
    expect(DASHBOARD_EXPIRING_MS).toBe(SUBSCRIPTION_EXPIRING_MS);
  });
});

describe('merchant list URL → Prisma where (#1192)', () => {
  it('status=current is còn hạn đang dùng, not enum ACTIVE', () => {
    const resolved = resolveMerchantListFilters({ status: 'current' }, NOW);
    expect(resolved.isActive).toBeUndefined();
    expect(resolved.subscription).toEqual({
      currentPeriodEnd: { gt: NOW },
      status: { notIn: ['CANCELLED', 'PAUSED'] },
    });
  });

  it('status=active is an alias of current (old Active tile bookmark)', () => {
    expect(resolveMerchantListFilters({ status: 'active' }, NOW).subscription).toEqual(
      resolveMerchantListFilters({ status: 'current' }, NOW).subscription
    );
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

  it('plan=Basic without status lists every Basic shop (contains, including Basic — 6 months)', () => {
    expect(resolveMerchantListFilters({ plan: 'Basic' }, NOW).subscription).toEqual({
      plan: { name: { contains: 'basic', mode: 'insensitive' } },
    });
  });

  it('In use + Basic still ANDs period with plan name', () => {
    expect(resolveMerchantListFilters({ status: 'current', plan: 'Basic' }, NOW).subscription).toEqual({
      currentPeriodEnd: { gt: NOW },
      status: { notIn: ['CANCELLED', 'PAUSED'] },
      plan: { name: { contains: 'basic', mode: 'insensitive' } },
    });
  });

  it('plan=Trial is exact equals (signup default name)', () => {
    expect(resolveMerchantListFilters({ status: 'current', plan: 'Trial' }, NOW).subscription).toEqual({
      currentPeriodEnd: { gt: NOW },
      status: { notIn: ['CANCELLED', 'PAUSED'] },
      plan: { name: { equals: 'Trial', mode: 'insensitive' } },
    });
  });

  it('plan=Professional matches names that contain pro', () => {
    expect(
      resolveMerchantListFilters({ plan: 'Professional' }, NOW).subscription?.plan
    ).toEqual({ name: { contains: 'pro', mode: 'insensitive' } });
  });

  it('plan=Enterprise matches names that contain enterprise', () => {
    expect(
      resolveMerchantListFilters({ plan: 'Enterprise' }, NOW).subscription?.plan
    ).toEqual({ name: { contains: 'enterprise', mode: 'insensitive' } });
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

describe('dashboard tiles open the merchant list (#1194)', () => {
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

  it('does not label the in-use tile Active', () => {
    expect(page).not.toMatch(/title="Active"/);
    expect(page).toMatch(/title="In use"/);
  });

  it('In use plan chips are GET /api/merchants status=current and real hrefs', () => {
    expect(page).toContain("totalOf('current', 'Basic')");
    expect(page).toContain("totalOf('current', 'Professional')");
    expect(page).toContain("totalOf('current', 'Enterprise')");
    expect(page).toContain("totalOf('current', 'Trial')");
    expect(page).toContain('dash-chip-basic');
    expect(page).toContain('dash-chip-trial-plan');
    expect(page).toContain('href: DASHBOARD_MERCHANT_HREFS.basic');
    expect(page).toContain('href: DASHBOARD_MERCHANT_HREFS.trialPlan');
    expect(page).toContain('href={DASHBOARD_MERCHANT_HREFS.inUse}');
    expect(statsSrc).toContain("'/merchants?status=current&plan=Basic'");
    expect(statsSrc).toContain("'/merchants?status=current&plan=Trial'");
    expect(read('apps/admin/app/dashboard/components/DashboardTiles.tsx')).toContain('next/link');
  });

  it('uses the merchant hrefs that match the tile filters', () => {
    for (const key of ['all', 'trial', 'trialPlan', 'inUse', 'basic', 'pro', 'enterprise', 'expiring', 'expired', 'cancelled'] as const) {
      expect(page).toContain(`DASHBOARD_MERCHANT_HREFS.${key}`);
      expect(statsSrc).toContain(DASHBOARD_MERCHANT_HREFS[key]);
    }
  });

  it('merchant status dropdown lists In use, not Active', () => {
    expect(filters).toContain('value="current"');
    expect(filters).toContain('In use');
    expect(filters).not.toContain('value="active"');
    for (const value of ['trial', 'expiring', 'expired', 'cancelled', 'inactive']) {
      expect(filters).toContain(`value="${value}"`);
    }
  });

  it('merchant plan dropdown lists Trial', () => {
    expect(filters).toContain('value="Trial"');
  });
});

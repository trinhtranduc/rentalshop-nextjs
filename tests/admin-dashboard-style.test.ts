/**
 * #808 (step 6 of #802): the admin dashboard follows the portal style. Presentation only:
 * every data call, filter and link stays.
 */
import * as fs from 'fs';
import * as path from 'path';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');
const page = read('apps/admin/app/dashboard/page.tsx');
const css = read('apps/admin/app/dashboard/dashboard.css');
const tile = read('apps/admin/app/dashboard/components/DashboardTiles.tsx');

describe('admin dashboard portal style (#808)', () => {
  it('loads its own dashboard.css', () => {
    expect(page).toMatch(/import ['"]\.\/dashboard\.css['"]/);
  });

  it('has a page title and a segmented period control with Today / This Month / This Year / Refresh', () => {
    expect(page).toMatch(/<SegmentedControl/);
    expect(tile).toMatch(/role="tablist"/);
    for (const k of ['today', 'month', 'year']) expect(page).toContain(`'${k}'`);
    expect(page).toMatch(/updateTimePeriod\(/);
    expect(page).toMatch(/fetchSystemMetrics\(\);\s*fetchRankings\(\)/);
    for (const label of ['Today', 'This Month', 'This Year', 'Refresh']) expect(page).toContain(label);
  });

  it('metric cards use the portal card classes, a tabular number, a pill and a chevron', () => {
    expect(tile).toContain('border-ar-line bg-ar-surface shadow-ar');
    expect(tile).toContain('tabular-nums');
    expect(tile).toMatch(/ChevronRight/);
    expect(page.match(/<MetricTile/g)?.length).toBe(6);
  });

  it('keeps the metric links and numbers', () => {
    for (const href of ['DASHBOARD_MERCHANT_HREFS.all', 'DASHBOARD_MERCHANT_HREFS.inUse', 'DASHBOARD_MERCHANT_HREFS.expired', 'DASHBOARD_MERCHANT_HREFS.trial', 'DASHBOARD_MERCHANT_HREFS.cancelled']) {
      expect(page).toContain(href);
    }
    for (const n of ['subscriptionStats.all', 'subscriptionStats.inUse', 'subscriptionStats.trial', 'subscriptionStats.inUseTrial', 'subscriptionStats.expiring', 'subscriptionStats.expired', 'subscriptionStats.cancelled', 'subscriptionStats.basic', 'subscriptionStats.pro']) {
      expect(page).toContain(n);
    }
  });

  it('charts use the --ar-chart-* tokens, not hard-coded hex colours', () => {
    expect(page).not.toMatch(/#10B981|#3B82F6|#374151/i);
    expect(page).toContain('var(--ar-chart-');
  });

  it('chart cards scroll inside their own container on a phone', () => {
    expect(css).toMatch(/\.ar-dash-chart-scroll[^}]*overflow-x:\s*auto/);
    expect(css).toMatch(/min-width/);
  });

  it('touch targets are at least 44px on a phone', () => {
    expect(css).toMatch(/\.ar-dash-seg-btn[^}]*min-height:\s*44px/);
  });
});

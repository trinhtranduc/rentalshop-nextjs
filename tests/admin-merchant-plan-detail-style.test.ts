/**
 * #882: the admin merchant detail (header, plan card, Quick Actions, plan dialogs) and the plan detail dialog
 * use the portal style of #802/#806/#807. Presentation only: every control stays.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const MERCHANTS = 'packages/ui/src/components/features/Merchants/components/';
const PAGE = 'apps/admin/app/merchants/[id]/page.tsx';
const PLANS = 'apps/admin/app/plans/page.tsx';

describe('admin merchant detail and plan detail style (#882)', () => {
  it('merchant detail has a DetailHeader with back link, status pill and the actions moved into it', () => {
    const src = read(PAGE);
    expect(src).toMatch(/<DetailHeader/);
    expect(src).toMatch(/backHref="\/merchants"/);
    expect(src).toMatch(/statusTone=/);
    expect(src).toMatch(/<MerchantQuickActions/);
    expect(src).toMatch(/showActions=\{false\}/);
  });

  it('Quick Actions keeps Add-on and the seven menu items', () => {
    const src = read(MERCHANTS + 'MerchantDetail.tsx');
    expect(src).toMatch(/export function MerchantQuickActions/);
    for (const item of [
      'Manage Outlets', 'Manage Products', 'Manage Users', 'Manage Orders', 'Manage Customers', 'Add-on', 'Edit Merchant',
    ]) expect(src).toContain(item);
    expect(src).toMatch(/data-testid="merchant-addon-tab"/);
    // other callers keep the actions inside the card
    expect(src).toMatch(/showActions = true/);
    expect(read('packages/ui/src/components/features/Merchants/index.ts')).toMatch(/MerchantQuickActions/);
  });

  it('merchant cards, statuses and the plan card use ar tokens and pills, no rainbow boxes', () => {
    const detail = read(MERCHANTS + 'MerchantDetail.tsx');
    expect(detail).toMatch(/ar-pill/);
    expect(detail).not.toMatch(/hover:border-(blue|green|orange|purple)-300/);
    const plan = read(MERCHANTS + 'MerchantPlanManagement.tsx');
    expect(plan).toMatch(/ar-pill/);
    expect(plan).not.toMatch(/bg-(red|orange|green)-50 border/);
    expect(plan).not.toMatch(/bg-gray-50 border rounded-lg/);
    expect(read(MERCHANTS + 'MerchantLoyaltySection.tsx')).toMatch(/ar-pill/);
  });

  it('plan card keeps every subscription action', () => {
    const plan = read(MERCHANTS + 'MerchantPlanManagement.tsx');
    for (const w of [
      'Upgrade to Paid Plan', 'Change Plan', 'Extend Plan', 'Pause Plan', 'Resume Plan', 'End Trial', 'Cancel Plan',
      'View History', 'Create Subscription',
    ]) expect(plan).toContain(w);
  });

  it('Cancel / Pause / Resume / History dialogs use the ar-dialog surface; Cancel and Pause keep a red confirm', () => {
    const plan = read(MERCHANTS + 'MerchantPlanManagement.tsx');
    expect((plan.match(/<DialogContent className=\{`ar-dialog\b/g) || []).length).toBe(4);
    expect((plan.match(/ar-dialog-footer ar-dialog-footer-danger/g) || []).length).toBe(2);
    const css = read('apps/admin/app/forms.css');
    expect(css).toMatch(/\.ar-dialog-footer-danger button:last-child:not\(:disabled\)/);
  });

  it('plan detail and Stripe Prices dialogs use ar-dialog, a pill and the dialog footer', () => {
    const src = read(PLANS);
    expect((src.match(/<DialogContent className="ar-dialog\b/g) || []).length).toBe(2);
    expect((src.match(/ar-dialog-footer/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(src).toMatch(/ar-pill/);
    for (const w of ['Close', 'Stripe Prices', 'Edit Plan', 'Open Stripe', 'Save']) expect(src).toContain(w);
    // a Badge (div) inside a <p> broke hydration; the values are now <dd>
    expect(src).not.toMatch(/<p className="mt-1 text-sm">\s*<Badge/);
  });

  it('PlanDialog (create / edit) uses the ar-dialog surface', () => {
    const src = read('packages/ui/src/components/features/Plans/components/PlanDialog.tsx');
    expect(src).toMatch(/<DialogContent className="ar-dialog\b/);
  });

  it('no behaviour change: no new fetch calls', () => {
    for (const f of [PAGE, PLANS, MERCHANTS + 'MerchantDetail.tsx']) expect(read(f)).not.toMatch(/[^.\w]fetch\(/);
  });
});

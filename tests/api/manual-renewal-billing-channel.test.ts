/**
 * #1459 audit A10 + A13 design 5: a renewal recorded by the admin, a manual payment or a SePay transfer goes through
 * `manualExtensionBilling`: with a store plan still running the extension joins the store credit and the store fields stay;
 * otherwise the shop is manual (billingChannel MANUAL, autoRenew false, storeProductId null, no billing issue, no credit).
 * Behaviour: plan-renewal-credit.test.ts (rule), subscription-renew-route.test.ts and manual-extension-store-credit.test.ts
 * (routes). Lemon Squeezy records LEMON.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { MANUAL_BILLING } from '../../apps/api/lib/plan-renewal';

const route = (dir: string) => readFileSync(join(__dirname, '../../apps/api/app/api', dir, 'route.ts'), 'utf8');

describe('manual renewal paths (A10, A13)', () => {
  it('MANUAL_BILLING is the manual channel without auto-renew or store product', () => {
    expect(MANUAL_BILLING).toEqual({ billingChannel: 'MANUAL', autoRenew: false, storeProductId: null, billingIssueAt: null });
  });

  it.each(['payments/manual', 'admin/subscriptions/[id]/extend', 'subscriptions/[id]/extend', 'subscriptions/[id]/renew'])(
    '%s writes the billing fields from manualExtensionBilling',
    (dir) => {
      const code = route(dir);
      expect(code).toMatch(/import \{[^}]*manualExtensionBilling[^}]*\} from '[./]+lib\/plan-renewal'/);
      expect(code).toMatch(/manualExtensionBilling\(/);
      expect(code).not.toMatch(/\.\.\.MANUAL_BILLING/);
    },
  );

  it('the Lemon Squeezy webhook records LEMON and drops the store product', () => {
    const code = route('lemonsqueezy/webhook');
    expect(code).toMatch(/billingChannel: 'LEMON'/);
    expect(code).toMatch(/storeProductId: null/);
  });
});

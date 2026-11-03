/**
 * #1459 audit A10: a renewal recorded by the admin, a manual payment or a SePay transfer is not a store subscription any
 * more: billingChannel MANUAL, autoRenew false, storeProductId null (and no billing issue). Lemon Squeezy records LEMON.
 * The renew route is checked by behaviour in subscription-renew-route.test.ts; the other routes share the same constant.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { MANUAL_BILLING } from '../../apps/api/lib/plan-renewal';

const route = (dir: string) => readFileSync(join(__dirname, '../../apps/api/app/api', dir, 'route.ts'), 'utf8');

describe('manual renewal paths reset the store fields (A10)', () => {
  it('MANUAL_BILLING is the manual channel without auto-renew or store product', () => {
    expect(MANUAL_BILLING).toEqual({ billingChannel: 'MANUAL', autoRenew: false, storeProductId: null, billingIssueAt: null });
  });

  it.each(['payments/manual', 'admin/subscriptions/[id]/extend', 'subscriptions/[id]/extend', 'subscriptions/[id]/renew'])(
    '%s spreads MANUAL_BILLING into the subscription update',
    (dir) => {
      const code = route(dir);
      expect(code).toMatch(/import \{[^}]*MANUAL_BILLING[^}]*\} from '[./]+lib\/plan-renewal'/);
      expect(code).toMatch(/\.\.\.MANUAL_BILLING/);
    },
  );

  it('the Lemon Squeezy webhook records LEMON and drops the store product', () => {
    const code = route('lemonsqueezy/webhook');
    expect(code).toMatch(/billingChannel: 'LEMON'/);
    expect(code).toMatch(/storeProductId: null/);
  });
});

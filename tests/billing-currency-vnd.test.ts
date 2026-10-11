/**
 * #821: plans, subscriptions and plan payments are billed in VND (they were stored as "USD" with VND prices).
 * Static checks on the migration, the schema defaults and the places that create or default them.
 */
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const MIGRATION = 'prisma/migrations/20261011160000_billing_currency_vnd/migration.sql';

const modelBlock = (schema: string, name: string) => schema.slice(schema.indexOf(`model ${name} {`), schema.indexOf('\n}', schema.indexOf(`model ${name} {`)));

describe('billing currency is VND (#821)', () => {
  describe('migration', () => {
    const sql = () => read(MIGRATION);

    it('exists and only updates data and defaults (no DROP, no type change, no NOT NULL)', () => {
      expect(fs.existsSync(path.join(root, MIGRATION))).toBe(true);
      expect(sql()).not.toMatch(/DROP\s+(COLUMN|TABLE)|ALTER\s+COLUMN[^;]*TYPE|SET\s+NOT\s+NULL/i);
    });

    it.each(['Plan', 'Subscription', 'Payment'])('%s: USD rows with VND-scale amounts become VND, USD-scale rows stay', (table) => {
      const amount = table === 'Plan' ? '"basePrice"' : 'amount';
      const re = new RegExp(`UPDATE\\s+"(public"\\.")?${table}"\\s+SET\\s+"?currency"?\\s*=\\s*'VND'\\s+WHERE\\s+"?currency"?\\s*=\\s*'USD'[^;]*${amount}\\s*(=\\s*0|>=\\s*1000)`, 'i');
      expect(sql()).toMatch(re);
    });

    it.each(['Plan', 'Subscription', 'Payment'])('%s: the column default becomes VND', (table) => {
      expect(sql()).toMatch(new RegExp(`ALTER\\s+TABLE\\s+"(public"\\.")?${table}"\\s+ALTER\\s+COLUMN\\s+"currency"\\s+SET\\s+DEFAULT\\s+'VND'`, 'i'));
    });
  });

  describe('schema.prisma', () => {
    const schema = () => read('prisma/schema.prisma');
    it.each(['Plan', 'Subscription', 'Payment'])('%s.currency defaults to VND', (model) => {
      expect(modelBlock(schema(), model)).toMatch(/currency\s+String[^\n]*@default\("VND"\)/);
    });
    it("Merchant.currency (the shop's own currency) is not touched", () => {
      expect(modelBlock(schema(), 'Merchant')).toMatch(/currency\s+String[^\n]*@default\("USD"\)/);
    });
  });

  describe('code that creates or defaults plan billing', () => {
    const FILES = [
      'apps/api/app/api/auth/register/route.ts',
      'apps/api/app/api/auth/register/merchant-google/route.ts',
      'packages/database/src/registration.ts',
      'packages/database/src/seed.ts',
      'packages/database/src/plan.ts',
      'packages/database/src/subscription.ts',
      'apps/api/app/api/subscriptions/[id]/renew/route.ts',
      'apps/api/app/api/subscriptions/status/route.ts',
      'apps/api/app/api/plans/[id]/route.ts',
      'apps/api/app/api/plans/public/route.ts',
      'apps/api/app/api/payments/route.ts',
    ];
    it.each(FILES)('%s does not default billing to USD', (file) => {
      expect(read(file)).not.toMatch(/currency:\s*'USD'|\|\|\s*'USD'|billingCurrency:\s*'USD'/);
    });

    it('the Stripe and Lemon Squeezy webhooks keep the currency their provider sends', () => {
      expect(read('apps/api/app/api/stripe/webhook/route.ts')).toMatch(/toUpperCase/);
    });
  });

  describe('admin screens', () => {
    it('the subscription detail page formats money in VND by default', () => {
      const page = read('apps/admin/app/subscriptions/[id]/page.tsx');
      expect(page).not.toMatch(/currency:\s*string\s*=\s*'USD'|\|\|\s*'USD'/);
    });
    it('the subscription form offers VND and starts with it', () => {
      const form = read('packages/ui/src/components/features/Subscriptions/components/SubscriptionForm.tsx');
      expect(form).toMatch(/<SelectItem value="VND">/);
      expect(form).toMatch(/initialData\?\.currency \|\| 'VND'/);
    });
    it('the plan variant form starts with VND', () => {
      expect(read('apps/admin/app/components/PlanVariantForm.tsx')).not.toMatch(/currency:\s*'USD'/);
    });
  });
});

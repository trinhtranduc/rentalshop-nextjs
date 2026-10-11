/**
 * #792: the admin subscription pages link to routes that exist, and the detail page can renew.
 * The admin app has no `/admin` prefix: `router.push('/admin/subscriptions')` is a 404.
 */
import * as fs from 'fs';
import * as path from 'path';

const ADMIN = path.resolve(__dirname, '../apps/admin/app');
const read = (p: string) => fs.readFileSync(path.join(ADMIN, p), 'utf8');

const SUBSCRIPTION_PAGES = [
  'subscriptions/[id]/page.tsx',
  'subscriptions/[id]/edit/page.tsx',
  'subscriptions/create/page.tsx',
];

describe('admin subscription pages (#792)', () => {
  it.each(SUBSCRIPTION_PAGES)('%s links without the /admin prefix', (file) => {
    expect(read(file)).not.toMatch(/['"`]\/admin\//);
  });

  it('the detail page has a Renew button that opens ManualRenewalModal and calls subscriptionsApi.renew', () => {
    const page = read('subscriptions/[id]/page.tsx');
    expect(page).toMatch(/<ManualRenewalModal/);
    expect(page).toMatch(/subscriptionsApi\.renew\(/);
    expect(page).toMatch(/Renew/);
  });

  it("the detail page compares the status without case (the API returns ACTIVE)", () => {
    expect(read('subscriptions/[id]/page.tsx')).not.toMatch(/status === '(active|cancelled)'/);
  });

  it('every subscriptionsApi method the detail page calls exists', () => {
    const page = read('subscriptions/[id]/page.tsx');
    const api = fs.readFileSync(path.resolve(__dirname, '../packages/utils/src/api/subscriptions.ts'), 'utf8');
    const used = [...page.matchAll(/subscriptionsApi\.(\w+)\(/g)].map((m) => m[1]);
    for (const name of new Set(used)) expect([name, new RegExp(`async ${name}\\(`).test(api)]).toEqual([name, true]);
  });

  it('the detail page does not renew with a raw fetch', () => {
    expect(read('subscriptions/[id]/page.tsx')).not.toMatch(/fetch\(`\/api\/subscriptions\/\$\{[^}]+\}\/renew`/);
  });
});

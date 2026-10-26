/**
 * #1185: admin list "Edit" must not go to a missing /outlets/:id/edit route.
 */
import * as fs from 'fs';
import * as path from 'path';

const APP = path.resolve(__dirname, '../apps/admin/app');
const read = (p: string) => fs.readFileSync(path.join(APP, p), 'utf8');

describe('admin merchant outlet edit href (#1185)', () => {
  it('the list Edit action still uses /outlets/:id/edit (same as merchant/order edit URLs)', () => {
    const src = read('merchants/[id]/outlets/page.tsx');
    expect(src).toContain('/outlets/${outletId}/edit');
  });

  it('GET .../outlets/:id/edit redirects to the detail page with ?edit=1', () => {
    const src = read('merchants/[id]/outlets/[outletId]/edit/page.tsx');
    expect(src).toMatch(/redirect\(/);
    expect(src).toMatch(/\?edit=1/);
  });
});

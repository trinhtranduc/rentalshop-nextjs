/**
 * #806 (step 4 of #802): the admin detail pages use the portal style (ar-* surface cards,
 * header with back link / title / status pill / actions) and fit a 390px phone.
 */
import * as fs from 'fs';
import * as path from 'path';

const APP = path.resolve(__dirname, '../apps/admin/app');
const read = (p: string) => fs.readFileSync(path.join(APP, p), 'utf8');

const DETAIL_PAGES = [
  'merchants/[id]/page.tsx',
  'merchants/[id]/orders/page.tsx',
  'merchants/[id]/orders/[orderId]/page.tsx',
  'merchants/[id]/products/page.tsx',
  'merchants/[id]/products/[productId]/page.tsx',
  'merchants/[id]/users/page.tsx',
  'merchants/[id]/users/[userId]/page.tsx',
  'merchants/[id]/outlets/page.tsx',
  'merchants/[id]/outlets/[outletId]/page.tsx',
  'merchants/[id]/customers/page.tsx',
  'merchants/[id]/plan-limit-addons/page.tsx',
  'subscriptions/[id]/page.tsx',
  'orders/[orderId]/page.tsx',
];

describe('admin detail pages (#806)', () => {
  it.each(DETAIL_PAGES)('%s imports details.css and wraps in .ar-detail', (file) => {
    const src = read(file);
    expect(src).toMatch(/import ['"][./]+details\.css['"]/);
    expect(src).toMatch(/ar-detail/);
  });

  it('details.css uses ar tokens, tabular figures, 44px targets and wrapping', () => {
    const css = read('details.css');
    expect(css).toMatch(/var\(--ar-line\)/);
    expect(css).toMatch(/tabular-nums/);
    expect(css).toMatch(/min-height:\s*44px/);
    expect(css).toMatch(/overflow-wrap:\s*anywhere/);
  });

  it('DetailHeader has a back link, title, status pill and wrapping actions', () => {
    const src = fs.readFileSync(path.join(APP, 'components/DetailHeader.tsx'), 'utf8');
    expect(src).toMatch(/backHref/);
    expect(src).toMatch(/<h1/);
    expect(src).toMatch(/status/);
    expect(src).toMatch(/flex-wrap/);
  });

  it('the subscription detail header keeps Edit / Renew / Extend / Suspend / Cancel / Delete', () => {
    const src = read('subscriptions/[id]/page.tsx');
    expect(src).toMatch(/<DetailHeader/);
    for (const w of ['Edit', 'Renew', 'Extend', 'Suspend', 'Cancel', 'Delete']) expect(src).toContain(w);
  });

  it('does not touch behaviour: no new fetch calls in the pages', () => {
    for (const f of DETAIL_PAGES) expect(read(f)).not.toMatch(/[^.\w]fetch\(/);
  });
});

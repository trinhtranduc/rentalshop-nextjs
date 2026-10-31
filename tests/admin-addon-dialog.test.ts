/**
 * #782 gaps 2 and 3, source checks of the admin screens. The flow itself is exercised in a browser (see the PR):
 * one add dialog replaces the left card and the second confirm dialog; the free loyalty button is gone; Basic does not
 * see loyalty and is told why; a plan already unlimited for that kind blocks the button; order blocks say plainly they
 * are all-time capacity.
 */
import * as fs from 'fs';
import * as path from 'path';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');
const page = read('apps/admin/app/merchants/[id]/addons/page.tsx');
const labels = read('apps/admin/app/components/addon-labels.ts');
const prices = read('apps/admin/app/plans/addon-prices/page.tsx');

describe('one add dialog (#782)', () => {
  it('the left card and the second confirm dialog are gone', () => {
    expect(page).not.toContain('data-testid="addon-add-card"');
    expect(page).not.toContain('data-testid="addon-confirm"');
    expect(page).not.toContain('confirming');
    expect((page.match(/data-testid="addon-dialog"/g) || []).length).toBe(1);
  });

  it('the page opens it from one "+ Thêm add-on" button, and it holds amount, price, period, charge and payment', () => {
    expect(page).toContain('data-testid="addon-open"');
    expect(page).toContain('+ Thêm add-on');
    for (const id of ['addon-amount', 'addon-price-line', 'addon-period', 'addon-charge-now', 'ad-method', 'ad-ref']) {
      expect(page).toContain(id);
    }
  });

  it('the amount accepts 6 digits, in the dialog and in the row editor', () => {
    expect(page).not.toContain('.slice(0, 4)');
    expect((page.match(/\.slice\(0, 6\)/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(page).toContain('MAX_ADDON_PACKS');
  });

  it('a unit row asks for the amount, an older pack row keeps "Số gói"', () => {
    expect(labels).toContain('cộng thêm');
    expect(page).toContain('amountLabel');
    expect(labels).toContain('Số gói');
  });

  it('a plan unlimited for that kind says so and blocks the button', () => {
    expect(page).toContain('data-testid="addon-unlimited"');
    expect(page).toMatch(/disabled=\{[^}]*unlimitedKind/);
  });

  it('order blocks are all-time capacity, shown plainly', () => {
    expect(page).toContain('data-testid="addon-orders-warning"');
    expect(page).toContain('từ trước đến nay');
    expect(page).toContain('không gỡ được');
  });
});

describe('loyalty on the shop page (#782)', () => {
  it('the free "Bật Khách thân thiết" button is gone; "Tắt" stays for shops already on it', () => {
    expect(page).not.toContain('enable-loyalty');
    expect(page).not.toContain('Bật Khách thân thiết');
    expect(page).not.toContain('setLoyaltySwitch(true)');
    expect(page).toContain('disable-loyalty');
  });

  it('Basic: the loyalty row is left out of the choices, with one line why', () => {
    expect(page).toContain('isBasicPlanName');
    expect(page).toContain('data-testid="addon-basic-loyalty"');
    expect(page).toMatch(/chưa bán cho gói Basic/);
  });

  it('the dialog says buying is enough, with no second switch', () => {
    expect(page).toContain('không phải bật công tắc');
  });
});

describe('price list (#782)', () => {
  it('a limit row at pack size 1 is priced for one unit', () => {
    expect(prices).toContain('Giá cho 1 ');
  });

  it('applies-to matches what is sold: outlets on every plan, loyalty not on Basic', () => {
    expect(labels).not.toContain('Chỉ gói nhiều chi nhánh');
    expect(labels).toContain('trừ Basic');
  });
});

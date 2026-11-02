/**
 * #943 admin: attendance is sold as a feature add-on. The merchant page has no "Module" card any more; the price list
 * offers the "Tính năng" kind; the shop's Add-on page confirms a purchase in a dialog with the charge and turns a
 * feature off from the next period ("Tắt từ kỳ sau").
 */
import * as fs from 'fs';
import * as path from 'path';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

describe('admin feature add-on (#943)', () => {
  it('the merchant detail page no longer shows the Module card', () => {
    expect(read('apps/admin/app/merchants/[id]/page.tsx')).not.toContain('MerchantModulesCard');
    expect(fs.existsSync(path.resolve(__dirname, '..', 'apps/admin/app/merchants/[id]/MerchantModulesCard.tsx'))).toBe(false);
  });

  it('the price list can create a "Tính năng" row bound to a module key', () => {
    const page = read('apps/admin/app/plans/addon-prices/page.tsx');
    expect(page).toContain('Tính năng');
    expect(page).toContain('featureKey');
  });

  it('the shop Add-on page confirms with the charge, and offers "Tắt từ kỳ sau" for a feature', () => {
    const page = read('apps/admin/app/merchants/[id]/addons/page.tsx');
    expect(page).toContain('Tắt từ kỳ sau');
    expect(page).toContain('Không hoàn tiền');
    expect(page).toContain('Mã giao dịch');
    expect(page).toContain('Tiền mặt');
    expect(page).toMatch(/data-testid="addon-dialog"/); // #782: one dialog, no second confirm
  });
});

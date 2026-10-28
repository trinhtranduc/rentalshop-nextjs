import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(path.resolve(__dirname, '../apps/client/app/orders/create/OrderEditor.tsx'), 'utf8');

describe('create order: rental days button lives in the cart column on wide screens (#1291)', () => {
  const asideAt = src.indexOf('<aside');
  const custAt = src.indexOf('onClick={() => setCustomerOpen(true)}');
  const daysBtn = src.indexOf('data-testid="cart-days"');

  it('has the days button inside the aside, above the customer button', () => {
    expect(asideAt).toBeGreaterThan(-1);
    expect(daysBtn).toBeGreaterThan(asideAt);
    expect(daysBtn).toBeLessThan(custAt);
  });

  it('shows the aside button only from 1100px and the header button only below it', () => {
    const asideBlock = src.slice(src.lastIndexOf('<button', daysBtn), src.indexOf('</button>', daysBtn));
    expect(asideBlock).toContain('hidden');
    expect(asideBlock).toContain('min-[1100px]:flex');
    expect(src).toContain('flex h-10 items-center gap-2 min-[1100px]:hidden');
  });

  it('only renders for rent orders and still opens the same dialog', () => {
    expect(src.slice(daysBtn - 400, daysBtn)).toContain("orderType === 'RENT'");
    expect(src.match(/setDaysOpen\(true\)/g)!.length).toBeGreaterThanOrEqual(2);
  });
});

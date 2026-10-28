import fs from 'fs';
import path from 'path';

const dir = path.resolve(__dirname, '../apps/client/app/orders/create');
const editor = fs.readFileSync(path.join(dir, 'OrderEditor.tsx'), 'utf8');
const hook = fs.readFileSync(path.join(dir, 'useDraftCarts.ts'), 'utf8');
const tabs = fs.readFileSync(path.join(dir, 'CartTabs.tsx'), 'utf8');

describe('create order: cart tabs (#1293)', () => {
  it('shows the tab bar only when creating, above both columns', () => {
    const bar = editor.indexOf('<CartTabs');
    expect(editor.slice(editor.lastIndexOf('{', bar) - 20, bar)).toContain('!editing');
    expect(bar).toBeGreaterThan(-1);
    expect(bar).toBeLessThan(editor.indexOf('{/* Products */}'));
    expect(bar).toBeLessThan(editor.indexOf('<aside'));
  });

  it('never reads or writes saved carts while editing an order', () => {
    expect(editor).toContain('persist: !editing');
    expect(hook).toContain('if (!persist || !userId');
  });

  it('keeps the right column below the 48px tab bar, and the old offsets when editing', () => {
    expect(editor).toContain('min-[1100px]:top-12');
    expect(editor).toContain('min-[1100px]:max-h-[calc(100vh-65px-48px)]');
    expect(editor).toContain('min-[1100px]:max-h-[calc(100vh-65px)]');
    expect(tabs).toContain('h-12');
  });

  it('closing a cart always asks, and a made order closes its cart', () => {
    expect(tabs).toContain('setAsking(c)');
    expect(tabs).toContain("t('editor.carts.deleteTitle')");
    expect(editor).toContain('store.remove(cartId)');
  });

  it('every state of the order lives in the cart, not in its own useState', () => {
    ['orderType', 'pickup', 'customer', 'discountValue', 'depositAmount', 'notes', 'photos'].forEach((k) => {
      expect(editor).not.toMatch(new RegExp(`const \\[${k}, set`));
    });
  });
});

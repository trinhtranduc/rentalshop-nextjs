/**
 * #1668 Tạo đơn, cart column: the rent / sale switch lives on the cart tab bar (more room in the cart); the items scroll
 * in their own block; the payment block never shrinks, so the submit button keeps its 52px; every item is its own card.
 * Source-level checks, like the other cart tests (the layout itself was checked in a real browser).
 */
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const editor = read('apps/client/app/orders/create/OrderEditor.tsx');
const tabs = read('apps/client/app/orders/create/CartTabs.tsx');
const parts = read('apps/client/app/orders/create/parts.tsx');

describe('rent / sale switch on the cart tab bar (#1668)', () => {
  it('the tab bar takes a trailing slot, pinned at its right end', () => {
    expect(tabs).toContain('trailing?: React.ReactNode');
    expect(tabs).toMatch(/\{trailing && <div className="sticky right-0 ml-auto/);
  });

  it('creating: the editor passes the switch to the bar; editing keeps it at the top of the cart', () => {
    expect(editor).toContain('trailing={typeSwitch(true)}');
    expect(editor).toContain('{editing && typeSwitch(false)}');
    // no other place renders the switch inside the cart column
    expect(editor.match(/typeSwitch\(/g)!.length).toBe(2); // the bar and the editing top (the definition is `typeSwitch = `)
  });

  it('the switch is still disabled for the other type while editing, and while submitting', () => {
    expect(editor).toContain('disabled={submitting || (editing && orderType !== k)}');
  });
});

describe('cart column: one scroll, the payment block and the button never shrink (#1668)', () => {
  const daysAt = editor.indexOf('data-testid="cart-days"');
  const customerAt = editor.indexOf('onClick={() => setCustomerOpen(true)}');
  const paymentAt = editor.indexOf('data-testid="cart-payment"');
  const submitAt = editor.indexOf('{submitLabel}');
  const asideEnd = editor.indexOf('</aside>');

  it('order in the column: days, customer, items, then the payment block, then the button', () => {
    expect(daysAt).toBeGreaterThan(-1);
    expect(customerAt).toBeGreaterThan(daysAt);
    expect(paymentAt).toBeGreaterThan(customerAt);
    expect(submitAt).toBeGreaterThan(paymentAt);
    expect(asideEnd).toBeGreaterThan(submitAt);
  });

  it('the whole column scrolls as before (nothing is pinned, the items get all the room)', () => {
    expect(editor).toContain('min-[1100px]:top-12');
    expect(editor).toContain('min-[1100px]:max-h-[calc(100vh-65px-48px)]');
    expect(editor).toContain('min-[1100px]:max-h-[calc(100vh-65px)]');
    expect(editor).toContain('min-[1100px]:sticky min-[1100px]:overflow-y-auto');
    // the payment block is not pinned to the bottom of the column
    expect(editor).not.toContain('min-[1100px]:overflow-hidden');
    expect(editor).not.toMatch(/data-testid="cart-payment"[\s\S]{0,200}min-\[1100px\]:max-h/);
  });

  it('the payment block is a card inside the flow and never shrinks', () => {
    const tag = editor.slice(paymentAt, editor.indexOf('>', paymentAt));
    expect(tag).toContain('flex flex-none flex-col gap-3 rounded-xl bg-ar-subtle p-4');
  });

  it('the submit button cannot be squeezed: 52px high, flex-none and shrink-0', () => {
    const buttonAt = editor.lastIndexOf('<button', submitAt);
    const tag = editor.slice(buttonAt, submitAt);
    expect(tag).toContain('h-[52px] flex-none shrink-0');
  });

  it('the total is the biggest number of the payment block', () => {
    expect(editor).toContain('text-2xl tabular-nums">{money(totals.totalAmount - totals.loyaltyDiscount)}');
  });

  it('the payment block has its own label', () => {
    expect(editor).toContain("t('editor.cart.payment')");
  });
});

describe('every item is its own card (#1668)', () => {
  const rowAt = parts.indexOf('export function CartLineRow');
  const rootTag = parts.slice(parts.indexOf('return (', rowAt), parts.indexOf('>', parts.indexOf('return (', rowAt) + 20));

  it('the line row is a bordered, rounded card with its own background, not a ruled row', () => {
    expect(rootTag).toContain('rounded-xl border border-ar-line bg-ar-subtle p-3');
    expect(rootTag).not.toContain('border-t');
  });

  it('cards are spaced by the list, not by their own padding', () => {
    expect(editor).toContain('<div className="flex flex-col gap-2.5">');
  });
});

describe('the payment label is translated everywhere', () => {
  const langs = ['vi', 'en', 'ja', 'ko', 'zh', 'zh-TW', 'ru', 'fr', 'de', 'th', 'id', 'es'];
  it.each(langs)('%s', (lang) => {
    const json = JSON.parse(read(`locales/${lang}/orders.json`));
    expect(typeof json.web.editor.cart.payment).toBe('string');
    expect(json.web.editor.cart.payment.length).toBeGreaterThan(0);
  });
});

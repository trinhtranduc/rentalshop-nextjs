/**
 * #1433 owner's decision: "phí hư hỏng -> phụ phí". Only the words on screen change.
 * The API keeps its sentences (`description`), because installed apps match on them:
 * apps/mobile OverviewDashLogic.swift, apps/mobile-android OverviewRelated.kt on main-real.
 */
import * as fs from 'fs';
import * as path from 'path';
import { eventReasons } from '../apps/client/app/dashboard/overview-model';
import { getOrderRevenueEvents } from '../packages/utils/src/core/revenue-calculator';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file: string) => JSON.parse(read(file));
const OLD_VI = /ph[ií] h[uư] h(ỏng|ại)/i;

const strings = (file: string) =>
  Object.fromEntries([...read(file).matchAll(/^"((?:[^"\\]|\\.)+)"\s*=\s*"((?:[^"\\]|\\.)*)";/gm)].map((m) => [m[1], m[2]]));
const androidStrings = (file: string) =>
  Object.fromEntries([...read(file).matchAll(/<string name="([^"]+)"[^>]*>([^<]*)<\/string>/g)].map((m) => [m[1], m[2]]));

function scalars(value: unknown, prefix = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[prefix, value]];
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => scalars(v, prefix ? `${prefix}.${k}` : k));
  }
  return [];
}

describe('#1433 label on web', () => {
  it('no Vietnamese web string says "phí hư hỏng" or "phí hư hại"', () => {
    const dir = path.join(root, 'locales/vi');
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const wrong = scalars(json(`locales/vi/${file}`)).filter(([, text]) => OLD_VI.test(text)).map(([key]) => key);
      expect({ file, wrong }).toEqual({ file, wrong: [] });
    }
  });

  it('no English web string calls the fee a damage fee', () => {
    for (const file of ['orders', 'dashboard']) {
      const wrong = scalars(json(`locales/en/${file}.json`)).filter(([, text]) => /damage fee/i.test(text)).map(([key]) => key);
      expect(wrong).toEqual([]);
    }
  });

  it('both languages name the fee in every place it is shown', () => {
    const vi = { o: json('locales/vi/orders.json'), d: json('locales/vi/dashboard.json') };
    const en = { o: json('locales/en/orders.json'), d: json('locales/en/dashboard.json') };
    expect([vi.o.amount.damageFee, vi.o.detailMoney.damageFee, vi.o.web.detail.pay.damageFee, vi.o.web.detail.dialog.takeBack.damageFee, vi.o.web.receipt.rows.damageFee])
      .toEqual(Array(5).fill('Phụ phí'));
    expect(vi.o.web.detail.dialog.rows.fees).toBe('Phí trễ + phụ phí');
    expect(vi.d.home.money.fees).toBe('Phụ phí, trễ hạn');
    expect(vi.d.operations.cash.feesBreakdown).toBe('Trễ hạn {late} · Phụ phí {damage}');
    expect(vi.d.home.related.event.damageFee).toBe('Thu phụ phí');
    expect(vi.d.home.related.event.futureDamageFee).toBe('Dự kiến thu phụ phí khi trả hàng');
    expect(en.o.web.receipt.rows.damageFee).toBe('Extra fee');
    expect(en.o.web.detail.dialog.rows.fees).toBe('Late + extra fees');
    expect(en.d.home.related.event.damageFee).toBe('Extra fee collected');
    expect(en.d.home.related.event.futureDamageFee).toBe('Expected extra fee at return');
  });

  // #1442: the late fee is its own line, so "trả muộn" does not belong in this tooltip (ja, ko, zh: no key, next test)
  it('the tooltip of the fee does not talk about returning late', () => {
    expect(json('locales/vi/orders.json').amount.tooltips.damageFee).toBe('Khoản thu thêm khi sản phẩm bị hư hỏng hoặc mất mát trong quá trình khách hàng thuê');
    expect(json('locales/en/orders.json').amount.tooltips.damageFee).toBe('Extra charge when products are damaged or lost during rental');
  });

  it('ja, ko and zh have no text of their own for it, so they show the English label', () => {
    for (const lang of ['ja', 'ko', 'zh']) {
      expect(scalars(json(`locales/${lang}/orders.json`)).filter(([key]) => /damageFee|\.fees$/.test(key))).toEqual([]);
      expect(fs.existsSync(path.join(root, `locales/${lang}/dashboard.json`))).toBe(false);
    }
  });
});

describe('#1433 label in the apps', () => {
  it('iOS', () => {
    const vi = strings('apps/mobile/POS ADBD/vi-VN.lproj/Localizable.strings');
    const en = strings('apps/mobile/POS ADBD/en.lproj/Localizable.strings');
    expect(Object.entries(vi).filter(([, text]) => OLD_VI.test(text)).map(([key]) => key)).toEqual([]);
    expect(Object.entries(en).filter(([, text]) => /damage fee/i.test(text)).map(([key]) => key)).toEqual([]);
    for (const key of ['Damage Fee', 'Damage fee', 'history.field.damageFee']) expect(vi[key]).toBe('Phụ phí');
    expect(vi['Damage Fee:']).toBe('Phụ phí:');
    expect(vi['overview.related.event.damageFee']).toBe('Thu phụ phí');
    expect(en['Damage Fee']).toBe('Extra Fee');
    expect(en['overview.related.event.damageFee']).toBe('Extra fee collected');
  });

  it('iOS receipt', () => {
    const swift = read('apps/mobile/POS ADBD/Viewcontrollers/Tabbar/PreviewViewController.swift');
    expect(swift).toContain('vietnamese: "Phụ Phí", english: "Extra Fee"');
    expect(swift).not.toContain('Phí Hư Hại');
  });

  it('Android', () => {
    const vi = androidStrings('apps/mobile-android/app/src/main/res/values-vi/strings.xml');
    const en = androidStrings('apps/mobile-android/app/src/main/res/values/strings.xml');
    expect(Object.entries(vi).filter(([, text]) => OLD_VI.test(text)).map(([key]) => key)).toEqual([]);
    expect(Object.entries(en).filter(([, text]) => /damage fee/i.test(text)).map(([key]) => key)).toEqual([]);
    expect(vi.damage_fee).toBe('Phụ phí');
    expect(vi.detail_fees).toBe('Phí trễ + phụ phí');
    expect(en.damage_fee).toBe('Extra Fee');
    expect(read('apps/mobile-android/app/src/main/res/values-vi/strings.xml')).toContain('<item>damageFee|Phụ phí</item>');
    expect(read('apps/mobile-android/app/src/main/res/values/strings.xml')).toContain('<item>damageFee|Extra fee</item>');
  });
});

describe('#1433 the API text stays for installed apps', () => {
  const returned = {
    orderType: 'RENT',
    status: 'RETURNED',
    totalAmount: 1000000,
    depositAmount: 0,
    securityDeposit: 100000,
    damageFee: 300000,
    createdAt: new Date('2026-10-01T03:00:00Z'),
    pickedUpAt: new Date('2026-10-02T03:00:00Z'),
    returnedAt: new Date('2026-10-05T03:00:00Z'),
  };

  it('the return event still says "Thu phí hư hỏng"', () => {
    const events = getOrderRevenueEvents(returned as never, new Date('2026-10-05T00:00:00Z'), new Date('2026-10-05T23:59:59Z'));
    expect(events.filter((e) => e.revenueType === 'RENT_RETURN').map((e) => e.description)).toEqual(['Thu phí hư hỏng']);
  });

  it('the web still knows the API sentences, alone and inside a MULTIPLE row', () => {
    expect(eventReasons('RENT_RETURN', 'Thu phí hư hỏng', 50).map((r) => r.key)).toEqual(['damageFee']);
    expect(eventReasons('RENT_FUTURE_RETURN', 'Ước tính thu phí hư hỏng khi trả hàng', 50).map((r) => r.key)).toEqual(['futureDamageFee']);
    expect(eventReasons('MULTIPLE', 'Thu tiền khi lấy hàng + Thu phí hư hỏng', 150).map((r) => r.key)).toEqual(['pickup', 'damageFee']);
  });
});

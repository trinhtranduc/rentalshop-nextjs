/**
 * #1145 "Tiền tệ" in Cài đặt → Thông tin cửa hàng: only the owner sees it; the confirm shows the same amount in
 * both currencies (nothing converted), in the web's own money format.
 */
import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { canChangeCurrency, currencyExample, shopCurrency } from '../apps/client/app/settings/settings-model';
import { formatCurrency, formatShopAmount } from '../packages/utils/src/core/currency';

const nbsp = (s: string) => s.replace(/ /g, ' ');

describe('shop currency in Settings (#1145)', () => {
  it('only MERCHANT can change it', () => {
    expect(canChangeCurrency('MERCHANT')).toBe(true);
    expect(canChangeCurrency('merchant')).toBe(true);
    for (const r of ['ADMIN', 'OPS', 'OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY', '', null, undefined]) {
      expect(canChangeCurrency(r as any)).toBe(false);
    }
  });

  it('reads the stored value like CurrencyProvider does (missing → USD)', () => {
    expect(shopCurrency('VND')).toBe('VND');
    expect(shopCurrency(' vnd ')).toBe('VND');
    expect(shopCurrency('USD')).toBe('USD');
    expect(shopCurrency(undefined)).toBe('USD');
    expect(shopCurrency('EUR')).toBe('USD');
  });

  it('shop web money: VND unchanged, USD with "$" (no decimals when whole)', () => {
    expect(formatShopAmount(220000, 'VND')).toBe(formatCurrency(220000, 'VND'));
    expect(formatShopAmount(220000, 'VND')).toBe('220,000');
    expect(formatShopAmount(220000, 'USD')).toBe('$220,000');
    expect(formatShopAmount(1234.5, 'USD')).toBe('$1,234.50');
    expect(formatShopAmount(-50, 'USD')).toBe('-$50');
    expect(formatShopAmount(0, 'USD')).toBe('$0');
    expect(formatShopAmount(null, 'USD')).toBe('$0');
  });

  it('confirm example keeps the amount: 220,000 → $220,000', () => {
    expect(nbsp(currencyExample('VND', 'USD', formatShopAmount))).toBe('220,000 → $220,000');
    expect(nbsp(currencyExample('USD', 'VND', formatShopAmount))).toBe('$220,000 → 220,000');
  });

  it('only the shop web turns the "$" on (admin keeps formatCurrency)', () => {
    const layout = readFileSync(join(__dirname, '..', 'apps', 'client', 'app', 'components', 'ClientLayout.tsx'), 'utf8');
    expect(layout).toMatch(/<CurrencyProvider merchantCurrency=\{merchantCurrency\} showDollar>/);
    const hook = readFileSync(join(__dirname, '..', 'packages', 'ui', 'src', 'hooks', 'useFormatCurrency.ts'), 'utf8');
    expect(hook).toMatch(/showDollar \? formatShopAmount\(amount, currency\) : formatCurrency\(amount, currency\)/);
  });

  it('every locale has the new keys', () => {
    for (const l of ['en', 'vi', 'ja', 'ko', 'zh']) {
      const form = JSON.parse(readFileSync(join(__dirname, '..', 'locales', l, 'settings.json'), 'utf8')).web.form;
      for (const k of ['currency', 'currencyHint', 'currencyConfirmTitle', 'currencyConfirmBody', 'currencyConfirmOk']) {
        expect(typeof form[k]).toBe('string');
      }
    }
  });

  it('the panel saves the currency through PUT /api/settings/currency and refreshes the shown currency', () => {
    const panel = readFileSync(join(__dirname, '..', 'apps', 'client', 'app', 'settings', 'SettingsPanel.tsx'), 'utf8');
    expect(panel).toMatch(/updateMerchantCurrency\(\{ currency: /);
    expect(panel).toMatch(/setCurrency\(/);
    expect(panel).toMatch(/canChangeCurrency\(role\)/);
  });
});

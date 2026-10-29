/**
 * #1321 web staff keep the old shop currency until they log in again: the shop layout reads
 * GET /api/settings/currency on load and when the tab comes back, at most once a minute.
 */
import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as model from '../apps/client/app/settings/settings-model';
import { storedUserDiffers } from '../packages/hooks/src/hooks/auth-sync';

const read = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');
const NOW = Date.parse('2026-10-29T03:00:00.000Z');
const ask = (over: Record<string, unknown> = {}) =>
  (model as any).shouldRefreshShopCurrency({ now: NOW, role: 'OUTLET_STAFF', hasMerchant: true, lastRefreshAt: null, ...over });

describe('shouldRefreshShopCurrency (#1321)', () => {
  it('reads once on load (never refreshed) for every shop role', () => {
    for (const role of ['MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY', 'outlet_staff']) {
      expect(ask({ role })).toBe(true);
    }
  });

  it('waits one minute between reads', () => {
    expect(ask({ lastRefreshAt: NOW - 1000 })).toBe(false);
    expect(ask({ lastRefreshAt: NOW - 59_999 })).toBe(false);
    expect(ask({ lastRefreshAt: NOW - 60_000 })).toBe(true);
    expect(ask({ lastRefreshAt: NOW - 10 * 60_000 })).toBe(true);
  });

  it('a clock that went backwards reads again', () => {
    expect(ask({ lastRefreshAt: NOW + 5 * 60_000 })).toBe(true);
  });

  it('ADMIN / OPS web and users without a merchant make no call', () => {
    expect(ask({ role: 'ADMIN' })).toBe(false);
    expect(ask({ role: 'OPS' })).toBe(false);
    expect(ask({ role: undefined })).toBe(false);
    expect(ask({ hasMerchant: false })).toBe(false);
  });
});

describe('web wiring (#1321)', () => {
  it('the sync reads the existing endpoint through settingsApi, on load and when the tab is visible again', () => {
    const sync = read('apps', 'client', 'app', 'components', 'ShopCurrencySync.tsx');
    expect(sync).toMatch(/settingsApi\.getMerchantCurrency\(\)/);
    expect(sync).toMatch(/visibilitychange/);
    expect(sync).toMatch(/shouldRefreshShopCurrency\(/);
    expect(sync).not.toMatch(/\bfetch\(/);
  });

  it('the shop layout mounts it inside the CurrencyProvider', () => {
    const layout = read('apps', 'client', 'app', 'components', 'ClientLayout.tsx');
    expect(layout).toMatch(/<ShopCurrencySync/);
    expect(layout.indexOf('<CurrencyProvider')).toBeLessThan(layout.indexOf('<ShopCurrencySync'));
  });

  it('another useAuth() instance takes a changed merchant currency from storage', () => {
    const u = { id: 3, role: 'OUTLET_STAFF', merchant: { id: 1, currency: 'USD' } };
    expect(storedUserDiffers(u as any, { ...u, merchant: { id: 1, currency: 'VND' } } as any)).toBe(true);
    expect(storedUserDiffers(u as any, { ...u, merchant: { id: 1, currency: 'USD' } } as any)).toBe(false);
  });
});

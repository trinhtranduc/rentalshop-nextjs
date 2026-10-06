/**
 * #528 shop web Cài đặt cửa hàng: tabs per role (same rules as the old Settings menu), `?tab=`
 * resolution, and the small form checks the page uses.
 */
import { describe, expect, it } from '@jest/globals';
import {
  addressLine,
  currencyForLocale,
  defaultTab,
  mapSubscriptionStatus,
  passwordProblem,
  publicLinks,
  resolveTab,
  tabsForRole,
  tenantKeyValid,
} from '../apps/client/app/settings/settings-model';

const ids = (role?: string | null) => tabsForRole(role).map((t) => t.id);

describe('tabsForRole', () => {
  it('gives the owner the shop tabs, receipt and plan, but not the outlet tabs', () => {
    expect(ids('MERCHANT')).toEqual(['merchant', 'receipt', 'subscription', 'profile', 'account', 'language']);
  });

  it('gives an outlet admin their outlet, bank accounts and receipt', () => {
    expect(ids('OUTLET_ADMIN')).toEqual(['outlet', 'bank-accounts', 'receipt', 'profile', 'account', 'language']);
  });

  it('gives outlet staff their outlet only, no bank accounts, receipt or plan', () => {
    expect(ids('OUTLET_STAFF')).toEqual(['outlet', 'profile', 'account', 'language']);
  });

  it('ignores the case of the role and shows only personal tabs to an unknown role', () => {
    expect(ids('merchant')).toEqual(ids('MERCHANT'));
    expect(ids(undefined)).toEqual(['profile', 'account', 'language']);
  });
});

describe('resolveTab', () => {
  it('opens the shop for owners and outlet users, the account for anyone else', () => {
    expect(defaultTab('MERCHANT')).toBe('merchant');
    expect(defaultTab('OUTLET_STAFF')).toBe('outlet');
    expect(resolveTab(null, 'MERCHANT')).toEqual({ tab: 'merchant' });
    expect(resolveTab(null, null)).toEqual({ tab: 'profile' });
  });

  it('keeps an allowed old ?tab= value', () => {
    expect(resolveTab('subscription', 'MERCHANT')).toEqual({ tab: 'subscription' });
    expect(resolveTab('bank-accounts', 'OUTLET_ADMIN')).toEqual({ tab: 'bank-accounts' });
  });

  it('falls back to the default for a tab the role may not open', () => {
    expect(resolveTab('receipt', 'OUTLET_STAFF')).toEqual({ tab: 'outlet' });
    expect(resolveTab('subscription', 'OUTLET_ADMIN')).toEqual({ tab: 'outlet' });
    expect(resolveTab('nonsense', 'MERCHANT')).toEqual({ tab: 'merchant' });
  });

  it('sends the old loyalty tab to /loyalty', () => {
    expect(resolveTab('loyalty', 'MERCHANT')).toEqual({ tab: 'merchant', redirect: '/loyalty' });
  });
});

describe('form checks', () => {
  it('checks passwords in the old order', () => {
    expect(passwordProblem({ currentPassword: '', newPassword: 'abcdef', confirmPassword: 'abcdef' })).toBe('currentRequired');
    expect(passwordProblem({ currentPassword: 'x', newPassword: 'abcdef', confirmPassword: 'abcdeg' })).toBe('mismatch');
    expect(passwordProblem({ currentPassword: 'x', newPassword: 'abc', confirmPassword: 'abc' })).toBe('tooShort');
    expect(passwordProblem({ currentPassword: 'x', newPassword: 'abcdef', confirmPassword: 'abcdef' })).toBeNull();
  });

  it('accepts an empty or lowercase store key only', () => {
    expect(tenantKeyValid('')).toBe(true);
    expect(tenantKeyValid('ao-dai-hoa-mai2')).toBe(true);
    expect(tenantKeyValid('Ao Dai')).toBe(false);
    expect(tenantKeyValid('áo-dài')).toBe(false);
  });

  it('matches the currency to the UI language', () => {
    expect(currencyForLocale('vi')).toBe('VND');
    expect(currencyForLocale('en')).toBe('USD');
  });

  it('writes an address line without blanks or repeats', () => {
    expect(addressLine({ address: '12 Lê Lợi', state: 'Quận 1', city: 'TP. Hồ Chí Minh' })).toBe('12 Lê Lợi, Quận 1, TP. Hồ Chí Minh');
    expect(addressLine({ address: ' ', state: 'Quận 1', city: 'Quận 1' })).toBe('Quận 1');
    expect(addressLine(null)).toBe('');
  });
});

describe('publicLinks', () => {
  it('prefers the link from the login payload, else builds it from the store key', () => {
    expect(publicLinks('https://anyrent.shop', { publicProductLink: 'https://x/y', tenantKey: 'hoa-mai' }).productLink).toBe('https://x/y');
    expect(publicLinks('https://anyrent.shop', { tenantKey: 'hoa-mai' })).toEqual({
      productLink: 'https://anyrent.shop/hoa-mai/products',
      registrationLink: 'https://anyrent.shop/register?referralCode=hoa-mai',
    });
  });

  it('has no links without a key or referral code', () => {
    expect(publicLinks('https://anyrent.shop', {})).toEqual({ productLink: null, registrationLink: null });
  });
});

describe('mapSubscriptionStatus', () => {
  it('maps the flat status to the shape the billing panel reads', () => {
    const out = mapSubscriptionStatus({ subscriptionId: 7, status: 'TRIAL', planName: 'Basic', billingAmount: 100, planId: 2, merchantId: 3, hasAccess: true });
    expect(out.subscription).toMatchObject({ id: 7, status: 'TRIAL', amount: 100, plan: { id: 2, name: 'Basic' } });
    expect(out).toMatchObject({ isTrial: true, isActive: false, hasAccess: true, merchant: { id: 3 } });
  });
});

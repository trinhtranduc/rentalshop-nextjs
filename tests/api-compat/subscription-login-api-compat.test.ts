/**
 * #1459: installed apps read the plan from GET /api/subscriptions/status and from the login answer. After this change
 * both answer exactly what `origin/main-real` answers (`golden/subscription-login-main-real.json`), key for key, and the
 * status answer only ADDS the renewal fields below. Login is unchanged.
 *
 * Runs the same under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import golden from './golden/subscription-login-main-real.json';
import { NOW, runSubscriptionLoginScenarios } from './subscription-login-scenarios';
import { freezeClock } from './load-route';

const before = golden as Record<string, any>;
let now: Record<string, any>;

const ADDED_STATUS_KEYS = [
  'billingChannel', 'autoRenew', 'billingIssue', 'storeProductId', 'planTier', 'canRenew', 'canUpgrade', 'purchasablePlanIds', 'renewWindowDays',
  'reenableAutoRenew', 'storeRenewsAt',
];

beforeAll(async () => {
  freezeClock(NOW);
  now = await runSubscriptionLoginScenarios();
});
afterAll(() => jest.useRealTimers());

const names = Object.keys(golden);
const statusNames = names.filter((n) => n.startsWith('status_'));
const loginNames = names.filter((n) => !n.startsWith('status_'));

describe('golden file', () => {
  it('covers the same scenarios', () => {
    expect(Object.keys(now).sort()).toEqual(names.sort());
  });

  it('records real answers (not errors)', () => {
    expect(before.status_activeBasic20Days.status).toBe(200);
    expect(before.status_activeBasic20Days.body.data).toMatchObject({ planName: 'Basic', status: 'ACTIVE', daysRemaining: 20 });
    expect(before.status_expiredBasic.body.data.status).toBe('EXPIRED');
    expect(before.login_activeBasic20Days.body.data.user.merchant.subscription).toMatchObject({ status: 'ACTIVE', planId: 2 });
  });
});

describe('login answers are unchanged', () => {
  it.each(loginNames)('%s', (name) => {
    expect(now[name]).toEqual(before[name]);
  });
});

describe('status answers keep every old key and value, and only add the renewal fields', () => {
  it.each(statusNames)('%s', (name) => {
    const old = before[name];
    const cur = now[name];
    expect(cur.status).toBe(old.status);
    const { data, ...envelope } = cur.body;
    const { data: oldData, ...oldEnvelope } = old.body;
    expect(envelope).toEqual(oldEnvelope);
    const added = Object.keys(data).filter((k) => !(k in oldData));
    expect(added.sort()).toEqual([...ADDED_STATUS_KEYS].sort());
    for (const key of Object.keys(oldData)) expect([key, data[key]]).toEqual([key, oldData[key]]);
  });
});

describe('the new fields answer the renewal rule', () => {
  const data = (name: string) => now[`status_${name}`].body.data;

  it('Basic, 20 days: upgrade only; 5 days and the last day: renew too', () => {
    expect(data('activeBasic20Days')).toMatchObject({ canRenew: false, canUpgrade: true, purchasablePlanIds: [3], billingChannel: 'MANUAL', autoRenew: false, billingIssue: false, planTier: 'basic', renewWindowDays: 7 });
    expect(data('activeBasic5Days')).toMatchObject({ canRenew: true, canUpgrade: true, purchasablePlanIds: [2, 3] });
    expect(data('lastDayBasic')).toMatchObject({ daysRemaining: 0, canRenew: true });
  });

  it('expired and trial: every in-app plan', () => {
    expect(data('expiredBasic')).toMatchObject({ canRenew: true, canUpgrade: true, purchasablePlanIds: [2, 3] });
    expect(data('trial')).toMatchObject({ planTier: null, canRenew: false, canUpgrade: true, purchasablePlanIds: [2, 3] });
  });

  it('App Store auto-renew: nothing to buy, channel and product exposed', () => {
    expect(data('appStoreAutoRenew')).toMatchObject({
      billingChannel: 'APP_STORE', autoRenew: true, storeProductId: 'anyrent_merchant_annual', canRenew: false, canUpgrade: false, purchasablePlanIds: [],
    });
  });

  it('A13 storeRenewsAt: the store charge date (end − credit) while auto-renewing, null otherwise', () => {
    const d = data('appStoreAutoRenew');
    expect(new Date(d.storeRenewsAt).getTime()).toBe(new Date(d.currentPeriodEnd).getTime() - 2 * 86400000);
    expect(data('activeBasic20Days').storeRenewsAt).toBeNull();
    expect(data('cancelledProfessional').storeRenewsAt).toBeNull();
    expect(data('expiredBasic').storeRenewsAt).toBeNull();
  });

  it('Professional with 40 days and cancelled auto-renew: nothing to buy yet', () => {
    expect(data('cancelledProfessional')).toMatchObject({ planTier: 'professional', canRenew: false, canUpgrade: false, purchasablePlanIds: [] });
  });

  it('staff of an expired shop read the status (open to expired shops)', () => {
    expect(now.status_staffExpired.status).toBe(200);
    expect(data('staffExpired').status).toBe('EXPIRED');
  });
});

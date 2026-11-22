/**
 * #1631 Polar on the web: config, Standard Webhooks signature, and the pure rules that turn Polar subscription / order
 * events into the subscription row and payments (apps/api/lib/polar.ts, apps/api/lib/polar-billing.ts).
 * Cases 1–6 are the ones the owner confirmed on 2026-11-21 (issue #1631); times are Vietnam days (UTC+7).
 */
import { createHmac } from 'crypto';
import {
  fixedPrice,
  merchantIdFromExternal,
  minorToMajor,
  parsePolarProducts,
  polarConfig,
  polarExternalCustomerId,
  productMonths,
  verifyPolarSignature,
} from '../apps/api/lib/polar';
import {
  isFullRefund,
  polarCheckoutDecision,
  polarOrderPayment,
  polarRefundPatch,
  polarSubscriptionPatch,
} from '../apps/api/lib/polar-billing';
import { normaliseChannel, isRunningStoreSubscription, manualExtensionBilling, storeRenewsAt } from '../apps/api/lib/plan-renewal';

const DAY = 86400000;
const PRO = { tier: 'professional' as const, months: 12 as const };
const PRO6 = { tier: 'professional' as const, months: 6 as const };
const PRO_PLAN = 3;

// Shop Hoa: Pro paid by transfer until 31/01/2027 23:59:59 VN
const HOA_END = new Date('2027-01-31T16:59:59.000Z');
const BUY_HOA = new Date('2026-11-21T03:00:00.000Z'); // 21/11/2026 10:00 VN

const sub = (over: Record<string, unknown> = {}) => ({
  id: 'sub_hoa_1',
  status: 'active',
  current_period_start: '2026-11-21T03:00:00.000Z',
  current_period_end: '2027-11-21T03:00:00.000Z',
  cancel_at_period_end: false,
  canceled_at: null,
  ended_at: null,
  past_due_at: null,
  product_id: 'prod_pro_12',
  amount: 1799000,
  currency: 'vnd',
  customer: { external_id: 'merchant_7' },
  metadata: { merchantId: '7', planId: '3', interval: 'annual' },
  ...over,
});

const manualHoa = (over: Record<string, unknown> = {}) => ({
  planId: PRO_PLAN,
  status: 'ACTIVE',
  currentPeriodStart: new Date('2026-01-31T17:00:00.000Z'),
  currentPeriodEnd: HOA_END,
  billingChannel: 'MANUAL',
  storeProductId: null,
  storeOriginalTransactionId: null,
  autoRenew: false,
  cancelAtPeriodEnd: false,
  storeBonusMs: null,
  billingIssueAt: null,
  ...over,
});

/** The row after case 1's purchase */
const polarHoa = (over: Record<string, unknown> = {}) => ({
  planId: PRO_PLAN,
  status: 'ACTIVE',
  currentPeriodStart: BUY_HOA,
  currentPeriodEnd: new Date('2028-01-31T16:59:59.000Z'),
  billingChannel: 'POLAR',
  storeProductId: 'prod_pro_12',
  storeOriginalTransactionId: 'sub_hoa_1',
  autoRenew: true,
  cancelAtPeriodEnd: false,
  storeBonusMs: HOA_END.getTime() - BUY_HOA.getTime(),
  billingIssueAt: null,
  ...over,
});

const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : d);

describe('#1631 config', () => {
  it('POLAR_PRODUCTS: tier and months per key; unknown keys and blank ids are left out', () => {
    expect(parsePolarProducts('professional_semi_annual=prod_p6, professional_annual = prod_p12,foo=bar,basic_annual=,basic_semi_annual=prod_b6')).toEqual([
      { key: 'professional_semi_annual', tier: 'professional', interval: 'semi_annual', months: 6, productId: 'prod_p6' },
      { key: 'professional_annual', tier: 'professional', interval: 'annual', months: 12, productId: 'prod_p12' },
      { key: 'basic_semi_annual', tier: 'basic', interval: 'semi_annual', months: 6, productId: 'prod_b6' },
    ]);
    expect(parsePolarProducts(undefined)).toEqual([]);
  });

  it('enabled only with a token and products; sandbox unless production; the base URL can be overridden', () => {
    expect(polarConfig({}).enabled).toBe(false);
    expect(polarConfig({ POLAR_ACCESS_TOKEN: 't' }).enabled).toBe(false);
    const sandbox = polarConfig({ POLAR_ACCESS_TOKEN: 't', POLAR_PRODUCTS: 'professional_annual=p' });
    expect(sandbox.enabled).toBe(true);
    expect(sandbox.baseUrl).toBe('https://sandbox-api.polar.sh');
    expect(polarConfig({ POLAR_ACCESS_TOKEN: 't', POLAR_PRODUCTS: 'professional_annual=p', POLAR_SERVER: 'production' }).baseUrl).toBe('https://api.polar.sh');
    expect(polarConfig({ POLAR_ACCESS_TOKEN: 't', POLAR_PRODUCTS: 'professional_annual=p', POLAR_API_BASE_URL: 'http://127.0.0.1:4590/' }).baseUrl).toBe('http://127.0.0.1:4590');
  });

  it('the customer id Polar sees is merchant_<id>', () => {
    expect(polarExternalCustomerId(7)).toBe('merchant_7');
    expect(merchantIdFromExternal('merchant_7')).toBe(7);
    expect(merchantIdFromExternal('merchant_x')).toBeNull();
    expect(merchantIdFromExternal(null)).toBeNull();
  });

  it('VND has no minor unit; USD has cents', () => {
    expect(minorToMajor(1799000, 'vnd')).toBe(1799000);
    expect(minorToMajor(4999, 'USD')).toBe(49.99);
  });

  it('the fixed price, VND first; product months from its interval', () => {
    const product = {
      recurring_interval: 'month', recurring_interval_count: 6,
      prices: [
        { amount_type: 'fixed', price_currency: 'usd', price_amount: 4999, is_archived: false },
        { amount_type: 'fixed', price_currency: 'vnd', price_amount: 1299000, is_archived: false },
        { amount_type: 'fixed', price_currency: 'vnd', price_amount: 999000, is_archived: true },
      ],
    };
    expect(fixedPrice(product)).toEqual({ amount: 1299000, currency: 'VND', minor: 1299000 });
    expect(productMonths(product)).toBe(6);
    expect(productMonths({ recurring_interval: 'year', recurring_interval_count: 1 })).toBe(12);
    expect(productMonths({ recurring_interval: 'month', recurring_interval_count: 12 })).toBe(12);
    expect(productMonths({ recurring_interval: 'month', recurring_interval_count: 1 })).toBeNull();
  });
});

describe('#1631 webhook signature (Standard Webhooks, as @polar-sh/sdk 1.3.2)', () => {
  const raw = 'local-polar-signing-key-123';
  const secret = `whsec_${Buffer.from(raw).toString('base64')}`;
  const body = JSON.stringify({ type: 'order.paid', data: { id: 'ord_1' } });
  const now = new Date('2026-11-21T03:00:00.000Z');
  const ts = String(Math.floor(now.getTime() / 1000));
  const sign = (key: Buffer | string, id = 'msg_1', t = ts, b = body) =>
    createHmac('sha256', key).update(`${id}.${t}.${b}`).digest('base64');

  it('accepts the base64 key after whsec_ and the raw secret bytes', () => {
    expect(verifyPolarSignature({ body, id: 'msg_1', timestamp: ts, signature: `v1,${sign(Buffer.from(raw))}`, secret, now })).toEqual({ ok: true });
    expect(verifyPolarSignature({ body, id: 'msg_1', timestamp: ts, signature: `v1,${sign(secret)}`, secret, now })).toEqual({ ok: true });
    expect(verifyPolarSignature({ body, id: 'msg_1', timestamp: ts, signature: `v1,bad v1,${sign(Buffer.from(raw))}`, secret, now })).toEqual({ ok: true });
  });

  it('refuses a changed body, a wrong id, old or future timestamps, missing headers', () => {
    const good = `v1,${sign(Buffer.from(raw))}`;
    expect(verifyPolarSignature({ body: body + ' ', id: 'msg_1', timestamp: ts, signature: good, secret, now }).ok).toBe(false);
    expect(verifyPolarSignature({ body, id: 'msg_2', timestamp: ts, signature: good, secret, now }).ok).toBe(false);
    const old = String(Number(ts) - 301);
    expect(verifyPolarSignature({ body, id: 'msg_1', timestamp: old, signature: `v1,${sign(Buffer.from(raw), 'msg_1', old)}`, secret, now })).toEqual({ ok: false, reason: 'too_old' });
    const future = String(Number(ts) + 301);
    expect(verifyPolarSignature({ body, id: 'msg_1', timestamp: future, signature: `v1,${sign(Buffer.from(raw), 'msg_1', future)}`, secret, now })).toEqual({ ok: false, reason: 'too_new' });
    expect(verifyPolarSignature({ body, id: null, timestamp: ts, signature: good, secret, now })).toEqual({ ok: false, reason: 'missing_headers' });
  });
});

describe('#1631 case 1: Shop Hoa buys Pro 12 months on 21/11/2026 with 71 days left', () => {
  it('purchase: POLAR, auto-renew, ends 31/01/2028 (Polar 21/11/2027 + the days left)', () => {
    const out = polarSubscriptionPatch(manualHoa(), sub(), PRO, PRO_PLAN, BUY_HOA);
    expect(out.kind).toBe('purchase');
    if (out.kind === 'ignore') throw new Error('ignored');
    expect(iso(out.data.currentPeriodEnd)).toBe('2028-01-31T16:59:59.000Z');
    expect(out.data).toMatchObject({
      planId: PRO_PLAN, status: 'ACTIVE', billingChannel: 'POLAR', autoRenew: true, cancelAtPeriodEnd: false,
      storeProductId: 'prod_pro_12', storeOriginalTransactionId: 'sub_hoa_1', storeBonusMs: HOA_END.getTime() - BUY_HOA.getTime(),
      billingIssueAt: null, amount: 1799000, currency: 'VND', interval: 'annual', intervalCount: 1,
    });
    expect(iso(out.data.currentPeriodStart)).toBe('2026-11-21T03:00:00.000Z');
  });

  it('order.paid 1.799.000 ₫ → one payment row of the real amount', () => {
    const payment = polarOrderPayment({
      id: 'ord_1', status: 'paid', paid: true, total_amount: 1799000, currency: 'vnd', invoice_number: 'ANY-0001',
      billing_reason: 'subscription_create', created_at: '2026-11-21T03:00:05.000Z', subscription_id: 'sub_hoa_1', product_id: 'prod_pro_12',
    });
    expect(payment).toEqual({
      amount: 1799000, currency: 'VND', transactionId: 'ord_1', invoiceNumber: 'ANY-0001',
      processedAt: new Date('2026-11-21T03:00:05.000Z'), renewal: false, subscriptionId: 'sub_hoa_1', productId: 'prod_pro_12',
    });
    expect(polarOrderPayment({ id: 'ord_0', status: 'paid', total_amount: 0, currency: 'vnd', created_at: '2026-11-21T03:00:05.000Z' })).toBeNull();
    expect(polarOrderPayment({ id: 'ord_p', status: 'pending', total_amount: 1799000, currency: 'vnd', created_at: '2026-11-21T03:00:05.000Z' })).toBeNull();
  });

  it('Polar renews on 21/11/2027 → ends 31/01/2029, the credit stays', () => {
    const out = polarSubscriptionPatch(
      polarHoa(),
      sub({ current_period_start: '2027-11-21T03:00:00.000Z', current_period_end: '2028-11-21T03:00:00.000Z' }),
      PRO, PRO_PLAN, new Date('2027-11-21T03:05:00.000Z'),
    );
    expect(out.kind).toBe('renewal');
    if (out.kind === 'ignore') throw new Error('ignored');
    expect(iso(out.data.currentPeriodEnd)).toBe('2029-01-31T16:59:59.000Z');
    expect(out.data.storeBonusMs).toBe(HOA_END.getTime() - BUY_HOA.getTime());
    expect(out.data.autoRenew).toBe(true);
  });

  it('the same state sent twice (subscription.created then subscription.active) changes nothing new', () => {
    const out = polarSubscriptionPatch(polarHoa(), sub(), PRO, PRO_PLAN, BUY_HOA);
    expect(out.kind).toBe('update');
    if (out.kind === 'ignore') throw new Error('ignored');
    expect(iso(out.data.currentPeriodEnd)).toBe('2028-01-31T16:59:59.000Z');
  });
});

describe('#1631 case 2: Shop Lan, trial to 05/12/2026, buys Pro 6 months on 25/11/2026', () => {
  it('ends 04/06/2027 (Polar 25/05/2027 + 10 trial days)', () => {
    const trial = { planId: 1, status: 'TRIAL', currentPeriodEnd: new Date('2026-12-05T16:59:59.000Z'), billingChannel: null, autoRenew: false };
    const out = polarSubscriptionPatch(
      trial,
      sub({ id: 'sub_lan', current_period_start: '2026-11-25T03:00:00.000Z', current_period_end: '2027-05-25T03:00:00.000Z', product_id: 'prod_pro_6', amount: 1299000 }),
      PRO6, PRO_PLAN, new Date('2026-11-25T03:00:00.000Z'),
    );
    expect(out.kind).toBe('purchase');
    if (out.kind === 'ignore') throw new Error('ignored');
    expect(iso(out.data.currentPeriodEnd)).toBe('2027-06-04T16:59:59.000Z');
    expect(out.data).toMatchObject({ status: 'ACTIVE', planId: PRO_PLAN, interval: 'semi_annual', amount: 1299000 });
  });

  it('nothing left (expired): Polar dates only', () => {
    const expired = { planId: PRO_PLAN, status: 'EXPIRED', currentPeriodEnd: new Date('2026-11-01T16:59:59.000Z'), billingChannel: 'MANUAL', autoRenew: false };
    const out = polarSubscriptionPatch(expired, sub(), PRO, PRO_PLAN, BUY_HOA);
    if (out.kind === 'ignore') throw new Error('ignored');
    expect(iso(out.data.currentPeriodEnd)).toBe('2027-11-21T03:00:00.000Z');
    expect(out.data.storeBonusMs).toBeNull();
  });
});

describe('#1631 case 3: cancel on 10/03/2027, then change of mind', () => {
  const cancelAt = new Date('2027-03-10T02:00:00.000Z');
  it('cancel at period end: auto-renew off, end 31/01/2028 kept, still ACTIVE', () => {
    const out = polarSubscriptionPatch(polarHoa(), sub({ cancel_at_period_end: true, canceled_at: cancelAt.toISOString() }), PRO, PRO_PLAN, cancelAt);
    expect(out.kind).toBe('cancel');
    if (out.kind === 'ignore') throw new Error('ignored');
    expect(out.data).toMatchObject({ status: 'ACTIVE', autoRenew: false, cancelAtPeriodEnd: true, cancelReason: 'UNSUBSCRIBE' });
    expect(iso(out.data.currentPeriodEnd)).toBe('2028-01-31T16:59:59.000Z');
    expect(iso(out.data.canceledAt)).toBe(cancelAt.toISOString());
  });

  it('uncancel: auto-renew on again', () => {
    const out = polarSubscriptionPatch(
      polarHoa({ autoRenew: false, cancelAtPeriodEnd: true }), sub(), PRO, PRO_PLAN, new Date('2027-04-01T02:00:00.000Z'),
    );
    expect(out.kind).toBe('uncancel');
    if (out.kind === 'ignore') throw new Error('ignored');
    expect(out.data).toMatchObject({ autoRenew: true, cancelAtPeriodEnd: false, canceledAt: null, cancelReason: null });
  });

  it('Polar ends the cancelled subscription on 21/11/2027: MANUAL, the shop keeps the days to 31/01/2028', () => {
    const endedAt = new Date('2027-11-21T03:00:00.000Z');
    const out = polarSubscriptionPatch(
      polarHoa({ autoRenew: false, cancelAtPeriodEnd: true }),
      sub({ status: 'canceled', cancel_at_period_end: true, canceled_at: cancelAt.toISOString(), ended_at: endedAt.toISOString() }),
      PRO, PRO_PLAN, endedAt,
    );
    expect(out.kind).toBe('ended');
    if (out.kind === 'ignore') throw new Error('ignored');
    expect(out.data).toMatchObject({ billingChannel: 'MANUAL', autoRenew: false, storeProductId: null, storeBonusMs: null, billingIssueAt: null });
    expect(out.data.status).toBeUndefined();
    expect(out.data.currentPeriodEnd).toBeUndefined();
  });
});

describe('#1631 case 4: card fails on 21/11/2027', () => {
  const failedAt = new Date('2027-11-21T03:10:00.000Z');
  it('past_due: billing issue flagged, status and end unchanged (no 403)', () => {
    const out = polarSubscriptionPatch(polarHoa(), sub({ status: 'past_due', past_due_at: failedAt.toISOString() }), PRO, PRO_PLAN, failedAt);
    expect(out.kind).toBe('billing_issue');
    if (out.kind === 'ignore') throw new Error('ignored');
    expect(Object.keys(out.data)).toEqual(['billingIssueAt']);
    expect(iso(out.data.billingIssueAt)).toBe(failedAt.toISOString());
  });

  it('Polar gives up (revoked) on 05/12/2027: MANUAL with the paid end, not expired yet', () => {
    const out = polarSubscriptionPatch(
      polarHoa({ billingIssueAt: failedAt }),
      sub({ status: 'canceled', ended_at: '2027-12-05T03:00:00.000Z' }),
      PRO, PRO_PLAN, new Date('2027-12-05T03:00:00.000Z'),
    );
    expect(out.kind).toBe('ended');
    if (out.kind === 'ignore') throw new Error('ignored');
    expect(out.data.status).toBeUndefined();
    expect(out.data.billingChannel).toBe('MANUAL');
  });

  it('ended after the paid end has passed: EXPIRED', () => {
    const out = polarSubscriptionPatch(
      polarHoa({ currentPeriodEnd: new Date('2027-12-01T16:59:59.000Z') }),
      sub({ status: 'canceled', ended_at: '2027-12-05T03:00:00.000Z' }),
      PRO, PRO_PLAN, new Date('2027-12-05T03:00:00.000Z'),
    );
    if (out.kind === 'ignore') throw new Error('ignored');
    expect(out.data.status).toBe('EXPIRED');
  });
});

describe('#1631 case 5: refund on 21/12/2026', () => {
  const refundedAt = new Date('2026-12-21T03:00:00.000Z');
  const order = {
    id: 'ord_1', status: 'refunded', total_amount: 1799000, refunded_amount: 1799000, currency: 'vnd',
    created_at: '2026-11-21T03:00:05.000Z', subscription_id: 'sub_hoa_1', modified_at: refundedAt.toISOString(),
  };

  it('a full refund of the period in use: back to 31/01/2027, MANUAL, auto-renew off', () => {
    expect(isFullRefund(order)).toBe(true);
    const out = polarRefundPatch(polarHoa(), order, refundedAt);
    expect(out.kind).toBe('refund_kept_days');
    if (out.kind === 'refund_other') throw new Error('other');
    expect(iso(out.data.currentPeriodEnd)).toBe('2027-01-31T16:59:59.000Z');
    expect(out.data).toMatchObject({ autoRenew: false, cancelAtPeriodEnd: true, cancelReason: 'REFUND', billingChannel: 'MANUAL', storeProductId: null, storeBonusMs: null });
  });

  it('refunded after that end: EXPIRED now', () => {
    const late = new Date('2027-03-01T03:00:00.000Z');
    const out = polarRefundPatch(polarHoa(), order, late);
    expect(out.kind).toBe('refund_ended');
    if (out.kind === 'refund_other') throw new Error('other');
    expect(out.data.status).toBe('EXPIRED');
    expect(iso(out.data.currentPeriodEnd)).toBe(late.toISOString());
  });

  it('a partial refund, or a refund of another subscription or an earlier period, changes no dates', () => {
    expect(isFullRefund({ ...order, refunded_amount: 500000, status: 'partially_refunded' })).toBe(false);
    expect(polarRefundPatch(polarHoa(), { ...order, subscription_id: 'sub_old' }, refundedAt).kind).toBe('refund_other');
    expect(polarRefundPatch(polarHoa({ currentPeriodStart: new Date('2027-11-21T03:00:00.000Z') }), order, refundedAt).kind).toBe('refund_other');
    expect(polarRefundPatch(manualHoa(), order, refundedAt).kind).toBe('refund_other');
  });
});

describe('#1631 case 6: one subscription, never two', () => {
  it('events of another Polar subscription change nothing unless it is a new active one', () => {
    const other = polarSubscriptionPatch(polarHoa(), sub({ id: 'sub_old', status: 'canceled', ended_at: '2026-11-22T00:00:00.000Z' }), PRO, PRO_PLAN, BUY_HOA);
    expect(other).toEqual({ kind: 'ignore', reason: 'other_subscription' });
    const pastDueOther = polarSubscriptionPatch(polarHoa(), sub({ id: 'sub_old', status: 'past_due' }), PRO, PRO_PLAN, BUY_HOA);
    expect(pastDueOther).toEqual({ kind: 'ignore', reason: 'other_subscription' });
  });

  it('a revoked event after the refund made the shop MANUAL changes nothing', () => {
    const afterRefund = manualHoa({ storeOriginalTransactionId: 'sub_hoa_1', cancelAtPeriodEnd: true });
    expect(polarSubscriptionPatch(afterRefund, sub({ status: 'canceled', ended_at: '2026-12-21T03:00:00.000Z' }), PRO, PRO_PLAN, BUY_HOA)).toEqual({
      kind: 'ignore', reason: 'other_subscription',
    });
  });

  it('checkout not finished (incomplete) is ignored', () => {
    expect(polarSubscriptionPatch(manualHoa(), sub({ status: 'incomplete' }), PRO, PRO_PLAN, BUY_HOA)).toEqual({ kind: 'ignore', reason: 'not_active' });
  });

  it('a new purchase needs a known product', () => {
    expect(polarSubscriptionPatch(manualHoa(), sub(), null, null, BUY_HOA)).toEqual({ kind: 'ignore', reason: 'unknown_product' });
  });

  it('a plan switch in the portal (Pro 6 → Pro 12) moves the product and keeps the credit', () => {
    const row = polarHoa({ storeProductId: 'prod_pro_6' });
    const out = polarSubscriptionPatch(row, sub({ product_id: 'prod_pro_12' }), PRO, PRO_PLAN, BUY_HOA);
    expect(out.kind).toBe('change');
    if (out.kind === 'ignore') throw new Error('ignored');
    expect(out.data).toMatchObject({ storeProductId: 'prod_pro_12', planId: PRO_PLAN, storeBonusMs: HOA_END.getTime() - BUY_HOA.getTime() });
  });

  it('web checkout: refused while a store or Polar renews; a trial may buy; a plan without an offer may not', () => {
    const plans = [{ id: 2, tier: 'basic' as const }, { id: PRO_PLAN, tier: 'professional' as const }];
    const now = new Date('2026-11-25T03:00:00.000Z');
    const base = { planId: 2, planName: 'Basic', dbStatus: 'ACTIVE', currentPeriodEnd: new Date('2027-05-01T16:59:59.000Z') };
    expect(polarCheckoutDecision({ ...base, billingChannel: 'APP_STORE', autoRenew: true }, plans, PRO_PLAN, [PRO_PLAN], now)).toBe('SUBSCRIPTION_RENEWS_IN_STORE');
    expect(polarCheckoutDecision({ ...base, billingChannel: 'PLAY_STORE', autoRenew: true }, plans, PRO_PLAN, [PRO_PLAN], now)).toBe('SUBSCRIPTION_RENEWS_IN_STORE');
    expect(polarCheckoutDecision({ ...base, billingChannel: 'POLAR', autoRenew: true }, plans, PRO_PLAN, [PRO_PLAN], now)).toBe('POLAR_MANAGE_IN_PORTAL');
    const trial = { planId: 1, planName: 'Trial', dbStatus: 'TRIAL', currentPeriodEnd: new Date('2026-12-05T16:59:59.000Z'), billingChannel: null, autoRenew: false };
    expect(polarCheckoutDecision(trial, plans, PRO_PLAN, [PRO_PLAN], now)).toBe('ok');
    expect(polarCheckoutDecision(trial, plans, 2, [PRO_PLAN], now)).toBe('PLAN_NOT_PURCHASABLE');
    // A manual Basic shop upgrades to Pro on the web at any time
    expect(polarCheckoutDecision({ ...base, billingChannel: 'MANUAL', autoRenew: false }, plans, PRO_PLAN, [PRO_PLAN], now)).toBe('ok');
  });
});

describe('#1631 POLAR is an auto-billed channel for the credit rules and the status', () => {
  const now = new Date('2027-03-10T02:00:00.000Z');
  it('status keeps the value POLAR; old values unchanged', () => {
    expect(normaliseChannel('POLAR')).toBe('POLAR');
    expect(normaliseChannel('LEMON')).toBe('LEMON');
    expect(normaliseChannel('APP_STORE')).toBe('APP_STORE');
    expect(normaliseChannel('SOMETHING')).toBe('MANUAL');
  });

  it('a running Polar plan: an admin extension joins the credit; the next charge is Polar end = end − credit', () => {
    const row = polarHoa();
    expect(isRunningStoreSubscription(row, now)).toBe(true);
    const ext = manualExtensionBilling(row, new Date(row.currentPeriodEnd.getTime() + 30 * DAY), now);
    expect(ext.keepsStore).toBe(true);
    expect(ext.data.storeBonusMs).toBe(row.storeBonusMs + 30 * DAY);
    expect(storeRenewsAt(row, now)?.toISOString()).toBe('2027-11-21T03:00:00.000Z');
  });
});

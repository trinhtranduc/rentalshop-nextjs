/**
 * #588 / #578 §E (PKG-6): subscription emails and the expiry-reminder activity text print the
 * Vietnam date, whatever the server zone. Nothing is sent: only the HTML generators run, and the
 * Prisma client is replaced by a stub.
 */
jest.mock('../packages/database/src/client', () => ({
  prisma: { subscriptionActivity: { create: jest.fn(async (args: unknown) => args) } },
}));

import {
  generatePlanChangeEmail,
  generateSubscriptionExpiryReminderEmail,
  generateSubscriptionExtensionEmail,
  generateSubscriptionRenewalEmail,
  generateSubscriptionStatusChangeEmail,
} from '../packages/utils/src/services/email';
import { recordExpiryReminderSent } from '../packages/database/src/subscription-expiry-reminder';

// 2026-04-09T17:00:00Z is 10 April 00:00 VN (still 9 April in UTC).
const AT_VN_MIDNIGHT = new Date('2026-04-09T17:00:00.000Z');
// 2026-04-10T16:59:59Z is 10 April 23:59:59 VN.
const AT_VN_END_OF_DAY = new Date('2026-04-10T16:59:59.000Z');

const longDate = (locale: string, date: Date, timeZone: string) =>
  new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric', timeZone }).format(date);

const VN_EN = longDate('en-US', AT_VN_MIDNIGHT, 'Asia/Ho_Chi_Minh'); // "April 10, 2026"
const UTC_EN = longDate('en-US', AT_VN_MIDNIGHT, 'UTC'); // "April 9, 2026"
const VN_VI = longDate('vi-VN', AT_VN_MIDNIGHT, 'Asia/Ho_Chi_Minh');
const UTC_VI = longDate('vi-VN', AT_VN_MIDNIGHT, 'UTC');

describe('subscription emails print the VN date', () => {
  it('sanity: the two zones disagree at the boundary', () => {
    expect(VN_EN).not.toBe(UTC_EN);
    expect(longDate('en-US', AT_VN_END_OF_DAY, 'Asia/Ho_Chi_Minh')).toBe(VN_EN);
  });

  it('plan change email (en)', () => {
    const html = generatePlanChangeEmail({
      merchantName: 'Shop',
      email: 'owner@example.com',
      oldPlanName: 'Basic',
      newPlanName: 'Pro',
      amount: 0,
      currency: 'VND',
      billingInterval: 'monthly',
      periodStart: AT_VN_MIDNIGHT,
      periodEnd: AT_VN_MIDNIGHT,
      locale: 'en',
    } as any);
    expect(html).toContain(VN_EN);
    expect(html).not.toContain(UTC_EN);
  });

  it('renewal email (vi)', () => {
    const html = generateSubscriptionRenewalEmail({
      merchantName: 'Shop',
      email: 'owner@example.com',
      planName: 'Basic',
      amount: 100000,
      currency: 'VND',
      periodStart: AT_VN_MIDNIGHT,
      periodEnd: AT_VN_MIDNIGHT,
      paymentMethod: 'TRANSFER',
    });
    expect(html).toContain(VN_VI);
    expect(html).not.toContain(UTC_VI);
  });

  it('extension email (en), both old and new end date', () => {
    const html = generateSubscriptionExtensionEmail({
      merchantName: 'Shop',
      email: 'owner@example.com',
      planName: 'Basic',
      oldEndDate: AT_VN_MIDNIGHT,
      newEndDate: AT_VN_END_OF_DAY,
      extensionDays: 0,
      method: 'MANUAL_EXTENSION',
      locale: 'en',
    });
    expect(html).toContain(VN_EN);
    expect(html).not.toContain(UTC_EN);
  });

  it('expiry reminder email (en)', () => {
    const html = generateSubscriptionExpiryReminderEmail({
      merchantName: 'Shop',
      email: 'owner@example.com',
      planName: 'Basic',
      periodEnd: AT_VN_MIDNIGHT,
      daysRemaining: 3,
      locale: 'en',
    });
    expect(html).toContain(VN_EN);
    expect(html).not.toContain(UTC_EN);
  });

  it('status change email (vi)', () => {
    const html = generateSubscriptionStatusChangeEmail({
      merchantName: 'Shop',
      email: 'owner@example.com',
      planName: 'Basic',
      status: 'CANCELLED',
      periodEnd: AT_VN_MIDNIGHT,
    });
    expect(html).toContain(VN_VI);
    expect(html).not.toContain(UTC_VI);
  });
});

describe('expiry reminder activity text uses the VN day key', () => {
  it('period end at 10 Apr 00:00 VN reads "before 2026-04-10"', async () => {
    const result: any = await recordExpiryReminderSent({
      subscriptionId: 1,
      reminderKey: 'k',
      daysBefore: 3,
      periodEnd: AT_VN_MIDNIGHT,
      recipients: ['owner@example.com'],
    });
    expect(result.data.description).toBe('Expiry reminder sent 3 days before 2026-04-10');
    // Stored instant in metadata is unchanged
    expect(JSON.parse(result.data.metadata).periodEnd).toBe('2026-04-09T17:00:00.000Z');
  });
});

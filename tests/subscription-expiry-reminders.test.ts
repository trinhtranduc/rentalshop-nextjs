import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERIOD_EXPIRY_NOTIFICATIONS,
  SUBSCRIPTION_EXPIRY_CONFIG,
} from '../packages/constants/src/subscription';
import {
  buildExpiryReminderKey,
} from '../packages/database/src/subscription-expiry-reminder';
import {
  generateSubscriptionExpiryReminderEmail,
  getSubscriptionExpiryReminderSubject,
  type SubscriptionExpiryReminderData,
} from '../packages/utils/src/services/email';

const baseReminder: SubscriptionExpiryReminderData = {
  merchantName: 'AnyRent Test Shop',
  email: 'owner@example.com',
  planName: 'Basic',
  periodEnd: new Date('2026-08-10T00:00:00.000Z'),
  daysRemaining: 3,
  status: 'ACTIVE',
  locale: 'vi',
};

test('uses only the 3-day and expiry-day notification buckets', () => {
  assert.deepEqual([...PERIOD_EXPIRY_NOTIFICATIONS], [3, 0]);
  assert.deepEqual(
    [...SUBSCRIPTION_EXPIRY_CONFIG.PERIOD_EXPIRY_NOTIFICATIONS],
    [3, 0],
  );
});

test('renders the 3-day reminder with advance-warning wording', () => {
  const html = generateSubscriptionExpiryReminderEmail(baseReminder);
  const subject = getSubscriptionExpiryReminderSubject(baseReminder);

  assert.match(subject, /3 ngày/);
  assert.match(html, /Gói đăng ký sắp hết hạn/);
  assert.match(html, /3 ngày/);
});

test('renders a dedicated expiry-day email without zero-day wording', () => {
  const data = { ...baseReminder, daysRemaining: 0 };
  const html = generateSubscriptionExpiryReminderEmail(data);
  const subject = getSubscriptionExpiryReminderSubject(data);

  assert.equal(subject, 'Gói đăng ký đã hết hạn - Basic');
  assert.match(html, /Gói đăng ký đã hết hạn/);
  assert.match(html, />Đã hết hạn</);
  assert.doesNotMatch(html, /0 ngày/);
});

test('uses trial-specific expiry wording', () => {
  const data = { ...baseReminder, daysRemaining: 0, status: 'TRIAL' };

  assert.equal(
    getSubscriptionExpiryReminderSubject(data),
    'Bản dùng thử đã hết hạn - Basic',
  );
  assert.match(
    generateSubscriptionExpiryReminderEmail(data),
    /Bản dùng thử đã hết hạn/,
  );
});

test('recovery reuses the expiry-day idempotency key', () => {
  const subscriptionId = 42;
  const periodEndDateKey = '2026-08-10';

  const regularExpiryKey = buildExpiryReminderKey(
    subscriptionId,
    periodEndDateKey,
    0,
  );
  const recoveryKey = buildExpiryReminderKey(
    subscriptionId,
    periodEndDateKey,
    0,
  );

  assert.equal(regularExpiryKey, recoveryKey);
  assert.equal(recoveryKey, '42:2026-08-10:0');
});

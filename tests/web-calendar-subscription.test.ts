/**
 * #849: on the shop web, Lịch (/calendar) shows the "Không tải được … / Thử lại" card when the shop's
 * subscription is expired, paused, cancelled or past due, like Tổng quan, Đơn hàng, Sản phẩm, Khách hàng.
 * The calendar routes stay open to blocked merchants (installed apps), so the page reads the subscription status.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { subscriptionBlocked } from '../apps/client/app/calendar/calendar-model';

describe('subscriptionBlocked', () => {
  it('blocks expired, cancelled, paused and past-due statuses', () => {
    for (const status of ['EXPIRED', 'CANCELED', 'CANCELLED', 'PAUSED', 'PAST_DUE']) {
      expect(subscriptionBlocked({ success: true, data: { status } })).toBe(true);
    }
  });

  it('blocks the 403 answer of the status route (#728) by its subscription code', () => {
    for (const code of ['SUBSCRIPTION_EXPIRED', 'SUBSCRIPTION_CANCELLED', 'SUBSCRIPTION_PAUSED', 'SUBSCRIPTION_PAST_DUE', 'TRIAL_EXPIRED']) {
      expect(subscriptionBlocked({ success: false, code })).toBe(true);
    }
  });

  it('does not block an active or trial shop, no subscription, or a failed read', () => {
    for (const status of ['ACTIVE', 'TRIAL', 'UNKNOWN', 'NO_SUBSCRIPTION', undefined]) {
      expect(subscriptionBlocked({ success: true, data: { status } })).toBe(false);
    }
    expect(subscriptionBlocked({ success: false, code: 'INTERNAL_SERVER_ERROR' })).toBe(false);
    expect(subscriptionBlocked({ success: true, data: null })).toBe(false);
    expect(subscriptionBlocked(null)).toBe(false);
    expect(subscriptionBlocked(undefined)).toBe(false);
  });
});

describe('the calendar page (#849)', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../apps/client/app/calendar/page.tsx'), 'utf8');

  it('reads the subscription status again on every load and retry', () => {
    expect(source).toMatch(/subscriptionsApi\s*\.getCurrentUserSubscriptionStatus\(\)/);
    expect(source).toMatch(/subscriptionBlocked\(/);
  });

  it('a blocked shop gets the month and both day retry cards', () => {
    expect(source).toMatch(/countState\.failed \|\| blocked/);
    expect(source).toMatch(/failed: pickups\.failed \|\| blocked/);
    expect(source).toMatch(/failed: returns\.failed \|\| blocked/);
  });

  it('keeps the #852 branch select', () => {
    expect(source).toMatch(/data-calendar-branch/);
    expect(source).toMatch(/useBranchOptions\(/);
  });
});

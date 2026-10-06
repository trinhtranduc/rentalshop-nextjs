/**
 * #528 shop web: Thông báo rows, Nhân viên list, Cài đặt cửa hàng tabs.
 * Pure models only. Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  groupByShopDay,
  notificationHref,
  notificationKind,
  shortDayLabel,
  weekdayOfKey,
} from '../apps/client/app/components/shell/notification-groups';
import {
  canFilterByOutlet,
  canManageRow,
  canSeeStaffPage,
  lastSeen,
  parseOutletParam,
  parseStaffPage,
  parseStaffPageSize,
  readStaffPage,
  roleTone,
  staffQuery,
  staffContact,
  staffInitials,
  staffName,
} from '../apps/client/app/users/users-model';
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
import { getLocalDateKey } from '../packages/utils/src/core/date';

const VI_WEEKDAYS = 'CN,T2,T3,T4,T5,T6,T7'.split(',');
const vnTime = (d: Date) =>
  new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(d);

describe('notifications (#528)', () => {
  it('maps inbox rows to the board icon families', () => {
    expect(notificationKind({ type: 'ORDER_CREATED', data: { status: 'RESERVED' } })).toBe('order');
    expect(notificationKind({ type: 'ORDER_STATUS_CHANGED', data: { status: 'PICKUPED' } })).toBe('handover');
    expect(notificationKind({ type: 'ORDER_STATUS_CHANGED', data: { status: 'returned' } })).toBe('back');
    expect(notificationKind({ type: 'ORDER_STATUS_CHANGED', data: { status: 'COMPLETED' } })).toBe('done');
    expect(notificationKind({ type: 'ORDER_STATUS_CHANGED', data: { status: 'CANCELLED' } })).toBe('cancelled');
    expect(notificationKind({ type: 'ORDER_STATUS_CHANGED', data: null })).toBe('order');
    expect(notificationKind({ type: 'SYSTEM', data: {} })).toBe('other');
  });

  it('links to the order detail by order number, never by a raw id', () => {
    expect(notificationHref({ data: { orderId: '9', orderNumber: '482913' } })).toBe('/orders/482913');
    expect(notificationHref({ data: { orderNumber: '#ORD-1-0007' } })).toBe('/orders/ORD-1-0007');
    expect(notificationHref({ data: { orderId: '9' } })).toBeNull();
    expect(notificationHref({ data: { orderNumber: '../x' } })).toBeNull();
    expect(notificationHref({ data: undefined })).toBeNull();
  });

  it('names the weekday from the date key, not the machine clock', () => {
    expect(weekdayOfKey('2026-10-06')).toBe(2);
    expect(shortDayLabel('2026-10-06', VI_WEEKDAYS)).toBe('T3 06/10');
    expect(shortDayLabel('2026-10-04', VI_WEEKDAYS)).toBe('CN 04/10');
    expect(shortDayLabel('bad', VI_WEEKDAYS)).toBe('');
  });

  it('a notification at 23:30 Vietnam time lands on that Vietnam day', () => {
    const now = new Date('2026-10-06T02:00:00.000Z'); // 09:00 06/10 in Vietnam
    const groups = groupByShopDay([{ id: 1, createdAt: '2026-10-05T16:30:00.000Z' }], now, getLocalDateKey);
    expect(groups[0].dateKey).toBe('2026-10-05');
    expect(groups[0].label.kind).toBe('yesterday');
    expect(shortDayLabel(groups[0].dateKey, VI_WEEKDAYS)).toBe('T2 05/10');
  });
});

describe('staff list (#528)', () => {
  it('keeps the old role rules', () => {
    expect(canSeeStaffPage('OUTLET_STAFF')).toBe(false);
    expect(canSeeStaffPage('outlet_admin')).toBe(true);
    expect(canSeeStaffPage('MERCHANT')).toBe(true);
    expect(canSeeStaffPage(undefined)).toBe(false);
    expect(canFilterByOutlet('MERCHANT')).toBe(true);
    expect(canFilterByOutlet('OUTLET_ADMIN')).toBe(false);
    expect(canManageRow({ id: 2, role: 'OUTLET_STAFF' }, 1)).toBe(true);
    expect(canManageRow({ id: 2, role: 'ADMIN' }, 1)).toBe(false);
    expect(canManageRow({ id: 1, role: 'OUTLET_ADMIN' }, 1)).toBe(false);
  });

  it('labels roles like the board', () => {
    expect(roleTone('MERCHANT')).toBe('owner');
    expect(roleTone('OUTLET_ADMIN')).toBe('admin');
    expect(roleTone('OUTLET_STAFF')).toBe('staff');
    expect(roleTone('OPS')).toBe('other');
  });

  it('builds names, initials and contact', () => {
    const lan = { id: 3, firstName: 'Trần Thị', lastName: 'Lan', phone: '0909 333 444', email: 'lan@x.vn' };
    expect(staffName(lan)).toBe('Trần Thị Lan');
    expect(staffInitials(lan)).toBe('TL');
    expect(staffContact(lan)).toBe('0909 333 444');
    expect(staffContact({ id: 4, email: 'a@b.c' })).toBe('a@b.c');
    expect(staffName({ id: 5, email: 'khoa@shop.vn' })).toBe('khoa@shop.vn');
    expect(staffName({ id: 6 })).toBe('#6');
    expect(staffInitials({ id: 7, firstName: 'Chi' })).toBe('C');
  });

  it('parses URL params defensively', () => {
    expect(parseOutletParam('17')).toBe(17);
    expect(parseOutletParam('abc')).toBeNull();
    expect(parseOutletParam('-1')).toBeNull();
    expect(parseStaffPage('0')).toBe(1);
    expect(parseStaffPage('3')).toBe(3);
    expect(parseStaffPageSize('50')).toBe(50);
    expect(parseStaffPageSize('25')).toBe(20);
  });

  it('reads both GET /api/users shapes', () => {
    expect(readStaffPage({ success: true, data: [{ id: 1 }], pagination: { total: 41, totalPages: 3 } }, 20)).toEqual({
      rows: [{ id: 1 }],
      total: 41,
      totalPages: 3,
    });
    expect(readStaffPage({ success: true, data: [{ id: 1 }, { id: 2 }] }, 20)).toEqual({ rows: [{ id: 1 }, { id: 2 }], total: 2, totalPages: 1 });
    expect(readStaffPage({ success: true, data: { users: [{ id: 9 }], total: 25 } }, 10)).toEqual({ rows: [{ id: 9 }], total: 25, totalPages: 3 });
    expect(readStaffPage({ success: false }, 20)).toBeNull();
  });

  it('builds the GET /api/users query like usersApi.searchUsers', () => {
    expect(staffQuery({ outletId: 3, page: 1, limit: 1 })).toBe('outletId=3&page=1&limit=1');
    expect(staffQuery({ q: 'lan', search: 'lan', role: 'OUTLET_STAFF', status: 'inactive', page: 2, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' })).toBe(
      'search=lan&q=lan&role=OUTLET_STAFF&isActive=false&page=2&limit=20&sortBy=createdAt&sortOrder=desc',
    );
    expect(staffQuery({ status: 'active' })).toBe('isActive=true');
    expect(staffQuery({})).toBe('');
  });

  it('reads the total from the raw GET /api/users answer, not the page length (#537)', () => {
    // What /api/users sends for an outlet with two staff and limit=1: one row, total 2.
    const raw = { success: true, data: [{ id: 7 }], pagination: { page: 1, limit: 1, total: 2, hasMore: true, totalPages: 2 } };
    expect(readStaffPage(raw, 1)).toEqual({ rows: [{ id: 7 }], total: 2, totalPages: 2 });
  });

  it('last sign-in reads in Vietnam days', () => {
    const now = new Date('2026-10-06T07:00:00.000Z'); // 14:00 06/10 in Vietnam
    expect(lastSeen('2026-10-06T06:58:00.000Z', now, getLocalDateKey, vnTime)).toEqual({ kind: 'today', time: '13:58' });
    // 23:10 on 05/10 in Vietnam is still "yesterday" even though it is 16:10Z
    expect(lastSeen('2026-10-05T16:10:00.000Z', now, getLocalDateKey, vnTime)).toEqual({ kind: 'yesterday', time: '23:10' });
    // 00:10 on 06/10 in Vietnam (17:10Z on 05/10) is today
    expect(lastSeen('2026-10-05T17:10:00.000Z', now, getLocalDateKey, vnTime).kind).toBe('today');
    expect(lastSeen('2026-10-03T03:00:00.000Z', now, getLocalDateKey, vnTime)).toEqual({ kind: 'day', dateKey: '2026-10-03' });
    expect(lastSeen(null, now, getLocalDateKey, vnTime)).toEqual({ kind: 'never' });
    expect(lastSeen('nope', now, getLocalDateKey, vnTime)).toEqual({ kind: 'never' });
  });
});

describe('store settings (#528)', () => {
  it('shows the same tabs per role as the old settings menu', () => {
    expect(tabsForRole('MERCHANT').map((t) => t.id)).toEqual(['merchant', 'receipt', 'subscription', 'profile', 'account', 'language']);
    expect(tabsForRole('OUTLET_ADMIN').map((t) => t.id)).toEqual(['outlet', 'bank-accounts', 'receipt', 'profile', 'account', 'language']);
    expect(tabsForRole('OUTLET_STAFF').map((t) => t.id)).toEqual(['outlet', 'profile', 'account', 'language']);
  });

  it('resolves ?tab= with the old guards', () => {
    expect(resolveTab(null, 'MERCHANT')).toEqual({ tab: 'merchant' });
    expect(resolveTab('subscription', 'MERCHANT')).toEqual({ tab: 'subscription' });
    expect(resolveTab('subscription', 'OUTLET_ADMIN')).toEqual({ tab: 'outlet' });
    expect(resolveTab('receipt', 'OUTLET_STAFF')).toEqual({ tab: 'outlet' });
    expect(resolveTab('bank-accounts', 'MERCHANT')).toEqual({ tab: 'merchant' });
    expect(resolveTab('loyalty', 'MERCHANT')).toEqual({ tab: 'merchant', redirect: '/loyalty' });
    expect(resolveTab('profile', 'OUTLET_STAFF')).toEqual({ tab: 'profile' });
    expect(defaultTab('ADMIN')).toBe('profile');
  });

  it('formats an outlet address line', () => {
    expect(addressLine({ address: '12 Lê Lợi', state: 'Quận 1', city: 'TP. Hồ Chí Minh' })).toBe('12 Lê Lợi, Quận 1, TP. Hồ Chí Minh');
    expect(addressLine({ address: ' ', city: 'Hà Nội', state: 'Hà Nội' })).toBe('Hà Nội');
    expect(addressLine(null)).toBe('');
  });

  it('checks the password form in the old order', () => {
    expect(passwordProblem({ currentPassword: '', newPassword: 'abcdef', confirmPassword: 'abcdef' })).toBe('currentRequired');
    expect(passwordProblem({ currentPassword: 'x', newPassword: 'abcdef', confirmPassword: 'abcdeg' })).toBe('mismatch');
    expect(passwordProblem({ currentPassword: 'x', newPassword: 'abc', confirmPassword: 'abc' })).toBe('tooShort');
    expect(passwordProblem({ currentPassword: 'x', newPassword: 'abcdef', confirmPassword: 'abcdef' })).toBeNull();
  });

  it('validates the store URL key and the currency rule', () => {
    expect(tenantKeyValid('hoa-mai-2')).toBe(true);
    expect(tenantKeyValid('')).toBe(true);
    expect(tenantKeyValid('Hoa Mai')).toBe(false);
    expect(currencyForLocale('vi')).toBe('VND');
    expect(currencyForLocale('en')).toBe('USD');
  });

  it('builds share links from login data or the tenant key', () => {
    expect(publicLinks('https://anyrent.shop', { tenantKey: 'hoamai' })).toEqual({
      productLink: 'https://anyrent.shop/hoamai/products',
      registrationLink: 'https://anyrent.shop/register?referralCode=hoamai',
    });
    expect(publicLinks('https://x', { publicProductLink: 'https://p/1', tenantKey: '' })).toEqual({ productLink: 'https://p/1', registrationLink: null });
    expect(publicLinks('https://x', {})).toEqual({ productLink: null, registrationLink: null });
  });

  it('maps the flat subscription status like the old settings component', () => {
    const m = mapSubscriptionStatus({ subscriptionId: 4, status: 'TRIAL', planName: 'Basic', billingAmount: 99000, daysRemaining: 9, merchantId: 2 });
    expect(m.subscription.id).toBe(4);
    expect(m.subscription.amount).toBe(99000);
    expect(m.isTrial).toBe(true);
    expect(m.isActive).toBe(false);
    expect(m.merchant.id).toBe(2);
    expect(m.daysRemaining).toBe(9);
  });
});

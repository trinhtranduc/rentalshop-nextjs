/**
 * #852 shop web per branch (pure models):
 * - Đơn hàng: the branch picker of Tổng quan (`?outlets=`), the ids sent to the API, the branch name per row.
 * - Cài đặt: Tài khoản ngân hàng for the owner too; the branch of the bank / receipt tabs (`?settingsOutlet=`).
 * - Lịch giao trả: one branch or all (`?outlet=`).
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import { getLocalDateKey } from '../packages/utils/src/core/date';
import { outletsParam, resolveBranchSelection, selectionOutletIds, showsBranchPicker, toBranchOptions } from '../apps/client/app/dashboard/branch-model';
import { buildOpsRows, buildOrderRow, rowBranchName } from '../apps/client/app/orders/orders-model';
import {
  SETTINGS_OUTLET_PARAM,
  closeSettingsHref,
  settingsHref,
  settingsOutletChoice,
  settingsOutletHref,
  tabsForRole,
} from '../apps/client/app/settings/settings-model';
import { calendarOutletId } from '../apps/client/app/calendar/calendar-model';

const outlets = toBranchOptions([
  { id: 4, name: 'Chi nhánh Quận 3', isActive: true, isDefault: false },
  { id: 2, name: 'Cửa hàng chính', isActive: true, isDefault: true },
  { id: 9, name: 'Kho cũ', isActive: false, isDefault: false },
]);
const today = '2026-10-11';

describe('Đơn hàng branch filter (#852)', () => {
  it('only an owner with 2+ branches gets the picker', () => {
    expect(showsBranchPicker('MERCHANT', outlets)).toBe(true);
    expect(showsBranchPicker('OUTLET_ADMIN', outlets)).toBe(false);
    expect(showsBranchPicker('MERCHANT', outlets.slice(0, 1))).toBe(false);
  });

  it('no ?outlets= = all active branches, sent as explicit ids; inactive only when ticked', () => {
    const all = resolveBranchSelection(outlets, null, null);
    expect(all).toEqual([2, 4]);
    expect(selectionOutletIds(all, outlets, true)).toEqual([2, 4]);
    expect(outletsParam(all, outlets)).toBeNull();
    const withOld = resolveBranchSelection(outlets, '9,4', null);
    expect(withOld).toEqual([4, 9]);
    expect(outletsParam(withOld, outlets)).toBe('4,9');
    // outlet roles: no ids, the API keeps them on their outlet
    expect(selectionOutletIds([4], outlets, false)).toBeUndefined();
  });

  it('a row carries its branch; the name comes from the branch list, else the row', () => {
    const row = buildOrderRow({ id: 1, orderNumber: '123456', status: 'RESERVED', outletId: 4, outlet: { id: 4, name: 'Q3 (old name)' } }, today, getLocalDateKey);
    expect(row.outletId).toBe(4);
    expect(rowBranchName(row, outlets)).toBe('Chi nhánh Quận 3');
    const unknown = buildOrderRow({ id: 2, orderNumber: '223456', status: 'RESERVED', outlet: { id: 7, name: 'Lạ' } }, today, getLocalDateKey);
    expect(unknown.outletId).toBe(7);
    expect(rowBranchName(unknown, outlets)).toBe('Lạ');
    expect(rowBranchName(buildOrderRow({ id: 3, orderNumber: '323456' }, today, getLocalDateKey), outlets)).toBeNull();
  });

  it('Việc cần làm rows keep the outletId of outlet-operations', () => {
    const rows = buildOpsRows(
      { pickupsToday: { count: 1, orders: [{ id: 5, orderNumber: '555555', outletId: 2, pickupPlanAt: '2026-10-11T03:00:00.000Z' }] } },
      'todo',
      today,
      getLocalDateKey,
    );
    expect(rows[0].outletId).toBe(2);
    expect(rowBranchName(rows[0], outlets)).toBe('Cửa hàng chính');
  });
});

describe('Cài đặt per branch (#852)', () => {
  it('the owner gets Thu tiền (Tài khoản ngân hàng, #1259); staff and inventory do not', () => {
    expect(tabsForRole('MERCHANT').map((t) => t.id)).toContain('payment');
    expect(tabsForRole('OUTLET_ADMIN').map((t) => t.id)).toContain('payment');
    expect(tabsForRole('OUTLET_STAFF').map((t) => t.id)).not.toContain('payment');
    expect(tabsForRole('OUTLET_INVENTORY').map((t) => t.id)).not.toContain('payment');
  });

  it('branch of the bank / receipt tabs: URL if known, else the default branch, else the first', () => {
    expect(settingsOutletChoice(outlets, '4')).toBe(4);
    expect(settingsOutletChoice(outlets, '9')).toBe(9);
    expect(settingsOutletChoice(outlets, null)).toBe(2);
    expect(settingsOutletChoice(outlets, '77')).toBe(2);
    expect(settingsOutletChoice(outlets, 'x')).toBe(2);
    expect(settingsOutletChoice(toBranchOptions([{ id: 6, name: 'B' }, { id: 5, name: 'A' }]), null)).toBe(5);
    expect(settingsOutletChoice([], '4')).toBeNull();
  });

  it('keeps the branch in the URL while the dialog is open, drops it on close', () => {
    expect(SETTINGS_OUTLET_PARAM).toBe('settingsOutlet');
    const open = settingsHref('/orders', 'tab=all', 'bank-accounts');
    expect(open).toBe('/orders?tab=all&settings=bank-accounts');
    const picked = settingsOutletHref('/orders', 'tab=all&settings=bank-accounts', 4);
    expect(picked).toBe('/orders?tab=all&settings=bank-accounts&settingsOutlet=4');
    expect(closeSettingsHref('/orders', 'tab=all&settings=bank-accounts&settingsOutlet=4')).toBe('/orders?tab=all');
  });
});

describe('Lịch giao trả branch (#852)', () => {
  it('?outlet= picks one known branch; anything else = all', () => {
    expect(calendarOutletId('4', outlets, true)).toBe(4);
    expect(calendarOutletId('9', outlets, true)).toBe(9);
    expect(calendarOutletId('77', outlets, true)).toBeUndefined();
    expect(calendarOutletId(null, outlets, true)).toBeUndefined();
    // no picker (outlet role or one branch): ignored
    expect(calendarOutletId('4', outlets, false)).toBeUndefined();
  });
});

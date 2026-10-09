/**
 * #682 Nhân viên kho on the shop web: staff menu and pages, a role card only behind the API flag.
 */
import { describe, expect, it } from '@jest/globals';
import { SHELL_MAIN_NAV, SHELL_MANAGE_NAV, filterNavForRole } from '../apps/client/app/components/shell/nav';
import { roleChoices, formFromUser, validateStaffForm, EMPTY_STAFF_FORM } from '../apps/client/app/users/staff-form-model';
import { canSeeStaffPage, roleTone } from '../apps/client/app/users/users-model';
import { defaultTab, tabsForRole } from '../apps/client/app/settings/settings-model';

const keys = (items: { key: string }[]) => items.map((i) => i.key);

describe('#682 Nhân viên kho — web', () => {
  it('sees the staff menu: no Nhân viên, no Chi nhánh; Sản phẩm and Danh mục stay', () => {
    const manage = keys(filterNavForRole(SHELL_MANAGE_NAV, 'OUTLET_INVENTORY'));
    expect(manage).toEqual(keys(filterNavForRole(SHELL_MANAGE_NAV, 'OUTLET_STAFF')));
    expect(manage).toContain('categories');
    expect(manage).not.toContain('staff');
    expect(manage).not.toContain('outlets');
    expect(keys(filterNavForRole(SHELL_MAIN_NAV, 'OUTLET_INVENTORY'))).toContain('products');
  });

  it('cannot open the staff page; its tag has its own tone', () => {
    expect(canSeeStaffPage('OUTLET_INVENTORY')).toBe(false);
    expect(roleTone('OUTLET_INVENTORY')).toBe('inventory');
  });

  it('settings open on the outlet tab like staff', () => {
    expect(defaultTab('OUTLET_INVENTORY')).toBe('outlet');
    expect(tabsForRole('OUTLET_INVENTORY').map((t) => t.id)).toEqual(tabsForRole('OUTLET_STAFF').map((t) => t.id));
  });

  it('the role card shows only when the API flag is on, or when the user already has the role', () => {
    expect(roleChoices('MERCHANT')).toEqual(['OUTLET_ADMIN', 'OUTLET_STAFF']);
    expect(roleChoices('MERCHANT', { inventoryRole: true })).toEqual(['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY']);
    expect(roleChoices('OUTLET_ADMIN', { currentRole: 'OUTLET_INVENTORY' })).toContain('OUTLET_INVENTORY');
    expect(roleChoices('OUTLET_STAFF', { inventoryRole: true })).toEqual([]);
    expect(roleChoices('OUTLET_INVENTORY', { inventoryRole: true })).toEqual([]);
  });

  it('#684 a new staff form starts with no role; saving without one is refused', () => {
    expect(EMPTY_STAFF_FORM.role).toBe('');
    const errors = validateStaffForm({ ...EMPTY_STAFF_FORM, name: 'A', email: 'a@b.vn', phone: '0901234567', outletId: 3, password: 'secret12', confirmPassword: 'secret12' }, 'create');
    expect(errors.role).toBe('roleRequired');
  });

  it('an inventory user opens in the edit form with its role and needs an outlet', () => {
    expect(formFromUser({ role: 'OUTLET_INVENTORY', outletId: 3 } as any).role).toBe('OUTLET_INVENTORY');
    const errors = validateStaffForm({ ...EMPTY_STAFF_FORM, name: 'A', email: 'a@b.vn', phone: '0901234567', role: 'OUTLET_INVENTORY', outletId: null, password: 'secret12', confirmPassword: 'secret12' }, 'create');
    expect(errors.outletId).toBe('outletRequired');
  });
});

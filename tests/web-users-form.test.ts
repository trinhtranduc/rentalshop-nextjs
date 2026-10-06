/**
 * #544 Thêm nhân viên / Sửa / Đổi mật khẩu (shop web). Pure model only.
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh (no date logic, kept for the suite rule).
 */
import { describe, expect, it } from '@jest/globals';
import {
  EMPTY_STAFF_FORM,
  canCreateStaff,
  canPickOutlet,
  createPayload,
  editPayload,
  formFromUser,
  passwordResetProblem,
  readOutlets,
  roleChoices,
  splitName,
  validateStaffForm,
  type StaffFormValues,
} from '../apps/client/app/users/staff-form-model';

const good: StaffFormValues = {
  ...EMPTY_STAFF_FORM,
  name: 'Trần Thị Lan',
  email: ' Lan@Shop.vn ',
  phone: '0909 333 444',
  role: 'OUTLET_STAFF',
  outletId: 3,
  password: 'secret1',
  confirmPassword: 'secret1',
};

describe('who and which roles', () => {
  it('merchant and outlet admin create outlet roles; staff cannot', () => {
    expect(canCreateStaff('MERCHANT')).toBe(true);
    expect(canCreateStaff('OUTLET_ADMIN')).toBe(true);
    expect(canCreateStaff('OUTLET_STAFF')).toBe(false);
    expect(roleChoices('MERCHANT')).toEqual(['OUTLET_ADMIN', 'OUTLET_STAFF']);
    expect(roleChoices('outlet_admin')).toEqual(['OUTLET_ADMIN', 'OUTLET_STAFF']);
    expect(roleChoices('OUTLET_STAFF')).toEqual([]);
  });
  it('only the merchant picks the outlet', () => {
    expect(canPickOutlet('MERCHANT')).toBe(true);
    expect(canPickOutlet('OUTLET_ADMIN')).toBe(false);
  });
});

describe('splitName', () => {
  it('first word is firstName, the rest lastName', () => {
    expect(splitName('  Trần   Thị Lan ')).toEqual({ firstName: 'Trần', lastName: 'Thị Lan' });
    expect(splitName('')).toEqual({ firstName: '', lastName: '' });
  });
});

describe('validateStaffForm', () => {
  it('passes a complete form', () => {
    expect(validateStaffForm(good, 'create')).toEqual({});
  });
  it('email required and well formed', () => {
    expect(validateStaffForm({ ...good, email: ' ' }, 'create').email).toBe('emailRequired');
    expect(validateStaffForm({ ...good, email: 'lan.shop' }, 'create').email).toBe('emailInvalid');
  });
  it('name is optional but a one-letter first word is refused', () => {
    expect(validateStaffForm({ ...good, name: '' }, 'create').name).toBeUndefined();
    expect(validateStaffForm({ ...good, name: 'L Tran' }, 'create').name).toBe('nameShort');
  });
  it('phone optional, 8–15 digits, safe characters', () => {
    expect(validateStaffForm({ ...good, phone: '' }, 'create').phone).toBeUndefined();
    expect(validateStaffForm({ ...good, phone: '12345' }, 'create').phone).toBe('phoneShort');
    expect(validateStaffForm({ ...good, phone: '1234567890123456' }, 'create').phone).toBe('phoneLong');
    expect(validateStaffForm({ ...good, phone: '0909.333.444' }, 'create').phone).toBe('phoneChars');
    expect(validateStaffForm({ ...good, phone: '+84 (909) 333-444' }, 'create').phone).toBeUndefined();
  });
  it('outlet required for outlet roles', () => {
    expect(validateStaffForm({ ...good, outletId: null }, 'create').outletId).toBe('outletRequired');
    expect(validateStaffForm({ ...good, role: '' }, 'create').role).toBe('roleRequired');
  });
  it('password ≥ 6 and confirm equal, only when creating', () => {
    expect(validateStaffForm({ ...good, password: '' }, 'create').password).toBe('passwordRequired');
    expect(validateStaffForm({ ...good, password: '12345', confirmPassword: '12345' }, 'create').password).toBe('passwordShort');
    expect(validateStaffForm({ ...good, confirmPassword: '' }, 'create').confirmPassword).toBe('confirmRequired');
    expect(validateStaffForm({ ...good, confirmPassword: 'secret2' }, 'create').confirmPassword).toBe('passwordMismatch');
    expect(validateStaffForm({ ...good, password: '', confirmPassword: '' }, 'edit')).toEqual({});
  });
});

describe('payloads', () => {
  it('create: split name, trimmed lower-case email, phone, merchant, outlet', () => {
    expect(createPayload(good, 1)).toEqual({
      firstName: 'Trần',
      lastName: 'Thị Lan',
      email: 'lan@shop.vn',
      phone: '0909 333 444',
      role: 'OUTLET_STAFF',
      password: 'secret1',
      merchantId: 1,
      outletId: 3,
    });
    expect(createPayload({ ...good, phone: '  ' }, null).phone).toBeUndefined();
    expect(createPayload({ ...good, phone: '  ' }, null).merchantId).toBeUndefined();
  });
  it('edit: starts from the user and sends their merchant', () => {
    const user = { id: 9, firstName: 'Agent1 NV', lastName: 'E2E', email: 'a@b.co', phone: null, role: 'OUTLET_ADMIN', merchantId: 1, outletId: 2 };
    const values = formFromUser(user);
    expect(values).toMatchObject({ name: 'Agent1 NV E2E', email: 'a@b.co', phone: '', role: 'OUTLET_ADMIN', outletId: 2 });
    expect(editPayload({ ...values, phone: '0909333444', outletId: 3 }, user)).toEqual({
      id: 9,
      firstName: 'Agent1',
      lastName: 'NV E2E',
      email: 'a@b.co',
      phone: '0909333444',
      role: 'OUTLET_ADMIN',
      merchantId: 1,
      outletId: 3,
    });
  });
  it('formFromUser reads nested outlet and leaves non-outlet roles blank', () => {
    expect(formFromUser({ id: 1, role: 'MERCHANT', outlet: { id: 4 } })).toMatchObject({ role: '', outletId: 4 });
  });
});

describe('passwordResetProblem', () => {
  it('old dialog order and messages', () => {
    expect(passwordResetProblem('  ', '')).toEqual([
      { field: 'newPassword', key: 'newRequired' },
      { field: 'confirmPassword', key: 'confirmRequired' },
    ]);
    expect(passwordResetProblem('12345', '12345')).toEqual([{ field: 'newPassword', key: 'passwordShort' }]);
    expect(passwordResetProblem('123456', '1234567')).toEqual([{ field: 'confirmPassword', key: 'passwordMismatch' }]);
    expect(passwordResetProblem('123456', '123456')).toEqual([]);
  });
});

describe('readOutlets', () => {
  it('reads { outlets } or an array and skips bad rows', () => {
    expect(readOutlets({ outlets: [{ id: 3, name: 'Quận 1', address: '12 Lê Lợi' }, { name: 'x' }] })).toEqual([
      { id: 3, name: 'Quận 1', address: '12 Lê Lợi' },
    ]);
    expect(readOutlets([{ id: 1 }])).toEqual([{ id: 1, name: '#1', address: null }]);
    expect(readOutlets(null)).toEqual([]);
  });
});

/**
 * #541 shop web customer form (create + edit) and profile text.
 * Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  createPayload,
  emptyForm,
  firstError,
  formValuesOf,
  fullAddress,
  parseCustomerId,
  saveErrorKey,
  splitName,
  updatePayload,
  validateCustomerForm,
} from '../apps/client/app/customers/customer-form-model';

const customer = {
  id: 29,
  firstName: 'Nguyễn',
  lastName: 'Thị Mai',
  phone: '0912555018',
  email: 'mai@example.com',
  address: '45 Nguyễn Trãi',
  city: 'Quận 5',
  state: 'TP HCM',
  zipCode: null,
  country: 'Vietnam',
  idNumber: null,
  notes: 'Khách quen',
};

describe('formValuesOf', () => {
  it('joins the name and turns nulls into empty strings', () => {
    expect(formValuesOf(customer)).toEqual({
      name: 'Nguyễn Thị Mai',
      phone: '0912555018',
      email: 'mai@example.com',
      address: '45 Nguyễn Trãi',
      city: 'Quận 5',
      state: 'TP HCM',
      zipCode: '',
      idNumber: '',
      notes: 'Khách quen',
    });
  });
  it('gives an empty form without a customer', () => {
    expect(formValuesOf(null)).toEqual(emptyForm());
  });
});

describe('splitName', () => {
  it('first word is firstName, the rest lastName', () => {
    expect(splitName('  Nguyễn   Thị Mai ')).toEqual({ firstName: 'Nguyễn', lastName: 'Thị Mai' });
    expect(splitName('Mai')).toEqual({ firstName: 'Mai', lastName: '' });
  });
});

describe('validateCustomerForm', () => {
  const ok = { ...emptyForm(), name: 'Lan Anh' };
  it('needs a name of at least 2 characters', () => {
    expect(validateCustomerForm({ ...ok, name: '  ' }, { mode: 'create' })).toEqual({ name: 'nameRequired' });
    expect(validateCustomerForm({ ...ok, name: 'A' }, { mode: 'create' })).toEqual({ name: 'nameShort' });
    expect(validateCustomerForm(ok, { mode: 'create' })).toEqual({});
  });
  it('phone is optional on create but checked when given', () => {
    expect(validateCustomerForm({ ...ok, phone: '' }, { mode: 'create' })).toEqual({});
    expect(validateCustomerForm({ ...ok, phone: '09ab' }, { mode: 'create' })).toEqual({ phone: 'phoneInvalid' });
    expect(validateCustomerForm({ ...ok, phone: '0912 34' }, { mode: 'create' })).toEqual({ phone: 'phoneShort' });
    expect(validateCustomerForm({ ...ok, phone: '+84 912 555 018' }, { mode: 'create' })).toEqual({});
  });
  it('on edit, a phone already on file cannot be cleared', () => {
    expect(validateCustomerForm({ ...ok, phone: '' }, { mode: 'edit', hadPhone: true })).toEqual({ phone: 'phoneRequired' });
    expect(validateCustomerForm({ ...ok, phone: '' }, { mode: 'edit', hadPhone: false })).toEqual({});
  });
  it('checks the email format when given', () => {
    expect(validateCustomerForm({ ...ok, email: 'mai@' }, { mode: 'create' })).toEqual({ email: 'emailInvalid' });
    expect(validateCustomerForm({ ...ok, email: 'mai@example.com' }, { mode: 'create' })).toEqual({});
  });
  it('firstError follows the screen order', () => {
    expect(firstError({ email: 'emailInvalid', name: 'nameRequired' })).toBe('name');
    expect(firstError({})).toBeNull();
  });
});

describe('createPayload', () => {
  it('sends only filled fields, trimmed, with the split name', () => {
    expect(createPayload({ ...emptyForm(), name: ' Trần Văn Minh ', phone: ' 0912555018 ', notes: ' VIP ' })).toEqual({
      firstName: 'Trần',
      lastName: 'Văn Minh',
      phone: '0912555018',
      notes: 'VIP',
    });
  });
  it('omits lastName for a one-word name', () => {
    expect(createPayload({ ...emptyForm(), name: 'Minh' })).toEqual({ firstName: 'Minh' });
  });
});

describe('updatePayload', () => {
  it('returns null when nothing changed (spacing does not count)', () => {
    expect(updatePayload(customer, { ...formValuesOf(customer), name: ' Nguyễn  Thị Mai ', email: ' mai@example.com ' })).toBeNull();
  });
  it('sends only the changed fields; a cleared field is ""', () => {
    expect(updatePayload(customer, { ...formValuesOf(customer), email: '', idNumber: '079123456789' })).toEqual({
      email: '',
      idNumber: '079123456789',
    });
  });
  it('sends firstName and lastName together when the name changed', () => {
    expect(updatePayload(customer, { ...formValuesOf(customer), name: 'Nguyễn Mai' })).toEqual({ firstName: 'Nguyễn', lastName: 'Mai' });
    expect(updatePayload(customer, { ...formValuesOf(customer), name: 'Mai' })).toEqual({ firstName: 'Mai', lastName: '' });
  });
  it('never sends country (not on the form)', () => {
    const p = updatePayload(customer, { ...formValuesOf(customer), city: 'Quận 1' });
    expect(p).toEqual({ city: 'Quận 1' });
  });
});

describe('profile text', () => {
  it('fullAddress keeps order and drops blanks and repeats', () => {
    expect(fullAddress(customer)).toBe('45 Nguyễn Trãi, Quận 5, TP HCM, Vietnam');
    expect(fullAddress({ address: ' ', city: 'Hà Nội', state: 'Hà Nội', zipCode: '100000' })).toBe('Hà Nội, 100000');
    expect(fullAddress({})).toBe('');
  });
  it('saveErrorKey maps the duplicate code', () => {
    expect(saveErrorKey('CUSTOMER_DUPLICATE')).toBe('duplicate');
    expect(saveErrorKey('INTERNAL_SERVER_ERROR')).toBe('saveFailed');
    expect(saveErrorKey(undefined)).toBe('saveFailed');
  });
  it('parseCustomerId accepts positive numeric ids only', () => {
    expect(parseCustomerId('29')).toBe(29);
    expect(parseCustomerId(['7'])).toBe(7);
    expect(parseCustomerId('0')).toBeNull();
    expect(parseCustomerId('ckabc123')).toBeNull();
    expect(parseCustomerId('12x')).toBeNull();
    expect(parseCustomerId(undefined)).toBeNull();
  });
});

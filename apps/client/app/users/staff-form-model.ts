/**
 * Thêm nhân viên / Sửa nhân viên / Đổi mật khẩu model (#544). Pure: no @rentalshop/* import, so Jest
 * can load it. Same rules as the old shared UserForm, UserFormValidation and ChangePasswordDialog.
 * Error values are i18n keys under `users.web.form.errors`.
 */

export type StaffRole = 'OUTLET_ADMIN' | 'OUTLET_STAFF' | 'OUTLET_INVENTORY';
export type FormMode = 'create' | 'edit';

export interface StaffFormValues {
  name: string;
  email: string;
  phone: string;
  role: StaffRole | '';
  outletId: number | null;
  password: string;
  confirmPassword: string;
}

export type StaffFormField = keyof StaffFormValues;
export type StaffFormErrors = Partial<Record<StaffFormField, string>>;

export const EMPTY_STAFF_FORM: StaffFormValues = {
  name: '',
  email: '',
  phone: '',
  // #684: no role until the owner picks one of the role cards (each card says what the role can do)
  role: '',
  outletId: null,
  password: '',
  confirmPassword: '',
};

const OUTLET_ROLES: readonly StaffRole[] = ['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY'];
/** Cards always offered; Nhân viên kho is added behind the API flag (#682) */
const BASE_CHOICES: readonly StaffRole[] = ['OUTLET_ADMIN', 'OUTLET_STAFF'];

const upper = (role?: string | null) => String(role || '').toUpperCase();

/** Who may open Thêm nhân viên (old page: ADMIN, MERCHANT, OUTLET_ADMIN; the API checks `users.manage`). */
export function canCreateStaff(role?: string | null): boolean {
  return ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'].includes(upper(role));
}

/**
 * Roles the caller may give on the shop web: the outlet roles (old RoleSelect; API `canAssignRole`).
 * #682: Nhân viên kho only once the API allows it (app-config `inventoryRole`), or when the user already has it.
 */
export function roleChoices(role?: string | null, opts: { inventoryRole?: boolean; currentRole?: string | null } = {}): StaffRole[] {
  if (!canCreateStaff(role)) return [];
  const inventory = opts.inventoryRole || upper(opts.currentRole) === 'OUTLET_INVENTORY';
  return inventory ? [...BASE_CHOICES, 'OUTLET_INVENTORY'] : [...BASE_CHOICES];
}

/** Merchants (and platform admins) pick the outlet; an outlet admin's staff go to their own outlet. */
export function canPickOutlet(role?: string | null): boolean {
  const r = upper(role);
  return r === 'MERCHANT' || r === 'ADMIN';
}

/** "Trần Thị Lan" → firstName "Trần", lastName "Thị Lan" (old UserForm split). */
export function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(' ').filter((p) => p.length > 0);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
}

function phoneProblem(phone: string): string | null {
  if (!phone || !phone.trim()) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return 'phoneShort';
  if (digits.length > 15) return 'phoneLong';
  if (!/^[+]?[0-9\s\-()]+$/.test(phone.trim())) return 'phoneChars';
  return null;
}

/** All problems at once, keyed by field (old validateUserCreateInput / validateUserUpdateInput). */
export function validateStaffForm(values: StaffFormValues, mode: FormMode): StaffFormErrors {
  const errors: StaffFormErrors = {};
  const { firstName } = splitName(values.name || '');
  if (firstName && firstName.length < 2) errors.name = 'nameShort';

  const email = (values.email || '').trim();
  if (!email) errors.email = 'emailRequired';
  else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'emailInvalid';

  const phone = phoneProblem(values.phone || '');
  if (phone) errors.phone = phone;

  if (!values.role) errors.role = 'roleRequired';
  else if (OUTLET_ROLES.includes(values.role as StaffRole) && !values.outletId) errors.outletId = 'outletRequired';

  if (mode === 'create') {
    if (!values.password) errors.password = 'passwordRequired';
    else if (values.password.length < 6) errors.password = 'passwordShort';
    if (!values.confirmPassword) errors.confirmPassword = 'confirmRequired';
    else if (values.password && values.password !== values.confirmPassword) errors.confirmPassword = 'passwordMismatch';
  }
  return errors;
}

export interface StaffCreateBody {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: StaffRole;
  password: string;
  merchantId?: number;
  outletId?: number;
}

/** Body for `usersApi.createUser` (same fields the old form sent). */
export function createPayload(values: StaffFormValues, merchantId?: number | null): StaffCreateBody {
  return {
    ...splitName(values.name || ''),
    email: values.email.trim().toLowerCase(),
    phone: values.phone.trim() || undefined,
    role: (values.role || 'OUTLET_STAFF') as StaffRole,
    password: values.password,
    merchantId: merchantId || undefined,
    outletId: values.outletId || undefined,
  };
}

export interface StaffLikeUser {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  merchantId?: number | null;
  outletId?: number | null;
  merchant?: { id?: number | null } | null;
  outlet?: { id?: number | null } | null;
}

/** Sửa dialog start values. Role outside the outlet roles is kept as '' (read-only anyway). */
export function formFromUser(user: StaffLikeUser): StaffFormValues {
  const name = [user.firstName, user.lastName].filter((s) => s && String(s).trim()).join(' ').trim() || (user.name || '').trim();
  const role = upper(user.role);
  return {
    name,
    email: user.email || '',
    phone: user.phone || '',
    role: OUTLET_ROLES.includes(role as StaffRole) ? (role as StaffRole) : '',
    outletId: user.outletId ?? user.outlet?.id ?? null,
    password: '',
    confirmPassword: '',
  };
}

/** Body for `usersApi.updateUserByPublicId` (old edit form: name, email, phone, role, merchant, outlet). */
export function editPayload(values: StaffFormValues, user: StaffLikeUser) {
  return {
    id: user.id,
    ...splitName(values.name || ''),
    email: values.email.trim().toLowerCase(),
    phone: values.phone.trim() || undefined,
    role: values.role || upper(user.role) || undefined,
    merchantId: user.merchantId ?? user.merchant?.id ?? undefined,
    outletId: values.outletId || undefined,
  };
}

/** Đổi mật khẩu checks in the old dialog's order. */
export function passwordResetProblem(newPassword: string, confirmPassword: string): { field: 'newPassword' | 'confirmPassword'; key: string }[] {
  const out: { field: 'newPassword' | 'confirmPassword'; key: string }[] = [];
  if (!newPassword.trim()) out.push({ field: 'newPassword', key: 'newRequired' });
  else if (newPassword.length < 6) out.push({ field: 'newPassword', key: 'passwordShort' });
  if (!confirmPassword.trim()) out.push({ field: 'confirmPassword', key: 'confirmRequired' });
  else if (newPassword !== confirmPassword) out.push({ field: 'confirmPassword', key: 'passwordMismatch' });
  return out;
}

export interface OutletOption {
  id: number;
  name: string;
  address?: string | null;
}

/** `outletsApi.getOutlets()` data: `{ outlets: [...] }` or a bare array. */
export function readOutlets(data: unknown): OutletOption[] {
  const list = Array.isArray(data) ? data : data && typeof data === 'object' ? (data as { outlets?: unknown }).outlets : null;
  if (!Array.isArray(list)) return [];
  return list
    .filter((o) => o && typeof o === 'object' && Number.isInteger((o as { id?: unknown }).id))
    .map((o) => {
      const r = o as { id: number; name?: string | null; address?: string | null };
      return { id: r.id, name: r.name || `#${r.id}`, address: r.address ?? null };
    });
}

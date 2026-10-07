/**
 * #541 shop web customer form (create + edit) and profile text. Pure: no React and no
 * `@rentalshop/*` imports, so it runs in Jest under any TZ.
 */

export interface CustomerLike {
  id?: number;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  idNumber?: string | null;
  notes?: string | null;
}

/** The fields the form shows, in screen order (also the order used to focus the first error). */
export const FORM_FIELDS = ['name', 'phone', 'email', 'address', 'city', 'state', 'zipCode', 'idNumber', 'notes'] as const;
export type FormField = (typeof FORM_FIELDS)[number];
export type CustomerFormValues = Record<FormField, string>;

export type FormMode = 'create' | 'edit';

export type FieldError = 'nameRequired' | 'nameShort' | 'phoneRequired' | 'phoneInvalid' | 'phoneShort' | 'emailInvalid';
export type FormErrors = Partial<Record<FormField, FieldError>>;

const clean = (v: string | null | undefined) => (v ?? '').trim();

export function emptyForm(): CustomerFormValues {
  return { name: '', phone: '', email: '', address: '', city: '', state: '', zipCode: '', idNumber: '', notes: '' };
}

export function formValuesOf(c: CustomerLike | null | undefined): CustomerFormValues {
  if (!c) return emptyForm();
  return {
    name: [clean(c.firstName), clean(c.lastName)].filter(Boolean).join(' '),
    phone: clean(c.phone),
    email: clean(c.email),
    address: clean(c.address),
    city: clean(c.city),
    state: clean(c.state),
    zipCode: clean(c.zipCode),
    idNumber: clean(c.idNumber),
    notes: (c.notes ?? '').trim(),
  };
}

/** First word → firstName, the rest → lastName (same split as the old edit form). */
export function splitName(name: string): { firstName: string; lastName: string } {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: words[0] || '', lastName: words.slice(1).join(' ') };
}

const PHONE_RE = /^[0-9+\-\s()]+$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

/**
 * Same rules as the old forms. Phone is optional on create; on edit it stays required when the
 * customer already has one (an empty phone would be stored as "" and clash with the unique phone).
 */
export function validateCustomerForm(values: CustomerFormValues, opts: { mode: FormMode; hadPhone?: boolean }): FormErrors {
  const errors: FormErrors = {};
  const name = values.name.trim();
  if (!name) errors.name = 'nameRequired';
  else if (name.length < 2) errors.name = 'nameShort';

  const phone = values.phone.trim();
  if (!phone) {
    if (opts.mode === 'edit' && opts.hadPhone) errors.phone = 'phoneRequired';
  } else if (!PHONE_RE.test(phone)) errors.phone = 'phoneInvalid';
  else if (phone.replace(/\s/g, '').length < 8) errors.phone = 'phoneShort';

  const email = values.email.trim();
  if (email && !EMAIL_RE.test(email)) errors.email = 'emailInvalid';
  return errors;
}

export function firstError(errors: FormErrors): FormField | null {
  return FORM_FIELDS.find((f) => errors[f]) ?? null;
}

type Payload = Record<string, string>;

/** POST /api/customers body: only filled fields, trimmed. */
export function createPayload(values: CustomerFormValues): Payload {
  const { firstName, lastName } = splitName(values.name);
  const out: Payload = { firstName };
  if (lastName) out.lastName = lastName;
  for (const f of FORM_FIELDS) {
    if (f === 'name') continue;
    const v = values[f].trim();
    if (v) out[f] = v;
  }
  return out;
}

/**
 * PUT body with only the changed fields (a cleared field is sent as ""), or null when nothing
 * changed. Name is compared as a whole and sent as firstName + lastName.
 */
export function updatePayload(original: CustomerLike, values: CustomerFormValues): Payload | null {
  const before = formValuesOf(original);
  const out: Payload = {};
  if (before.name !== values.name.trim().split(/\s+/).filter(Boolean).join(' ')) {
    const { firstName, lastName } = splitName(values.name);
    out.firstName = firstName;
    out.lastName = lastName;
  }
  for (const f of FORM_FIELDS) {
    if (f === 'name') continue;
    const v = values[f].trim();
    if (v !== before[f]) out[f] = v;
  }
  return Object.keys(out).length ? out : null;
}

/** Message key under `customers.web.form` for a failed save. */
export function saveErrorKey(code: string | null | undefined): 'duplicate' | 'saveFailed' {
  return code === 'CUSTOMER_DUPLICATE' ? 'duplicate' : 'saveFailed';
}

/** Full postal line for the profile: street, city, state, zip, country without repeats. */
export function fullAddress(c: CustomerLike): string {
  const parts: string[] = [];
  for (const p of [c.address, c.city, c.state, c.zipCode, c.country]) {
    const s = clean(p);
    if (s && !parts.includes(s)) parts.push(s);
  }
  return parts.join(', ');
}

/** Numeric public id from the route, or null. */
export function parseCustomerId(raw: string | string[] | undefined): number | null {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s || !/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n > 0 && Number.isSafeInteger(n) ? n : null;
}

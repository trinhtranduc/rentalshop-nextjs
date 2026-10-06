/**
 * #526 shop web Nhập khách từ Excel: check each mapped row before sending it, count, order the
 * table (errors first), build the bulk-import payload and map the API answer back to file rows.
 * Pure: the page parses the file with `parseExcelFile` + `mapExcelColumnsToFields` first.
 */

/** Same cap as `POST /api/customers/bulk-import`. */
export const MAX_IMPORT_ROWS = 3000;
/** Rows drawn at once in the check table. */
export const ROWS_STEP = 100;

export const ID_TYPES = ['passport', 'drivers_license', 'national_id', 'other'] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'address',
  'city',
  'state',
  'zipCode',
  'country',
  'dateOfBirth',
  'idNumber',
  'idType',
  'notes',
] as const;
export type Field = (typeof FIELDS)[number];
export type RowValues = Record<Field, string>;

export type Issue = 'missingName' | 'badEmail' | 'badIdType';
/** The table's columns and which value each one shows. */
export type Column = 'name' | 'phone' | 'email' | 'address' | 'notes';
export const COLUMNS: Column[] = ['name', 'phone', 'email', 'address', 'notes'];
const ISSUE_COLUMN: Record<Issue, Column | null> = { missingName: 'name', badEmail: 'email', badIdType: null };

export interface ImportRow {
  /** Index in the parsed file (0-based), the key for selection. */
  index: number;
  /** Excel row number: the header is row 1. */
  n: number;
  values: RowValues;
  issue: Issue | null;
}

const text = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());

/**
 * A Vietnamese number read from a numeric cell loses its leading 0 (912345678): put it back.
 * Anything else is kept as typed.
 */
export function phoneText(value: unknown): string {
  const s = text(value);
  return /^[1-9]\d{8}$/.test(s) ? `0${s}` : s;
}

export function checkRow(raw: Record<string, unknown>, index: number): ImportRow {
  const values = Object.fromEntries(FIELDS.map((f) => [f, text(raw?.[f])])) as RowValues;
  values.phone = phoneText(raw?.phone);
  let issue: Issue | null = null;
  if (!values.firstName && !values.lastName) issue = 'missingName';
  else if (values.email && !EMAIL_RE.test(values.email)) issue = 'badEmail';
  else if (values.idType && !(ID_TYPES as readonly string[]).includes(values.idType)) issue = 'badIdType';
  return { index, n: index + 2, values, issue };
}

export function checkRows(mapped: Array<Record<string, unknown>>): ImportRow[] {
  return mapped.map((r, i) => checkRow(r || {}, i));
}

export function cellOf(row: ImportRow, column: Column): string {
  const v = row.values;
  switch (column) {
    case 'name':
      return [v.firstName, v.lastName].filter(Boolean).join(' ');
    case 'address': {
      const parts: string[] = [];
      for (const p of [v.address, v.city, v.state]) if (p && !parts.includes(p)) parts.push(p);
      return parts.join(', ');
    }
    default:
      return v[column];
  }
}

/** The column that holds the problem, to paint that cell red. */
export function badColumn(row: ImportRow): Column | null {
  return row.issue ? ISSUE_COLUMN[row.issue] : null;
}

export function counts(rows: ImportRow[]): { all: number; ok: number; bad: number } {
  const bad = rows.filter((r) => r.issue).length;
  return { all: rows.length, ok: rows.length - bad, bad };
}

/** "Lỗi trước": rows with a problem first, each group in file order. */
export function orderRows(rows: ImportRow[], errorsFirst: boolean): ImportRow[] {
  if (!errorsFirst) return rows;
  return [...rows.filter((r) => r.issue), ...rows.filter((r) => !r.issue)];
}

/** Every valid row starts ticked. */
export function initialSelection(rows: ImportRow[]): Set<number> {
  return new Set(rows.filter((r) => !r.issue).map((r) => r.index));
}

/** Rows that will be sent, in file order: ticked and valid. */
export function rowsToSend(rows: ImportRow[], selected: ReadonlySet<number>): ImportRow[] {
  return rows.filter((r) => !r.issue && selected.has(r.index));
}

export interface CustomerPayload {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: string;
  idNumber?: string;
  idType?: (typeof ID_TYPES)[number];
  notes?: string;
  merchantId?: number;
}

/**
 * Same body the old page sent: `lastName` and `phone` always strings, other empty fields left out.
 * A row with only a last name sends it as the first name (the API requires `firstName`).
 */
export function payloadOf(row: ImportRow, merchantId?: number): CustomerPayload {
  const v = row.values;
  const out: CustomerPayload = {
    firstName: v.firstName || v.lastName,
    lastName: v.firstName ? v.lastName : '',
    phone: v.phone,
  };
  for (const f of ['email', 'address', 'city', 'state', 'zipCode', 'country', 'dateOfBirth', 'idNumber', 'notes'] as const) {
    if (v[f]) out[f] = v[f];
  }
  if (v.idType) out.idType = v.idType as CustomerPayload['idType'];
  if (merchantId) out.merchantId = merchantId;
  return out;
}

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  /** Row errors from the API, with the file's row number. */
  errors: Array<{ n: number | null; message: string }>;
}

/**
 * `data` of the bulk-import answer. Its error rows count from 1 over the rows sent, so
 * they are mapped back through `sent` to the file's row numbers.
 */
export function resultOf(data: unknown, sent: ImportRow[]): ImportResult {
  const d = (data || {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const rawErrors = Array.isArray(d.errors) ? (d.errors as Array<Record<string, unknown>>) : [];
  return {
    imported: num(d.imported),
    updated: num(d.updated),
    skipped: num(d.skipped),
    failed: num(d.failed),
    errors: rawErrors.map((e) => {
      const i = typeof e?.row === 'number' ? e.row - 1 : -1;
      return { n: sent[i]?.n ?? null, message: text(e?.error ?? e?.message) };
    }),
  };
}

/** Shop clock "HH:mm" for "đọc xong lúc …". */
export function clockText(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

export function acceptsFile(name: string): boolean {
  return /\.(xlsx|xls|csv)$/i.test(name.trim());
}

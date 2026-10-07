/**
 * #526 Nhập sản phẩm từ Excel: pure checks between the parsed sheet and POST /api/products/bulk-import.
 * The page reads the file with `xlsx` (the library the old import dialog used) into a cell matrix;
 * everything after that lives here and is unit-tested.
 *
 * The API is all-or-nothing on validation (one bad row and nothing is saved) and numbers rows by their
 * position in the request, so rows are checked here first and the API's row numbers are mapped back
 * to the file's row numbers.
 */

/** Same cap as the API (`MAX_IMPORT_ROWS` in apps/api/app/api/products/bulk-import). */
export const MAX_IMPORT_ROWS = 3000;

export const IMPORT_FIELDS = ['name', 'barcode', 'categoryName', 'rentPrice', 'salePrice', 'costPrice', 'deposit', 'stock', 'description'] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

/** Columns the check table shows, in order. */
export const TABLE_FIELDS: ImportField[] = ['name', 'barcode', 'categoryName', 'rentPrice', 'salePrice', 'deposit', 'stock'];

const MONEY_FIELDS = ['rentPrice', 'salePrice', 'costPrice', 'deposit'] as const;

/**
 * Header names per field, compared without accents, case or punctuation. Covers the API sample file
 * (Name, Barcode, Category Name, Rent Price, …), the old dialog's aliases and the Vietnamese headers.
 */
const FIELD_ALIASES: Record<ImportField, string[]> = {
  name: ['name', 'product name', 'product_name', 'ten', 'ten san pham', 'san pham'],
  description: ['description', 'desc', 'mo ta'],
  barcode: ['barcode', 'bar code', 'ma vach', 'sku', 'code', 'ma', 'ma san pham'],
  categoryName: ['category name', 'categoryname', 'category', 'danh muc', 'ten danh muc'],
  rentPrice: ['rent price', 'rentprice', 'price', 'gia thue', 'gia', 'thue theo lan', 'gia thue theo lan'],
  salePrice: ['sale price', 'saleprice', 'gia ban'],
  costPrice: ['cost price', 'costprice', 'cost', 'gia von'],
  deposit: ['deposit', 'tien coc', 'coc', 'tien dat coc', 'dat coc'],
  stock: ['stock', 'quantity', 'qty', 'so luong', 'ton kho'],
};

/** "Tên sản phẩm" → "ten san pham". */
export function normalizeHeader(raw: unknown): string {
  return String(raw ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const ALIAS_INDEX: Map<string, ImportField> = (() => {
  const map = new Map<string, ImportField>();
  for (const field of IMPORT_FIELDS) for (const alias of FIELD_ALIASES[field]) map.set(normalizeHeader(alias), field);
  return map;
})();

/** Field of each column (null = ignored). The first column wins when two map to one field. */
export function mapHeaders(headers: unknown[]): Array<ImportField | null> {
  const seen = new Set<ImportField>();
  return headers.map((h) => {
    const field = ALIAS_INDEX.get(normalizeHeader(h)) ?? null;
    if (!field || seen.has(field)) return null;
    seen.add(field);
    return field;
  });
}

// ----------------------------------------------------------------------------
// Sheet
// ----------------------------------------------------------------------------

export interface SheetRow {
  /** Row number as the shop sees it in Excel (header is usually row 1). */
  row: number;
  cells: unknown[];
}

export interface Sheet {
  headers: unknown[];
  rows: SheetRow[];
}

const blank = (v: unknown) => v === null || v === undefined || String(v).trim() === '';

/**
 * Header = first non-empty row; data = the non-empty rows after it. `firstRow` is the Excel row number
 * of matrix[0] (1 unless the sheet starts lower).
 */
export function sheetFromMatrix(matrix: unknown[][], firstRow = 1): Sheet {
  const isEmpty = (r: unknown[] | undefined) => !r || r.every(blank);
  const h = matrix.findIndex((r) => !isEmpty(r));
  if (h < 0) return { headers: [], rows: [] };
  const rows: SheetRow[] = [];
  for (let i = h + 1; i < matrix.length; i++) {
    if (!isEmpty(matrix[i])) rows.push({ row: firstRow + i, cells: matrix[i] });
  }
  return { headers: matrix[h], rows };
}

// ----------------------------------------------------------------------------
// Values
// ----------------------------------------------------------------------------

const INVALID = 'invalid' as const;

/** Money cell → number, null when empty, 'invalid' otherwise. Accepts 250000, "250.000", "250,000đ". */
export function parseMoney(value: unknown): number | null | typeof INVALID {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : INVALID;
  if (blank(value)) return null;
  const s = String(value)
    .replace(/[\s ]/g, '')
    .replace(/(đ|₫|vnd|vnđ)$/i, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ''));
  if (/^\d+([.,]\d{1,2})?$/.test(s)) return Number(s.replace(',', '.'));
  return INVALID;
}

/** Quantity cell → whole number ≥ 0, null when empty, 'invalid' otherwise. */
export function parseCount(value: unknown): number | null | typeof INVALID {
  if (typeof value === 'number') return Number.isInteger(value) && value >= 0 ? value : INVALID;
  if (blank(value)) return null;
  const s = String(value).replace(/[\s ]/g, '');
  if (/^\d+$/.test(s)) return Number(s);
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ''));
  return INVALID;
}

/** Text cell; whole numbers keep all digits (barcodes typed as numbers). */
export function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isInteger(value) ? value.toFixed(0) : String(value);
  return String(value).trim();
}

// ----------------------------------------------------------------------------
// Row checks
// ----------------------------------------------------------------------------

export type RowErrorCode = 'nameMissing' | 'priceInvalid' | 'stockInvalid' | 'categoryUnknown' | 'barcodeDuplicate';

export interface RowError {
  field: ImportField;
  code: RowErrorCode;
  /** Row the duplicate barcode first appears on, for 'barcodeDuplicate'. */
  ref?: number;
}

/** What POST /api/products/bulk-import receives per row (same fields the old dialog sent). */
export interface ImportPayload {
  name: string;
  description?: string;
  barcode?: string;
  categoryName: string;
  rentPrice: number;
  salePrice: number;
  costPrice: number;
  deposit: number;
  stock: number;
}

export interface CheckedRow {
  row: number;
  /** Text shown in the check table per field. */
  values: Record<ImportField, string>;
  errors: RowError[];
  payload: ImportPayload | null;
}

export type FileProblem = 'empty' | 'tooMany' | 'noNameColumn';

export interface CheckResult {
  rows: CheckedRow[];
  problem: FileProblem | null;
  okCount: number;
  errorCount: number;
}

/**
 * Checks every row against the API's rules: name required, prices and quantity are numbers ≥ 0, the
 * category must already exist (empty = the shop's default category), and a barcode appears once in the
 * file (later copies are errors, the first one is imported). Barcodes already in the shop are skipped
 * by the API and counted in the result.
 */
export function checkSheet(sheet: Sheet, categoryNames: string[]): CheckResult {
  if (sheet.rows.length === 0) return { rows: [], problem: 'empty', okCount: 0, errorCount: 0 };
  if (sheet.rows.length > MAX_IMPORT_ROWS) return { rows: [], problem: 'tooMany', okCount: 0, errorCount: 0 };
  const columns = mapHeaders(sheet.headers);
  if (!columns.includes('name')) return { rows: [], problem: 'noNameColumn', okCount: 0, errorCount: 0 };

  const known = new Set(categoryNames.map((n) => n.trim().toLowerCase()));
  const firstByBarcode = new Map<string, number>();
  const rows: CheckedRow[] = sheet.rows.map(({ row, cells }) => {
    const raw = {} as Record<ImportField, unknown>;
    columns.forEach((field, i) => {
      if (field) raw[field] = cells[i];
    });
    const values = Object.fromEntries(IMPORT_FIELDS.map((f) => [f, cellText(raw[f])])) as Record<ImportField, string>;
    const errors: RowError[] = [];

    if (!values.name) errors.push({ field: 'name', code: 'nameMissing' });

    const money = {} as Record<(typeof MONEY_FIELDS)[number], number>;
    for (const f of MONEY_FIELDS) {
      const v = parseMoney(raw[f]);
      if (v === INVALID) errors.push({ field: f, code: 'priceInvalid' });
      else money[f] = v ?? 0;
    }

    const stock = parseCount(raw.stock);
    if (stock === INVALID) errors.push({ field: 'stock', code: 'stockInvalid' });

    const category = values.categoryName;
    if (category && category.toLowerCase() !== 'default' && !known.has(category.toLowerCase())) {
      errors.push({ field: 'categoryName', code: 'categoryUnknown' });
    }

    if (values.barcode) {
      const first = firstByBarcode.get(values.barcode);
      if (first !== undefined) errors.push({ field: 'barcode', code: 'barcodeDuplicate', ref: first });
      else firstByBarcode.set(values.barcode, row);
    }

    const payload: ImportPayload | null =
      errors.length > 0
        ? null
        : {
            name: values.name,
            ...(values.description ? { description: values.description } : {}),
            ...(values.barcode ? { barcode: values.barcode } : {}),
            categoryName: category || 'default',
            rentPrice: money.rentPrice,
            salePrice: money.salePrice,
            costPrice: money.costPrice,
            deposit: money.deposit,
            stock: stock === INVALID ? 0 : stock ?? 0,
          };
    return { row, values, errors, payload };
  });

  const errorCount = rows.filter((r) => r.errors.length > 0).length;
  return { rows, problem: null, okCount: rows.length - errorCount, errorCount };
}

/** Rows for the table: file order, or rows with errors first ("Lỗi trước"). */
export function orderRows(rows: CheckedRow[], errorsFirst: boolean): CheckedRow[] {
  if (!errorsFirst) return rows;
  return [...rows.filter((r) => r.errors.length > 0), ...rows.filter((r) => r.errors.length === 0)];
}

/** Payload for the chosen valid rows, plus each item's file row (index i ↔ API row i + 1). */
export function buildImport(rows: CheckedRow[], chosen: ReadonlySet<number>): { items: ImportPayload[]; fileRows: number[] } {
  const picked = rows.filter((r) => r.payload && chosen.has(r.row));
  return { items: picked.map((r) => r.payload as ImportPayload), fileRows: picked.map((r) => r.row) };
}

// ----------------------------------------------------------------------------
// Result
// ----------------------------------------------------------------------------

export interface ImportOutcome {
  imported: number;
  /** Barcode already in the shop. */
  skipped: number;
  failed: number;
  /** Errors with the file's row numbers. */
  errors: Array<{ row: number | null; message: string }>;
}

/** Maps the API's `{ imported, skipped, failed, errors[{ row, error }] }` back to file rows. */
export function readOutcome(data: unknown, fileRows: number[]): ImportOutcome {
  const d = (data && typeof data === 'object' ? data : {}) as {
    imported?: unknown;
    skipped?: unknown;
    failed?: unknown;
    errors?: Array<{ row?: unknown; error?: unknown; message?: unknown }>;
  };
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
  const errors = (Array.isArray(d.errors) ? d.errors : []).map((e) => {
    const i = typeof e?.row === 'number' ? e.row - 1 : -1;
    return { row: i >= 0 && i < fileRows.length ? fileRows[i] : null, message: String(e?.error ?? e?.message ?? '') };
  });
  return { imported: n(d.imported), skipped: n(d.skipped), failed: Math.max(n(d.failed), errors.length), errors };
}

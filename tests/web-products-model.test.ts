/**
 * #526 shop web Sản phẩm: list rows (prices, today's stock), URL state, selection, and the Excel
 * import checks (headers, money, duplicates, unknown categories, API row mapping).
 * Pure modules; runs under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import {
  EMPTY_SELECTION,
  buildRow,
  firstImage,
  pageCheckState,
  parseListQuery,
  parsePageSize,
  productPrices,
  scopedOutletFor,
  selectedCount,
  stockView,
  toApiFilters,
  toggleOne,
  togglePage,
  type ProductLike,
} from '../apps/client/app/products/list/list-model';
import {
  MAX_IMPORT_ROWS,
  buildImport,
  checkSheet,
  mapHeaders,
  normalizeHeader,
  orderRows,
  parseCount,
  parseMoney,
  readOutcome,
  sheetFromMatrix,
} from '../apps/client/app/products/import/import-model';

const AO_DAI: ProductLike = {
  id: 11,
  name: 'Áo dài lụa đỏ',
  barcode: '8930001234',
  images: ['https://img/ad.jpg'],
  rentPrice: 150000,
  salePrice: 0,
  pricingType: 'DAILY',
  pricingOptions: [
    { type: 'FIXED', price: 250000, isActive: true },
    { type: 'DAILY', price: 150000, unit: 'DAY', isActive: true },
  ],
  category: { id: 1, name: 'Áo dài' },
  totalStock: 3,
  renting: 1,
  available: 2,
  outletStock: [
    { stock: 2, renting: 1, available: 1, outlet: { id: 1 } },
    { stock: 1, renting: 0, available: 1, outlet: { id: 2 } },
  ],
};

describe('list rows', () => {
  it('splits rent prices by option type and drops empty sale prices', () => {
    expect(productPrices(AO_DAI)).toEqual({ once: 250000, day: 150000, hour: null, sale: null });
    expect(productPrices({ id: 1, rentPrice: 300000, salePrice: 1800000, pricingType: 'FIXED', pricingOptions: [] })).toEqual({ once: 300000, day: null, hour: null, sale: 1800000 });
    expect(productPrices({ id: 2, rentPrice: 200000, pricingType: 'DAILY' })).toMatchObject({ once: null, day: 200000 });
    expect(productPrices({ id: 3, rentPrice: 50000, pricingType: 'HOURLY' })).toMatchObject({ once: null, hour: 50000 });
    // inactive options are ignored; hourly as DAILY + unit HOUR
    expect(
      productPrices({ id: 4, pricingOptions: [{ type: 'FIXED', price: 1, isActive: false }, { type: 'DAILY', unit: 'HOUR', price: 40000 }] }),
    ).toMatchObject({ once: null, day: null, hour: 40000 });
  });

  it('shows today stock from the rollup or the scoped outlet', () => {
    expect(stockView(AO_DAI)).toEqual({ total: 3, available: 2, renting: 1, out: false });
    expect(stockView(AO_DAI, 1)).toEqual({ total: 2, available: 1, renting: 1, out: false });
    expect(stockView({ id: 5, totalStock: 1, renting: 1, available: 0 }).out).toBe(true);
    expect(stockView({ id: 6, stock: 4 })).toEqual({ total: 4, available: 0, renting: 0, out: true });
  });

  it('scopes stock to the outlet of outlet users, or the URL outlet', () => {
    expect(scopedOutletFor(undefined, { role: 'OUTLET_STAFF', outletId: 7 })).toBe(7);
    expect(scopedOutletFor(3, { role: 'OUTLET_STAFF', outletId: 7 })).toBe(3);
    expect(scopedOutletFor(undefined, { role: 'MERCHANT', outletId: 7 })).toBeUndefined();
  });

  it('builds a row with the first image and trimmed text', () => {
    const r = buildRow({ ...AO_DAI, name: ' Áo dài lụa đỏ ' });
    expect(r).toMatchObject({ id: 11, name: 'Áo dài lụa đỏ', code: '8930001234', category: 'Áo dài', image: 'https://img/ad.jpg' });
    expect(firstImage('https://a/1.jpg,https://a/2.jpg')).toBe('https://a/1.jpg');
    expect(firstImage([])).toBeNull();
  });
});

describe('URL state', () => {
  it('reads filters with safe defaults', () => {
    const params = new URLSearchParams('q= vest &category=3&outlet=x&sort=priceDesc&page=2&limit=50');
    const q = parseListQuery((k) => params.get(k));
    expect(q).toEqual({ q: 'vest', categoryId: 3, outletId: undefined, sort: 'priceDesc', page: 2, limit: 50 });
    expect(toApiFilters(q)).toMatchObject({ search: 'vest', categoryId: 3, page: 2, limit: 50, sortBy: 'rentPrice', sortOrder: 'desc' });
    expect(parsePageSize('25')).toBe(10);
    const d = parseListQuery(() => null);
    expect(d).toMatchObject({ q: '', sort: 'name', page: 1, limit: 10 });
    expect(toApiFilters(d)).toMatchObject({ search: undefined, sortBy: 'name', sortOrder: 'asc' });
  });
});

describe('selection', () => {
  const page = [1, 2, 3];
  it('toggles rows and the page header', () => {
    let s = toggleOne(EMPTY_SELECTION, 2, page);
    expect(pageCheckState(s, page)).toBe('some');
    s = togglePage(s, page);
    expect(s).toEqual({ ids: [2, 1, 3], all: false });
    expect(pageCheckState(s, page)).toBe('all');
    expect(togglePage(s, page)).toEqual({ ids: [], all: false });
  });

  it('keeps picks from other pages when the header clears this page', () => {
    const s = togglePage({ ids: [9, 1, 2, 3], all: false }, page);
    expect(s.ids).toEqual([9]);
  });

  it('"select all N" counts every matching product; unticking one falls back to this page', () => {
    const all = { ids: page, all: true };
    expect(selectedCount(all, 86)).toBe(86);
    expect(pageCheckState(all, page)).toBe('all');
    expect(toggleOne(all, 2, page)).toEqual({ ids: [1, 3], all: false });
    expect(togglePage(all, page)).toEqual(EMPTY_SELECTION);
  });
});

describe('import: headers and values', () => {
  it('maps Vietnamese, English and template headers without accents or case', () => {
    expect(normalizeHeader('Tên sản phẩm')).toBe('ten san pham');
    expect(normalizeHeader('Đặt cọc')).toBe('dat coc');
    expect(mapHeaders(['Tên sản phẩm', 'MÃ VẠCH', 'Danh mục', 'Giá thuê', 'Giá bán', 'Tiền cọc', 'Số lượng', 'Ghi chú'])).toEqual([
      'name',
      'barcode',
      'categoryName',
      'rentPrice',
      'salePrice',
      'deposit',
      'stock',
      null,
    ]);
    // the API sample file
    expect(mapHeaders(['Name', 'Description', 'Barcode', 'Category Name', 'Rent Price', 'Sale Price', 'Cost Price', 'Deposit', 'Stock', 'Pricing Type (FIXED/HOURLY/DAILY)'])).toEqual([
      'name',
      'description',
      'barcode',
      'categoryName',
      'rentPrice',
      'salePrice',
      'costPrice',
      'deposit',
      'stock',
      null,
    ]);
    // a second column for the same field is ignored
    expect(mapHeaders(['Name', 'Tên'])).toEqual(['name', null]);
  });

  it('reads money the way shops type it', () => {
    expect(parseMoney(250000)).toBe(250000);
    expect(parseMoney('250.000')).toBe(250000);
    expect(parseMoney('1,500,000đ')).toBe(1500000);
    expect(parseMoney(' 2.500.000 ₫')).toBe(2500000);
    expect(parseMoney('99.5')).toBe(99.5);
    expect(parseMoney('')).toBeNull();
    expect(parseMoney(undefined)).toBeNull();
    expect(parseMoney('hai trăm')).toBe('invalid');
    expect(parseMoney(-5)).toBe('invalid');
    expect(parseMoney('-5')).toBe('invalid');
  });

  it('reads quantities as whole numbers', () => {
    expect(parseCount(3)).toBe(3);
    expect(parseCount('12')).toBe(12);
    expect(parseCount('1.000')).toBe(1000);
    expect(parseCount('')).toBeNull();
    expect(parseCount(2.5)).toBe('invalid');
    expect(parseCount('ba')).toBe('invalid');
  });

  it('keeps Excel row numbers and skips blank rows', () => {
    const sheet = sheetFromMatrix(
      [
        ['', ''],
        ['Tên sản phẩm', 'Mã vạch'],
        ['Áo dài', 'A1'],
        ['', ''],
        ['Vest', 'V1'],
      ],
      1,
    );
    expect(sheet.headers).toEqual(['Tên sản phẩm', 'Mã vạch']);
    expect(sheet.rows.map((r) => r.row)).toEqual([3, 5]);
  });
});

describe('import: row checks', () => {
  const HEAD = ['Tên sản phẩm', 'Mã vạch', 'Danh mục', 'Giá thuê', 'Giá bán', 'Tiền cọc', 'Số lượng'];
  const sheet = (rows: unknown[][]) => sheetFromMatrix([HEAD, ...rows]);
  const CATS = ['Áo dài', 'Vest', 'Phụ kiện'];

  it('builds the payload the API expects for valid rows', () => {
    const res = checkSheet(sheet([['Áo dài lụa trắng', 8930005002, 'áo dài', '200.000', '', 100000, 4]]), CATS);
    expect(res).toMatchObject({ problem: null, okCount: 1, errorCount: 0 });
    expect(res.rows[0]).toMatchObject({ row: 2, errors: [] });
    expect(res.rows[0].payload).toEqual({
      name: 'Áo dài lụa trắng',
      barcode: '8930005002',
      categoryName: 'áo dài',
      rentPrice: 200000,
      salePrice: 0,
      costPrice: 0,
      deposit: 100000,
      stock: 4,
    });
  });

  it('uses the default category when the cell is empty', () => {
    const res = checkSheet(sheet([['Khăn vấn', '', '', 50000, '', '', '']]), CATS);
    expect(res.rows[0].payload).toMatchObject({ categoryName: 'default', stock: 0 });
    expect(res.rows[0].payload).not.toHaveProperty('barcode');
  });

  it('flags the board errors per cell', () => {
    const res = checkSheet(
      sheet([
        ['', '8930005101', 'Áo dài', '250.000', '', '', 3],
        ['Vest nam xám tro', '8930005123', 'Vest', 'hai trăm', '', '', 2],
        ['Áo cưới đỏ', '8930005200', 'Áo cưới', '600.000', '', '', 1],
        ['Vest đen', '8930005123', 'Vest', '300.000', '', '', 'năm'],
        ['Váy dạ hội', 'V9', 'Vest', '150.000', '', '', 3],
      ]),
      CATS,
    );
    expect(res.okCount).toBe(1);
    expect(res.errorCount).toBe(4);
    expect(res.rows[0].errors).toEqual([{ field: 'name', code: 'nameMissing' }]);
    expect(res.rows[1].errors).toEqual([{ field: 'rentPrice', code: 'priceInvalid' }]);
    expect(res.rows[2].errors).toEqual([{ field: 'categoryName', code: 'categoryUnknown' }]);
    // first copy of a barcode is kept (row 3), the later one points back to it
    expect(res.rows[3].errors).toEqual([
      { field: 'stock', code: 'stockInvalid' },
      { field: 'barcode', code: 'barcodeDuplicate', ref: 3 },
    ]);
    expect(res.rows.filter((r) => r.payload).map((r) => r.row)).toEqual([6]);
    expect(orderRows(res.rows, true).map((r) => r.row)).toEqual([2, 3, 4, 5, 6]);
    expect(orderRows(res.rows.slice().reverse(), true).map((r) => r.row)).toEqual([5, 4, 3, 2, 6]);
  });

  it('refuses empty files, files without a name column and files over the cap', () => {
    expect(checkSheet(sheetFromMatrix([HEAD]), CATS).problem).toBe('empty');
    expect(checkSheet(sheetFromMatrix([['Giá', 'Mã'], [1, 'a']]), CATS).problem).toBe('noNameColumn');
    const big = sheet(Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => [`SP ${i}`]));
    expect(checkSheet(big, CATS).problem).toBe('tooMany');
    expect(checkSheet(sheet(Array.from({ length: MAX_IMPORT_ROWS }, (_, i) => [`SP ${i}`])), CATS).problem).toBeNull();
  });
});

describe('import: request and result', () => {
  const rows = checkSheet(
    sheetFromMatrix([['Name', 'Rent Price'], ['A', 1], ['', 2], ['B', 3], ['C', 4]]),
    [],
  ).rows;

  it('sends only valid rows that are still ticked and remembers their file rows', () => {
    const { items, fileRows } = buildImport(rows, new Set([2, 3, 5]));
    expect(items.map((i) => i.name)).toEqual(['A', 'C']);
    expect(fileRows).toEqual([2, 5]);
  });

  it('maps API row numbers (1-based, request order) back to file rows', () => {
    const out = readOutcome({ imported: 0, failed: 1, total: 2, errors: [{ row: 2, error: 'Category "X" not found' }] }, [2, 5]);
    expect(out).toEqual({ imported: 0, skipped: 0, failed: 1, errors: [{ row: 5, message: 'Category "X" not found' }] });
    expect(readOutcome({ imported: 3, skipped: 1, failed: 0, errors: [] }, [2, 3, 4, 5])).toEqual({ imported: 3, skipped: 1, failed: 0, errors: [] });
    expect(readOutcome(undefined, [])).toEqual({ imported: 0, skipped: 0, failed: 0, errors: [] });
    expect(readOutcome({ errors: [{ row: 9, error: 'x' }] }, [2]).errors[0].row).toBeNull();
  });
});

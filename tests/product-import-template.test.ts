/**
 * #1338 the product Excel sample file ("Tải file mẫu sản phẩm") no longer shows the technical columns
 * Pricing Type and Duration Config. The importer still reads them: an older file with 11 columns imports
 * as before, and a new file with 9 columns imports with pricingType / durationConfig empty.
 * Pure modules; runs under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import * as XLSX from 'xlsx';
import { generateProductSampleFile } from '../packages/utils/src/import/sample-generator';
import { createExcelWorkbook } from '../packages/utils/src/core/excel';
import { validateProducts } from '../packages/utils/src/import/validators';
import { checkSheet, mapHeaders, sheetFromMatrix } from '../apps/client/app/products/import/import-model';

const NEW_HEADERS = [
  'Name',
  'Description',
  'Barcode',
  'Category Name',
  'Rent Price',
  'Sale Price',
  'Cost Price',
  'Deposit',
  'Stock',
];
const OLD_ONLY_HEADERS = ['Pricing Type (FIXED/HOURLY/DAILY)', 'Duration Config (JSON string)'];

/** First sheet of an xlsx buffer as a matrix (row 0 = header), the way the web reads a file. */
function matrixOf(buffer: Buffer): { sheetName: string; matrix: unknown[][] } {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  const matrix = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' }) as unknown[][];
  return { sheetName, matrix };
}

/** The sample file as it was before #1338 (11 columns), built the same way the API builds it. */
function oldTemplateFile(): Buffer {
  const columns = [
    ...NEW_HEADERS.map((header) => ({ header, key: header })),
    { header: OLD_ONLY_HEADERS[0], key: 'pricingType' },
    { header: OLD_ONLY_HEADERS[1], key: 'durationConfig' },
  ];
  const row = {
    Name: 'Bicycle',
    Description: 'Mountain bike for rent',
    Barcode: 'BIKE001',
    'Category Name': 'Vehicles',
    'Rent Price': 25,
    'Sale Price': 300,
    'Cost Price': 200,
    Deposit: 50,
    Stock: 5,
    pricingType: 'DAILY',
    durationConfig: '{"minDuration":1,"maxDuration":30,"defaultDuration":1}',
  };
  return createExcelWorkbook([row], columns, 'Products');
}

describe('#1338 product sample file', () => {
  it('has the 9 shop-facing columns in order and not Pricing Type / Duration Config', () => {
    const { sheetName, matrix } = matrixOf(generateProductSampleFile());
    expect(sheetName).toBe('Products');
    expect(matrix[0]).toEqual(NEW_HEADERS);
    for (const hidden of OLD_ONLY_HEADERS) expect(matrix[0]).not.toContain(hidden);
  });

  it('keeps the 3 example rows, each with 9 cells and no pricing type or duration config', () => {
    const { matrix } = matrixOf(generateProductSampleFile());
    expect(matrix).toHaveLength(4);
    for (const row of matrix.slice(1)) expect(row).toHaveLength(NEW_HEADERS.length);
    const flat = JSON.stringify(matrix);
    expect(flat).not.toMatch(/FIXED|HOURLY|DAILY|minDuration/);
  });

  it('the new file imports on the web: every column maps and every example row passes the checks', () => {
    const { matrix } = matrixOf(generateProductSampleFile());
    expect(mapHeaders(matrix[0])).toEqual([
      'name',
      'description',
      'barcode',
      'categoryName',
      'rentPrice',
      'salePrice',
      'costPrice',
      'deposit',
      'stock',
    ]);
    const result = checkSheet(sheetFromMatrix(matrix), ['Electronics', 'Vehicles']);
    expect(result.errorCount).toBe(0);
    expect(result.okCount).toBe(3);
    // the web payload never carried pricingType / durationConfig
    expect(Object.keys(result.rows[0].payload ?? {})).not.toContain('pricingType');
    expect(Object.keys(result.rows[0].payload ?? {})).not.toContain('durationConfig');
  });

  it('the new file passes the server validator with pricingType / durationConfig left out', () => {
    const rows = [
      { name: 'Camera DSLR', categoryName: 'Electronics', rentPrice: 50, salePrice: 500, costPrice: 300, deposit: 100, stock: 10 },
    ];
    const result = validateProducts(rows, 1);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    expect(result.data).toHaveLength(1);
  });
});

describe('#1338 an older file with the two technical columns still imports', () => {
  it('maps the first 9 columns and ignores the two extra headers on the web', () => {
    const { matrix } = matrixOf(oldTemplateFile());
    expect(matrix[0]).toEqual([...NEW_HEADERS, ...OLD_ONLY_HEADERS]);
    expect(mapHeaders(matrix[0])).toEqual([
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
      null,
    ]);
    const result = checkSheet(sheetFromMatrix(matrix), ['Vehicles']);
    expect(result.errorCount).toBe(0);
    expect(result.okCount).toBe(1);
  });

  it('the server validator still accepts pricingType and durationConfig', () => {
    const base = { categoryName: 'Vehicles', rentPrice: 25, salePrice: 300, costPrice: 200, deposit: 50, stock: 5 };
    const ok = validateProducts(
      [
        { ...base, name: 'Bicycle', pricingType: 'DAILY', durationConfig: '{"minDuration":1,"maxDuration":30,"defaultDuration":1}' },
        { ...base, name: 'Camera', pricingType: 'FIXED', durationConfig: '' },
      ],
      1,
    );
    expect(ok.errors).toEqual([]);
    expect(ok.valid).toBe(true);
    expect(ok.data).toHaveLength(2);

    // the rule for HOURLY / DAILY is unchanged: a missing durationConfig is still an error
    const bad = validateProducts([{ ...base, name: 'Laptop', pricingType: 'HOURLY' }], 1);
    expect(bad.valid).toBe(false);
    expect(bad.errors[0].field).toBe('durationConfig');
  });
});

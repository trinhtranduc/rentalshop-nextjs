/**
 * #1013 (release review #999): a success response never carries the generic error sentence.
 *
 * `ResponseBuilder.success()` / `paginated()` used the error resolver, so a success code missing from
 * `locales/{en,vi}/errors.json` answered HTTP 200, `success: true`, `message: "Đã có lỗi. Vui lòng thử lại."`.
 * Every literal success code the API passes is checked here, in English and Vietnamese.
 */
import * as fs from 'fs';
import * as path from 'path';
import { withApiMessageRequest } from '../packages/utils/src/api-message-binding';
import { ResponseBuilder } from '../packages/utils/src/api/response-builder';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIRS = ['apps/api/app', 'apps/api/lib', 'packages'];
const ERROR_FALLBACK = ['Đã có lỗi. Vui lòng thử lại.', 'Something went wrong. Please try again.'];

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '__tests__', '.next', '.turbo'].includes(entry.name)) continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Codes in the first argument of `ResponseBuilder.success(` / `.paginated(` / `attendanceOk(` (ternaries too) */
function literalSuccessCodes(): string[] {
  const codes = new Set<string>();
  const call = /(?:ResponseBuilder\.(?:success|paginated)|\battendanceOk)\(\s*([^,)]*)/g;
  for (const dir of SOURCE_DIRS) {
    for (const file of walk(path.join(ROOT, dir))) {
      const text = fs.readFileSync(file, 'utf8');
      for (const m of text.matchAll(call)) {
        for (const lit of m[1].matchAll(/['"`]([A-Z][A-Z0-9_]+)['"`]/g)) codes.add(lit[1]);
      }
    }
  }
  return [...codes].sort();
}

const codes = literalSuccessCodes();
const en = (fn: () => string) => withApiMessageRequest({ 'accept-language': 'en' }, fn);
const vi = (fn: () => string) => withApiMessageRequest({ 'accept-language': 'vi' }, fn);

describe('#1013 success responses never use the error fallback', () => {
  it('finds the success codes the API uses', () => {
    expect(codes.length).toBeGreaterThan(100);
    expect(codes).toEqual(expect.arrayContaining(['DAILY_INCOME_SUCCESS', 'INCOME_ORDERS_SUCCESS', 'ATTENDANCE_PUNCH_SUCCESS']));
  });

  it.each(codes)('%s: success() and paginated() answer a non-error message in en and vi', (code) => {
    for (const run of [en, vi]) {
      const one = run(() => ResponseBuilder.success(code, {}).message as string);
      const page = run(() => ResponseBuilder.paginated(code, [], { page: 1, limit: 10, total: 0 }).message as string);
      for (const message of [one, page]) {
        expect(typeof message).toBe('string');
        expect(message.trim()).not.toBe('');
        expect(ERROR_FALLBACK).not.toContain(message);
      }
    }
  });

  it('a success code missing from every table still answers a neutral success sentence', () => {
    expect(vi(() => ResponseBuilder.success('NOT_A_REAL_SUCCESS_CODE').message as string)).toBe('Thành công');
    expect(en(() => ResponseBuilder.success('NOT_A_REAL_SUCCESS_CODE').message as string)).toBe('Success');
  });

  it('the income codes the golden tests cover have their own sentence', () => {
    expect(vi(() => ResponseBuilder.success('DAILY_INCOME_SUCCESS').message as string)).toBe('Lấy thu nhập theo ngày thành công');
    expect(en(() => ResponseBuilder.success('DAILY_INCOME_SUCCESS').message as string)).toBe('Daily income retrieved successfully');
    expect(vi(() => ResponseBuilder.success('INCOME_ORDERS_SUCCESS').message as string)).toBe('Lấy danh sách đơn thu nhập thành công');
    expect(en(() => ResponseBuilder.success('INCOME_ORDERS_SUCCESS').message as string)).toBe('Income orders retrieved successfully');
  });

  it('keeps success, code, data and meta exactly', () => {
    const data = { a: 1 };
    const meta = { page: 2 };
    const body = ResponseBuilder.success('DAILY_INCOME_SUCCESS', data, meta);
    expect(body.success).toBe(true);
    expect(body.code).toBe('DAILY_INCOME_SUCCESS');
    expect(body.data).toBe(data);
    expect(body.meta).toBe(meta);
    expect(Object.keys(body).sort()).toEqual(['code', 'data', 'message', 'meta', 'success']);
  });

  it('errors keep the error fallback', () => {
    expect(vi(() => ResponseBuilder.error('NOT_A_REAL_ERROR_CODE').message as string)).toBe('Đã có lỗi. Vui lòng thử lại.');
    expect(en(() => ResponseBuilder.error('NOT_A_REAL_ERROR_CODE').message as string)).toBe('Something went wrong. Please try again.');
  });
});

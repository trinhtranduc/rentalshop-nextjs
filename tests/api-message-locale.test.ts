/**
 * #986: server `message` / `error` are catalog sentences.
 * Accept-Language `en` / `vi` picks the catalog. Anything else is Vietnamese.
 * Exception text is not copied into the response.
 */
import * as fs from 'fs';
import * as path from 'path';
import { getApiMessage, resolveApiMessageLocale } from '../packages/utils/src/api-messages';
import { installApiMessageLocale, withApiMessageRequest } from '../packages/utils/src/api-message-binding';
import { handleApiError } from '../packages/utils/src/core/errors';
import { ResponseBuilder } from '../packages/utils/src/api/response-builder';

const root = path.resolve(__dirname, '..');
const en = JSON.parse(fs.readFileSync(path.join(root, 'locales/en/errors.json'), 'utf8'));
const vi = JSON.parse(fs.readFileSync(path.join(root, 'locales/vi/errors.json'), 'utf8'));

describe('#986 API message locale', () => {
  it('picks English or Vietnamese from the first language tag', () => {
    expect(resolveApiMessageLocale(null)).toBe('vi');
    expect(resolveApiMessageLocale('')).toBe('vi');
    expect(resolveApiMessageLocale('ja')).toBe('vi');
    expect(resolveApiMessageLocale('ko-KR,en;q=0.8')).toBe('vi');
    expect(resolveApiMessageLocale('zh-CN')).toBe('vi');
    expect(resolveApiMessageLocale('en')).toBe('en');
    expect(resolveApiMessageLocale('en-US,en;q=0.9,vi;q=0.8')).toBe('en');
    expect(resolveApiMessageLocale('vi')).toBe('vi');
    expect(resolveApiMessageLocale('vi-VN,en;q=0.5')).toBe('vi');
  });

  it('uses the Accept-Language of the Node request that is running', async () => {
    const http = require('http') as typeof import('http');
    installApiMessageLocale();
    const server = http.createServer((_req, res) => {
      res.end(getApiMessage('INVALID_CREDENTIALS'));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const ask = (lang?: string) =>
      new Promise<string>((resolve, reject) => {
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port,
            path: '/',
            method: 'GET',
            headers: lang ? { 'accept-language': lang } : {},
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
          },
        );
        req.on('error', reject);
        req.end();
      });

    try {
      expect(await ask('en-US,en;q=0.9')).toBe(en.INVALID_CREDENTIALS);
      expect(await ask('vi-VN')).toBe(vi.INVALID_CREDENTIALS);
      expect(await ask()).toBe(vi.INVALID_CREDENTIALS);
      expect(await ask('ja')).toBe(vi.INVALID_CREDENTIALS);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('reads a header bag the same way a request would', () => {
    withApiMessageRequest({ 'accept-language': 'en' }, () => {
      expect(getApiMessage('INVALID_CREDENTIALS')).toBe(en.INVALID_CREDENTIALS);
    });
    expect(getApiMessage('INVALID_CREDENTIALS')).toBe(vi.INVALID_CREDENTIALS);
  });

  it('returns the catalog sentence and fills placeholders as plain text', () => {
    expect(getApiMessage('INVALID_CREDENTIALS', {}, 'en')).toBe(en.INVALID_CREDENTIALS);
    expect(getApiMessage('INVALID_CREDENTIALS', {}, 'vi')).toBe(vi.INVALID_CREDENTIALS);
    expect(getApiMessage('INVALID_CREDENTIALS')).toBe(vi.INVALID_CREDENTIALS);
    const filled = getApiMessage('PRODUCT_HELD_BY_OTHER_OUTLETS', { outlets: 'Main {shop}' }, 'en');
    expect(filled).toContain('Main {shop}');
    expect(filled).not.toContain('{outlets}');
    expect(getApiMessage('NOT_A_REAL_CODE', {}, 'en')).toBe('Something went wrong. Please try again.');
    expect(getApiMessage('NOT_A_REAL_CODE', {}, 'vi')).toBe('Đã có lỗi. Vui lòng thử lại.');
  });

  it('does not put a Prisma or Zod exception into message or error', () => {
    const database = Object.assign(new Error("Can't reach database server at postgres.internal:5432"), {
      code: 'P1001',
    });
    const dbResult = handleApiError(database);
    const dbBody = JSON.stringify(dbResult.response);
    expect(dbBody).not.toContain('postgres.internal');
    expect(dbBody).not.toContain('database server');
    expect(dbResult.response.code).toBe('SERVICE_UNAVAILABLE');
    expect(dbResult.statusCode).toBe(503);
    expect(dbResult.response.message).toBe(vi.SERVICE_UNAVAILABLE);
    expect(dbResult.response.error).toBe(vi.SERVICE_UNAVAILABLE);

    const zod = {
      name: 'ZodError',
      message: 'Expected number, received string at orderItems.0.price',
      errors: [{ path: ['orderItems', 0, 'price'], message: 'Expected number, received string' }],
    };
    const zodResult = handleApiError(zod);
    const zodBody = JSON.stringify(zodResult.response);
    expect(zodBody).not.toContain('Expected number');
    expect(zodBody).not.toContain('Field:');
    expect(zodBody).not.toContain('orderItems');
    expect(zodResult.response.code).toBe('VALIDATION_ERROR');
    expect(zodResult.response.message).toBe(vi.VALIDATION_ERROR);
    expect(zodResult.response.error).toBe(vi.VALIDATION_ERROR);

    const flat = ResponseBuilder.validationError({
      fieldErrors: { email: ['Invalid email'] },
      formErrors: [],
    });
    expect(JSON.stringify(flat)).not.toContain('Invalid email');
    expect(flat.error).toBe(vi.VALIDATION_ERROR);
    expect(flat.code).toBe('VALIDATION_ERROR');
  });
});

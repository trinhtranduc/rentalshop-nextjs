/**
 * Auth and GET /api/orders — installed apps keep working after the release that carries #1409 and #1392 (#1450).
 *
 * `golden/auth-orders-main-real.json` holds the answers of `origin/main-real` for the scenarios in
 * `auth-orders-scenarios.ts` (see `generate-golden-auth-orders.ts`), through the real `withPermissions` and
 * `authenticateRequest`. Today's code must answer the same, field for field. Allowed differences, each intended:
 *
 * - #1409 a Prisma failure during authentication: 403 `SUBSCRIPTION_ERROR` with the raw text, or 401
 *   `AUTHENTICATION_FAILED` (signs the user out of both apps), becomes 503 `SERVICE_UNAVAILABLE` with the catalog text.
 * - #1409 another exception whose text holds "subscription": still 403 `SUBSCRIPTION_ERROR`, the catalog sentence
 *   replaces the exception text.
 * - #1392 an outlet manager writing a bank account: 200 / 201 becomes 403 `INSUFFICIENT_PERMISSIONS`.
 * - #1409 a failed image upload: `error` no longer holds the S3 text. `POST /api/upload/image` and the order notes keep
 *   `code` and `message`; `POST /api/products` and `PUT /api/products/[id]` also move from `IMAGE_UPLOAD_FAILED` to
 *   `UPLOAD_IMAGE_FAILED`. Both codes have a sentence in every installed app and no client branches on either.
 * - Added fields: none.
 *
 * Runs the same under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import golden from './golden/auth-orders-main-real.json';
import { NOW, runAuthOrdersScenarios } from './auth-orders-scenarios';
import { freezeClock } from './load-route';

const before = golden as Record<string, any>;
let now: Record<string, any>;

const DB_FAILURE_503 = ['authPrismaFailureWithSubscriptionWord', 'authPrismaFailurePlain', 'authPrismaFailureNoCode', 'sessionReadPrismaFailure'];
const CATALOG_TEXT_ONLY = ['authOtherErrorWithSubscriptionWord'];
const MANAGER_WRITES = ['bankCreateManager', 'bankUpdateManager', 'bankSetDefaultManager', 'bankDeleteManager'];
const UPLOAD_SAME_CODE = ['uploadImageS3Failure', 'orderNotesS3Failure'];
const UPLOAD_NEW_CODE = ['productCreateS3Failure', 'productUpdateS3Failure'];
const CHANGED = [...DB_FAILURE_503, ...CATALOG_TEXT_ONLY, ...MANAGER_WRITES, ...UPLOAD_SAME_CODE, ...UPLOAD_NEW_CODE];
const unchanged = Object.keys(golden).filter((name) => !CHANGED.includes(name));

const RAW_TEXT = ['invocation', 'prisma', 'SELECT', '/app/', '.next', 'chunks', 'attendanceScan', 'subscription:d', 'AccessDenied'];
const expectNoRawText = (body: unknown) => {
  const text = JSON.stringify(body).toLowerCase();
  for (const marker of RAW_TEXT) expect(text).not.toContain(marker.toLowerCase());
};

beforeAll(async () => {
  freezeClock(NOW);
  now = await runAuthOrdersScenarios();
});
afterAll(() => jest.useRealTimers());

describe('golden file', () => {
  it('covers the same scenarios', () => {
    expect(Object.keys(now).sort()).toEqual(Object.keys(before).sort());
  });

  it('records the leak of #1408, so the comparison below means something', () => {
    const leak = before.authPrismaFailureWithSubscriptionWord;
    expect(leak.status).toBe(403);
    expect(leak.body.message).toContain('attendanceScan');
  });

  it('records the order list the apps read, with its default limit and sort', () => {
    const list = before.listAsOutletStaff;
    expect(list.status).toBe(200);
    expect(list.body.data.orders).toHaveLength(3);
    expect(list.filters[0]).toMatchObject({ page: 1, limit: 50, sortBy: 'createdAt', sortOrder: 'desc', merchantId: 1, outletId: 2 });
  });
});

describe('every answer an installed app reads is unchanged', () => {
  it.each(unchanged)('%s', (name) => {
    expect(now[name]).toEqual(before[name]);
  });
});

describe('#1409 database failure during authentication', () => {
  it.each(DB_FAILURE_503)('%s: 503 SERVICE_UNAVAILABLE, not a sign-out, not a plan problem', (name) => {
    expect(now[name].status).toBe(503);
    expect(now[name].body).toMatchObject({ success: false, code: 'SERVICE_UNAVAILABLE' });
    // The iOS list response (`OrdersResponse`, `Model/Order.swift`) decodes `code` and `message` as non-optional String
    expect(typeof now[name].body.message).toBe('string');
    expect(typeof now[name].body.error).toBe('string');
    expectNoRawText(now[name].body);
  });

  it('401 goes away only for a database failure', () => {
    expect(before.authPrismaFailurePlain.status).toBe(401);
    expect(before.authOtherError).toEqual(now.authOtherError);
    expect(now.authOtherError.status).toBe(401);
  });
});

describe('#1409 another exception that mentions "subscription"', () => {
  it('keeps 403 SUBSCRIPTION_ERROR, with the catalog sentence', () => {
    const [was, is] = [before.authOtherErrorWithSubscriptionWord, now.authOtherErrorWithSubscriptionWord];
    expect(was.status).toBe(403);
    expect(is.status).toBe(403);
    expect(is.body.code).toBe(was.body.code);
    expect(is.body.success).toBe(false);
    expect(is.body.message).not.toBe(was.body.message);
    expect(typeof is.body.message).toBe('string');
    expectNoRawText(is.body);
  });
});

describe('#1392 bank accounts', () => {
  it.each(MANAGER_WRITES)('%s: the manager gets 403 INSUFFICIENT_PERMISSIONS, old apps read it', (name) => {
    expect(before[name].status).toBeLessThan(300);
    expect(now[name].status).toBe(403);
    expect(now[name].body).toMatchObject({ success: false, code: 'INSUFFICIENT_PERMISSIONS' });
    expect(now[name].body.data).toBeUndefined();
    // `APIBankAccountResponse` (`Model/BankAccount.swift`): every field but `success` is optional; the `error` is a String
    expect(typeof now[name].body.error).toBe('string');
  });
});

describe('#1409 failed image upload', () => {
  it.each([...UPLOAD_SAME_CODE, ...UPLOAD_NEW_CODE])('%s: main-real sent the S3 text, today it does not', (name) => {
    expect(JSON.stringify(before[name].body)).toContain('AccessDenied');
    expect(now[name].status).toBe(before[name].status);
    expect(now[name].body.success).toBe(false);
    expect(typeof now[name].body.error).toBe('string');
    expectNoRawText(now[name].body);
  });

  it.each(UPLOAD_SAME_CODE)('%s keeps code and message', (name) => {
    expect(now[name].body.code).toBe(before[name].body.code);
    expect(now[name].body.message).toBe(before[name].body.message);
  });

  it.each(UPLOAD_NEW_CODE)('%s: IMAGE_UPLOAD_FAILED becomes UPLOAD_IMAGE_FAILED', (name) => {
    expect(before[name].body.code).toBe('IMAGE_UPLOAD_FAILED');
    expect(now[name].body.code).toBe('UPLOAD_IMAGE_FAILED');
    expect(now[name].status).toBe(500);
  });
});

describe('error answers stay decodable', () => {
  it('every non-success answer of the order list has code and message as strings', () => {
    for (const [name, answer] of Object.entries(now)) {
      if (answer.status < 300) continue;
      expect([name, typeof answer.body.code, typeof answer.body.message]).toEqual([name, 'string', 'string']);
    }
  });
});

/**
 * #1408 An iPhone showed "Invalid `t.attendanceScan.findFirst()` invocation in /app/apps/api/.next/server/chunks/…"
 * plus SQL and bundled source. Exception text never goes to a client: the log keeps it, the response has a
 * catalog sentence. See .agent/evals/cases/api-raw-exception-text.md.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (body: any, init?: any) => ({ body, status: init?.status || 200 }),
  },
}));

jest.mock('@rentalshop/utils', () => ({
  ...jest.requireActual('../packages/utils/src/core/errors'),
  ...jest.requireActual('../packages/utils/src/api/response-builder'),
}));

jest.mock('@rentalshop/utils/server', () => ({ getSubscriptionError: jest.fn() }));

jest.mock('@rentalshop/loyalty', () => ({
  LoyaltyPlanGateError: class LoyaltyPlanGateError extends Error {},
  assertLoyaltyFeature: jest.fn(),
}));

jest.mock('@rentalshop/auth/server', () => ({
  withAuthRoles: () => (handler: any) => (request: any) =>
    handler(request, { user: { id: 1, role: 'MERCHANT', merchantId: 7, outletId: null }, userScope: { merchantId: 7 } }),
}));

const mockDb = {
  users: { findById: jest.fn() },
  sessions: { getSessionStatus: jest.fn(), validateSession: jest.fn() },
  merchantModules: { isActive: jest.fn() },
};

jest.mock('@rentalshop/database', () => ({ db: mockDb, prisma: {} }));

import * as jsonwebtoken from 'jsonwebtoken';
import { authenticateRequest } from '../packages/auth/src/core';
import { handleApiError, clientSafeErrorText } from '../packages/utils/src/core/errors';
import { attendanceRoute } from '../apps/api/lib/attendance/context';
import { loyaltyErrorResponse } from '../apps/api/lib/loyalty-route-helpers';

const root = path.resolve(__dirname, '..');

/** The text of the incident: Prisma's error with its call site. The name in it is not the query that failed. */
const RAW_PRISMA_TEXT = [
  '',
  'Invalid `t.attendanceScan.findFirst()` invocation in',
  '/app/apps/api/.next/server/chunks/1677.js:54:55586',
  '',
  '  51 SELECT u."merchantId" AS id FROM "User" u',
  `  52 WHERE u."role" = 'MERCHANT' AND u."deletedAt" IS NULL AND u."merchantId" IS NOT NULL`,
  '  53   AND regexp_replace(COALESCE(u."phone", \'\'), \'[^0-9]\', \'\', \'g\') LIKE ${t}`).map(e=>Number(e.id))}async function tc(e){let{page:t=1,limit:r=20,subscription:d}=e',
  '→ 54 t.$queryRaw`SELECT id FROM "User"`;let n=await t.attendanceScan.findFirst(',
  'Timed out fetching a new connection from the connection pool.',
].join('\n');

function prismaError(code?: string, name = 'PrismaClientKnownRequestError', message = RAW_PRISMA_TEXT) {
  const error = new Error(message) as Error & { code?: string };
  error.name = name;
  if (code) error.code = code;
  return error;
}

const FORBIDDEN = ['invocation', 'prisma', 'SELECT', '/app/', '.next', 'chunks', 'regexp_replace', 'attendanceScan'];

function expectClean(body: unknown) {
  const text = JSON.stringify(body);
  for (const marker of FORBIDDEN) {
    expect(text.toLowerCase()).not.toContain(marker.toLowerCase());
  }
}

describe('#1408 handleApiError', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['P2024'],
    ['P2028'],
    ['P2022'],
    ['P1001'],
    [undefined],
  ])('sends no exception text for a Prisma failure with code %s', (code) => {
    const { response, statusCode } = handleApiError(prismaError(code));
    expectClean(response);
    expect(statusCode).toBeGreaterThanOrEqual(400);
  });

  it('sends no exception text when the error has no Prisma code at all', () => {
    expectClean(handleApiError(prismaError(undefined, 'PrismaClientUnknownRequestError')).response);
    expectClean(handleApiError(prismaError(undefined, 'PrismaClientRustPanicError')).response);
  });
});

describe('#1408 attendanceRoute', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mockDb.merchantModules.isActive.mockResolvedValue(true);
  });
  afterEach(() => jest.restoreAllMocks());

  it('answers a Prisma failure in the handler with a catalog sentence', async () => {
    const route = attendanceRoute(['MERCHANT'], async () => {
      throw prismaError('P2028');
    }) as any;
    const res = await route({});
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(typeof res.body.code).toBe('string');
    expectClean(res.body);
  });
});

describe('#1408 authenticateRequest', () => {
  const token = () =>
    jsonwebtoken.sign(
      { userId: 1, email: 'a@b.c', role: 'ADMIN', merchantId: null, outletId: null, sessionId: 's', passwordChangedAt: null, permissionsChangedAt: null },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' },
    );
  const request = () =>
    ({ headers: { get: (name: string) => (name.toLowerCase() === 'authorization' ? `Bearer ${token()}` : null) } }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mockDb.sessions.getSessionStatus.mockResolvedValue('active');
  });
  afterEach(() => jest.restoreAllMocks());

  it('the leak: Prisma text containing "subscription" is not sent, and it is not a plan problem or a lost session', async () => {
    mockDb.users.findById.mockRejectedValue(prismaError('P2024'));
    const result: any = await authenticateRequest(request());
    expect(result.success).toBe(false);
    expectClean(result.response.body);
    expect(result.response.body.code).toBe('SERVICE_UNAVAILABLE');
    // 401 signs the user out of both apps (AuthSession.swift, ApiClient.kt), 403 SUBSCRIPTION_ERROR is about the plan
    expect(result.response.status).toBe(503);
    expect(typeof result.response.body.message).toBe('string');
    expect(result.response.body.success).toBe(false);
  });

  it('Prisma text without "subscription" is a 503 too, not a sign-out', async () => {
    mockDb.users.findById.mockRejectedValue(
      prismaError('P1001', 'PrismaClientKnownRequestError', "Invalid `prisma.user.findUnique()` invocation:\n\nCan't reach database server"),
    );
    const result: any = await authenticateRequest(request());
    expect(result.response.status).toBe(503);
    expect(result.response.body.code).toBe('SERVICE_UNAVAILABLE');
    expectClean(result.response.body);
  });

  it('keeps code and status of a real subscription error, with a catalog sentence', async () => {
    mockDb.users.findById.mockRejectedValue(new Error('the subscription row failed at /app/apps/api/.next/server/chunks/1.js'));
    const result: any = await authenticateRequest(request());
    expect(result.response.status).toBe(403);
    expect(result.response.body.code).toBe('SUBSCRIPTION_ERROR');
    expectClean(result.response.body);
  });
});

describe('#1408 loyaltyErrorResponse', () => {
  it('keeps business codes passed through as the message', () => {
    for (const [code, status] of [
      ['INSUFFICIENT_POINTS', 400],
      ['LOYALTY_TIER_NOT_FOUND', 400],
      ['CUSTOMER_NOT_FOUND', 404],
      ['MERCHANT_ID_REQUIRED', 403],
    ] as const) {
      const res: any = loyaltyErrorResponse(new Error(code));
      expect(res.body.code).toBe(code);
      expect(res.status).toBe(status);
    }
  });

  it('never uses exception text as the code', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const res: any = loyaltyErrorResponse(prismaError('P2024'));
    expectClean(res.body);
    expect(res.body.code).toMatch(/^[A-Z][A-Z0-9_]*$/);
    jest.restoreAllMocks();
  });
});

describe('#1408 clientSafeErrorText', () => {
  it('keeps a short business sentence', () => {
    expect(clientSafeErrorText(new Error('Row 3: email already exists'), 'fallback')).toBe('Row 3: email already exists');
  });

  it.each([
    [RAW_PRISMA_TEXT],
    ['connect ECONNREFUSED 127.0.0.1:5432'],
    ['Cannot read properties of undefined (reading "id")\n    at foo (/srv/a.js:1:2)'],
    ['x'.repeat(500)],
    [''],
  ])('falls back for %#', (text) => {
    expect(clientSafeErrorText(new Error(text), 'fallback')).toBe('fallback');
  });

  it('falls back for something that is not an Error', () => {
    expect(clientSafeErrorText('boom', 'fallback')).toBe('fallback');
    expect(clientSafeErrorText(undefined, 'fallback')).toBe('fallback');
  });
});

describe('#1408 Prisma client', () => {
  it('never renders source code into error.message, whatever NODE_ENV is', () => {
    const source = fs.readFileSync(path.join(root, 'packages/database/src/client.ts'), 'utf8');
    expect(source).toMatch(/errorFormat:\s*'minimal'/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Repo rule: a catch variable's text only goes to a log. Whatever else reads it is listed here with the reason.
// ---------------------------------------------------------------------------------------------------------------------

const ALLOWED: Array<{ file: string; text: string; why: string }> = [
  { file: 'packages/auth/src/core.ts', text: 'error.message', why: 'instanceof PlanLimitError: our own sentence, not exception text' },
  { file: 'apps/api/app/api/orders/[orderId]/route.ts', text: 'error?.message', why: 'raw only picks the code; never sent' },
  { file: 'apps/api/app/api/products/searchByImage/route.ts', text: 'error?.message', why: 'message is only logged and tested for "timeout"' },
  { file: 'apps/api/app/api/products/searchByImage/route.ts', text: 'error.message', why: 'message is only logged and tested for "timeout"' },
  { file: 'apps/api/app/api/public/[tenantKey]/search-by-image/route.ts', text: 'err?.message', why: 'message is only logged and tested for "timeout"' },
  { file: 'apps/api/app/api/public/[tenantKey]/search-by-image/route.ts', text: 'err.message', why: 'message is only logged and tested for "timeout"' },
  { file: 'apps/api/app/api/products/searchByImage/route.ts', text: 'String(error)', why: 'message is only logged and tested for "timeout"' },
  { file: 'apps/api/app/api/public/[tenantKey]/search-by-image/route.ts', text: 'String(error)', why: 'message is only logged and tested for "timeout"' },
  { file: 'apps/api/app/api/products/route.ts', text: 'error.message', why: 'ResponseBuilder.error(error.message) sits inside `if (error.message === <known code>)`' },
  { file: 'apps/api/app/api/auth/helper/page.tsx', text: 'error.message', why: 'a browser page showing its own fetch failure, not a server response' },
  { file: 'apps/api/lib/route-wrapper.ts', text: 'error.message', why: 'errorMessage goes to the request log only; the response is a fixed sentence' },
  { file: 'apps/api/lib/route-wrapper.ts', text: 'String(error)', why: 'errorMessage goes to the request log only; the response is a fixed sentence' },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== 'dist') walk(full, out);
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const TESTS_TEXT = new Set(['includes', 'startsWith', 'endsWith', 'match', 'test']);
const COMPARISON = new Set([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
]);

function isHarmlessUse(node: ts.Node): boolean {
  for (let cur: ts.Node = node; cur.parent; cur = cur.parent) {
    const parent = cur.parent;
    // error.message.includes('x') tests the text; error.message.slice(n) would pass it on
    if (ts.isPropertyAccessExpression(parent) && parent.expression === cur && TESTS_TEXT.has(parent.name.text)) return true;
    if (ts.isCallExpression(parent)) {
      const callee = parent.expression.getText();
      if (/^(console|logger|log)\./.test(callee)) return true;
      if (/\.includes$/.test(callee)) return true;
    }
    if (ts.isBinaryExpression(parent) && COMPARISON.has(parent.operatorToken.kind)) return true;
    if (ts.isTypeOfExpression(parent)) return true;
    if (ts.isThrowStatement(parent)) return true;
    if (ts.isIfStatement(parent) && parent.expression === cur) return true;
    if (ts.isConditionalExpression(parent) && parent.condition === cur) return true;
    if (ts.isPrefixUnaryExpression(parent)) return true;
    if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && parent.left === cur) {
      // `error.message && x` only tests; what x sends is checked on its own
      return true;
    }
    if (ts.isBlock(parent) || ts.isSourceFile(parent)) return false;
  }
  return false;
}

/** Every read of a catch variable's `.message` / `.stack` / text that can end up outside the process. */
function findLeaks(file: string): Array<{ text: string; line: number }> {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const leaks: Array<{ text: string; line: number }> = [];

  const visit = (node: ts.Node, names: Set<string>) => {
    let scope = names;
    if (ts.isCatchClause(node) && node.variableDeclaration && ts.isIdentifier(node.variableDeclaration.name)) {
      scope = new Set(names);
      scope.add(node.variableDeclaration.name.text);
    }
    // const err = error as X
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const init = ts.isAsExpression(node.initializer) ? node.initializer.expression : node.initializer;
      if (ts.isIdentifier(init) && names.has(init.text)) names.add(node.name.text);
    }
    const report = () =>
      leaks.push({ text: node.getText().slice(0, 40), line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1 });
    if (
      ts.isPropertyAccessExpression(node) &&
      (node.name.text === 'message' || node.name.text === 'stack') &&
      ts.isIdentifier(node.expression) &&
      scope.has(node.expression.text) &&
      !isHarmlessUse(node)
    ) {
      report();
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.getText() === 'String' &&
      node.arguments.length === 1 &&
      ts.isIdentifier(node.arguments[0]) &&
      scope.has((node.arguments[0] as ts.Identifier).text) &&
      !isHarmlessUse(node)
    ) {
      report();
    }
    ts.forEachChild(node, (child) => visit(child, scope));
  };
  visit(source, new Set());
  return leaks;
}

describe('#1408 repo rule: no route sends exception text', () => {
  const files = [
    ...walk(path.join(root, 'apps/api/app/api')),
    ...walk(path.join(root, 'apps/api/lib')),
    path.join(root, 'apps/api/middleware.ts'),
    ...walk(path.join(root, 'packages/auth/src')),
  ];

  it('scans real files', () => {
    expect(files.length).toBeGreaterThan(200);
  });

  it('finds the pattern it is looking for', () => {
    const probe = path.join(root, 'tests', '.tmp-no-raw-errors-probe.ts');
    fs.writeFileSync(
      probe,
      `try { a(); } catch (error) { console.error(error.message); if (error.message === 'X') b(); return { details: error.message, stack: error.stack, s: String(error) }; }`,
    );
    try {
      expect(findLeaks(probe).map((leak) => leak.text)).toEqual(['error.message', 'error.stack', 'String(error)']);
    } finally {
      fs.unlinkSync(probe);
    }
  });

  it('no catch variable text outside a log, a comparison or the allow list', () => {
    const found: string[] = [];
    for (const file of files) {
      const rel = path.relative(root, file);
      for (const leak of findLeaks(file)) {
        if (!ALLOWED.some((a) => a.file === rel && a.text === leak.text)) found.push(`${rel}:${leak.line} ${leak.text}`);
      }
    }
    expect(found).toEqual([]);
  });

  it('no helper puts a raw upload detail in the error field', () => {
    const found: string[] = [];
    for (const file of walk(path.join(root, 'apps/api/app/api'))) {
      const text = fs.readFileSync(file, 'utf8');
      if (/error:\s*(detail|raw)\s*\|\|/.test(text)) found.push(path.relative(root, file));
    }
    expect(found).toEqual([]);
  });
});

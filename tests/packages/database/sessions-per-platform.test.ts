/**
 * Issue #660 — one phone session and one web session per account.
 *
 * A login replaces only the active session of the same platform (plus NULL-platform rows, which
 * are pre-#660 sessions or unknown clients). A login with an unknown platform still replaces
 * everything, as before. Refresh tokens bound to the session that is kept keep rotating.
 *
 * The Prisma fake below keeps rows in memory and follows SQL NULL rules for `not` / `notIn`
 * (a NULL column never matches them), so the session code must handle NULL explicitly.
 */

type Row = Record<string, any>;

const store: { userSession: Row[]; refreshToken: Row[] } = { userSession: [], refreshToken: [] };
let nextId = 1;

function matchField(value: any, cond: any): boolean {
  if (cond === null) return value === null || value === undefined;
  if (cond instanceof Date) return value instanceof Date && value.getTime() === cond.getTime();
  if (typeof cond !== 'object') return value === cond;
  const isNull = value === null || value === undefined;
  return Object.entries(cond).every(([op, arg]: [string, any]) => {
    switch (op) {
      case 'equals':
        return matchField(value, arg);
      case 'in':
        return !isNull && arg.includes(value);
      case 'notIn':
        return !isNull && !arg.includes(value);
      case 'not':
        if (arg === null) return !isNull;
        return !isNull && !matchField(value, arg);
      case 'gt':
        return !isNull && value > arg;
      case 'lt':
        return !isNull && value < arg;
      default:
        throw new Error(`fake prisma: unsupported operator ${op}`);
    }
  });
}

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'OR') return (cond as Row[]).some((w) => matches(row, w));
    if (key === 'AND') return (cond as Row[]).every((w) => matches(row, w));
    if (key === 'NOT') return !(Array.isArray(cond) ? cond : [cond]).some((w: Row) => matches(row, w));
    return matchField(row[key], cond);
  });
}

// Column defaults from prisma/schema.prisma
const DEFAULTS: Record<string, Row> = {
  userSession: { isActive: true, invalidatedAt: null, platform: null, absoluteExpiresAt: null, idleTimeoutDays: null },
  refreshToken: { isRevoked: false, revokedAt: null, replacedBy: null, sessionId: null, deviceId: null },
};

function model(name: 'userSession' | 'refreshToken') {
  const rows = () => store[name];
  return {
    findUnique: jest.fn(async ({ where }: any) => rows().find((r) => matches(r, where)) ?? null),
    findFirst: jest.fn(async ({ where }: any) => rows().find((r) => matches(r, where)) ?? null),
    findMany: jest.fn(async ({ where }: any = {}) => rows().filter((r) => matches(r, where))),
    create: jest.fn(async ({ data }: any) => {
      const row = { id: nextId++, createdAt: new Date(), ...DEFAULTS[name], ...data };
      rows().push(row);
      return row;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const row = rows().find((r) => matches(r, where));
      if (!row) throw new Error('fake prisma: record not found');
      Object.assign(row, data);
      return row;
    }),
    updateMany: jest.fn(async ({ where, data }: any) => {
      const hit = rows().filter((r) => matches(r, where));
      hit.forEach((r) => Object.assign(r, data));
      return { count: hit.length };
    }),
  };
}

const mockPrisma: any = {
  userSession: model('userSession'),
  refreshToken: model('refreshToken'),
  $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(mockPrisma) : Promise.all(arg))),
};

jest.mock('../../../packages/database/src/client', () => ({ prisma: mockPrisma }));

import {
  createUserSession,
  getSessionStatus,
  invalidateAllUserSessions,
} from '../../../packages/database/src/sessions';
import { createRefreshToken, rotateRefreshToken, hashToken } from '../../../packages/database/src/refresh-tokens';

const T0 = new Date('2026-10-08T03:00:00.000Z').getTime();
let clock = T0;

function tick(ms = 1000) {
  clock += ms;
  jest.setSystemTime(clock);
}

const webLogin = () => createUserSession(1, 'ip', 'Mozilla/5.0', 7, { platform: 'web' } as any);
const mobileLogin = () => createUserSession(1, 'ip', 'okhttp/4.12.0', 30, { absoluteDays: 90, platform: 'mobile' } as any);

function tokenRow(token: string) {
  return store.refreshToken.find((r) => r.tokenHash === hashToken(token))!;
}

describe('one phone and one web session per account (#660)', () => {
  beforeEach(() => {
    store.userSession = [];
    store.refreshToken = [];
    nextId = 1;
    clock = T0;
    jest.useFakeTimers().setSystemTime(clock);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stores the platform on the new session', async () => {
    const web = await webLogin();
    expect(store.userSession.find((s) => s.sessionId === web.sessionId)!.platform).toBe('web');
  });

  it('web then mobile: both sessions stay active', async () => {
    const web = await webLogin();
    tick();
    const mobile = await mobileLogin();

    await expect(getSessionStatus(web.sessionId)).resolves.toBe('active');
    await expect(getSessionStatus(mobile.sessionId)).resolves.toBe('active');
  });

  it('mobile then web: the phone refresh token is not revoked and still rotates', async () => {
    const mobile = await mobileLogin();
    const refresh = await createRefreshToken(1, { deviceId: 'd1', sessionId: mobile.sessionId });
    tick();
    await webLogin();

    expect(tokenRow(refresh).isRevoked).toBe(false);
    const rotation = await rotateRefreshToken(refresh);
    expect(rotation).toEqual(expect.objectContaining({ userId: 1, sessionId: mobile.sessionId }));
    await expect(getSessionStatus(mobile.sessionId)).resolves.toBe('active');
  });

  it('a second web login replaces the first web session; the phone keeps working', async () => {
    const web1 = await webLogin();
    tick();
    const mobile = await mobileLogin();
    const refresh = await createRefreshToken(1, { sessionId: mobile.sessionId });
    tick();
    const web2 = await webLogin();

    await expect(getSessionStatus(web1.sessionId)).resolves.toBe('replaced');
    await expect(getSessionStatus(web2.sessionId)).resolves.toBe('active');
    await expect(getSessionStatus(mobile.sessionId)).resolves.toBe('active');
    expect(tokenRow(refresh).isRevoked).toBe(false);
  });

  it('a second phone login replaces the first phone session and revokes its refresh token; web keeps working', async () => {
    const mobile1 = await mobileLogin();
    const refresh1 = await createRefreshToken(1, { sessionId: mobile1.sessionId });
    tick();
    const web = await webLogin();
    tick();
    const mobile2 = await mobileLogin();

    await expect(getSessionStatus(mobile1.sessionId)).resolves.toBe('replaced');
    await expect(getSessionStatus(mobile2.sessionId)).resolves.toBe('active');
    await expect(getSessionStatus(web.sessionId)).resolves.toBe('active');
    expect(tokenRow(refresh1).isRevoked).toBe(true);
  });

  it('pre-#660 sessions (platform NULL) are replaced by any login, as today', async () => {
    const old = await createUserSession(1, 'ip', 'ua', 30, { absoluteDays: 90 });
    const oldRefresh = await createRefreshToken(1, { sessionId: old.sessionId });
    tick();
    await webLogin();

    await expect(getSessionStatus(old.sessionId)).resolves.toBe('replaced');
    expect(tokenRow(oldRefresh).isRevoked).toBe(true);
  });

  it('refresh tokens with no session (pre-#343) are still revoked on login', async () => {
    const mobile = await mobileLogin();
    const unbound = await createRefreshToken(1, {});
    tick();
    await webLogin();

    expect(tokenRow(unbound).isRevoked).toBe(true);
    expect(store.userSession.find((s) => s.sessionId === mobile.sessionId)!.isActive).toBe(true);
  });

  it('a login with an unknown platform replaces every session and revokes every refresh token (today)', async () => {
    const web = await webLogin();
    tick();
    const mobile = await mobileLogin();
    const refresh = await createRefreshToken(1, { sessionId: mobile.sessionId });
    tick();
    const unknown = await createUserSession(1, 'ip', 'curl/8', 7, { platform: null } as any);

    await expect(getSessionStatus(web.sessionId)).resolves.toBe('replaced');
    await expect(getSessionStatus(mobile.sessionId)).resolves.toBe('replaced');
    await expect(getSessionStatus(unknown.sessionId)).resolves.toBe('active');
    expect(tokenRow(refresh).isRevoked).toBe(true);
  });

  it('password reset / admin lock (invalidateAllUserSessions) logs out web and phone', async () => {
    const web = await webLogin();
    tick();
    const mobile = await mobileLogin();
    tick();
    await invalidateAllUserSessions(1);

    await expect(getSessionStatus(web.sessionId)).resolves.toBe('expired');
    await expect(getSessionStatus(mobile.sessionId)).resolves.toBe('expired');
  });

  it('a phone logout at the same moment as a web login is not reported as replaced', async () => {
    const mobile = await mobileLogin();
    tick();
    const loginAt = new Date(clock);
    // Logout stamps invalidatedAt = now; a web login created at that same instant must not count.
    store.userSession.find((s) => s.sessionId === mobile.sessionId)!.isActive = false;
    store.userSession.find((s) => s.sessionId === mobile.sessionId)!.invalidatedAt = loginAt;
    await webLogin();

    await expect(getSessionStatus(mobile.sessionId)).resolves.toBe('expired');
  });

  it('other users are never touched', async () => {
    const other = await createUserSession(2, 'ip', 'Mozilla/5.0', 7, { platform: 'web' } as any);
    const otherRefresh = await createRefreshToken(2, { sessionId: other.sessionId });
    tick();
    await webLogin();

    await expect(getSessionStatus(other.sessionId)).resolves.toBe('active');
    expect(tokenRow(otherRefresh).isRevoked).toBe(false);
  });
});

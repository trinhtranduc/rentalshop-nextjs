/**
 * Loads an API route handler from a source tree: this checkout by default, or another checkout
 * (e.g. `origin/main-real` via GOLDEN_ROOT) when generating golden responses. Everything the
 * response depends on (route, `@rentalshop/utils`, `@rentalshop/constants`, `apps/api/lib`) comes
 * from that tree; only I/O is replaced: auth passes the given user through, `db` / `prisma` are the
 * scenario's in-memory store, and uploads, audit, plan limits, loyalty and push are no-ops.
 */
import path from 'path';

export const THIS_ROOT = path.resolve(__dirname, '../..');

/** Where the route reads `db` and `prisma`; scenarios swap the store between requests */
export interface StoreHolder {
  db: any;
  prisma: any;
}

export interface RouteResponse {
  status: number;
  body: any;
}

/** Plain JSON, as the API sends it (Dates become ISO strings, undefined keys disappear) */
const json = (value: unknown) => JSON.parse(JSON.stringify(value));

export function loadRoute(routeDir: string, holder: StoreHolder, root = THIS_ROOT): Record<string, any> {
  const pkg = (name: string) => path.join(root, 'packages', name, 'src');
  const lib = (name: string) => path.join(root, 'apps/api/lib', name);

  jest.resetModules();
  jest.doMock('next/server', () => ({
    NextResponse: {
      json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, body: json(body) }),
    },
    NextRequest: class {},
  }));
  jest.doMock('@rentalshop/auth/server', () => ({
    withPermissions: () => (handler: any) => handler,
  }));
  jest.doMock('@rentalshop/database', () => ({
    get db() {
      return holder.db;
    },
    get prisma() {
      return holder.prisma;
    },
    updateOutletStockForOrder: async () => undefined,
  }));
  jest.doMock('@rentalshop/constants', () => jest.requireActual(pkg('constants')));
  // React badge / label helpers (JSX) are never used by the API routes; the test project has no JSX setup
  for (const tsx of ['badge-utils', 'product-utils', 'user-utils', 'customer-utils']) {
    jest.doMock(path.join(pkg('utils'), 'core', tsx), () => ({}));
  }
  // Client-only hooks re-exported by the utils index (ESM packages); never called on the API
  jest.doMock('next-intl', () => ({}));
  jest.doMock('@rentalshop/utils', () => jest.requireActual(pkg('utils')));
  jest.doMock('@rentalshop/utils/server', () => ({
    checkPlanLimitIfNeeded: async () => null,
    createAuditHelper: () => ({ logCreate: async () => undefined, logUpdate: async () => undefined }),
    uploadToS3: async () => ({ success: false }),
    commitStagingFiles: async () => ({ success: true, committedKeys: [] }),
  }));
  jest.doMock('@rentalshop/loyalty', () => ({
    calculateAmountDue: jest.requireActual(path.join(pkg('loyalty'), 'earn')).calculateAmountDue,
    handleLoyaltyOnOrderCreate: async (order: any) => order,
    merchantHasLoyaltyFeature: async () => false,
  }));
  jest.doMock(lib('image-compression'), () => ({
    compressImageTo1MB: async (b: Buffer) => b,
    bodyExceedsNoteImageLimit: () => false,
    exceedsNoteImageLimit: () => false,
  }));
  jest.doMock(lib('push-notifications'), () => ({ notifyOutletOrderEvent: () => undefined }));

  return require(path.join(root, 'apps/api/app/api', routeDir, 'route'));
}

/** A request as the route reads it: URL, headers, JSON body */
export function request(url: string, init: { body?: unknown; headers?: Record<string, string> } = {}) {
  const headers = new Map(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  if (init.body !== undefined && !headers.has('content-type')) headers.set('content-type', 'application/json');
  return {
    url: `https://api.test${url}`,
    headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
    json: async () => json(init.body),
  };
}

/** Runs `fn` with console output silenced (the routes log every request) */
export async function quietly<T>(fn: () => Promise<T>): Promise<T> {
  const saved = { log: console.log, info: console.info, warn: console.warn, error: console.error };
  console.log = console.info = console.warn = console.error = () => undefined;
  try {
    return await fn();
  } finally {
    Object.assign(console, saved);
  }
}

/** Freezes `new Date()` at `now` without faking timers that promises rely on */
export function freezeClock(now: Date) {
  jest.useFakeTimers({
    now,
    doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'queueMicrotask', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'hrtime', 'performance'],
  });
}

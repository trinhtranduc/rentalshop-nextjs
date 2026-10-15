import { AsyncLocalStorage } from 'node:async_hooks';
import * as http from 'http';

/**
 * Binds the Node request so API `message` can follow Accept-Language (#986).
 * Imported only from the server entry. The browser bundle does not load this file.
 *
 * `headers()` from `next/headers` is not used here: a second copy of that module
 * has an empty request store, the call throws, and every sentence would stay Vietnamese.
 * The route bundle reads this same store from `globalThis`.
 */
const REQUEST_STORE = Symbol.for('rentalshop.apiMessageRequest');
const HTTP_PATCH = Symbol.for('rentalshop.apiMessageHttpPatch');

type HeaderBag = { headers?: Record<string, string | string[] | undefined> };

function requestStore(): AsyncLocalStorage<HeaderBag> {
  const g = globalThis as typeof globalThis & { [REQUEST_STORE]?: AsyncLocalStorage<HeaderBag> };
  if (!g[REQUEST_STORE]) g[REQUEST_STORE] = new AsyncLocalStorage();
  return g[REQUEST_STORE];
}

/** Call once when the API process starts, before it accepts connections. */
export function installApiMessageLocale(): void {
  const g = globalThis as typeof globalThis & { [HTTP_PATCH]?: boolean };
  if (g[HTTP_PATCH]) return;
  g[HTTP_PATCH] = true;
  const store = requestStore();
  // Node's `emit` overloads collapse to the last event (`upgrade`) when overridden directly.
  const serverProto = http.Server.prototype as unknown as {
    emit: (this: unknown, event: string | symbol, ...args: unknown[]) => boolean;
  };
  const original = serverProto.emit;
  serverProto.emit = function (this: unknown, event: string | symbol, ...args: unknown[]) {
    const req = args[0] as HeaderBag | undefined;
    if (event === 'request' && req && req.headers) {
      return store.run(req, () => original.call(this, event, ...args));
    }
    return original.call(this, event, ...args);
  };
}

/** Run `fn` as if an HTTP request with these headers were in progress. */
export function withApiMessageRequest<T>(
  headers: Record<string, string | string[] | undefined>,
  fn: () => T,
): T {
  return requestStore().run({ headers }, fn);
}

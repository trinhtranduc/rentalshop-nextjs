/**
 * Client capabilities (#1200): which new behaviours the caller understands.
 *
 * A client sends `X-Client-Capabilities: installments, block-pricing` (comma-separated tokens, any case).
 * No header, an empty header or an unusable value = no capability = an old client (the iOS / Android
 * builds installed on `main-real` never send it). Server code gives old clients the response they
 * decode today and gives a capable client the new data.
 *
 * Self-contained on purpose (no workspace import): route tests mock `@rentalshop/utils`.
 */

export const CLIENT_CAPABILITIES_HEADER = 'x-client-capabilities';

/** Tokens the server knows. Add a token here in the PR that ships the behaviour. */
export type ClientCapability = 'installments' | 'block-pricing';

interface HeaderSource {
  get(name: string): string | null;
}

const TOKEN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const MAX_TOKENS = 32;

/** Lower-cased valid tokens of the request header; never throws. */
export function getClientCapabilities(request: { headers?: HeaderSource | null } | null | undefined): Set<string> {
  const result = new Set<string>();
  try {
    const raw = request?.headers?.get(CLIENT_CAPABILITIES_HEADER);
    if (typeof raw !== 'string' || raw.length === 0 || raw.length > 1024) return result;
    for (const part of raw.split(',')) {
      const token = part.trim().toLowerCase();
      if (TOKEN.test(token)) result.add(token);
      if (result.size >= MAX_TOKENS) break;
    }
  } catch {
    return new Set<string>();
  }
  return result;
}

export function hasCapability(
  request: { headers?: HeaderSource | null } | null | undefined,
  capability: ClientCapability
): boolean {
  return getClientCapabilities(request).has(capability);
}

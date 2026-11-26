/**
 * #1665 SEO Agent Hub connector: the site key.
 *
 * AnyRent keeps only the SHA-256 of the key (`SEO_CONNECTOR_KEY_SHA256`, 64 hex characters); the real key (`sk_` + 32 random
 * bytes) is pasted into the Hub, which stores it encrypted. The comparison is constant-time. No env value = nobody gets in.
 */
import { createHash, timingSafeEqual } from 'node:crypto';

/** `Authorization: Bearer <key>` against the stored fingerprint. */
export function keyOk(authorization: string | null | undefined, fingerprintHex: string | undefined = process.env.SEO_CONNECTOR_KEY_SHA256): boolean {
  const expected = (fingerprintHex ?? '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expected)) return false;
  const given = (authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!given) return false;
  const a = createHash('sha256').update(given).digest();
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The fingerprint to store for a key (used by the tests and the setup note). */
export function keyFingerprint(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

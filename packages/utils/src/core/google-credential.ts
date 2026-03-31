/**
 * Decode Google Sign-In JWT credential payload (client-side preview only).
 * Server must always verify the full token.
 */
export function decodeGoogleCredentialPayload(jwt: string): {
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  sub?: string;
} | null {
  if (typeof jwt !== 'string' || !jwt.includes('.')) return null;
  try {
    const part = jwt.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    let json: string;
    if (typeof atob === 'function') {
      json = atob(base64);
    } else if (typeof Buffer !== 'undefined') {
      json = Buffer.from(base64, 'base64').toString('utf8');
    } else {
      return null;
    }
    return JSON.parse(json);
  } catch {
    return null;
  }
}

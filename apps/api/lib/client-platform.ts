/**
 * Which session slot a login takes (#660): an account keeps one phone session and one web session.
 *
 * 1. `X-Client-Platform`: `web` → web; `mobile` (iOS BaseService, Android ApiClient), `ios`, `android` → mobile.
 * 2. `User-Agent` of installed apps and browsers.
 * 3. Otherwise null: the login replaces every session, as before #660.
 *
 * Token lifetimes are not decided here (see platform-detector.ts).
 */

export type ClientSessionPlatform = 'web' | 'mobile';

interface HeaderSource {
  get(name: string): string | null;
}

const MOBILE_HEADER_VALUES = new Set(['mobile', 'ios', 'android']);

// Apps: our own iOS User-Agent, URLSession (CFNetwork/Darwin), Alamofire default, OkHttp default, Android Dalvik
const MOBILE_APP_UA = /^AnyRent-(iOS|Android)\/|\bCFNetwork\/|\bDarwin\/|\bAlamofire\/|^okhttp\/|^Dalvik\//i;
const BROWSER_UA = /^Mozilla\//i;

export function detectClientPlatform(headers: HeaderSource): ClientSessionPlatform | null {
  const header = headers.get('x-client-platform')?.trim().toLowerCase();
  if (header === 'web') return 'web';
  if (header && MOBILE_HEADER_VALUES.has(header)) return 'mobile';

  const userAgent = headers.get('user-agent')?.trim() || '';
  if (MOBILE_APP_UA.test(userAgent)) return 'mobile';
  if (BROWSER_UA.test(userAgent)) return 'web';
  return null;
}

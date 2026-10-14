/**
 * Issue #660 — the platform a login counts as (one web + one phone session per account).
 * X-Client-Platform first, then the User-Agent of installed apps and browsers. Unknown = null.
 */

import { detectClientPlatform } from '../../apps/api/lib/client-platform';

function headers(values: Record<string, string>) {
  const lower = Object.fromEntries(Object.entries(values).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (name: string) => lower[name.toLowerCase()] ?? null };
}

describe('detectClientPlatform (#660)', () => {
  it.each([
    ['web', 'web'],
    ['WEB', 'web'],
    ['mobile', 'mobile'], // iOS BaseService.jsonHeader and Android applyAuth today
    ['ios', 'mobile'],
    ['android', 'mobile'],
  ])('X-Client-Platform %s → %s', (header, expected) => {
    expect(detectClientPlatform(headers({ 'X-Client-Platform': header, 'User-Agent': 'curl/8' }))).toBe(expected);
  });

  it('the header wins over the User-Agent', () => {
    expect(
      detectClientPlatform(headers({ 'X-Client-Platform': 'web', 'User-Agent': 'okhttp/4.12.0' }))
    ).toBe('web');
  });

  it.each([
    // iOS app (BaseService overrides the User-Agent)
    ['AnyRent-iOS/1.0.0', 'mobile'],
    // Alamofire default (older iOS builds without the override)
    ['POS ADBD/1.1.3 (com.anyrent; build:12; iOS 17.5.1) Alamofire/5.9.1', 'mobile'],
    // URLSession default
    ['POS%20ADBD/12 CFNetwork/1494.0.7 Darwin/23.4.0', 'mobile'],
    // Android app: OkHttp default, no custom User-Agent in ApiClient
    ['okhttp/4.12.0', 'mobile'],
    // Android system HTTP stack
    ['Dalvik/2.1.0 (Linux; U; Android 14; Pixel 7 Build/UQ1A.240205.004)', 'mobile'],
    // Browsers, including a phone browser on the web app
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36', 'web'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', 'web'],
  ])('User-Agent %s → %s', (ua, expected) => {
    expect(detectClientPlatform(headers({ 'User-Agent': ua }))).toBe(expected);
  });

  it.each([['curl/8.7.1'], ['PostmanRuntime/7.39.0'], ['']])('unknown User-Agent %p → null', (ua) => {
    expect(detectClientPlatform(headers(ua ? { 'User-Agent': ua } : {}))).toBeNull();
  });

  it('an unknown header value falls back to the User-Agent', () => {
    expect(detectClientPlatform(headers({ 'X-Client-Platform': 'tv', 'User-Agent': 'okhttp/4.12.0' }))).toBe('mobile');
    expect(detectClientPlatform(headers({ 'X-Client-Platform': 'tv', 'User-Agent': 'curl/8' }))).toBeNull();
  });
});

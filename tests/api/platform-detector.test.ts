/**
 * Issue #343 — Android builds in the field send no X-Client-Platform header and
 * OkHttp's default User-Agent; they must still be detected as mobile.
 */

import { detectPlatform } from '../../apps/api/lib/platform-detector';

function req(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/auth/login', { headers });
}

describe('detectPlatform (#343)', () => {
  it('detects OkHttp without platform header as mobile/android', () => {
    const info = detectPlatform(req({ 'User-Agent': 'okhttp/4.12.0' }));
    expect(info.platform).toBe('mobile');
    expect(info.deviceType).toBe('android');
  });

  it('keeps the explicit header first', () => {
    const info = detectPlatform(req({ 'X-Client-Platform': 'mobile', 'X-Device-Type': 'ios', 'User-Agent': 'AnyRent-iOS/1.0.0' }));
    expect(info.platform).toBe('mobile');
    expect(info.deviceType).toBe('ios');
  });

  it('keeps desktop browsers as web', () => {
    const info = detectPlatform(req({ 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15' }));
    expect(info.platform).toBe('web');
  });
});

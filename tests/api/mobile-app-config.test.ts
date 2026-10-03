/**
 * #362 — GET /api/mobile/app-config: minimum app version and screen flags for iOS and Android.
 * Public, env-driven; the defaults never force an update and keep every new screen off.
 */
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: any) => ({ body, status: init?.status || 200, headers: init?.headers || {} }),
  },
}));
jest.mock('@rentalshop/utils', () => ({
  ResponseBuilder: { success: (code: string, data: any) => ({ success: true, code, data }) },
  handleApiError: (e: any) => ({ response: { success: false, message: String(e) }, statusCode: 500 }),
}));

import { GET } from '../../apps/api/app/api/mobile/app-config/route';
import { buildMobileAppConfig, MOBILE_FEATURE_KEYS } from '../../apps/api/lib/mobile-app-config';

const ENV_KEYS = [
  'IOS_MIN_VERSION', 'IOS_LATEST_VERSION', 'IOS_STORE_URL',
  'ANDROID_MIN_VERSION', 'ANDROID_LATEST_VERSION', 'ANDROID_STORE_URL', 'MOBILE_FEATURES',
];

describe('mobile app-config (#362)', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });
  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it('defaults never force an update and keep every feature off', () => {
    const config = buildMobileAppConfig({});
    expect(config.ios.minVersion).toBe('0.0.0');
    expect(config.android.minVersion).toBe('0.0.0');
    expect(config.android.storeUrl).toBe('https://play.google.com/store/apps/details?id=anyrent.shop');
    expect(config.ios.storeUrl).toBeNull();
    expect(Object.keys(config.features).sort()).toEqual([...MOBILE_FEATURE_KEYS].sort());
    expect(Object.values(config.features).every((on) => on === false)).toBe(true);
  });

  it('uses the env values', () => {
    const config = buildMobileAppConfig({
      IOS_MIN_VERSION: '1.2.0',
      IOS_LATEST_VERSION: '1.3.1',
      IOS_STORE_URL: 'https://apps.apple.com/app/id123',
      ANDROID_MIN_VERSION: '0.2.0',
      ANDROID_LATEST_VERSION: '0.2.4',
    });
    expect(config.ios).toEqual({ minVersion: '1.2.0', latestVersion: '1.3.1', storeUrl: 'https://apps.apple.com/app/id123' });
    expect(config.android.minVersion).toBe('0.2.0');
    expect(config.android.latestVersion).toBe('0.2.4');
  });

  it('falls back to the default for a malformed version', () => {
    expect(buildMobileAppConfig({ IOS_MIN_VERSION: 'latest' }).ios.minVersion).toBe('0.0.0');
    expect(buildMobileAppConfig({ ANDROID_MIN_VERSION: '1.2' }).android.minVersion).toBe('0.0.0');
  });

  it('turns on only known feature keys from MOBILE_FEATURES', () => {
    const { features } = buildMobileAppConfig({ MOBILE_FEATURES: ' newOrders, unknown ,newCalendar' });
    expect(features.newOrders).toBe(true);
    expect(features.newCalendar).toBe(true);
    expect(features.newOverview).toBe(false);
    expect((features as any).unknown).toBeUndefined();
  });

  it('GET answers without auth, with a short public cache', async () => {
    process.env.MOBILE_FEATURES = 'newOrders';
    const res: any = await GET();
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ success: true, code: 'APP_CONFIG_SUCCESS' }));
    expect(res.body.data.features.newOrders).toBe(true);
    expect(res.headers['Cache-Control']).toBe('public, max-age=300');
  });
});

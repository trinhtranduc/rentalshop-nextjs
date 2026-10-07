/**
 * Mobile app config (#362): the minimum app version each platform must run, the latest version in the
 * stores, and which new screens are switched on. Read from env on every request so a change needs only a
 * Railway variable update. Defaults never force an update.
 *
 * Screens (`MOBILE_FEATURES`, #456): unset or blank → every new screen on; `none` → every new screen off;
 * otherwise a comma-separated list of keys to turn on (staged rollout / kill switch). Unknown keys are ignored.
 */

export const MOBILE_FEATURE_KEYS = [
  'newOrders',
  'newOrderDetail',
  'newProducts',
  'newCalendar',
  'newOverview',
  'newSettings',
  'newAuth',
  'newCustomers',
] as const;

export type MobileFeatureKey = (typeof MOBILE_FEATURE_KEYS)[number];

export interface MobilePlatformConfig {
  minVersion: string;
  latestVersion: string;
  storeUrl: string | null;
}

export interface MobileAppConfig {
  ios: MobilePlatformConfig;
  android: MobilePlatformConfig;
  features: Record<MobileFeatureKey, boolean>;
}

const DEFAULT_MIN_VERSION = '0.0.0';
const DEFAULT_IOS_LATEST_VERSION = '1.1.3';
const DEFAULT_ANDROID_LATEST_VERSION = '0.1.3';
const DEFAULT_ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=anyrent.shop';

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

function version(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && VERSION_PATTERN.test(trimmed) ? trimmed : fallback;
}

function url(value: string | undefined, fallback: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed && /^https?:\/\//.test(trimmed) ? trimmed : fallback;
}

/** Keys switched on by `MOBILE_FEATURES` (#456): unset/blank → all, `none` → none, else the listed keys */
function enabledFeatures(value: string | undefined): Set<string> {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return new Set(MOBILE_FEATURE_KEYS);
  if (trimmed.toLowerCase() === 'none') return new Set();
  return new Set(
    trimmed
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean)
  );
}

export function buildMobileAppConfig(env: Record<string, string | undefined> = process.env): MobileAppConfig {
  const enabled = enabledFeatures(env.MOBILE_FEATURES);
  const features = Object.fromEntries(
    MOBILE_FEATURE_KEYS.map((key) => [key, enabled.has(key)])
  ) as Record<MobileFeatureKey, boolean>;

  return {
    ios: {
      minVersion: version(env.IOS_MIN_VERSION, DEFAULT_MIN_VERSION),
      latestVersion: version(env.IOS_LATEST_VERSION, DEFAULT_IOS_LATEST_VERSION),
      storeUrl: url(env.IOS_STORE_URL, null),
    },
    android: {
      minVersion: version(env.ANDROID_MIN_VERSION, DEFAULT_MIN_VERSION),
      latestVersion: version(env.ANDROID_LATEST_VERSION, DEFAULT_ANDROID_LATEST_VERSION),
      storeUrl: url(env.ANDROID_STORE_URL, DEFAULT_ANDROID_STORE_URL),
    },
    features,
  };
}

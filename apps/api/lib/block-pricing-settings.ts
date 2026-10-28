/** `Merchant.settings.blockPricing.oldApps` (#1189): what the server does with a day-block line from an app that does not know it */
export type OldAppsMode = 'recompute' | 'block';

/** Anything but 'block' is 'recompute' (the default) */
export function readOldAppsMode(settings: unknown): OldAppsMode {
  const mode = (settings as { blockPricing?: { oldApps?: unknown } } | null | undefined)?.blockPricing?.oldApps;
  return mode === 'block' ? 'block' : 'recompute';
}

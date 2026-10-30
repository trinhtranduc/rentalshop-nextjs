/**
 * `Merchant.settings.shareOrderNote` (#1344): the shop shows the order's own note at the bottom of the shared order
 * image (iOS / Android draw the image). Only the shop owner changes it. Anything but `true` is OFF, so every shop
 * that never set it keeps the image it has today.
 */
export function readShareOrderNote(settings: unknown): boolean {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return false;
  return (settings as { shareOrderNote?: unknown }).shareOrderNote === true;
}

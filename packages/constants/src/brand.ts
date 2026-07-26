/** AnyRent brandmark (AR monogram ribbon) — matches iOS app icon */
export const ANYRENT_BRANDMARK_PATH = '/anyrent-brandmark-ribbon.png';

export const ANYRENT_BRAND_NAME = 'AnyRent';

export function getAnyRentLogoUrl(baseUrl?: string): string {
  const base = (baseUrl || process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop').replace(
    /\/$/,
    ''
  );
  return `${base}${ANYRENT_BRANDMARK_PATH}`;
}

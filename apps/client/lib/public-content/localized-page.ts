import { notFound } from 'next/navigation';
import { isPublicLocale, type PublicLocale } from '@rentalshop/constants';

/** #1114: `/{locale}/{page}` for the 11 prefixed public locales; Vietnamese keeps its own URLs, a shop key is 404 */
export function localizedPageLocale(tenantKey: string): PublicLocale {
  if (!isPublicLocale(tenantKey) || tenantKey === 'vi') notFound();
  return tenantKey;
}

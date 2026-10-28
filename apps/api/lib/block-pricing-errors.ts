import { ResponseBuilder } from '@rentalshop/utils';

/**
 * #1189 error answers of the order routes. `PRICING_TYPE_REQUIRES_UPDATE` leaves `error` empty: Android prefers
 * `error` over `message` (ApiClient.kt:1302-1325), and the sentence must reach the staff of an old app as `message`.
 */
export function blockPricingErrorResponse(code: string) {
  const body = ResponseBuilder.error(code);
  return code === 'PRICING_TYPE_REQUIRES_UPDATE' ? { ...body, error: '' } : body;
}

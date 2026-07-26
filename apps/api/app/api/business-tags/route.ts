import { NextResponse } from 'next/server';
import { BUSINESS_TAG_OPTIONS } from '@rentalshop/constants';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';

/**
 * GET /api/business-tags
 * Public catalog of niche rental tags for signup / settings UIs.
 * Clients should localize labels using the stable `value` key.
 */
export async function GET() {
  try {
    return NextResponse.json(
      ResponseBuilder.success('BUSINESS_TAGS_RETRIEVED', {
        tags: BUSINESS_TAG_OPTIONS.map((tag) => ({
          value: tag.value,
          label: tag.label,
          businessType: tag.businessType,
        })),
      })
    );
  } catch (error) {
    console.error('Error fetching business tags:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

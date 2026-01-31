import { NextRequest, NextResponse } from 'next/server';
import { withAnyAuth } from '@rentalshop/auth';
import { 
  generateProductSampleFile, 
  handleApiError, 
  ResponseBuilder 
} from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * GET /api/import/sample/products
 * Download sample Product Excel file for import
 * 
 * Authorization: Any authenticated user
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const GET = withApiLogging(
  withAnyAuth(async (request: NextRequest) => {
    try {
    const buffer = generateProductSampleFile();
    const filename = `products-import-sample-${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(buffer as any, {
      status: API.STATUS.OK,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })
);


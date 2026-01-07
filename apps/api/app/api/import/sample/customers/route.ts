import { NextRequest, NextResponse } from 'next/server';
import { withAnyAuth } from '@rentalshop/auth';
import { 
  generateCustomerSampleFile, 
  handleApiError, 
  ResponseBuilder 
} from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/import/sample/customers
 * Download sample Customer Excel file for import
 * 
 * Authorization: Any authenticated user
 */
export const GET = withAnyAuth(async (request: NextRequest) => {
  try {
    const buffer = generateCustomerSampleFile();
    const filename = `customers-import-sample-${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(buffer as any, {
      status: API.STATUS.OK,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Error generating customer sample file:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});


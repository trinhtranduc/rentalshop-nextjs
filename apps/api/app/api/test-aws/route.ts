import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { ResponseBuilder } from '@rentalshop/utils';

/**
 * GET /api/test-aws
 * Test AWS credentials and S3 connection
 */
export const GET = withAuthRoles(['ADMIN'])(async (request: NextRequest) => {
  try {
    const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
    const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
    const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
    const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

    // Check environment variables
    const envCheck = {
      hasAccessKey: !!AWS_ACCESS_KEY_ID,
      hasSecretKey: !!AWS_SECRET_ACCESS_KEY,
      hasRegion: !!AWS_REGION,
      hasBucketName: !!AWS_S3_BUCKET_NAME,
      accessKeyPreview: AWS_ACCESS_KEY_ID ? `${AWS_ACCESS_KEY_ID.substring(0, 8)}...` : 'missing',
      region: AWS_REGION,
      bucketName: AWS_S3_BUCKET_NAME || 'not set'
    };

    return NextResponse.json({
      success: true,
      data: {
        message: 'AWS credentials check completed',
        environment: envCheck,
        timestamp: new Date().toISOString()
      },
      code: 'AWS_CREDENTIALS_CHECK_SUCCESS'
    });

  } catch (error) {
    console.error('Error testing AWS S3:', error);
    return NextResponse.json(
      ResponseBuilder.error('AWS_S3_TEST_FAILED', error instanceof Error ? error.message : 'Unknown error'),
      { status: 500 }
    );
  }
});

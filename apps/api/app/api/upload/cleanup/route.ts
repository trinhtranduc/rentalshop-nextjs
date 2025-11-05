import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { ResponseBuilder, cleanupStagingFiles } from '@rentalshop/utils/api';

/**
 * POST /api/upload/cleanup
 * Clean up orphaned staging files (when user uploads but doesn't create product)
 */
export const POST = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request: NextRequest) => {
  try {
    const body = await request.json();
    
    // Expected format: { stagingKeys: ['staging/file1.jpg', 'staging/file2.jpg'] }
    if (!body.stagingKeys || !Array.isArray(body.stagingKeys)) {
      return NextResponse.json(
        ResponseBuilder.error('MISSING_STAGING_KEYS'),
        { status: 400 }
      );
    }

    const stagingKeys = body.stagingKeys.filter((key: string) => 
      typeof key === 'string' && key.startsWith('staging/')
    );

    if (stagingKeys.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          deletedCount: 0,
          message: 'No valid staging keys provided'
        },
        code: 'NO_CLEANUP_NEEDED'
      });
    }

    console.log('🧹 Cleaning up staging files:', stagingKeys);

    const result = await cleanupStagingFiles(stagingKeys);

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
        totalRequested: stagingKeys.length,
        errors: result.errors,
        success: result.success
      },
      code: 'STAGING_CLEANUP_COMPLETED',
      message: `Cleaned up ${result.deletedCount} staging files`
    });

  } catch (error) {
    console.error('Error cleaning up staging files:', error);
    return NextResponse.json(
      ResponseBuilder.error('CLEANUP_FAILED', error instanceof Error ? error.message : 'Unknown error'),
      { status: 500 }
    );
  }
});

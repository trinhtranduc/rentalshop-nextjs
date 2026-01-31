import { NextRequest, NextResponse } from 'next/server';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * GET /api/system/api-keys/test
 * Test endpoint for API keys functionality
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export async function GET(request: NextRequest) {
  return withApiLogging(async (request: NextRequest) => {
    return NextResponse.json({
      success: true,
      code: 'API_KEYS_WORKING',
      message: 'API Keys endpoint is working!',
      data: {
        endpoint: '/api/system/api-keys',
        methods: ['GET', 'POST'],
        description: 'Manage API keys for system access',
        authentication: 'Bearer token required',
        permissions: 'ADMIN or MERCHANT role required'
      }
    });
  })(request);
}

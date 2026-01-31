import { NextRequest, NextResponse } from 'next/server';
import { comprehensiveSwaggerConfig } from '../../../lib/swagger/comprehensive';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * GET /api/docs
 * Get Swagger/OpenAPI documentation
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export async function GET(request: NextRequest) {
  return withApiLogging(async (request: NextRequest) => {
    const specs = comprehensiveSwaggerConfig;
    return NextResponse.json(specs);
  })(request);
} 

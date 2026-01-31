import { NextRequest, NextResponse } from 'next/server';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * Simple health check endpoint for Railway deployment
 * Returns 200 OK if the server is running
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const GET = withApiLogging(async (request: NextRequest) => {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  }, { status: 200 });
});


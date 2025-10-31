import { NextResponse } from 'next/server';

/**
 * Simple health check endpoint for Railway deployment
 * Returns 200 OK if the server is running
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  }, { status: 200 });
}


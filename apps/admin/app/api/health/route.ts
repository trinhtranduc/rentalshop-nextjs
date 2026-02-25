import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Vercel deployment
 * This ensures at least one serverless function is built
 * 
 * CRITICAL: Force dynamic rendering to ensure Vercel detects this as serverless function
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(
    { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'admin'
    },
    { status: 200 }
  );
}

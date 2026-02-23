import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Vercel deployment
 * This ensures at least one serverless function is built
 * 
 * Force dynamic rendering to ensure this is built as a serverless function
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

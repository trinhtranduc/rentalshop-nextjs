import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Vercel deployment
 * This ensures at least one serverless function is built
 * 
 * Simple API route - Vercel automatically builds API routes as serverless functions
 * 
 * CRITICAL: This route must exist for Vercel to detect serverless functions
 * Without at least one serverless function, Vercel will fail with:
 * "Error: No serverless pages were built"
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

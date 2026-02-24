import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Vercel deployment
 * This ensures at least one serverless function is built
 * 
 * Simple API route - Vercel automatically builds API routes as serverless functions
 */
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

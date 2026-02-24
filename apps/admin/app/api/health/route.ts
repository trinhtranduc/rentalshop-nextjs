import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Health check endpoint for Vercel deployment
 * This ensures at least one serverless function is built
 * 
 * Force dynamic rendering to ensure this is built as a serverless function.
 * Perform actual server-side work (reading cookies) to ensure it's not optimized away.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  // Perform actual server-side work to ensure this is a serverless function
  const cookieStore = await cookies();
  const hasAuth = cookieStore.has('auth-token');
  
  return NextResponse.json(
    { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'admin',
      authenticated: hasAuth
    },
    { status: 200 }
  );
}

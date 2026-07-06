import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/cron/embedding-jobs
 * DISABLED: Python embedding service removed. Feature is work in progress.
 */
export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    code: 'FEATURE_DISABLED',
    message: 'Embedding jobs disabled. Python service removed.',
    data: null
  }, { status: 503 });
}

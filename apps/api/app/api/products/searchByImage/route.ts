/**
 * POST /api/products/searchByImage
 * DISABLED: Feature is work in progress. Python embedding service removed.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    code: 'FEATURE_DISABLED',
    message: 'Image search is currently work in progress. This feature will be available in a future update.',
    data: null
  }, { status: 503 });
}

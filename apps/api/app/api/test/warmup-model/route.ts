import { NextRequest, NextResponse } from 'next/server';
import { ResponseBuilder } from '@rentalshop/utils';
import { withApiLogging } from '@/lib/api-logging-wrapper';

// Force dynamic rendering to prevent Next.js from collecting page data during build
// This prevents Next.js from trying to load native dependencies (onnxruntime-node) during build
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/test/warmup-model
 * Warm-up the ML model to pre-load it and avoid issue #1135 (promise hanging)
 * 
 * This endpoint can be called:
 * 1. During server startup (via start.sh or init script)
 * 2. Manually via API call
 * 3. As a health check to ensure model is ready
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const POST = withApiLogging(async (request: NextRequest) => {
  try {
    // Lazy import to prevent Next.js from loading during build
    const { warmUpModel } = await import('@rentalshop/database/server');
    
    // Warm-up model with 120 second timeout
    await warmUpModel(120000);
    
    return NextResponse.json(
      ResponseBuilder.success('MODEL_WARMUP_SUCCESS', {
        message: 'Model warm-up completed successfully',
        timestamp: new Date().toISOString()
      })
    );
  } catch (error: any) {
    // Error will be automatically logged by withApiLogging wrapper
    return NextResponse.json(
      ResponseBuilder.error('MODEL_WARMUP_FAILED'),
      { status: 500 }
    );
  }
});

/**
 * GET /api/test/warmup-model
 * Check if model is already loaded (quick check)
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const GET = withApiLogging(async (request: NextRequest) => {
  try {
    // Try to get model (will return cached if already loaded)
    const { getEmbeddingService } = await import('@rentalshop/database/server');
    const service = getEmbeddingService();
    
    // Check if model is already loaded (non-blocking check)
    const isLoaded = (service as any).model !== undefined && (service as any).model !== null;
    
    return NextResponse.json(
      ResponseBuilder.success('MODEL_STATUS_CHECK', {
        isLoaded,
        message: isLoaded ? 'Model is already loaded' : 'Model is not loaded yet',
        timestamp: new Date().toISOString()
      })
    );
  } catch (error: any) {
    // Error will be automatically logged by withApiLogging wrapper
    return NextResponse.json(
      ResponseBuilder.error('MODEL_STATUS_CHECK_FAILED'),
      { status: 500 }
    );
  }
});

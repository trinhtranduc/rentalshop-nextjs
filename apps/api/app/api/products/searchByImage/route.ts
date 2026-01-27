/**
 * POST /api/products/searchByImage
 * Search products by uploading an image
 * 
 * ⚠️ TEMPORARILY SIMPLIFIED: Feature returns empty results to ensure app stability
 * TODO: Re-enable full ML functionality after fixing WASM backend initialization issues
 * 
 * Current behavior: Returns empty results without loading ML model
 * This allows frontend to work without crashing while we fix the backend
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { ResponseBuilder } from '@rentalshop/utils';

// Force dynamic rendering to prevent Next.js from collecting page data
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ⚠️ TEMPORARILY DISABLED: Validation and ML logic commented out
// Will be re-enabled after fixing WASM backend initialization

/**
 * POST /api/products/searchByImage
 * Search products by image
 * 
 * ⚠️ TEMPORARILY SIMPLIFIED: Returns empty results without loading ML model
 * This allows frontend to work without crashing while we fix WASM backend
 * 
 * TODO: Re-enable full ML functionality after fixing WASM backend initialization
 */
export const POST = withPermissions(['products.view'], { requireActiveSubscription: false })(
  async (request: NextRequest, { user, userScope }) => {
    try {
      console.log(`🔍 POST /api/products/searchByImage - User: ${user.email} (${user.role})`);
      console.log('⚠️ Feature temporarily disabled - returning empty results');
      
      // ⚠️ TEMPORARILY DISABLED: Return empty results without loading ML model
      // This prevents app crashes while we fix WASM backend initialization
      // Will be re-enabled step by step after fixing the backend
      
      return NextResponse.json(
        ResponseBuilder.success('NO_PRODUCTS_FOUND', {
          products: [],
          total: 0,
          message: 'Tính năng tìm kiếm hình ảnh đang được bảo trì. Vui lòng thử lại sau.'
        })
      );
      
      /* TODO: Re-enable after fixing WASM backend
      // Parse form data
      const formData = await request.formData();
      const file = formData.get('image') as File;
      
      // ... full ML logic will be restored here ...
      */
    } catch (error: any) {
      console.error('❌ Error in image search:', error?.message);
      return NextResponse.json(
        ResponseBuilder.error('SERVICE_UNAVAILABLE'),
        { status: 503 }
      );
    }
  }
);

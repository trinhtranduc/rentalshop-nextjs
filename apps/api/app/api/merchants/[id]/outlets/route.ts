import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/merchants/[id]/outlets
 * Get merchant outlets
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  
  return withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
    try {
      if (isNaN(merchantPublicId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_MERCHANT_ID_FORMAT'),
          { status: 400 }
        );
      }

      // Find the merchant by id to get the actual CUID
      const merchant = await db.merchants.findById(merchantPublicId);

      if (!merchant) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Get outlets for this merchant
      const outlets = await db.outlets.search({
        merchantId: merchantPublicId,
        isActive: true
      });

      // Return standardized response format matching general outlets API
      return NextResponse.json(ResponseBuilder.success('OUTLETS_FOUND', {
        outlets: outlets.data || [],
        total: outlets.total || 0,
        page: outlets.page || 1,
        limit: outlets.limit || 20,
        hasMore: outlets.hasMore || false,
        totalPages: Math.ceil((outlets.total || 0) / (outlets.limit || 20))
      }, `Found ${outlets.total || 0} outlets`));

    } catch (error) {
      console.error('Error fetching merchant outlets:', error);
      return NextResponse.json(
        ResponseBuilder.error('INTERNAL_SERVER_ERROR'),
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * POST /api/merchants/[id]/outlets
 * Create new outlet
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      if (isNaN(merchantPublicId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_MERCHANT_ID_FORMAT'),
          { status: 400 }
        );
      }

      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      const body = await request.json();
      const { name, address, phone, description } = body;

      // Create new outlet with proper data handling
      const outletData: any = {
        name,
        address,
        merchantId: merchant.id,
        isActive: true
      };

      // Only include optional fields if they have values
      if (phone && phone.trim()) {
        outletData.phone = phone.trim();
      }

      if (description && description.trim()) {
        outletData.description = description.trim();
      }

      const newOutlet = await db.outlets.create(outletData);

      return NextResponse.json({
        success: true,
        data: newOutlet
      });

    } catch (error) {
      console.error('Error creating outlet:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
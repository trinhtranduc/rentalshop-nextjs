import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withPermissions, validateMerchantAccess } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';

/**
 * GET /api/merchants/[id]/outlets
 * Get merchant outlets with role-based access control
 * 
 * Authorization: All roles with 'outlet.view' permission can access
 * Security: Role-based filtering ensures users only see outlets within their scope:
 * - ADMIN: Can see all outlets (no restrictions)
 * - MERCHANT: Can only see outlets from their own merchant
 * - OUTLET_ADMIN/OUTLET_STAFF: Can only see their assigned outlet
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  
  return withPermissions(['outlet.view'])(async (request, { user, userScope }) => {
    try {
      // Validate merchant access (format, exists, association, scope)
      const validation = await validateMerchantAccess(merchantPublicId, user, userScope);
      if (!validation.valid) {
        return validation.error!;
      }
      const merchant = validation.merchant!;

      // Build search filters with role-based access control
      const searchFilters: any = {
        merchantId: merchantPublicId,
        isActive: true
      };

      // Role-based outlet filtering:
      // - OUTLET_ADMIN/OUTLET_STAFF: Can only see their assigned outlet
      if (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) {
        if (userScope.outletId) {
          searchFilters.outletId = userScope.outletId;
        }
      }
      // ADMIN and MERCHANT: no outlet filtering (can see all outlets)

      console.log(`🔍 Role-based filtering for merchant outlets (${user.role}):`, {
        merchantPublicId,
        'userScope.merchantId': userScope.merchantId,
        'userScope.outletId': userScope.outletId,
        'final merchantId filter': searchFilters.merchantId,
        'final outletId filter': searchFilters.outletId
      });

      // Get outlets for this merchant with role-based filtering
      const outlets = await db.outlets.search(searchFilters);

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
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * POST /api/merchants/[id]/outlets
 * Create new outlet with role-based access control
 * 
 * Authorization: Roles with 'outlet.manage' permission can create outlets
 * Security: Validates merchant ownership before creating outlet
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  
  return withPermissions(['outlet.manage'])(async (request, { user, userScope }) => {
    try {
      // Validate merchant access (format, exists, association, scope)
      const validation = await validateMerchantAccess(merchantPublicId, user, userScope);
      if (!validation.valid) {
        return validation.error!;
      }
      const merchant = validation.merchant!;

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
        data: newOutlet,
        code: 'OUTLET_CREATED_SUCCESS',
        message: 'Outlet created successfully'
      });

    } catch (error) {
      console.error('Error creating outlet:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
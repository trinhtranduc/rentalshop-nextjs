import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withPermissions, validateMerchantAccess } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';

/**
 * GET /api/merchants/[id]/users
 * Get merchant users with role-based access control
 * 
 * Authorization: All roles with 'users.view' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN
 * - OUTLET_STAFF cannot access (does not have 'users.view' permission)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 * 
 * Security: Role-based filtering ensures users only see users within their scope:
 * - ADMIN: Can see all users (no restrictions)
 * - MERCHANT: Can only see users from their own merchant
 * - OUTLET_ADMIN: Can only see users from their outlet
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  const merchantPublicId = parseInt(id);
  
  return withPermissions(['users.view'])(async (request, { user, userScope }) => {
    try {
      // Validate merchant access (format, exists, association, scope)
      const validation = await validateMerchantAccess(merchantPublicId, user, userScope);
      if (!validation.valid) {
        return validation.error!;
      }
      const merchant = validation.merchant!;

      // Parse query parameters for pagination and filtering
      const { searchParams } = new URL(request.url);
      const { usersQuerySchema } = await import('@rentalshop/utils');
      
      const parsed = usersQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
      if (!parsed.success) {
        return NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        );
      }

      const query = parsed.data;

      // Build search filters with role-based access control
      const searchFilters: any = {
        merchantId: merchantPublicId,
        page: query.page || 1,
        limit: query.limit || 20,
        sortBy: query.sortBy || 'createdAt',
        sortOrder: query.sortOrder || 'desc'
      };

      // Add optional filters
      if (query.search) {
        searchFilters.search = query.search;
      }
      if (query.role) {
        searchFilters.role = query.role;
      }
      if (query.isActive !== undefined) {
        searchFilters.isActive = query.isActive;
      } else {
        // Default to active users only if not specified
        searchFilters.isActive = true;
      }

      // Role-based outlet filtering:
      // - OUTLET_ADMIN: Can only see users from their assigned outlet
      if (user.role === USER_ROLE.OUTLET_ADMIN && userScope.outletId) {
        searchFilters.outletId = userScope.outletId;
      }
      // ADMIN and MERCHANT: no outlet filtering (can see all users in merchant)

      console.log(`🔍 Role-based filtering for merchant users (${user.role}):`, {
        merchantPublicId,
        'userScope.merchantId': userScope.merchantId,
        'userScope.outletId': userScope.outletId,
        'final merchantId filter': searchFilters.merchantId,
        'final outletId filter': searchFilters.outletId,
        'pagination': { page: searchFilters.page, limit: searchFilters.limit }
      });

      // Get users for this merchant with role-based filtering and pagination
      const users = await db.users.search(searchFilters);

      return NextResponse.json({
        success: true,
        data: users.data || [],
        users: users.data || [], // Alias for compatibility
        total: users.total || 0,
        page: users.page || 1,
        totalPages: users.totalPages || 1,
        limit: users.limit || 20,
        hasMore: users.hasMore || false,
        code: 'MERCHANT_USERS_FOUND',
        message: `Found ${users.total || 0} users for merchant`
      });

    } catch (error) {
      console.error('Error fetching merchant users:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * POST /api/merchants/[id]/users
 * Create new user with role-based access control
 * 
 * Authorization: All roles with 'users.manage' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN
 * - OUTLET_STAFF cannot access (does not have 'users.manage' permission)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 * 
 * Security: Validates merchant ownership and outlet restrictions before creating user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  
  return withPermissions(['users.manage'])(async (request, { user, userScope }) => {
    try {
      // Validate merchant access (format, exists, association, scope)
      const validation = await validateMerchantAccess(merchantPublicId, user, userScope);
      if (!validation.valid) {
        return validation.error!;
      }
      const merchant = validation.merchant!;

      const body = await request.json();
      const { firstName, lastName, email, phone, role, outletId } = body;

      // For OUTLET_ADMIN, validate they can only create users for their outlet
      if (user.role === USER_ROLE.OUTLET_ADMIN && outletId && outletId !== userScope.outletId) {
        console.log('❌ Outlet admin trying to create user for different outlet:', {
          requestedOutletId: outletId,
          userOutletId: userScope.outletId
        });
        return NextResponse.json(
          ResponseBuilder.error('OUTLET_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Verify outlet belongs to merchant if outletId is provided
      if (outletId) {
        const outlet = await db.outlets.findById(outletId);
        if (!outlet) {
          return NextResponse.json(
            ResponseBuilder.error('OUTLET_NOT_FOUND'),
            { status: API.STATUS.NOT_FOUND }
          );
        }
        
        if (outlet.merchantId !== merchantPublicId) {
          console.log('❌ Outlet does not belong to merchant:', {
            outletMerchantId: outlet.merchantId,
            requestedMerchantId: merchantPublicId
          });
          return NextResponse.json(
            ResponseBuilder.error('OUTLET_NOT_FOUND'),
            { status: API.STATUS.NOT_FOUND }
          );
        }
      }

      // Create new user
      const newUser = await db.users.create({
        firstName,
        lastName: lastName || '', // Default to empty string if not provided
        email,
        phone,
        role,
        merchantId: merchant.id,
        outletId: outletId || null,
        isActive: true
      });

      return NextResponse.json({
        success: true,
        data: newUser,
        code: 'USER_CREATED_SUCCESS',
        message: 'User created successfully'
      });

    } catch (error) {
      console.error('Error creating user:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
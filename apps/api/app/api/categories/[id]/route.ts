import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { API, USER_ROLE } from '@rentalshop/constants';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * GET /api/categories/[id]
 * Get category by public ID
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const categoryId = parseInt(resolvedParams.id);
  
  return withApiLogging(
    withAuthRoles()(async (request: NextRequest, { user, userScope }) => {
    try {
    if (isNaN(categoryId)) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_CATEGORY_ID'),
        { status: 400 }
      );
    }

    // Apply role-based filtering (consistent with other APIs)
    const where: any = { id: categoryId };
    
    if (user.role === USER_ROLE.MERCHANT && userScope.merchantId) {
      where.merchantId = userScope.merchantId;
    } else if ((user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) && userScope.outletId) {
      // Find outlet by id to get merchant
      const outlet = await db.outlets.findById(userScope.outletId);
      if (outlet) {
        where.merchantId = outlet.merchantId;
      }
    } else if (user.role === USER_ROLE.ADMIN) {
      // ADMIN users see all data (system-wide access)
      // No additional filtering needed for ADMIN role
    } else {
      // All other users without merchant/outlet assignment should see no data
      return NextResponse.json(
        ResponseBuilder.error('NO_DATA_AVAILABLE'),
        { status: 403 }
      );
    }

    const category = await db.categories.findFirst(where);

    if (!category) {
      return NextResponse.json(
        ResponseBuilder.error('CATEGORY_NOT_FOUND'),
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Transform response: internal id → public id as "id"
    const transformedCategory = {
      id: category.id,                    // Return id as "id" to frontend
      name: category.name,
      description: category.description,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
      // DO NOT include category.id (internal CUID)
    };

    return NextResponse.json(
      ResponseBuilder.success('CATEGORY_RETRIEVED_SUCCESS', transformedCategory)
    );

    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
    })(request)
  );
}

/**
 * PUT /api/categories/[id]
 * Update category by public ID
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const categoryId = parseInt(resolvedParams.id);
  
  return withApiLogging(
    withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT])(async (request: NextRequest, { user, userScope }) => {
    try {

    // Check if user can manage categories
    if (!userScope.merchantId) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_ACCESS_REQUIRED'),
        { status: API.STATUS.FORBIDDEN }
      );
    }

    if (isNaN(categoryId)) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_CATEGORY_ID'),
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, isActive } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        ResponseBuilder.error('CATEGORY_NAME_REQUIRED'),
        { status: 400 }
      );
    }

    // Find category by id and verify ownership
    const existingCategory = await db.categories.findFirst({
      id: categoryId,
      merchantId: userScope.merchantId
    });

    if (!existingCategory) {
      return NextResponse.json(
        ResponseBuilder.error('CATEGORY_NOT_FOUND'),
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Check if trying to deactivate default category
    if (isActive === false && existingCategory.isDefault) {
      return NextResponse.json(
        ResponseBuilder.error('CANNOT_DELETE_DEFAULT_CATEGORY'),
        { status: API.STATUS.CONFLICT }
      );
    }

    // Check if new name conflicts with existing category (excluding current one)
    const nameConflict = await db.categories.findFirst({
      name: name.trim(),
      merchantId: userScope.merchantId,
      id: { not: categoryId }
    });

    if (nameConflict) {
      return NextResponse.json(
        ResponseBuilder.error('CATEGORY_NAME_EXISTS'),
        { status: API.STATUS.CONFLICT }
      );
    }

    // Update category with proper data handling
    const updateData: any = {
      name: name.trim(),
      isActive: isActive !== undefined ? isActive : existingCategory.isActive
    };

    // Only update isActive if it's not the default category
    if (existingCategory.isDefault && 'isActive' in updateData) {
      delete updateData.isActive;
    }

    // Only update description if it has a value
    if (description && description.trim()) {
      updateData.description = description.trim();
    }

    const updatedCategory = await db.categories.update(categoryId, updateData);

    // Transform response: internal id → public id as "id"
    const transformedCategory = {
      id: updatedCategory.id,                    // Return id as "id" to frontend
      name: updatedCategory.name,
      description: updatedCategory.description,
      isActive: updatedCategory.isActive,
      createdAt: updatedCategory.createdAt,
      updatedAt: updatedCategory.updatedAt,
      // DO NOT include category.id (internal CUID)
    };

    return NextResponse.json(
      ResponseBuilder.success('CATEGORY_UPDATED_SUCCESS', transformedCategory)
    );

    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
    })(request)
  );
}

/**
 * DELETE /api/categories/[id]
 * Delete category by public ID
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const categoryId = parseInt(resolvedParams.id);
  
  return withApiLogging(
    withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT])(async (request: NextRequest, { user, userScope }) => {
    try {

    // Check if user can manage categories
    if (!userScope.merchantId) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_ACCESS_REQUIRED'),
        { status: API.STATUS.FORBIDDEN }
      );
    }

    if (isNaN(categoryId)) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_CATEGORY_ID'),
        { status: 400 }
      );
    }

    // Find category by id and verify ownership
    const existingCategory = await db.categories.findFirst({
      id: categoryId,
      merchantId: userScope.merchantId
    });

    if (!existingCategory) {
      return NextResponse.json(
        ResponseBuilder.error('CATEGORY_NOT_FOUND'),
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Prevent deleting default category
    if (existingCategory.isDefault) {
      return NextResponse.json(
        {
          success: false,
          code: 'CANNOT_DELETE_DEFAULT_CATEGORY',
          message: 'Cannot delete the default category. This category was created during registration and must remain active.'
        },
        { status: 400 }
      );
    }

    // Check if category has products (simplified check)
    const productCount = await db.products.getStats({
      categoryId: categoryId
    });
    
    if (productCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          code: "BUSINESS_RULE_VIOLATION",
          message: `Cannot delete category "${existingCategory.name}" because it has ${productCount} product(s) assigned to it. Please reassign or delete these products first.` 
        },
        { status: API.STATUS.CONFLICT }
      );
    }

    // Delete category (hard delete - permanently remove from database)
    await db.categories.delete(categoryId);

    return NextResponse.json(
      ResponseBuilder.success('CATEGORY_DELETED_SUCCESS')
    );

    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
    })(request)
  );
}

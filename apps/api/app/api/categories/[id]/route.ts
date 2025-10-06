import { handleApiError } from '@rentalshop/utils';
import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

/**
 * GET /api/categories/[id]
 * Get category by public ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles()(async (request: NextRequest, { user, userScope }) => {
    try {

    const categoryId = parseInt(params.id);
    if (isNaN(categoryId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid category ID' },
        { status: 400 }
      );
    }

    // Apply role-based filtering (consistent with other APIs)
    const where: any = { id: categoryId };
    
    if (user.role === 'MERCHANT' && userScope.merchantId) {
      where.merchantId = userScope.merchantId;
    } else if ((user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') && userScope.outletId) {
      // Find outlet by id to get merchant
      const outlet = await db.outlets.findById(userScope.outletId);
      if (outlet) {
        where.merchantId = outlet.merchantId;
      }
    }
    // ADMIN users see all data (no additional filtering)

    const category = await db.categories.findFirst({
      where
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Category not found' },
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

    return NextResponse.json({
      success: true,
      data: transformedCategory
    });

    } catch (error) {
      console.error('Error fetching category:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch category' },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * PUT /api/categories/[id]
 * Update category by public ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request: NextRequest, { user, userScope }) => {
    try {

    // Check if user can manage categories
    if (!userScope.merchantId) {
      return NextResponse.json(
        { success: false, message: 'Merchant access required' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const categoryId = parseInt(params.id);
    if (isNaN(categoryId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid category ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, isActive } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Category name is required' },
        { status: 400 }
      );
    }

    // Find category by id and verify ownership
    const existingCategory = await db.categories.findFirst({
      where: {
        id: categoryId,
        merchantId: userScope.merchantId
      }
    });

    if (!existingCategory) {
      return NextResponse.json(
        { success: false, message: 'Category not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Check if new name conflicts with existing category (excluding current one)
    const nameConflict = await db.categories.findFirst({
      where: {
        name: name.trim(),
        merchantId: userScope.merchantId,
        id: { not: categoryId }
      }
    });

    if (nameConflict) {
      return NextResponse.json(
        { success: false, message: 'Category with this name already exists' },
        { status: API.STATUS.CONFLICT }
      );
    }

    // Update category with proper data handling
    const updateData: any = {
      name: name.trim(),
      isActive: isActive !== undefined ? isActive : existingCategory.isActive
    };

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
      updatedAt: updatedCategory.updatedAt
      // DO NOT include category.id (internal CUID)
    };

    return NextResponse.json({
      success: true,
      data: transformedCategory,
      message: 'Category updated successfully'
    });

    } catch (error) {
      console.error('Error updating category:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to update category' },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * DELETE /api/categories/[id]
 * Delete category by public ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request: NextRequest, { user, userScope }) => {
    try {

    // Check if user can manage categories
    if (!userScope.merchantId) {
      return NextResponse.json(
        { success: false, message: 'Merchant access required' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const categoryId = parseInt(params.id);
    if (isNaN(categoryId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid category ID' },
        { status: 400 }
      );
    }

    // Find category by id and verify ownership
    const existingCategory = await db.categories.findFirst({
      where: {
        id: categoryId,
        merchantId: userScope.merchantId
      }
    });

    if (!existingCategory) {
      return NextResponse.json(
        { success: false, message: 'Category not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Check if category has products (simplified check)
    const productCount = await db.products.getStats({
      where: { categoryId: categoryId }
    });
    
    if (productCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Cannot delete category "${existingCategory.name}" because it has ${productCount} product(s) assigned to it. Please reassign or delete these products first.` 
        },
        { status: API.STATUS.CONFLICT }
      );
    }

    // Delete category (soft delete)
    await db.categories.delete(categoryId);

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    });

    } catch (error) {
      console.error('Error deleting category:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to delete category' },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

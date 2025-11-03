import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { getTenantDbFromRequest } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/categories/[id]
 * Get category by public ID
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles()(async (request: NextRequest, { user }) => {
    try {
      const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;

      const categoryId = parseInt(params.id);
      if (isNaN(categoryId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_CATEGORY_ID'),
          { status: 400 }
        );
      }

      const category = await db.category.findUnique({
        where: { id: categoryId }
      });

      if (!category) {
        return NextResponse.json(
          ResponseBuilder.error('CATEGORY_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      return NextResponse.json(
        ResponseBuilder.success('CATEGORY_RETRIEVED_SUCCESS', category)
      );

    } catch (error) {
      console.error('Error fetching category:', error);
      return NextResponse.json(
        ResponseBuilder.error('FETCH_CATEGORIES_FAILED'),
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * PUT /api/categories/[id]
 * Update category by public ID
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request: NextRequest, { user }) => {
    try {
      const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;

      const categoryId = parseInt(params.id);
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

      // Find category by id
      const existingCategory = await db.category.findUnique({
        where: { id: categoryId }
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
      const nameConflict = await db.category.findFirst({
        where: {
          name: name.trim(),
          id: { not: categoryId }
        }
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
        console.log('🔍 Removed isActive from update data for default category');
      }

      // Only update description if it has a value
      if (description && description.trim()) {
        updateData.description = description.trim();
      }

      const updatedCategory = await db.category.update({
        where: { id: categoryId },
        data: updateData
      });

      return NextResponse.json(
        ResponseBuilder.success('CATEGORY_UPDATED_SUCCESS', updatedCategory)
      );

    } catch (error) {
      console.error('Error updating category:', error);
      return NextResponse.json(
        ResponseBuilder.error('UPDATE_CATEGORY_FAILED'),
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

/**
 * DELETE /api/categories/[id]
 * Delete category by public ID
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request: NextRequest, { user }) => {
    try {
      const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;

      const categoryId = parseInt(params.id);
      if (isNaN(categoryId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_CATEGORY_ID'),
          { status: 400 }
        );
      }

      // Find category by id
      const existingCategory = await db.category.findUnique({
        where: { id: categoryId }
      });

      if (!existingCategory) {
        return NextResponse.json(
          ResponseBuilder.error('CATEGORY_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Prevent deleting default category
      if (existingCategory.isDefault) {
        console.log('❌ Cannot delete default category:', existingCategory.name);
        return NextResponse.json(
          {
            success: false,
            code: 'CANNOT_DELETE_DEFAULT_CATEGORY',
            message: 'Cannot delete the default category. This category was created during registration and must remain active.'
          },
          { status: 400 }
        );
      }

      // Check if category has products
      const productCount = await db.product.count({
        where: { categoryId: categoryId }
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

      // Delete category (soft delete)
      await db.category.update({
        where: { id: categoryId },
        data: { isActive: false }
      });

      return NextResponse.json(
        ResponseBuilder.success('CATEGORY_DELETED_SUCCESS')
      );

    } catch (error) {
      console.error('Error deleting category:', error);
      return NextResponse.json(
        ResponseBuilder.error('DELETE_CATEGORY_FAILED'),
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  })(request);
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';

/**
 * GET /api/categories/[id]
 * Get category by public ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const categoryId = parseInt(params.id);
    if (isNaN(categoryId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid category ID' },
        { status: 400 }
      );
    }

    // Build where clause based on user role and scope
    const where: any = { publicId: categoryId };
    
    if (user.merchantId) {
      where.merchantId = user.merchantId;
    }

    const category = await prisma.category.findFirst({
      where,
      select: {
        id: true,
        publicId: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Category not found' },
        { status: 404 }
      );
    }

    // Transform response: internal id → public id as "id"
    const transformedCategory = {
      id: category.publicId,                    // Return publicId as "id" to frontend
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
      { status: 500 }
    );
  }
}

/**
 * PUT /api/categories/[id]
 * Update category by public ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user can manage categories
    if (!user.merchantId) {
      return NextResponse.json(
        { success: false, message: 'Merchant access required' },
        { status: 403 }
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

    // Find category by publicId and verify ownership
    const existingCategory = await prisma.category.findFirst({
      where: {
        publicId: categoryId,
        merchantId: user.merchantId
      }
    });

    if (!existingCategory) {
      return NextResponse.json(
        { success: false, message: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if new name conflicts with existing category (excluding current one)
    const nameConflict = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        merchantId: user.merchantId,
        publicId: { not: categoryId }
      }
    });

    if (nameConflict) {
      return NextResponse.json(
        { success: false, message: 'Category with this name already exists' },
        { status: 409 }
      );
    }

    // Update category
    const updatedCategory = await prisma.category.update({
      where: { id: existingCategory.id }, // Use internal CUID
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isActive: isActive !== undefined ? isActive : existingCategory.isActive
      },
      select: {
        id: true,
        publicId: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Transform response: internal id → public id as "id"
    const transformedCategory = {
      id: updatedCategory.publicId,                    // Return publicId as "id" to frontend
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
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/categories/[id]
 * Delete category by public ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user can manage categories
    if (!user.merchantId) {
      return NextResponse.json(
        { success: false, message: 'Merchant access required' },
        { status: 403 }
      );
    }

    const categoryId = parseInt(params.id);
    if (isNaN(categoryId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid category ID' },
        { status: 400 }
      );
    }

    // Find category by publicId and verify ownership
    const existingCategory = await prisma.category.findFirst({
      where: {
        publicId: categoryId,
        merchantId: user.merchantId
      },
      include: {
        products: {
          select: { id: true, name: true }
        }
      }
    });

    if (!existingCategory) {
      return NextResponse.json(
        { success: false, message: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if category has products
    if (existingCategory.products.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Cannot delete category "${existingCategory.name}" because it has ${existingCategory.products.length} product(s) assigned to it. Please reassign or delete these products first.` 
        },
        { status: 409 }
      );
    }

    // Delete category
    await prisma.category.delete({
      where: { id: existingCategory.id } // Use internal CUID
    });

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete category' },
      { status: 500 }
    );
  }
}

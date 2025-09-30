import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

/**
 * GET /api/categories
 * Get all categories
 */
export const GET = withAuthRoles()(async (request: NextRequest, { user }) => {
  try {

    // Build where clause based on user role and scope
    const where: any = { isActive: true };
    
    if (user.merchantId) {
      where.merchantId = user.merchantId;
    }

    const categories = await prisma.category.findMany({
      where,
      select: {
        id: true,           // Internal ID (for database operations)
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { name: 'asc' }
    });

    // Transform response: internal id → public id as "id"
    const transformedCategories = categories.map((category: any) => ({
      id: category.id,                    // Return id as "id" to frontend
      name: category.name,
      description: category.description,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
      // DO NOT include category.id (internal CUID)
    }));

    return NextResponse.json({
      success: true,
      data: transformedCategories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch categories' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});

/**
 * POST /api/categories
 * Create a new category
 */
export const POST = withAuthRoles(['ADMIN', 'MERCHANT'])(async (request: NextRequest, { user }) => {
  console.log('🚀 POST /api/categories - Starting category creation...');
  
  try {
    console.log('👤 User verification result: Success');

    console.log('👤 User details:', {
      id: user.id,
      email: user.email,
      role: user.role,
      merchantId: user.merchantId,
      outletId: user.outletId
    });

    // Check if user can manage categories
    if (!user.merchantId) {
      console.log('❌ User has no merchantId - merchant access required');
      return NextResponse.json(
        { success: false, message: 'Merchant access required' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const body = await request.json();
    console.log('📝 Request body received:', body);
    
    const { name, description } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      console.log('❌ Validation failed - invalid name:', { name, type: typeof name, length: name?.length });
      return NextResponse.json(
        { success: false, message: 'Category name is required' },
        { status: 400 }
      );
    }

    console.log('✅ Validation passed - proceeding with category creation');

    // Find merchant by id to get the CUID
    const merchant = await prisma.merchant.findUnique({
      where: { id: user.merchantId },
      select: { id: true }
    });
    
    if (!merchant) {
      console.log('❌ Merchant not found for id:', user.merchantId);
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Check if category name already exists for this merchant
    console.log('🔍 Checking for existing category with name:', name.trim(), 'for merchant:', user.merchantId);
    
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        merchantId: merchant.id // Use CUID for database query
      }
    });

    if (existingCategory) {
      console.log('❌ Category already exists:', existingCategory);
      return NextResponse.json(
        { success: false, message: 'Category with this name already exists' },
        { status: API.STATUS.CONFLICT }
      );
    }

    console.log('✅ No duplicate category found - proceeding to generate id');

    // Generate next category id
    console.log('🔢 Finding last category to generate next id...');
    
    // Check globally across ALL merchants for the highest id
    const lastCategory = await prisma.category.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true }
    });
    
    const nextPublicId = (lastCategory?.id || 0) + 1;
    console.log('🔢 Generated id:', nextPublicId, '(last was:', lastCategory?.id || 0, ')');

    // Create category
    console.log('💾 Creating category in database with data:', {
      id: nextPublicId,
      name: name.trim(),
      description: description?.trim() || null,
      merchantId: merchant.id, // Use CUID for database query
      isActive: true
    });

    const category = await prisma.category.create({
      data: {
        id: nextPublicId,
        name: name.trim(),
        description: description?.trim() || null,
        merchantId: merchant.id, // Use CUID for database query
        isActive: true
      },
      select: {
          id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log('✅ Category created successfully in database:', category);

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

    console.log('🔄 Transformed category response:', transformedCategory);
    console.log('🎉 Category creation completed successfully!');

    return NextResponse.json({
      success: true,
      data: transformedCategory,
      message: 'Category created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('💥 Error creating category:', error);
    
    // Type guard for error object
    if (error instanceof Error) {
      console.error('💥 Error stack:', error.stack);
      console.error('💥 Error details:', {
        name: error.name,
        message: error.message,
        code: (error as any).code
      });
    } else {
      console.error('💥 Unknown error type:', typeof error, error);
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to create category' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});

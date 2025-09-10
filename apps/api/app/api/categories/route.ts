import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';

/**
 * GET /api/categories
 * Get all categories
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Build where clause based on user role and scope
    const where: any = { isActive: true };
    
    if (user.merchantId) {
      where.merchantId = user.merchantId;
    }

    const categories = await prisma.category.findMany({
      where,
      select: {
        id: true,           // Internal ID (for database operations)
        publicId: true,     // Public ID (to expose as "id")
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { name: 'asc' }
    });

    // Transform response: internal id → public id as "id"
    const transformedCategories = categories.map(category => ({
      id: category.publicId,                    // Return publicId as "id" to frontend
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
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories
 * Create a new category
 */
export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/categories - Starting category creation...');
  
  try {
    // Verify authentication using the centralized method
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      console.log('❌ Authentication failed:', authResult.message);
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: authResult.status }
      );
    }

    const user = authResult.user;
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
        { status: 403 }
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

    // Check if category name already exists for this merchant
    console.log('🔍 Checking for existing category with name:', name.trim(), 'for merchant:', user.merchantId);
    
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        merchantId: user.merchantId
      }
    });

    if (existingCategory) {
      console.log('❌ Category already exists:', existingCategory);
      return NextResponse.json(
        { success: false, message: 'Category with this name already exists' },
        { status: 409 }
      );
    }

    console.log('✅ No duplicate category found - proceeding to generate publicId');

    // Generate next category publicId
    console.log('🔢 Finding last category to generate next publicId...');
    
    // Check globally across ALL merchants for the highest publicId
    const lastCategory = await prisma.category.findFirst({
      orderBy: { publicId: 'desc' },
      select: { publicId: true }
    });
    
    const nextPublicId = (lastCategory?.publicId || 0) + 1;
    console.log('🔢 Generated publicId:', nextPublicId, '(last was:', lastCategory?.publicId || 0, ')');

    // Create category
    console.log('💾 Creating category in database with data:', {
      publicId: nextPublicId,
      name: name.trim(),
      description: description?.trim() || null,
      merchantId: user.merchantId,
      isActive: true
    });

    const category = await prisma.category.create({
      data: {
        publicId: nextPublicId,
        name: name.trim(),
        description: description?.trim() || null,
        merchantId: user.merchantId,
        isActive: true
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

    console.log('✅ Category created successfully in database:', category);

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
      { status: 500 }
    );
  }
}

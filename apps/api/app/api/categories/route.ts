import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import { handleApiError } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

/**
 * GET /api/categories
 * Get all categories
 */
export const GET = withAuthRoles()(async (request: NextRequest, { user, userScope }) => {
  try {

    // Apply role-based filtering (consistent with other APIs)
    const where: any = { isActive: true };
    
    if (user.role === 'MERCHANT' && userScope.merchantId) {
      where.merchantId = userScope.merchantId;
    } else if ((user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') && userScope.outletId) {
      // Find outlet by id to get merchant
      const outlet = await db.outlets.findById(userScope.outletId);
      if (outlet) {
        where.merchantId = outlet.merchantId;
      }
    } else if (user.role === 'ADMIN') {
      // ADMIN users see all data (system-wide access)
      // No additional filtering needed for ADMIN role
      console.log('✅ ADMIN user accessing all system data:', {
        role: user.role,
        merchantId: userScope.merchantId,
        outletId: userScope.outletId
      });
    } else {
      // All other users without merchant/outlet assignment should see no data
      console.log('🚫 User without merchant/outlet assignment:', {
        role: user.role,
        merchantId: userScope.merchantId,
        outletId: userScope.outletId
      });
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No data available - user not assigned to merchant/outlet'
      });
    }

    const categories = await db.categories.findMany({
      where,
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
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

/**
 * POST /api/categories
 * Create a new category
 */
export const POST = withAuthRoles(['ADMIN', 'MERCHANT'])(async (request: NextRequest, { user, userScope }) => {
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
    if (!userScope.merchantId) {
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

    // Check if category name already exists for this merchant
    console.log('🔍 Checking for existing category with name:', name.trim(), 'for merchant:', userScope.merchantId);
    
    const existingCategory = await db.categories.findFirst({
      where: {
        name: name.trim(),
        merchantId: userScope.merchantId,
        isActive: true
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
    const lastCategory = await db.categories.findFirst({
      where: {},
      orderBy: { id: 'desc' }
    });
    
    const nextPublicId = (lastCategory?.id || 0) + 1;
    console.log('🔢 Generated id:', nextPublicId, '(last was:', lastCategory?.id || 0, ')');

    // Create category with proper data handling
    const categoryData: any = {
      id: nextPublicId,
      name: name.trim(),
      merchantId: userScope.merchantId,
      isActive: true
    };

    // Only include description if it has a value
    if (description && description.trim()) {
      categoryData.description = description.trim();
    }

    console.log('💾 Creating category in database with data:', categoryData);

    const category = await db.categories.create(categoryData);

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
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

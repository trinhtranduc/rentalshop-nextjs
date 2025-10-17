import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { categoriesQuerySchema, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

/**
 * GET /api/categories
 * Get categories with filtering and pagination
 * REFACTORED: Now uses validation schema and db.categories.search()
 */
export const GET = withAuthRoles()(async (request: NextRequest, { user, userScope }) => {
  console.log(`🔍 GET /api/categories - User: ${user.email} (${user.role})`);
  
  try {
    const { searchParams } = new URL(request.url);
    const hasSearchParams = searchParams.toString().length > 0;
    console.log('Search params:', Object.fromEntries(searchParams.entries()), 'Has params:', hasSearchParams);
    
    // Determine merchantId based on role
    let filterMerchantId: number | undefined;
    
    if (user.role === 'ADMIN') {
      // Admin can see any merchant's categories or all categories
      filterMerchantId = undefined;
    } else if (user.role === 'MERCHANT' || user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      // Non-admin users restricted to their merchant
      filterMerchantId = userScope.merchantId;
      
      // For outlet users, get merchant from outlet
      if ((user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') && userScope.outletId && !filterMerchantId) {
        const outlet = await db.outlets.findById(userScope.outletId);
        if (outlet) {
          filterMerchantId = outlet.merchantId;
        }
      }
    }
    
    // SIMPLE LIST MODE: No search params → Return simple array for dropdowns
    if (!hasSearchParams) {
      console.log('🔍 Simple list mode - returning array for dropdowns');
      
      const where: any = { isActive: true };
      if (filterMerchantId) where.merchantId = filterMerchantId;
      
      const categories = await db.categories.findMany({
        where,
        orderBy: { name: 'asc' }
      });

      return NextResponse.json({
        success: true,
        data: categories
      });
    }
    
    // SEARCH MODE: Has search params → Return pagination structure
    console.log('🔍 Search mode - returning pagination structure');
    
    const parsed = categoriesQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      console.log('Validation error:', parsed.error.flatten());
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { 
      q, 
      search, 
      merchantId: queryMerchantId,
      isActive,
      sortBy,
      sortOrder,
      page,
      limit
    } = parsed.data;

    console.log('Parsed filters:', { 
      q, search, queryMerchantId, isActive, sortBy, sortOrder, page, limit
    });

    // Override merchantId from query if admin
    if (user.role === 'ADMIN' && queryMerchantId) {
      filterMerchantId = queryMerchantId;
    }

    console.log('🔍 Using merchantId for filtering:', filterMerchantId, 'for user role:', user.role);

    // Build search filters with role-based access control
    const searchFilters = {
      merchantId: filterMerchantId,
      isActive: isActive === 'all' ? undefined : (isActive !== undefined ? Boolean(isActive) : true),
      q: q || search, // Pass q parameter to database search
      sortBy: sortBy || 'name',
      sortOrder: sortOrder || 'asc',
      page: page || 1,
      limit: limit || 25
    };

    console.log('🔍 Using db.categories.search with filters:', searchFilters);
    
    const result = await db.categories.search(searchFilters);
    console.log('✅ Search completed, found:', result.total || 0, 'categories');

    return NextResponse.json({
      success: true,
      data: {
        categories: result.data || [],
        total: result.total || 0,
        page: result.page || 1,
        limit: result.limit || 25,
        hasMore: result.hasMore || false,
        totalPages: Math.ceil((result.total || 0) / (result.limit || 25))
      },
      code: "CATEGORIES_FOUND", message: `Found ${result.total || 0} categories`
    });

  } catch (error) {
    console.error('Error in GET /api/categories:', error);
    
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
        ResponseBuilder.error('MERCHANT_ACCESS_REQUIRED'),
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
        ResponseBuilder.error('CATEGORY_NAME_REQUIRED'),
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
        ResponseBuilder.error('CATEGORY_NAME_EXISTS'),
        { status: API.STATUS.CONFLICT }
      );
    }

    console.log('✅ No duplicate category found - proceeding to create category');

    // Create category with proper data handling
    // Note: ID will be auto-generated by Prisma @default(autoincrement())
    const categoryData: any = {
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

    return NextResponse.json(
      ResponseBuilder.success('CATEGORY_CREATED_SUCCESS', transformedCategory),
      { status: 201 }
    );

  } catch (error) {
    console.error('💥 Error creating category:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

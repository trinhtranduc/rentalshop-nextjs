import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { getTenantDbFromRequest } from '@rentalshop/utils';
import { categoriesQuerySchema, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/categories
 * Get categories with filtering and pagination
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const GET = withAuthRoles()(async (request: NextRequest, { user }) => {
  console.log(`🔍 GET /api/categories - User: ${user.email} (${user.role})`);
  
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;
    
    const { searchParams } = new URL(request.url);
    const hasSearchParams = searchParams.toString().length > 0;
    console.log('Search params:', Object.fromEntries(searchParams.entries()), 'Has params:', hasSearchParams);
    
    // SIMPLE LIST MODE: No search params → Return simple array for dropdowns
    if (!hasSearchParams) {
      console.log('🔍 Simple list mode - returning array for dropdowns');
      
      const categories = await db.category.findMany({
        where: { isActive: true },
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
        ResponseBuilder.error('VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { 
      q, 
      search, 
      merchantId: queryMerchantId, // Ignore in multi-tenant
      isActive,
      sortBy,
      sortOrder,
      page,
      limit
    } = parsed.data;

    console.log('Parsed filters:', { 
      q, search, isActive, sortBy, sortOrder, page, limit
    });

    // Build where clause
    const where: any = {};
    if (isActive !== 'all' && isActive !== undefined) {
      where.isActive = Boolean(isActive);
    } else if (isActive === undefined) {
      where.isActive = true;
    }
    
    const searchQuery = q || search;
    if (searchQuery) {
      where.name = { contains: searchQuery, mode: 'insensitive' };
    }

    const pageNum = page || 1;
    const limitNum = limit || 25;
    const skip = (pageNum - 1) * limitNum;

    const [categories, total] = await Promise.all([
      db.category.findMany({
        where,
        orderBy: { [sortBy || 'name']: sortOrder || 'asc' },
        take: limitNum,
        skip
      }),
      db.category.count({ where })
    ]);
    console.log('✅ Search completed, found:', total, 'categories');

    return NextResponse.json({
      success: true,
      data: {
        categories: categories,
        total: total,
        page: pageNum,
        limit: limitNum,
        hasMore: skip + limitNum < total,
        totalPages: Math.ceil(total / limitNum)
      },
      code: "CATEGORIES_FOUND",
      message: `Found ${total} categories`
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
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const POST = withAuthRoles(['ADMIN', 'MERCHANT'])(async (request: NextRequest, { user }) => {
  console.log('🚀 POST /api/categories - Starting category creation...');
  
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;
    
    console.log('👤 User verification result: Success');

    console.log('👤 User details:', {
      id: user.id,
      email: user.email,
      role: user.role
    });

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

    // Check if category name already exists (NO merchantId needed)
    console.log('🔍 Checking for existing category with name:', name.trim());
    
    const existingCategory = await db.category.findFirst({
      where: {
        name: name.trim(),
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
    const categoryData: any = {
      name: name.trim(),
      isActive: true
    };

    // Only include description if it has a value
    if (description && description.trim()) {
      categoryData.description = description.trim();
    }

    console.log('💾 Creating category in database with data:', categoryData);

    const category = await db.category.create({
      data: categoryData
    });

    console.log('✅ Category created successfully in database:', category);
    console.log('🎉 Category creation completed successfully!');

    return NextResponse.json(
      ResponseBuilder.success('CATEGORY_CREATED_SUCCESS', category),
      { status: 201 }
    );

  } catch (error) {
    console.error('💥 Error creating category:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

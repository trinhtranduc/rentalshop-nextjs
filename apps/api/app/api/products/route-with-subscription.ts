import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { authenticateRequest } from '@rentalshop/auth';
import { searchProducts, createProduct, updateProduct, deleteProduct } from '@rentalshop/database';
import { productsQuerySchema, productCreateSchema, productUpdateSchema } from '@rentalshop/utils';
import { assertAnyRole, getUserScope } from '@rentalshop/auth';
import { searchRateLimiter } from '@rentalshop/middleware';
import { captureAuditContext } from '@rentalshop/middleware';
import { createAuditHelper } from '@rentalshop/utils';
import { prisma } from '@rentalshop/database';
import { withSubscriptionRequired, withSubscriptionOptional, hasPermission } from '../../middleware/subscription-access';
import {API} from '@rentalshop/constants';

/**
 * GET /api/products
 * Get products with filtering and pagination
 * Requires: canView permission
 */
export const GET = withSubscriptionOptional(async (request: NextRequest) => {
  try {
    console.log('GET /api/products called');
    
    // Get user from middleware
    const user = (request as any).user;
    const subscriptionAccess = (request as any).subscriptionAccess;
    
    console.log('User verification result:', user ? 'Success' : 'Failed');
    console.log('Subscription access:', subscriptionAccess?.accessLevel);

    if (!user.merchant?.id) {
      return NextResponse.json(
        { success: false, message: 'User must be associated with a merchant' },
        { status: 400 }
      );
    }

    // Check if user has view permission
    if (!hasPermission(request, 'canView')) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Access denied: ' + (subscriptionAccess?.reason || 'Insufficient subscription access'),
          accessLevel: subscriptionAccess?.accessLevel
        },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    console.log('User merchant ID:', user.merchant?.id);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    console.log('Query parameters:', queryParams);

    // Validate query parameters
    const validatedQuery = productsQuerySchema.parse(queryParams);
    console.log('Validated query:', validatedQuery);

    // Get user scope for role-based filtering
    const userScope = getUserScope(user);
    console.log('User scope:', userScope);

    // Build filters with user scope
    const filters = {
      ...validatedQuery,
      merchantId: userScope.merchantId,
      outletId: userScope.outletId
    };

    console.log('Final filters:', filters);

    // Apply rate limiting for search operations
    if (validatedQuery.search) {
      const rateLimitResult = await searchRateLimiter(user.id);
      if (!rateLimitResult.success) {
        return NextResponse.json(
          { success: false, message: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }

    // Search products
    const result = await searchProducts(filters);
    console.log('Search result:', { count: result.products.length, total: result.total });

    return NextResponse.json({
      success: true,
      data: result.products,
      pagination: {
        total: result.total,
        hasMore: result.hasMore,
        limit: filters.limit,
        offset: filters.offset
      }
    });

  } catch (error) {
    console.error('Error in GET /api/products:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, message: 'Invalid query parameters', errors: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to fetch products' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}, { requiredAction: 'canView' });

/**
 * POST /api/products
 * Create a new product
 * Requires: canCreate permission
 */
export const POST = withSubscriptionRequired(async (request: NextRequest) => {
  try {
    console.log('POST /api/products called');
    
    // Get user from middleware
    const user = (request as any).user;
    const subscriptionAccess = (request as any).subscriptionAccess;

    // Check if user has create permission
    if (!hasPermission(request, 'canCreate')) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Access denied: ' + (subscriptionAccess?.reason || 'Cannot create products with current subscription'),
          accessLevel: subscriptionAccess?.accessLevel
        },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Check if user can manage products
    if (!hasPermission(request, 'canManageProducts')) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Access denied: Cannot manage products with current subscription',
          accessLevel: subscriptionAccess?.accessLevel
        },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const body = await request.json();
    console.log('Request body:', body);

    // Validate input data
    const validatedData = productCreateSchema.parse(body);
    console.log('Validated data:', validatedData);

    // Get user scope
    const userScope = getUserScope(user);
    console.log('User scope:', userScope);

    if (!userScope.merchantId) {
      return NextResponse.json(
        { success: false, message: 'User must be associated with a merchant' },
        { status: 400 }
      );
    }

    // Capture audit context
    const auditContext = await captureAuditContext(user, 'PRODUCT_CREATE');
    const auditHelper = createAuditHelper(auditContext);

    // Create product
    const product = await createProduct({
      ...validatedData,
      merchantId: userScope.merchantId,
      outletId: userScope.outletId
    });

    console.log('Product created successfully:', product.id);

    // Log audit event
    await auditHelper.logEvent('PRODUCT_CREATED', {
      productId: product.id,
      productName: product.name,
      outletId: product.outletId
    });

    return NextResponse.json({
      success: true,
      data: product,
      message: 'Product created successfully'
    });

  } catch (error) {
    console.error('Error in POST /api/products:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', errors: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to create product' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}, { requiredAction: 'canCreate' });

/**
 * PUT /api/products
 * Update multiple products
 * Requires: canEdit permission
 */
export const PUT = withSubscriptionRequired(async (request: NextRequest) => {
  try {
    console.log('PUT /api/products called');
    
    // Get user from middleware
    const user = (request as any).user;
    const subscriptionAccess = (request as any).subscriptionAccess;

    // Check if user has edit permission
    if (!hasPermission(request, 'canEdit')) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Access denied: ' + (subscriptionAccess?.reason || 'Cannot edit products with current subscription'),
          accessLevel: subscriptionAccess?.accessLevel
        },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Check if user can manage products
    if (!hasPermission(request, 'canManageProducts')) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Access denied: Cannot manage products with current subscription',
          accessLevel: subscriptionAccess?.accessLevel
        },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const body = await request.json();
    console.log('Request body:', body);

    // Validate input data
    const validatedData = productUpdateSchema.parse(body);
    console.log('Validated data:', validatedData);

    // Get user scope
    const userScope = getUserScope(user);
    console.log('User scope:', userScope);

    if (!userScope.merchantId) {
      return NextResponse.json(
        { success: false, message: 'User must be associated with a merchant' },
        { status: 400 }
      );
    }

    // Capture audit context
    const auditContext = await captureAuditContext(user, 'PRODUCT_UPDATE');
    const auditHelper = createAuditHelper(auditContext);

    // Update products
    const result = await updateProduct(validatedData, userScope);

    console.log('Products updated successfully:', result.length);

    // Log audit event
    await auditHelper.logEvent('PRODUCTS_UPDATED', {
      productIds: result.map(p => p.id),
      outletId: userScope.outletId
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Products updated successfully'
    });

  } catch (error) {
    console.error('Error in PUT /api/products:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', errors: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to update products' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}, { requiredAction: 'canEdit' });

/**
 * DELETE /api/products
 * Delete multiple products
 * Requires: canDelete permission
 */
export const DELETE = withSubscriptionRequired(async (request: NextRequest) => {
  try {
    console.log('DELETE /api/products called');
    
    // Get user from middleware
    const user = (request as any).user;
    const subscriptionAccess = (request as any).subscriptionAccess;

    // Check if user has delete permission
    if (!hasPermission(request, 'canDelete')) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Access denied: ' + (subscriptionAccess?.reason || 'Cannot delete products with current subscription'),
          accessLevel: subscriptionAccess?.accessLevel
        },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Check if user can manage products
    if (!hasPermission(request, 'canManageProducts')) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Access denied: Cannot manage products with current subscription',
          accessLevel: subscriptionAccess?.accessLevel
        },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const body = await request.json();
    console.log('Request body:', body);

    const { productIds } = body;
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Product IDs are required' },
        { status: 400 }
      );
    }

    // Get user scope
    const userScope = getUserScope(user);
    console.log('User scope:', userScope);

    if (!userScope.merchantId) {
      return NextResponse.json(
        { success: false, message: 'User must be associated with a merchant' },
        { status: 400 }
      );
    }

    // Capture audit context
    const auditContext = await captureAuditContext(user, 'PRODUCT_DELETE');
    const auditHelper = createAuditHelper(auditContext);

    // Delete products
    const result = await deleteProduct(productIds, userScope);

    console.log('Products deleted successfully:', result.length);

    // Log audit event
    await auditHelper.logEvent('PRODUCTS_DELETED', {
      productIds: result,
      outletId: userScope.outletId
    });

    return NextResponse.json({
      success: true,
      data: { deletedIds: result },
      message: 'Products deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /api/products:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete products' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}, { requiredAction: 'canDelete' });

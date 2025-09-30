import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { getCustomerById } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

/**
 * GET /api/customers/[id]/orders
 * Get orders for a specific customer
 * REFACTORED: Now uses unified withAuthRoles pattern for business roles
 */
async function handleGetCustomerOrders(
  request: NextRequest,
  { user, userScope }: { user: any; userScope: any },
  params: { id: string }
) {
  console.log(`📎 GET /api/customers/${params.id}/orders - User: ${user.email}, Role: ${user.role}`);
  
  try {
    // Check if the ID is numeric (public ID)
    if (!/^\d+$/.test(params.id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid customer ID format' },
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    const customerId = parseInt(params.id);

    // Get merchantId from userScope (provided by withAuthRoles)
    const userMerchantId = userScope.merchantId;
    console.log('User merchant ID:', userMerchantId);

    if (!userMerchantId) {
      return NextResponse.json(
        { success: false, message: 'User not associated with any merchant' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Verify customer exists and belongs to user's merchant
    const customer = await getCustomerById(customerId, userMerchantId);
    
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // No need to check merchant access since getCustomerByPublicId already filters by merchant
    // The customer returned is guaranteed to belong to the user's merchant

    // Get query parameters for filtering orders
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Get customer orders from the database
    // The customer object already includes orders from getCustomerByPublicId
    const customerOrders = customer.orders || [];
    
    // Apply filters if provided
    let filteredOrders = customerOrders;
    
    if (status) {
      filteredOrders = filteredOrders.filter(order => order.status === status);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredOrders = filteredOrders.filter(order => 
        order.orderNumber.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply sorting
    filteredOrders.sort((a, b) => {
      const aValue = a[sortBy as keyof typeof a];
      const bValue = b[sortBy as keyof typeof b];
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });
    
    // Apply pagination
    const total = filteredOrders.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
    
    // Transform orders to use id as id for frontend
    const transformedOrders = paginatedOrders.map(order => ({
      id: order.id, // Frontend expects 'id' to be the id
      orderId: order.id, // Keep orderId for backward compatibility
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt
    }));

    return NextResponse.json({
      success: true,
      data: {
        orders: transformedOrders,
        total,
        page,
        totalPages,
        limit
      }
    });

  } catch (error) {
    console.error('Error in GET /api/customers/[id]/orders:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleGetCustomerOrders(req, context, params)
  );
  return authenticatedHandler(request);
}

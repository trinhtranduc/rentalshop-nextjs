import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@rentalshop/auth';
import { getUserScope } from '@rentalshop/auth';
import { getCustomerByPublicId } from '@rentalshop/database';

/**
 * GET /api/customers/[id]/orders
 * Get orders for a specific customer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('GET /api/customers/[id]/orders called with customer ID:', params.id);
  
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Check if the ID is numeric (public ID)
    if (!/^\d+$/.test(params.id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid customer ID format' },
        { status: 400 }
      );
    }

    const customerId = parseInt(params.id);

    // Get merchantId from user
    const userScope = getUserScope(user as any);
    const userMerchantId = userScope.merchantId;
    console.log('User merchant ID:', userMerchantId);

    if (!userMerchantId) {
      return NextResponse.json(
        { success: false, message: 'User not associated with any merchant' },
        { status: 403 }
      );
    }

    // Verify customer exists and belongs to user's merchant using new dual ID system
    const customer = await getCustomerByPublicId(customerId, userMerchantId);
    
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
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
    
    // Transform orders to use publicId as id for frontend
    const transformedOrders = paginatedOrders.map(order => ({
      id: order.publicId, // Frontend expects 'id' to be the publicId
      publicId: order.publicId, // Keep publicId for backward compatibility
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
      { status: 500 }
    );
  }
}

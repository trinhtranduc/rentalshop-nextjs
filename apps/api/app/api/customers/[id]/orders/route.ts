import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { getUserScope } from '@rentalshop/auth';
import { getCustomerById } from '@rentalshop/database';

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

    // Get merchantId from user
    const userMerchantId = getUserScope(user as any).merchantId;
    console.log('User merchant ID:', userMerchantId);

    // Verify customer exists and belongs to user's merchant
    const customer = await getCustomerById(params.id);
    
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    if (customer.merchantId !== userMerchantId) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    // Get query parameters for filtering orders
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // For now, return a placeholder response
    // TODO: Implement actual order fetching logic
    const orders = [];
    const total = 0;
    const totalPages = 0;

    return NextResponse.json({
      success: true,
      data: {
        orders,
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

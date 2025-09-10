import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getUserScope } from '@rentalshop/auth';
import { getOrderStats, getOverdueRentals } from '@rentalshop/database';
import type { OrderSearchResult } from '@rentalshop/types';

// GET /api/orders/stats - Get order statistics
export async function GET(request: NextRequest) {
  try {
    // Verify authentication using the centralized method
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.message },
        { status: authResult.status }
      );
    }

    const user = authResult.user;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const outletId = searchParams.get('outletId') ? parseInt(searchParams.get('outletId')!) : undefined;

    // Get user scope for proper authorization
    const userScope = getUserScope(user as any);

    // Get order statistics with proper user scope
    const stats = await getOrderStats(userScope);

    // Get overdue rentals if requested
    const includeOverdue = searchParams.get('includeOverdue') === 'true';
    let overdueRentals: OrderSearchResult[] = [];
    if (includeOverdue) {
      overdueRentals = await getOverdueRentals(outletId);
    }

    return NextResponse.json({
      success: true,
      data: {
        stats,
        overdueRentals,
      },
    });

  } catch (error) {
    console.error('Error getting order stats:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
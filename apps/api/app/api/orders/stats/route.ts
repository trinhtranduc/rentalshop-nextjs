import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple, getUserScope } from '@rentalshop/auth';
import { getOrderStats, getOverdueRentals } from '@rentalshop/database';
import type { OrderSearchResult } from '@rentalshop/types';

// GET /api/orders/stats - Get order statistics
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

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
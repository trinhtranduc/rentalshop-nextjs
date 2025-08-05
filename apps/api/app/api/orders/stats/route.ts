import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/jwt-edge';
import { getOrderStats, getOverdueRentals } from '@rentalshop/database';

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

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const outletId = searchParams.get('outletId') || undefined;

    // Get order statistics
    const stats = await getOrderStats(outletId);

    // Get overdue rentals if requested
    const includeOverdue = searchParams.get('includeOverdue') === 'true';
    let overdueRentals = [];
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
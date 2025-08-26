import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';

/**
 * GET /api/categories
 * Get all categories
 */
export async function GET(request: NextRequest) {
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

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,           // Internal ID (for database operations)
        publicId: true,     // Public ID (to expose as "id")
        name: true,
        description: true
      },
      orderBy: { name: 'asc' }
    });

    // Transform response: internal id → public id as "id"
    const transformedCategories = categories.map(category => ({
              id: category.publicId,                    // Return publicId as "id" to frontend
      name: category.name,
      description: category.description,
      // DO NOT include category.id (internal CUID)
    }));

    return NextResponse.json({
      success: true,
      data: transformedCategories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

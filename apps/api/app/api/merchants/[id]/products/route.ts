import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    const merchantPublicId = parseInt(params.id);
    if (isNaN(merchantPublicId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid merchant ID' },
        { status: 400 }
      );
    }

    // Find the merchant by publicId to get the actual CUID
    const merchant = await prisma.merchant.findUnique({
      where: { publicId: merchantPublicId },
      select: { id: true }
    });

    if (!merchant) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
        { status: 404 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const outletId = searchParams.get('outletId') || undefined;
    const available = searchParams.get('available') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause with role-based filtering
    const where: any = {
      merchantId: merchant.id // Use the actual CUID - products are directly related to merchants
    };

    // Role-based filtering: Outlet users can only see products from their outlet
    if (user.outletId) {
      // Outlet role: filter by specific outlet
      where.outletStock = {
        some: {
          outletId: user.outletId
        }
      };
    }
    // Merchant role: can see all products from all outlets (no additional filtering needed)

    // Add search filter
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { barcode: { contains: search } }
      ];
    }

    // Add category filter
    if (categoryId) {
      where.categoryId = parseInt(categoryId);
    }

    // Add outlet filter
    if (outletId) {
      where.outletId = parseInt(outletId);
    }

    // Add availability filter
    if (available !== undefined) {
      if (available === 'true') {
        where.available = { gt: 0 };
      } else if (available === 'false') {
        where.available = 0;
      }
    }

    // Build order by clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Get total count
    const total = await prisma.product.count({ where });

    // Get products with pagination
    const products = await prisma.product.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      select: {
        id: true,
        publicId: true,
        name: true,
        description: true,
        barcode: true,
        totalStock: true,
        rentPrice: true,
        salePrice: true,
        deposit: true,
        images: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            publicId: true,
            name: true
          }
        },
        outletStock: {
          select: {
            stock: true,
            available: true,
            renting: true,
            outlet: {
              select: {
                id: true,
                publicId: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            orderItems: true
          }
        }
      }
    });

    // Transform data for frontend
    const transformedProducts = products.map(product => {
      // Calculate total stock across all outlets
      const totalStock = product.outletStock.reduce((sum, stock) => sum + stock.stock, 0);
      const totalRenting = product.outletStock.reduce((sum, stock) => sum + stock.renting, 0);
      const totalAvailable = product.outletStock.reduce((sum, stock) => sum + stock.available, 0);
      
      // Get primary outlet (first one with stock)
      const primaryOutlet = product.outletStock.find(stock => stock.stock > 0)?.outlet || 
                           product.outletStock[0]?.outlet || null;

      return {
        id: product.publicId,
        name: product.name,
        description: product.description,
        barcode: product.barcode,
        stock: totalStock,
        renting: totalRenting,
        available: totalAvailable,
        rentPrice: product.rentPrice,
        salePrice: product.salePrice,
        deposit: product.deposit,
        images: product.images,
        isActive: product.isActive,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        outlet: primaryOutlet ? {
          id: primaryOutlet.publicId,
          name: primaryOutlet.name
        } : null,
        category: product.category ? {
          id: product.category.publicId,
          name: product.category.name
        } : null,
        orderCount: product._count.orderItems
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        products: transformedProducts,
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Error fetching merchant products:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

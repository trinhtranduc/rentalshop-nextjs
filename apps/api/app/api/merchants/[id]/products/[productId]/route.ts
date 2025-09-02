import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { verifyTokenSimple } from '@rentalshop/auth';

// GET: Fetch product detail for editing (includes categories and outlets for the merchant)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: 'Access token required' }, { status: 401 });
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    const merchantPublicId = parseInt(params.id);
    const productPublicId = parseInt(params.productId);
    if (isNaN(merchantPublicId) || isNaN(productPublicId)) {
      return NextResponse.json({ success: false, message: 'Invalid IDs' }, { status: 400 });
    }

    const merchant = await prisma.merchant.findUnique({ where: { publicId: merchantPublicId }, select: { id: true } });
    if (!merchant) {
      return NextResponse.json({ success: false, message: 'Merchant not found' }, { status: 404 });
    }

    const product = await prisma.product.findFirst({
      where: { publicId: productPublicId, merchantId: merchant.id },
      select: {
        id: true,
        publicId: true,
        name: true,
        description: true,
        barcode: true,
        rentPrice: true,
        salePrice: true,
        deposit: true,
        totalStock: true,
        images: true,
        isActive: true,
        category: { select: { id: true, publicId: true, name: true } },
        outletStock: {
          select: {
            stock: true,
            outlet: { select: { id: true, publicId: true, name: true } }
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    // Fetch auxiliary data
    const [categories, outlets] = await Promise.all([
      prisma.category.findMany({
        where: { merchantId: merchant.id, isActive: true },
        select: { id: true, publicId: true, name: true }
      }),
      prisma.outlet.findMany({
        where: { merchantId: merchant.id },
        select: { id: true, publicId: true, name: true, address: true }
      })
    ]);

    const transformed = {
      product: {
        id: product.publicId,
        name: product.name,
        description: product.description || '',
        barcode: product.barcode || '',
        categoryId: product.category ? product.category.publicId : undefined,
        rentPrice: product.rentPrice || 0,
        salePrice: product.salePrice || 0,
        deposit: product.deposit || 0,
        totalStock: product.totalStock || 0,
        images: Array.isArray(product.images) ? product.images : (product.images ? [product.images] : []),
        isActive: product.isActive,
        outletStock: product.outletStock.map(os => ({ outletId: os.outlet.publicId, stock: os.stock }))
      },
      categories: categories.map(c => ({ id: c.publicId, name: c.name })),
      outlets: outlets.map(o => ({ id: o.publicId, name: o.name, address: o.address || '' }))
    };

    return NextResponse.json({ success: true, data: transformed });
  } catch (error) {
    console.error('Error fetching product detail:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch product' }, { status: 500 });
  }
}

// PUT: Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: 'Access token required' }, { status: 401 });
    }
    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    const merchantPublicId = parseInt(params.id);
    const productPublicId = parseInt(params.productId);
    if (isNaN(merchantPublicId) || isNaN(productPublicId)) {
      return NextResponse.json({ success: false, message: 'Invalid IDs' }, { status: 400 });
    }

    const body = await request.json();
    // Expecting ProductInput shape from frontend
    const {
      name,
      description,
      barcode,
      categoryId,
      rentPrice,
      salePrice,
      deposit,
      totalStock,
      images,
      outletStock
    } = body || {};

    const merchant = await prisma.merchant.findUnique({ where: { publicId: merchantPublicId }, select: { id: true } });
    if (!merchant) {
      return NextResponse.json({ success: false, message: 'Merchant not found' }, { status: 404 });
    }

    const existing = await prisma.product.findFirst({
      where: { publicId: productPublicId, merchantId: merchant.id },
      select: { id: true }
    });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    // Resolve category CUID from publicId
    let categoryCuid: string | undefined = undefined;
    if (typeof categoryId === 'number') {
      const category = await prisma.category.findUnique({ where: { publicId: categoryId }, select: { id: true } });
      if (category) categoryCuid = category.id;
    }

    // Update main product fields
    const updated = await prisma.product.update({
      where: { id: existing.id },
      data: {
        name,
        description: description ?? null,
        barcode: barcode ?? null,
        categoryId: categoryCuid ?? undefined,
        rentPrice,
        salePrice: salePrice ?? null,
        deposit,
        totalStock,
        images: Array.isArray(images) ? images : images ? [images] : [],
        isActive: body.isActive ?? true
      },
      select: {
        id: true,
        publicId: true,
        name: true,
        description: true,
        barcode: true,
        rentPrice: true,
        salePrice: true,
        deposit: true,
        totalStock: true,
        images: true,
        isActive: true,
        updatedAt: true
      }
    });

    // NOTE: For now, skip updating outletStock to keep operation simple and fast.
    // A follow-up endpoint can manage outlet stock in detail if required.

    return NextResponse.json({ success: true, data: { id: updated.publicId, ...updated } });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ success: false, message: 'Failed to update product' }, { status: 500 });
  }
}



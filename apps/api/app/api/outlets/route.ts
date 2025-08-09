import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import { outletsQuerySchema } from '@rentalshop/utils';
import { assertAnyRole, getUserScope } from '@rentalshop/auth';
import crypto from 'crypto';

/**
 * GET /api/outlets
 * Get all outlets
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

    // Authorization: ADMIN and MERCHANT can list outlets
    try {
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT']);
    } catch {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = outletsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid query', error: parsed.error.flatten() }, { status: 400 });
    }

    const q = parsed.data;
    const skip = (q.page - 1) * q.limit;

    const where: any = {
      ...(q.isActive !== undefined ? { isActive: q.isActive } : { isActive: true }),
      ...(q.merchantId ? { merchantId: q.merchantId } : {}),
      ...(q.search
        ? { OR: [
            { name: { contains: q.search, mode: 'insensitive' } },
            { address: { contains: q.search, mode: 'insensitive' } },
            { description: { contains: q.search, mode: 'insensitive' } },
          ] }
        : {}),
    };

    const [outlets, total] = await Promise.all([
      prisma.outlet.findMany({
        where,
        select: { id: true, name: true, address: true, description: true },
        orderBy: { name: 'asc' },
        skip,
        take: q.limit,
      }),
      prisma.outlet.count({ where }),
    ]);

    const totalPages = Math.ceil(total / q.limit);
    const payload = { success: true, data: { outlets, total, page: q.page, totalPages } };
    const bodyString = JSON.stringify(payload);
    const etag = crypto.createHash('sha1').update(bodyString).digest('hex');
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });
    }
    return new NextResponse(bodyString, { status: 200, headers: { 'Content-Type': 'application/json', ETag: etag, 'Cache-Control': 'private, max-age=60' } });
  } catch (error) {
    console.error('Error fetching outlets:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch outlets' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';

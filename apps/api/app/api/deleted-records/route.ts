import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { prisma } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';

type EntityType = 'User' | 'Customer' | 'Order';

/**
 * GET /api/deleted-records - List soft-deleted records by entity type
 * ADMIN only; returns deleted users, customers, orders (with deletedAt set)
 */
export const GET = withAuthRoles(['ADMIN'])(async (request, { user, userScope }) => {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = (searchParams.get('entityType') || 'User') as EntityType;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50') || 50, 100);
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0);

    if (!['User', 'Customer', 'Order'].includes(entityType)) {
      return NextResponse.json(ResponseBuilder.error('INVALID_ENTITY_TYPE'), { status: 400 });
    }

    let items: any[] = [];
    let total = 0;

    if (entityType === 'User') {
      const users = await prisma.user.findMany({
        where: { deletedAt: { not: null } },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, deletedAt: true },
        orderBy: { deletedAt: 'desc' },
        take: limit,
        skip: offset
      });
      total = await prisma.user.count({ where: { deletedAt: { not: null } } });
      items = users.map((u) => ({ id: u.id, type: 'User', label: u.email, deletedAt: u.deletedAt, ...u }));
    } else if (entityType === 'Customer') {
      const customers = await prisma.customer.findMany({
        where: { OR: [{ deletedAt: { not: null } }, { isActive: false }] },
        select: { id: true, firstName: true, lastName: true, phone: true, email: true, deletedAt: true, isActive: true },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset
      });
      total = await prisma.customer.count({
        where: { OR: [{ deletedAt: { not: null } }, { isActive: false }] }
      });
      items = customers.map((c) => ({
        id: c.id,
        type: 'Customer',
        label: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.phone || c.email || String(c.id),
        deletedAt: c.deletedAt,
        ...c
      }));
    } else if (entityType === 'Order') {
      const orders = await prisma.order.findMany({
        where: { deletedAt: { not: null } },
        select: { id: true, orderNumber: true, status: true, totalAmount: true, deletedAt: true },
        orderBy: { deletedAt: 'desc' },
        take: limit,
        skip: offset
      });
      total = await prisma.order.count({ where: { deletedAt: { not: null } } });
      items = orders.map((o) => ({
        id: o.id,
        type: 'Order',
        label: o.orderNumber,
        deletedAt: o.deletedAt,
        ...o
      }));
    }

    return NextResponse.json({
      success: true,
      data: items,
      pagination: { total, limit, offset, hasMore: offset + limit < total }
    });
  } catch (error) {
    console.error('Error fetching deleted records:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

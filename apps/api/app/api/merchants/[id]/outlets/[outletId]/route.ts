import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withPermissions, validateMerchantAccess } from '@rentalshop/auth/server';
import { handleApiError, ResponseBuilder, outletUpdateSchema } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

function toOutletDetail(outlet: {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  city?: string | null;
  _count?: { users: number; orders: number; products: number };
}) {
  return {
    id: outlet.id,
    name: outlet.name,
    address: outlet.address || '',
    phone: outlet.phone || '',
    description: outlet.description || '',
    isActive: outlet.isActive,
    isDefault: outlet.isDefault,
    city: outlet.city || null,
    createdAt: outlet.createdAt,
    updatedAt: outlet.updatedAt,
    stats: {
      totalUsers: outlet._count?.users || 0,
      totalProducts: outlet._count?.products || 0,
      totalOrders: outlet._count?.orders || 0
    }
  };
}

/**
 * GET /api/merchants/[id]/outlets/[outletId]
 * Outlet detail for the admin merchant shop page.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; outletId: string }> | { id: string; outletId: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id, 10);
  const outletPublicId = parseInt(resolvedParams.outletId, 10);

  return withPermissions(['outlet.view'])(async (request, { user, userScope }) => {
    try {
      const validation = await validateMerchantAccess(
        merchantPublicId,
        user,
        userScope,
        outletPublicId
      );
      if (!validation.valid) {
        return validation.error!;
      }

      const outlet = validation.outlet || (await db.outlets.findById(outletPublicId));
      if (!outlet) {
        return NextResponse.json(ResponseBuilder.error('OUTLET_NOT_FOUND'), {
          status: API.STATUS.NOT_FOUND
        });
      }

      return NextResponse.json(ResponseBuilder.success('OUTLET_FOUND', toOutletDetail(outlet)));
    } catch (error) {
      console.error('Error fetching merchant outlet:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * PUT /api/merchants/[id]/outlets/[outletId]
 * Update an outlet from the admin merchant shop page.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; outletId: string }> | { id: string; outletId: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id, 10);
  const outletPublicId = parseInt(resolvedParams.outletId, 10);

  return withPermissions(['outlet.manage'])(async (request, { user, userScope }) => {
    try {
      const validation = await validateMerchantAccess(
        merchantPublicId,
        user,
        userScope,
        outletPublicId
      );
      if (!validation.valid) {
        return validation.error!;
      }

      const body = await request.json();
      const parsed = outletUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), {
          status: API.STATUS.BAD_REQUEST
        });
      }

      const { status, ...updateData } = parsed.data;
      const updated = await db.outlets.update(outletPublicId, updateData);
      const withCounts = await db.outlets.findById(outletPublicId);

      return NextResponse.json(
        ResponseBuilder.success('OUTLET_UPDATED_SUCCESS', toOutletDetail(withCounts || updated))
      );
    } catch (error) {
      console.error('Error updating merchant outlet:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

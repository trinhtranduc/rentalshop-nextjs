import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth/server';
import { 
  handleApiError,
  ResponseBuilder,
} from '@rentalshop/utils';

/**
 * Helper to parse and validate addon ID from params
 */
async function parseAddonId(params: Promise<{ id: string }> | { id: string }): Promise<number | null> {
  const resolvedParams = await Promise.resolve(params);
  const id = parseInt(resolvedParams.id);
  return isNaN(id) ? null : id;
}

/**
 * GET /api/plan-limit-addons/[id]
 * Get a specific plan limit addon by ID
 * Authorization: ADMIN only
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  return withAuthRoles(['ADMIN'])(async (request) => {
    try {
      const id = await parseAddonId(params);
      if (!id) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_INPUT'),
          { status: 400 }
        );
      }

      const addon = await db.planLimitAddons.findById(id);
      if (!addon) {
        return NextResponse.json(
          ResponseBuilder.error('PLAN_LIMIT_ADDON_NOT_FOUND'),
          { status: 404 }
        );
      }

      return NextResponse.json(
        ResponseBuilder.success('PLAN_LIMIT_ADDON_FOUND', addon)
      );
    } catch (error) {
      console.error('Error fetching plan limit addon:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * PUT: add-ons are managed as modules since #782 (see /api/billing-modules and /api/merchants/[id]/modules).
 * The old rows stay readable; writing answers 410.
 */
export async function PUT(_request: NextRequest, _context?: unknown) {
  return NextResponse.json(ResponseBuilder.error('ADDONS_REPLACED_BY_MODULES'), { status: 410 });
}

/**
 * DELETE: add-ons are managed as modules since #782 (see /api/billing-modules and /api/merchants/[id]/modules).
 * The old rows stay readable; writing answers 410.
 */
export async function DELETE(_request: NextRequest, _context?: unknown) {
  return NextResponse.json(ResponseBuilder.error('ADDONS_REPLACED_BY_MODULES'), { status: 410 });
}


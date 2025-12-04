import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { 
  planLimitAddonUpdateSchema,
  handleApiError,
  ResponseBuilder 
} from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

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
      const resolvedParams = await Promise.resolve(params);
      const id = parseInt(resolvedParams.id);

      if (isNaN(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_ID', 'Invalid addon ID'),
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
 * PUT /api/plan-limit-addons/[id]
 * Update a plan limit addon
 * Authorization: ADMIN only
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  return withAuthRoles(['ADMIN'])(async (request) => {
    try {
      const resolvedParams = await Promise.resolve(params);
      const id = parseInt(resolvedParams.id);

      if (isNaN(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_ID', 'Invalid addon ID'),
          { status: 400 }
        );
      }

      // Verify addon exists
      const existingAddon = await db.planLimitAddons.findById(id);
      if (!existingAddon) {
        return NextResponse.json(
          ResponseBuilder.error('PLAN_LIMIT_ADDON_NOT_FOUND'),
          { status: 404 }
        );
      }

      const body = await request.json();
      
      // Validate input
      const parsed = planLimitAddonUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        );
      }

      // Update plan limit addon
      const addon = await db.planLimitAddons.update(id, parsed.data);

      return NextResponse.json(
        ResponseBuilder.success('PLAN_LIMIT_ADDON_UPDATED_SUCCESS', addon)
      );
    } catch (error) {
      console.error('Error updating plan limit addon:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * DELETE /api/plan-limit-addons/[id]
 * Delete a plan limit addon
 * Authorization: ADMIN only
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  return withAuthRoles(['ADMIN'])(async (request) => {
    try {
      const resolvedParams = await Promise.resolve(params);
      const id = parseInt(resolvedParams.id);

      if (isNaN(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_ID', 'Invalid addon ID'),
          { status: 400 }
        );
      }

      // Verify addon exists
      const existingAddon = await db.planLimitAddons.findById(id);
      if (!existingAddon) {
        return NextResponse.json(
          ResponseBuilder.error('PLAN_LIMIT_ADDON_NOT_FOUND'),
          { status: 404 }
        );
      }

      // Delete plan limit addon
      await db.planLimitAddons.delete(id);

      return NextResponse.json(
        ResponseBuilder.success('PLAN_LIMIT_ADDON_DELETED_SUCCESS')
      );
    } catch (error) {
      console.error('Error deleting plan limit addon:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}


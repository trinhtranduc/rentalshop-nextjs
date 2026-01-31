import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { 
  planLimitAddonUpdateSchema,
  handleApiError,
  ResponseBuilder,
  validateAddonDeletion,
  sendPlanLimitAddonChangeEmail
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
      const id = await parseAddonId(params);
      if (!id) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_INPUT'),
          { status: 400 }
        );
      }

      const existingAddon = await db.planLimitAddons.findById(id);
      if (!existingAddon) {
        return NextResponse.json(
          ResponseBuilder.error('PLAN_LIMIT_ADDON_NOT_FOUND'),
          { status: 404 }
        );
      }

      const body = await request.json();
      const parsed = planLimitAddonUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        );
      }

      const addon = await db.planLimitAddons.update(id, parsed.data);
      
      // Send email notification (non-blocking) - TEMPORARILY DISABLED
      // if (addon.merchant?.email) {
      //   console.log('📨 [Addon] Sending addon updated email...', {
      //     to: addon.merchant.email,
      //     merchantName: addon.merchant.name,
      //     addonLimits: {
      //       outlets: addon.outlets,
      //       users: addon.users,
      //       products: addon.products,
      //       customers: addon.customers,
      //       orders: addon.orders
      //     },
      //     isActive: addon.isActive,
      //     provider: process.env.EMAIL_PROVIDER || 'console'
      //   });
      //   
      //   const action = addon.isActive !== existingAddon.isActive
      //     ? (addon.isActive ? 'ACTIVATED' : 'DEACTIVATED')
      //     : 'UPDATED';
      //   
      //   sendPlanLimitAddonChangeEmail({
      //     merchantName: addon.merchant.name || 'Quý khách',
      //     email: addon.merchant.email,
      //     action,
      //     addonLimits: {
      //       outlets: addon.outlets,
      //       users: addon.users,
      //       products: addon.products,
      //       customers: addon.customers,
      //       orders: addon.orders
      //     },
      //     notes: addon.notes || undefined
      //   })
      //     .then((emailResult) => {
      //       console.log('📬 [Addon] Addon updated email result:', {
      //         success: emailResult.success,
      //         error: emailResult.error,
      //         messageId: emailResult.messageId,
      //         provider: process.env.EMAIL_PROVIDER
      //       });
      //     })
      //     .catch((error) => {
      //       console.error('❌ [Addon] Failed to send addon updated email:', error);
      //     });
      // } else {
      //   console.warn('⚠️ [Addon] Cannot send addon updated email: merchant email not found');
      // }
      
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
 * 
 * Validates that deletion won't cause plan limits to be exceeded.
 * Only validates active addons (inactive addons don't affect limits).
 * 
 * Authorization: ADMIN only
 */
export async function DELETE(
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

      const existingAddon = await db.planLimitAddons.findById(id);
      if (!existingAddon) {
        return NextResponse.json(
          ResponseBuilder.error('PLAN_LIMIT_ADDON_NOT_FOUND'),
          { status: 404 }
        );
      }

      // Validate deletion only for active addons
      if (existingAddon.isActive) {
        const validation = await validateAddonDeletion(existingAddon.merchantId, {
          outlets: existingAddon.outlets,
          users: existingAddon.users,
          products: existingAddon.products,
          customers: existingAddon.customers,
          orders: existingAddon.orders,
        });

        if (!validation.isValid && validation.exceededLimits) {
          const exceededDetails = validation.exceededLimits
            .map(limit => `${limit.entityType}: ${limit.current} > ${limit.futureLimit}`)
            .join(', ');

          const errorResponse = ResponseBuilder.error('CANNOT_DELETE_ADDON_LIMIT_EXCEEDED');
          errorResponse.error = {
            message: errorResponse.message,
            exceededLimits: validation.exceededLimits,
            currentCounts: validation.currentCounts,
            futureLimits: validation.futureLimits,
            details: exceededDetails,
          };

          return NextResponse.json(errorResponse, { status: 422 });
        }
      }

      await db.planLimitAddons.delete(id);
      
      // Send email notification (non-blocking) - TEMPORARILY DISABLED
      // if (existingAddon.merchant?.email) {
      //   console.log('📨 [Addon] Sending addon deleted email...', {
      //     to: existingAddon.merchant.email,
      //     merchantName: existingAddon.merchant.name,
      //     addonLimits: {
      //       outlets: existingAddon.outlets,
      //       users: existingAddon.users,
      //       products: existingAddon.products,
      //       customers: existingAddon.customers,
      //       orders: existingAddon.orders
      //     },
      //     provider: process.env.EMAIL_PROVIDER || 'console'
      //   });
      //   
      //   sendPlanLimitAddonChangeEmail({
      //     merchantName: existingAddon.merchant.name || 'Quý khách',
      //     email: existingAddon.merchant.email,
      //     action: 'DELETED',
      //     addonLimits: {
      //       outlets: existingAddon.outlets,
      //       users: existingAddon.users,
      //       products: existingAddon.products,
      //       customers: existingAddon.customers,
      //       orders: existingAddon.orders
      //     },
      //     notes: existingAddon.notes || undefined
      //   })
      //     .then((emailResult) => {
      //       console.log('📬 [Addon] Addon deleted email result:', {
      //         success: emailResult.success,
      //         error: emailResult.error,
      //         messageId: emailResult.messageId,
      //         provider: process.env.EMAIL_PROVIDER
      //       });
      //     })
      //     .catch((error) => {
      //       console.error('❌ [Addon] Failed to send addon deleted email:', error);
      //     });
      // } else {
      //   console.warn('⚠️ [Addon] Cannot send addon deleted email: merchant email not found');
      // }
      
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


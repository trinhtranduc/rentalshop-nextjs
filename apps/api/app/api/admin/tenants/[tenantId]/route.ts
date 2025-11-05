import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { getTenantById, updateTenant } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Validation schema for tenant update
const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  businessType: z.string().optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal('')),
  description: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  subscriptionStatus: z.enum(['trial', 'active', 'past_due', 'canceled']).optional(),
  planId: z.number().int().positive().optional().nullable(),
  currentPeriodStart: z.string().datetime().optional().nullable(),
  currentPeriodEnd: z.string().datetime().optional().nullable(),
  trialStart: z.string().datetime().optional().nullable(),
  trialEnd: z.string().datetime().optional().nullable(),
  canceledAt: z.string().datetime().optional().nullable(),
  cancelReason: z.string().optional().nullable(),
});

/**
 * GET /api/admin/tenants/{tenantId}
 * Get tenant by ID (Admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  return withAuthRoles(['ADMIN'])(async (request, { user }) => {
    try {
      const { tenantId } = params;

      // Validate tenantId
      if (!tenantId) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_ID_REQUIRED', 'Tenant ID is required'),
          { status: 400 }
        );
      }

      // Get tenant from Main DB
      const tenant = await getTenantById(tenantId);
      if (!tenant) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_NOT_FOUND', 'Tenant not found'),
          { status: 404 }
        );
      }

      // Transform tenant to match expected format (mask database URL)
      const tenantResponse = {
        ...tenant,
        databaseUrl: tenant.databaseUrl ? '***masked***' : null,
        tenantUrl: `${tenant.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'anyrent.shop'}`,
      };

      return NextResponse.json(
        ResponseBuilder.success('TENANT_FOUND', {
          tenant: tenantResponse,
        })
      );
    } catch (error: any) {
      console.error('Get tenant error:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * PUT /api/admin/tenants/{tenantId}
 * Update tenant (Admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  return withAuthRoles(['ADMIN'])(async (request, { user }) => {
    try {
      const { tenantId } = params;

      // Validate tenantId
      if (!tenantId) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_ID_REQUIRED', 'Tenant ID is required'),
          { status: 400 }
        );
      }

      // Check if tenant exists
      const existingTenant = await getTenantById(tenantId);
      if (!existingTenant) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_NOT_FOUND', 'Tenant not found'),
          { status: 404 }
        );
      }

      // Parse and validate request body
      const body = await request.json();
      const validatedData = updateTenantSchema.safeParse(body);

      if (!validatedData.success) {
        return NextResponse.json(
          {
            success: false,
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            errors: validatedData.error.flatten(),
          },
          { status: 400 }
        );
      }

      // Transform date strings to Date objects if present
      const updateData: any = { ...validatedData.data };
      if (updateData.currentPeriodStart) {
        updateData.currentPeriodStart = new Date(updateData.currentPeriodStart);
      }
      if (updateData.currentPeriodEnd) {
        updateData.currentPeriodEnd = new Date(updateData.currentPeriodEnd);
      }
      if (updateData.trialStart) {
        updateData.trialStart = new Date(updateData.trialStart);
      }
      if (updateData.trialEnd) {
        updateData.trialEnd = new Date(updateData.trialEnd);
      }
      if (updateData.canceledAt) {
        updateData.canceledAt = new Date(updateData.canceledAt);
      }

      // Handle empty string for website (convert to null)
      if (updateData.website === '') {
        updateData.website = null;
      }

      // Update tenant
      const updatedTenant = await updateTenant(tenantId, updateData);

      // Transform tenant to match expected format (mask database URL)
      const tenantResponse = {
        ...updatedTenant,
        databaseUrl: updatedTenant.databaseUrl ? '***masked***' : null,
        tenantUrl: `${updatedTenant.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'anyrent.shop'}`,
      };

      return NextResponse.json(
        ResponseBuilder.success('TENANT_UPDATED', {
          tenant: tenantResponse,
        })
      );
    } catch (error: any) {
      console.error('Update tenant error:', error);

      // Handle specific error cases
      if (error.message?.includes('not found')) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_NOT_FOUND', error.message),
          { status: 404 }
        );
      }

      if (error.message?.includes('No fields to update')) {
        return NextResponse.json(
          ResponseBuilder.error('NO_FIELDS_TO_UPDATE', 'No fields provided to update'),
          { status: 400 }
        );
      }

      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}


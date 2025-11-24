import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { SUBSCRIPTION_STATUS } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/plans/[id]
 * Get plan by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN'])(async (request: NextRequest, { user, userScope }) => {
    try {
      const { id } = params;
      console.log('🔍 GET /api/plans/[id] - Looking for plan with ID:', id);

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_PLAN_ID_FORMAT'),
          { status: 400 }
        );
      }

      const planId = parseInt(id);
      
      // Get plan using the simplified database API
      const plan = await db.plans.findById(planId);

      if (!plan) {
        console.log('❌ Plan not found in database for planId:', planId);
        return NextResponse.json(
          ResponseBuilder.error('PLAN_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      console.log('✅ Plan found:', plan);

      // Transform response to match Plan interface
      // Handle limits and features - they may be JSON strings or already parsed
      let limits: any;
      let features: string[];

      try {
        limits = typeof plan.limits === 'string' 
          ? JSON.parse(plan.limits) 
          : plan.limits || {};
      } catch (e) {
        console.error('❌ Error parsing limits:', e);
        limits = {};
      }

      try {
        features = typeof plan.features === 'string' 
          ? JSON.parse(plan.features || '[]') 
          : (Array.isArray(plan.features) ? plan.features : []);
      } catch (e) {
        console.error('❌ Error parsing features:', e);
        features = [];
      }

      // Generate pricing from basePrice
      const generatePlanPricing = (basePrice: number) => {
        return {
          monthly: {
            price: basePrice,
            discount: 0,
            savings: 0
          },
          quarterly: {
            price: basePrice * 3,
            discount: 0,
            savings: 0
          },
          semi_annual: {
            price: basePrice * 6 * 0.95,
            discount: 5,
            savings: basePrice * 6 * 0.05
          },
          annual: {
            price: basePrice * 12 * 0.90,
            discount: 10,
            savings: basePrice * 12 * 0.10
          }
        };
      };

      const transformedPlan = {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        basePrice: plan.basePrice,
        currency: plan.currency || 'USD',
        trialDays: plan.trialDays || 0,
        limits: limits,
        features: features,
        isActive: plan.isActive ?? true,
        isPopular: plan.isPopular ?? false,
        sortOrder: plan.sortOrder || 0,
        pricing: generatePlanPricing(plan.basePrice),
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
        ...(plan.deletedAt && { deletedAt: plan.deletedAt })
      };

      return NextResponse.json({
        success: true,
        data: transformedPlan,
        code: 'PLAN_RETRIEVED_SUCCESS',
        message: 'Plan retrieved successfully'
      });

    } catch (error) {
      console.error('❌ Error fetching plan:', error);
      
      // Use unified error handling system (consistent with other APIs)
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * PUT /api/plans/[id]
 * Update plan by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN'])(async (req: NextRequest, { user, userScope }) => {
    try {
      const { id } = params;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_PLAN_ID_FORMAT'),
          { status: 400 }
        );
      }

      const planId = parseInt(id);

      // Parse and validate request body
      const body = await req.json();
      console.log('🔍 PUT /api/plans/[id] - Update request body:', body);

      // Check if plan exists
      const existingPlan = await db.plans.findById(planId);
      if (!existingPlan) {
        return NextResponse.json(
          ResponseBuilder.error('PLAN_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Transform data: filter out read-only fields and transform features/limits
      const updateData: any = {};
      
      // Only include allowed fields (based on Plan schema)
      const allowedFields = [
        'name', 'description', 'basePrice', 'currency', 'trialDays',
        'isActive', 'isPopular', 'sortOrder'
      ];
      
      allowedFields.forEach(field => {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      });

      // Transform limits: if it's a string (JSON), validate and keep it; if object, stringify
      if (body.limits !== undefined) {
        if (typeof body.limits === 'string') {
          // Validate JSON string
          try {
            JSON.parse(body.limits);
            updateData.limits = body.limits;
          } catch (e) {
            console.error('❌ Invalid JSON string for limits:', body.limits);
            return NextResponse.json(
              ResponseBuilder.error('INVALID_LIMITS_FORMAT', 'Limits must be a valid JSON string'),
              { status: 400 }
            );
          }
        } else if (typeof body.limits === 'object' && body.limits !== null) {
          // Convert object to JSON string
          updateData.limits = JSON.stringify(body.limits);
        }
      }

      // Transform features: if it's an array, stringify; if string, validate and keep it
      if (body.features !== undefined) {
        if (Array.isArray(body.features)) {
          // Convert array to JSON string
          updateData.features = JSON.stringify(body.features);
        } else if (typeof body.features === 'string') {
          // Validate JSON string
          try {
            JSON.parse(body.features);
            updateData.features = body.features;
          } catch (e) {
            console.error('❌ Invalid JSON string for features:', body.features);
            return NextResponse.json(
              ResponseBuilder.error('INVALID_FEATURES_FORMAT', 'Features must be a valid JSON string or array'),
              { status: 400 }
            );
          }
        }
      }

      console.log('🔍 Transformed update data:', JSON.stringify(updateData, null, 2));

      // Validate that we have at least one field to update
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          ResponseBuilder.error('NO_FIELDS_TO_UPDATE', 'No valid fields provided for update'),
          { status: 400 }
        );
      }

      // Update the plan using the simplified database API
      let updatedPlan;
      try {
        updatedPlan = await db.plans.update(planId, updateData);
        console.log('✅ Plan updated successfully:', updatedPlan);
      } catch (dbError: any) {
        console.error('❌ Database error updating plan:', dbError);
        
        // Handle specific Prisma errors
        if (dbError.code === 'P2002') {
          return NextResponse.json(
            ResponseBuilder.error('PLAN_NAME_EXISTS', `Plan with name "${updateData.name}" already exists`),
            { status: 409 }
          );
        }
        
        if (dbError.code === 'P2025') {
          return NextResponse.json(
            ResponseBuilder.error('PLAN_NOT_FOUND', 'Plan not found'),
            { status: API.STATUS.NOT_FOUND }
          );
        }
        
        throw dbError; // Re-throw to be caught by outer catch
      }
      
      // Transform response to match Plan interface
      const transformedPlan = {
        id: updatedPlan.id,
        name: updatedPlan.name,
        description: updatedPlan.description,
        basePrice: updatedPlan.basePrice,
        currency: updatedPlan.currency,
        trialDays: updatedPlan.trialDays,
        limits: typeof updatedPlan.limits === 'string' ? JSON.parse(updatedPlan.limits) : updatedPlan.limits,
        features: typeof updatedPlan.features === 'string' ? JSON.parse(updatedPlan.features || '[]') : updatedPlan.features,
        isActive: updatedPlan.isActive,
        isPopular: updatedPlan.isPopular,
        sortOrder: updatedPlan.sortOrder,
        createdAt: updatedPlan.createdAt,
        updatedAt: updatedPlan.updatedAt,
      };

      return NextResponse.json({
        success: true,
        data: transformedPlan,
        code: 'PLAN_UPDATED_SUCCESS',
        message: 'Plan updated successfully'
      });

    } catch (error) {
      console.error('❌ Error updating plan:', error);
      
      // Use unified error handling system (consistent with other APIs)
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * DELETE /api/plans/[id]
 * Delete plan by ID (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN'])(async (request: NextRequest, { user, userScope }) => {
    try {
      const { id } = params;

      // Check if the ID is numeric (public ID)
      if (!/^\d+$/.test(id)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_PLAN_ID_FORMAT'),
          { status: 400 }
        );
      }

      const planId = parseInt(id);

      // Check if plan exists
      const existingPlan = await db.plans.findById(planId);
      if (!existingPlan) {
        return NextResponse.json(
          ResponseBuilder.error('PLAN_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Check if plan has active subscriptions
      const activeSubscriptions = await db.subscriptions.getStats({
        planId: planId,
        status: { in: [SUBSCRIPTION_STATUS.ACTIVE as any, SUBSCRIPTION_STATUS.TRIAL as any] }
      });

      if (activeSubscriptions > 0) {
        console.log('❌ Cannot delete plan with active subscriptions:', activeSubscriptions);
        return NextResponse.json(
          ResponseBuilder.error('PLAN_HAS_ACTIVE_SUBSCRIPTIONS', `Cannot delete plan with ${activeSubscriptions} active subscription(s). Please wait for subscriptions to expire or cancel them first.`),
          { status: API.STATUS.CONFLICT }
        );
      }

      // Soft delete by setting isActive to false
      const deletedPlan = await db.plans.update(planId, { isActive: false });
      console.log('✅ Plan soft deleted successfully:', deletedPlan);

      return NextResponse.json({
        success: true,
        data: deletedPlan,
        code: 'PLAN_DELETED_SUCCESS',
        message: 'Plan deleted successfully'
      });

    } catch (error) {
      console.error('❌ Error deleting plan:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
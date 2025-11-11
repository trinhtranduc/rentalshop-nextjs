import { NextResponse } from 'next/server';
import type { AuthContext } from '@rentalshop/auth';
import { assertPlanLimit } from '@rentalshop/utils';
import type { PlanRecord } from '@rentalshop/database';

type TenantFeature = string;

function getPlanFeatures(plan: PlanRecord | undefined | null): TenantFeature[] {
  if (!plan || !plan.features) {
    return [];
  }

  try {
    const features = Array.isArray(plan.features) ? plan.features : JSON.parse(JSON.stringify(plan.features));
    return features
      .map((feature: any) => feature?.name)
      .filter((name: unknown): name is string => typeof name === 'string');
  } catch (error) {
    console.warn('Failed to parse plan features, defaulting to empty.', error);
    return [];
  }
}

function getPlanLimits(plan: PlanRecord | undefined | null): Record<string, number> | null {
  if (!plan || !plan.limits) {
    return null;
  }

  if (typeof plan.limits === 'object' && !Array.isArray(plan.limits)) {
    return plan.limits as Record<string, number>;
  }

  try {
    return JSON.parse(JSON.stringify(plan.limits)) as Record<string, number>;
  } catch (error) {
    console.warn('Failed to parse plan limits JSON.', error);
    return null;
  }
}

export async function enforceTenantPlanLimit(
  authContext: AuthContext,
  entity: 'outlets' | 'users' | 'products' | 'customers' | 'orders',
  options?: { merchantId?: number }
): Promise<NextResponse | null> {
  const merchantId = options?.merchantId ?? authContext.userScope?.merchantId;

  if (!merchantId) {
    return null;
  }

  try {
    await assertPlanLimit(merchantId, entity);
    return null;
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        code: 'PLAN_LIMIT_EXCEEDED',
        message: error?.message || `Plan limit exceeded for ${entity}`,
      },
      { status: 403 }
    );
  }
}

export function assertTenantFeature(
  authContext: AuthContext,
  featureName: TenantFeature
): NextResponse | null {
  const plan = authContext.tenantPlan;
  if (!plan) {
    return null;
  }

  const features = getPlanFeatures(plan);

  if (features.includes(featureName)) {
    return null;
  }

  return NextResponse.json(
    {
      success: false,
      code: 'PLAN_FEATURE_REQUIRED',
      message: `Current plan does not include feature "${featureName}".`,
    },
    { status: 403 }
  );
}


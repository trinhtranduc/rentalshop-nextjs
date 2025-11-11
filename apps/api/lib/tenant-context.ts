import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { AuthContext } from '@rentalshop/auth';
import {
  db,
  withTenantContext,
  tenantManager,
  TenantContext as DatabaseTenantContext,
  TenantManagerError,
  TenantNotFoundError,
  TenantInactiveError,
  TenantSubscriptionError,
  type TenantIdentifier,
} from '@rentalshop/database';

export interface TenantHandlerContext extends DatabaseTenantContext {
  db: typeof db;
}

interface ResolveTenantOptions {
  fallbackTenantKey?: string;
}

function resolveTenantIdentifier(
  request: NextRequest,
  authContext: AuthContext | undefined,
  options?: ResolveTenantOptions
): TenantIdentifier | null {
  const headerTenantId = request.headers.get('x-tenant-id') ?? undefined;
  const headerTenantKey =
    request.headers.get('x-tenant-key') ??
    request.headers.get('x-tenant') ??
    undefined;

  const contextTenantId =
    (authContext?.user?.tenantId as string | undefined) ??
    (authContext?.user?.tenant?.id as string | undefined);
  const contextTenantKey =
    (authContext?.user?.tenantKey as string | undefined) ??
    (authContext?.user?.tenant?.tenantKey as string | undefined);

  const tenantId = headerTenantId ?? contextTenantId ?? undefined;
  const tenantKey =
    headerTenantKey ??
    contextTenantKey ??
    options?.fallbackTenantKey ??
    process.env.DEFAULT_TENANT_KEY ??
    undefined;

  if (!tenantId && !tenantKey) {
    return null;
  }

  return {
    tenantId: tenantId ?? undefined,
    tenantKey: tenantKey ?? undefined,
  };
}

function mapTenantErrorToResponse(error: TenantManagerError) {
  const details =
    error instanceof TenantNotFoundError ||
    error instanceof TenantInactiveError ||
    error instanceof TenantSubscriptionError
      ? { code: error.code, message: error.message }
      : { code: 'TENANT_ERROR', message: error.message };

  if (error instanceof TenantNotFoundError) {
    return NextResponse.json(
      {
        success: false,
        code: details.code,
        message: 'Tenant not found',
        details,
      },
      { status: 404 }
    );
  }

  if (error instanceof TenantInactiveError) {
    return NextResponse.json(
      {
        success: false,
        code: details.code,
        message: 'Tenant is inactive',
        details,
      },
      { status: 403 }
    );
  }

  if (error instanceof TenantSubscriptionError) {
    return NextResponse.json(
      {
        success: false,
        code: details.code,
        message: 'Tenant subscription is not active',
        details,
      },
      { status: 402 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      code: details.code,
      message: 'Failed to resolve tenant',
      details,
    },
    { status: 500 }
  );
}

export async function withTenantFromRequest<T>(
  request: NextRequest,
  authContext: AuthContext | undefined,
  handler: (context: TenantHandlerContext) => Promise<T>,
  options?: ResolveTenantOptions
): Promise<T | NextResponse> {
  const identifier = resolveTenantIdentifier(request, authContext, options);

  if (!identifier) {
    return NextResponse.json(
      {
        success: false,
        code: 'TENANT_IDENTIFIER_MISSING',
        message: 'Tenant identifier is required (provide X-Tenant-Key or ensure user has tenant association).',
      },
      { status: 400 }
    );
  }

  try {
    return await withTenantContext(identifier, async (tenantContext) =>
      handler({
        ...tenantContext,
        db,
      })
    );
  } catch (error) {
    if (error instanceof TenantManagerError) {
      console.error('Tenant resolution error:', error);
      return mapTenantErrorToResponse(error);
    }

    console.error('Unexpected tenant context error:', error);
    return NextResponse.json(
      {
        success: false,
        code: 'TENANT_CONTEXT_ERROR',
        message: 'Unexpected error establishing tenant context',
      },
      { status: 500 }
    );
  }
}

export { tenantManager as tenantRegistryManager };


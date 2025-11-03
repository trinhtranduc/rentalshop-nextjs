import { NextRequest, NextResponse } from 'next/server';
import { getMainDb, getTenantDb } from '@rentalshop/database';
import { comparePassword, generateToken } from '@rentalshop/auth';
import { loginSchema, ResponseBuilder } from '@rentalshop/utils';
import { handleApiError } from '@rentalshop/utils';
import { hash } from 'bcryptjs';
import { compare } from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    // Get subdomain from header (Phase 1: header-based detection)
    const subdomain = request.headers.get('x-subdomain') || body.subdomain;
    
    // Validate input
    const validatedData = loginSchema.parse(body);
    
    // Admin login (no subdomain) - use Main DB
    if (!subdomain) {
      const mainDb = await getMainDb();
      await mainDb.connect();
      
      try {
        const result = await mainDb.query(
          'SELECT id, email, password, "firstName", "lastName", phone, role, "isActive", "createdAt", "updatedAt" FROM "User" WHERE email = $1',
          [email]
        );
        
        const user = result.rows[0];
        
        if (!user || user.role !== 'ADMIN') {
          return NextResponse.json(
            ResponseBuilder.error('INVALID_CREDENTIALS'),
            { status: 401 }
          );
        }
        
        if (!user.isActive) {
          return NextResponse.json(
            ResponseBuilder.error('ACCOUNT_DEACTIVATED'),
            { status: 403 }
          );
        }
        
        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
          return NextResponse.json(
            ResponseBuilder.error('INVALID_CREDENTIALS'),
            { status: 401 }
          );
        }
        
        // Generate token for admin
        const token = generateToken({
          userId: user.id,
          email: user.email,
          role: user.role
        } as any);
        
        return NextResponse.json(
          ResponseBuilder.success('LOGIN_SUCCESS', {
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              subdomain: null
            },
            token
          })
        );
      } finally {
        await mainDb.end();
      }
    }
    
    // Tenant login (with subdomain) - use Tenant DB
    const mainDb = await getMainDb();
    await mainDb.connect();
    
    try {
      // First, verify tenant exists and is active
      const tenantResult = await mainDb.query(
        'SELECT id, subdomain, name, status FROM "Tenant" WHERE subdomain = $1',
        [subdomain]
      );
      
      const tenant = tenantResult.rows[0];
      
      if (!tenant || tenant.status !== 'active') {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_NOT_FOUND'),
          { status: 404 }
        );
      }
    } finally {
      await mainDb.end();
    }
    
    // Get tenant DB and verify user
    const tenantDb = await getTenantDb(subdomain);
    const user = await tenantDb.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_CREDENTIALS'),
        { status: 401 }
      );
    }
    
    if (!user.isActive) {
      return NextResponse.json(
        ResponseBuilder.error('ACCOUNT_DEACTIVATED'),
        { status: 403 }
      );
    }
    
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_CREDENTIALS'),
        { status: 401 }
      );
    }
    
    // Get outlet data if user has outlet assignment
    let outletData = null;
    if (user.outletId) {
      const outlet = await tenantDb.outlet.findUnique({
        where: { id: user.outletId },
        select: { id: true, name: true, address: true }
      });
      
      if (outlet) {
        outletData = {
          id: outlet.id,
          name: outlet.name,
          address: outlet.address || undefined
        };
      }
    }
    
    // Generate token for tenant user
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      subdomain: subdomain
    } as any);
    
    return NextResponse.json(
      ResponseBuilder.success('LOGIN_SUCCESS', {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          outlet: outletData,
          subdomain: subdomain
        },
        token
      })
    );
    
  } catch (error: any) {
    console.error('Login error:', error);
    
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

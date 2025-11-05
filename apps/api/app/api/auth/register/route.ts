import { NextRequest, NextResponse } from 'next/server';
import { 
  registerTenantWithTrial,
  getTenantDb
} from '@rentalshop/database';
import { registerSchema, sendVerificationEmail } from '@rentalshop/utils/api';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = registerSchema.parse(body);
    
    // Determine registration type
    const isMerchantRegistration = validatedData.role === 'MERCHANT' || !!validatedData.businessName;

    if (isMerchantRegistration) {
      // ============================================================================
      // TENANT REGISTRATION FLOW (Multi-tenant)
      // ============================================================================
      
      // Process name - get firstName and lastName
      let firstName = validatedData.firstName || '';
      let lastName = validatedData.lastName || '';
      
      if (validatedData.name && !firstName && !lastName) {
        const nameParts = validatedData.name.trim().split(/\s+/);
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }
      
      if (!firstName || !lastName) {
        return NextResponse.json(
          ResponseBuilder.error('NAME_REQUIRED', 'First name and last name are required'),
          { status: 400 }
        );
      }
      
      // Register tenant (creates tenant + database + initial setup)
      const result = await registerTenantWithTrial({
        businessName: validatedData.businessName!,
        email: validatedData.email,
        password: validatedData.password,
        firstName,
        lastName,
        phone: validatedData.phone,
        subdomain: body.subdomain, // Optional custom subdomain
        address: validatedData.address,
        city: validatedData.city,
        state: validatedData.state,
        zipCode: validatedData.zipCode,
        country: validatedData.country,
        businessType: validatedData.businessType,
        outletName: `${validatedData.businessName} - Main Store`
      });
      
      console.log('✅ Tenant registration complete:', { subdomain: result.tenant.subdomain });
      
      // Create email verification in tenant DB and send email
      try {
        const tenantDb = await getTenantDb(result.tenant.subdomain);
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry
        
        // Invalidate existing unverified tokens first (using raw query to avoid merchantId issues)
        await tenantDb.$executeRaw`
          UPDATE "EmailVerification"
          SET verified = true, "verifiedAt" = NOW()
          WHERE "userId" = ${result.user.id}
            AND verified = false
            AND "expiresAt" > NOW()
        `;
        
        // Create new verification token (don't include user relation)
        const verification = await tenantDb.emailVerification.create({
          data: {
            userId: result.user.id,
            token,
            email: result.user.email,
            expiresAt,
            verified: false
          },
          select: {
            id: true,
            userId: true,
            token: true,
            email: true,
            verified: true,
            expiresAt: true,
            createdAt: true,
          }
        });
        
        const userName = `${result.user.firstName} ${result.user.lastName}`.trim() || result.user.email;
        await sendVerificationEmail(
          result.user.email,
          userName,
          verification.token
        );
        
        console.log('✅ Verification email sent to:', result.user.email);
      } catch (emailError) {
        console.error('⚠️ Failed to send verification email:', emailError);
        // Don't fail registration if email fails
      }
      
      return NextResponse.json({
        success: true,
        code: 'TENANT_REGISTERED_SUCCESS',
        message: 'Tenant registered successfully',
        data: {
          tenant: {
            id: result.tenant.id,
            subdomain: result.tenant.subdomain,
            name: result.tenant.name,
            email: result.tenant.email,
            url: result.tenantUrl
          },
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role
          },
          outlet: result.outlet,
          subscription: result.subscription
        }
      }, { status: 201 });
      
    } else {
      // Basic user registration (not implemented for multi-tenant)
      return NextResponse.json(
        ResponseBuilder.error('REGISTRATION_NOT_SUPPORTED', 'Only merchant/tenant registration is supported in multi-tenant mode'),
        { status: 400 }
      );
    }
    
  } catch (error: any) {
    console.error('Registration error:', error);
    
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

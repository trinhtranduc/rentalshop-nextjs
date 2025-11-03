import { NextRequest, NextResponse } from 'next/server';
import { 
  getMainDb, 
  getTenantDb, 
  createTenantDatabase,
  generateSubdomain,
  validateSubdomain,
  createEmailVerification
} from '@rentalshop/database';
import { registerSchema, sendVerificationEmail } from '@rentalshop/utils';
import { hashPassword } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';

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
      // MERCHANT REGISTRATION FLOW (Multi-tenant)
      // ============================================================================
      
      // Generate subdomain from business name
      const subdomain = body.subdomain || generateSubdomain(validatedData.businessName!);
      
      // Validate subdomain format
      if (!validateSubdomain(subdomain)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_SUBDOMAIN', 'Invalid subdomain format'),
          { status: 400 }
        );
      }
      
      // Check if subdomain already exists in Main DB
      const mainDb = await getMainDb();
      await mainDb.connect();
      
      let merchantId: number;
      
      try {
        const existingTenant = await mainDb.query(
          'SELECT id FROM "Tenant" WHERE subdomain = $1',
          [subdomain]
        );
        
        if (existingTenant.rows.length > 0) {
          await mainDb.end();
          return NextResponse.json(
            ResponseBuilder.error('SUBDOMAIN_ALREADY_EXISTS', 'Subdomain already taken'),
            { status: 409 }
          );
        }
        
        // Check if merchant email already exists
        const existingMerchant = await mainDb.query(
          'SELECT id FROM "Merchant" WHERE email = $1',
          [validatedData.email]
        );
        
        if (existingMerchant.rows.length > 0) {
          await mainDb.end();
          return NextResponse.json(
            ResponseBuilder.error('EMAIL_ALREADY_EXISTS', 'Email already exists'),
            { status: 409 }
          );
        }
        
        // Create merchant in Main DB
        const merchantResult = await mainDb.query(
          'INSERT INTO "Merchant" (name, email, phone, "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id',
          [validatedData.businessName, validatedData.email, validatedData.phone]
        );
        
        merchantId = merchantResult.rows[0].id;
        
        // Create tenant database
        const databaseUrl = await createTenantDatabase(subdomain, merchantId);
        
        // Create tenant record in Main DB
        await mainDb.query(
          'INSERT INTO "Tenant" (id, subdomain, name, "merchantId", "databaseUrl", status, "createdAt", "updatedAt") VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW())',
          [subdomain, validatedData.businessName, merchantId, databaseUrl, 'active']
        );
        
        console.log('✅ Tenant created:', { subdomain, merchantId });
        
      } finally {
        await mainDb.end();
      }
      
      // Get tenant DB and create initial entities
      const tenantDb = await getTenantDb(subdomain);
      
      // Process name
      let firstName = validatedData.firstName || '';
      let lastName = validatedData.lastName || '';
      
      if (validatedData.name && !firstName && !lastName) {
        const nameParts = validatedData.name.trim().split(/\s+/);
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }
      
      // Create default outlet
      const outlet = await tenantDb.outlet.create({
        data: {
          name: `${validatedData.businessName} - Main Store`,
          address: validatedData.address || 'Address to be updated',
          phone: validatedData.phone,
          isDefault: true
        } as any
      });
      
      // Create default category
      const category = await tenantDb.category.create({
        data: {
          name: 'General',
          description: 'Default category for general products',
          isDefault: true
        } as any
      });
      
      // Create merchant user in tenant DB as OUTLET_ADMIN
      const hashedPassword = await hashPassword(validatedData.password);
      const user = await tenantDb.user.create({
        data: {
          email: validatedData.email,
          password: hashedPassword,
          firstName: firstName,
          lastName: lastName,
          phone: validatedData.phone,
          role: 'OUTLET_ADMIN', // Tenant DB only has OUTLET_ADMIN and OUTLET_STAFF
          outletId: outlet.id
        }
      });
      
      console.log('✅ Merchant registration complete:', { subdomain, merchantId });
      
      // Create email verification and send email
      try {
        const verification = await createEmailVerification(
          user.id,
          user.email,
          24 // 24 hours expiry
        );
        
        const userName = `${user.firstName} ${user.lastName}`.trim() || user.email;
        await sendVerificationEmail(
          user.email,
          userName,
          verification.token
        );
        
        console.log('✅ Verification email sent to:', user.email);
      } catch (emailError) {
        console.error('⚠️ Failed to send verification email:', emailError);
        // Don't fail registration if email fails
      }
      
      return NextResponse.json({
        success: true,
        code: 'MERCHANT_ACCOUNT_CREATED',
        message: 'Merchant account created successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            subdomain
          },
          merchant: {
            subdomain,
            url: `${subdomain}.anyrent.shop`
          }
        }
      }, { status: 201 });
      
    } else {
      // Basic user registration (not implemented for multi-tenant)
      return NextResponse.json(
        ResponseBuilder.error('REGISTRATION_NOT_SUPPORTED', 'User registration not supported in multi-tenant mode'),
        { status: 400 }
      );
    }
    
  } catch (error: any) {
    console.error('Registration error:', error);
    
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

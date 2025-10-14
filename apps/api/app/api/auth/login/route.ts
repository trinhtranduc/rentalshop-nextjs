import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { comparePassword, generateToken } from '@rentalshop/auth';
import { loginSchema } from '@rentalshop/utils';
import { handleApiError, ErrorCode } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = loginSchema.parse(body);
    
    // Find user in database by email
    const user = await db.users.findByEmail(validatedData.email);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: 'Account is deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(validatedData.password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Get merchant's active subscription plan (for platform access control)
    let planName = 'Basic'; // Default plan
    let merchantData = null; // MerchantReference | null
    let outletData = null;   // OutletReference | null
    
    if (user.merchantId) {
      const merchant = await db.merchants.findById(user.merchantId);
      if (merchant) {
        if (merchant.subscription?.plan) {
          planName = merchant.subscription.plan.name;
        }
        // ✅ Follow MerchantReference type: { id, name, email? }
        merchantData = {
          id: merchant.id,
          name: merchant.name,
          email: merchant.email || undefined
        };
      }
    }

    // Get outlet data if user has outlet assignment
    if (user.outletId) {
      const outlet = await db.outlets.findById(user.outletId);
      if (outlet) {
        // ✅ Follow OutletReference type: { id, name, address?, merchantId }
        outletData = {
          id: outlet.id,
          name: outlet.name,
          address: outlet.address || undefined,
          merchantId: outlet.merchantId
        };
      }
    }

    // Generate token with plan name for platform access control
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      merchantId: user.merchantId,
      outletId: user.outletId,
      planName, // ✅ Include plan name in JWT
    } as any);

    const result = {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.firstName + ' ' + user.lastName,
          role: user.role,
          merchantId: user.merchantId,
          outletId: user.outletId,
          // ✅ Optional: merchant object (null for ADMIN users without merchant)
          merchant: merchantData,  // MerchantReference | null
          // ✅ Optional: outlet object (null for ADMIN/MERCHANT users without outlet)
          outlet: outletData,      // OutletReference | null
        },
        token,
      },
    };
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('Login error:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@rentalshop/database';
import { registerSchema } from '@rentalshop/utils';
import { generateToken } from '@rentalshop/auth';
import {API} from '@rentalshop/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = registerSchema.parse(body);
    
    // Register user with smart registration
    const result = await registerUser({
      email: validatedData.email,
      password: validatedData.password,
      name: validatedData.name,
      phone: validatedData.phone,
      role: validatedData.role || 'CLIENT',
      businessName: validatedData.businessName,
      outletName: validatedData.outletName,
      // Address fields for merchant registration
      address: validatedData.address,
      city: validatedData.city,
      state: validatedData.state,
      zipCode: validatedData.zipCode,
      country: validatedData.country,
      // For outlet staff registration
      merchantCode: validatedData.merchantCode,
      outletCode: validatedData.outletCode,
    });
    
    // Generate JWT token
    const token = generateToken({
      userId: result.user.id, // Use publicId (number) for JWT token consistency
      email: result.user.email,
      role: result.user.role,
    });
    
    return NextResponse.json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        token: token
      }
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Handle validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      }, { status: 400 });
    }
    
    // Handle specific auth errors
    if (error.message === 'User with this email already exists') {
      return NextResponse.json({
        success: false,
        message: 'User with this email already exists'
      }, { status: API.STATUS.CONFLICT });
    }
    
    if (error.message === 'Merchant with this email already exists') {
      return NextResponse.json({
        success: false,
        message: 'Merchant with this email already exists'
      }, { status: API.STATUS.CONFLICT });
    }
    
    if (error.message.includes('Invalid merchant code')) {
      return NextResponse.json({
        success: false,
        message: 'Invalid merchant code. Please check with your manager.'
      }, { status: 400 });
    }
    
    if (error.message.includes('Invalid outlet code')) {
      return NextResponse.json({
        success: false,
        message: 'Invalid outlet code. Please check with your manager.'
      }, { status: 400 });
    }
    
    // Generic error
    return NextResponse.json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: API.STATUS.INTERNAL_SERVER_ERROR });
  }
} 
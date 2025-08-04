import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@rentalshop/auth';
import { registerSchema } from '@rentalshop/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = registerSchema.parse(body);
    
    // Register user
    const result = await registerUser({
      email: validatedData.email,
      password: validatedData.password,
      name: validatedData.name,
      phone: validatedData.phone,
      role: validatedData.role || 'CLIENT',
    });
    
    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      data: result
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
    if (error.message === 'User already exists') {
      return NextResponse.json({
        success: false,
        message: 'User with this email already exists'
      }, { status: 409 });
    }
    
    // Generic error
    return NextResponse.json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
} 
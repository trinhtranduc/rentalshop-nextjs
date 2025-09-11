import { NextRequest, NextResponse } from 'next/server';
import { registerMerchantWithTrial } from '@rentalshop/database';
import { z } from 'zod';
import {API} from '@rentalshop/constants';

// Validation schema for merchant registration
const merchantRegistrationSchema = z.object({
  // Merchant details
  merchantName: z.string().min(1, 'Merchant name is required'),
  merchantEmail: z.string().email('Invalid merchant email'),
  merchantPhone: z.string().optional(),
  merchantDescription: z.string().optional(),
  
  // User details (merchant owner)
  userEmail: z.string().email('Invalid user email'),
  userPassword: z.string().min(6, 'Password must be at least 6 characters'),
  userFirstName: z.string().min(1, 'First name is required'),
  userLastName: z.string().min(1, 'Last name is required'),
  userPhone: z.string().optional(),
  
  // Optional outlet details
  outletName: z.string().optional(),
  outletAddress: z.string().optional(),
  outletDescription: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = merchantRegistrationSchema.parse(body);
    
    // Register merchant with trial plan
    const result = await registerMerchantWithTrial(validatedData);
    
    return NextResponse.json({
      success: true,
      message: 'Merchant registered successfully with 14-day free trial',
      data: {
        merchant: result.merchant,
        user: result.user,
        subscription: result.subscription,
        outlet: result.outlet,
        trialInfo: {
          planName: result.subscription.planName,
          trialEndDate: result.subscription.trialEndDate,
          daysRemaining: Math.ceil((result.subscription.trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        }
      }
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Merchant registration error:', error);
    
    // Handle validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      }, { status: 400 });
    }
    
    // Handle specific errors
    if (error.message === 'Merchant with this email already exists') {
      return NextResponse.json({
        success: false,
        message: 'A merchant with this email already exists'
      }, { status: API.STATUS.CONFLICT });
    }
    
    if (error.message === 'User with this email already exists') {
      return NextResponse.json({
        success: false,
        message: 'A user with this email already exists'
      }, { status: API.STATUS.CONFLICT });
    }
    
    if (error.message === 'Trial plan not found. Please contact support.') {
      return NextResponse.json({
        success: false,
        message: 'Trial plan not available. Please contact support.'
      }, { status: API.STATUS.INTERNAL_SERVER_ERROR });
    }
    
    // Generic error
    return NextResponse.json({
      success: false,
      message: 'Merchant registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: API.STATUS.INTERNAL_SERVER_ERROR });
  }
}

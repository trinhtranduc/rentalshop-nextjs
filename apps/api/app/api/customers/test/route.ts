import { NextRequest, NextResponse } from 'next/server';
import { customerCreateSchema } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

/**
 * POST /api/customers/test
 * Test endpoint to validate customer creation payload
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received payload:', JSON.stringify(body, null, 2));
    
    // Validate the payload
    const parsedBody = customerCreateSchema.safeParse(body);
    
    if (!parsedBody.success) {
      console.log('Validation errors:', parsedBody.error.flatten());
      return NextResponse.json({ 
        success: false, 
        message: 'Validation failed', 
        errors: parsedBody.error.flatten(),
        receivedPayload: body
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Payload validation successful',
      validatedData: parsedBody.data
    });
    
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export const runtime = 'nodejs';

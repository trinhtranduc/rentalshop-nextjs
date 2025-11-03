import { NextRequest, NextResponse } from 'next/server';
import { customerCreateSchema, handleApiError } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

/**
 * POST /api/customers/debug
 * Debug endpoint to identify validation issues
 */
export async function POST(request: NextRequest) {
  try {
    console.log('=== Customer API Debug ===');
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    const body = await request.json();
    console.log('Raw request body:', JSON.stringify(body, null, 2));
    
    // Check for missing required fields (NO merchantId)
    const requiredFields = ['firstName', 'lastName', 'phone'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return NextResponse.json({
        success: false,
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Missing required fields',
        missingFields,
        receivedPayload: body
      }, { status: 400 });
    }
    
    // Validate the payload
    const parsedBody = customerCreateSchema.safeParse(body);
    
    if (!parsedBody.success) {
      console.log('Validation errors:', parsedBody.error.flatten());
      return NextResponse.json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: parsedBody.error.flatten(),
        receivedPayload: body,
        fieldDetails: {
          firstName: {
            value: body.firstName,
            type: typeof body.firstName,
            length: body.firstName?.length
          },
          lastName: {
            value: body.lastName,
            type: typeof body.lastName,
            length: body.lastName?.length
          },
          email: {
            value: body.email,
            type: typeof body.email,
            isValidEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email || '')
          },
          phone: {
            value: body.phone,
            type: typeof body.phone,
            length: body.phone?.length,
            isValidFormat: /^[0-9+\-\s()]+$/.test(body.phone || '')
          }
        }
      }, { status: 400 });
    }
    
    console.log('Validation successful');
    return NextResponse.json({
      success: true,
      code: 'PAYLOAD_VALIDATION_SUCCESS',
        message: 'Payload validation successful',
      validatedData: parsedBody.data,
      fieldDetails: {
        firstName: { value: parsedBody.data.firstName, type: typeof parsedBody.data.firstName },
        lastName: { value: parsedBody.data.lastName, type: typeof parsedBody.data.lastName },
        email: { value: parsedBody.data.email, type: typeof parsedBody.data.email },
        phone: { value: parsedBody.data.phone, type: typeof parsedBody.data.phone }
      }
    });
    
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}

export const runtime = 'nodejs';

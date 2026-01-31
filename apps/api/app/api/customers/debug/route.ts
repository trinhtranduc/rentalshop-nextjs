import { NextRequest, NextResponse } from 'next/server';
import { customerCreateSchema, handleApiError } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * POST /api/customers/debug
 * Debug endpoint to identify validation issues
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 * Note: This is a debug endpoint, so some diagnostic logging is kept for debugging purposes
 */
export async function POST(request: NextRequest) {
  return withApiLogging(async (request: NextRequest) => {
    try {
      const body = await request.json();
      
      // Check for missing required fields
      const requiredFields = ['firstName', 'lastName', 'phone', 'merchantId'];
      const missingFields = requiredFields.filter(field => !body[field]);
      
      if (missingFields.length > 0) {
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
          },
          merchantId: {
            value: body.merchantId,
            type: typeof body.merchantId,
            length: body.merchantId?.length
          }
        }
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      code: 'PAYLOAD_VALIDATION_SUCCESS',
        message: 'Payload validation successful',
      validatedData: parsedBody.data,
      fieldDetails: {
        firstName: { value: parsedBody.data.firstName, type: typeof parsedBody.data.firstName },
        lastName: { value: parsedBody.data.lastName, type: typeof parsedBody.data.lastName },
        email: { value: parsedBody.data.email, type: typeof parsedBody.data.email },
        phone: { value: parsedBody.data.phone, type: typeof parsedBody.data.phone },
        merchantId: { value: parsedBody.data.merchantId, type: typeof parsedBody.data.merchantId }
      }
    });
    
    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

export const runtime = 'nodejs';

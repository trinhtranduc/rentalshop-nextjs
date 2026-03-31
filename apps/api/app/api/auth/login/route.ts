import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { comparePassword } from '@rentalshop/auth/server';
import { loginSchema, ResponseBuilder } from '@rentalshop/utils';
import { handleApiError } from '@rentalshop/utils';
import { buildSimpleCorsHeaders } from '@rentalshop/utils/server';
import { buildAuthLoginSuccessResponse } from '../../../../lib/build-auth-login-response';

export async function OPTIONS(request: NextRequest) {
  try {
  const corsHeaders = buildSimpleCorsHeaders(request);
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
  } catch (error: any) {
    console.error('❌ OPTIONS ERROR:', {
      errorName: error?.name,
      errorMessage: error?.message,
    });
    
    // Return basic CORS headers even on error
    const fallbackHeaders = {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
      'Access-Control-Allow-Credentials': 'true',
    };
    
    return new NextResponse(null, {
      status: 204,
      headers: fallbackHeaders,
    });
  }
}

export async function POST(request: NextRequest) {
  // Build CORS headers first (safe, never throws)
  const corsHeaders = buildSimpleCorsHeaders(request);
  
  // 🔍 DIAGNOSTIC LOGGING: Log request origin and environment
  const origin = request.headers.get('origin') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  console.log('🔍 LOGIN REQUEST:', {
    origin,
    userAgent: userAgent.substring(0, 50),
    timestamp: new Date().toISOString(),
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
  });
  
  try {
    // 🔍 DIAGNOSTIC LOGGING: Test Prisma client connection before use
    try {
      const { prisma } = await import('@rentalshop/database');
      console.log('🔍 PRISMA CLIENT STATUS:', {
        isInitialized: !!prisma,
        clientType: prisma?.constructor?.name || 'unknown',
      });
      
      // Test database connection with a simple query
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ DATABASE CONNECTION: Successfully connected');
    } catch (dbTestError: any) {
      console.error('❌ DATABASE CONNECTION TEST FAILED:', {
        errorName: dbTestError?.name,
        errorMessage: dbTestError?.message,
        errorCode: dbTestError?.code,
        isPrismaError: dbTestError?.name === 'PrismaClientInitializationError',
      });
      // Don't throw here - let the actual query fail to get better error context
    }
    
    const body = await request.json();
    
    // Validate input
    const validatedData = loginSchema.parse(body);
    
    console.log('🔍 LOGIN ATTEMPT:', {
      email: validatedData.email,
      emailLength: validatedData.email.length,
    });
    
    // Find user in database by email
    console.log('🔍 DATABASE QUERY: Starting findByEmail...');
    const user = await db.users.findByEmail(validatedData.email);
    console.log('🔍 DATABASE QUERY: findByEmail completed', {
      userFound: !!user,
      userId: user?.id,
      userRole: user?.role,
    });

    if (!user) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_CREDENTIALS'),
        { 
          status: 401,
          headers: corsHeaders
        }
      );
    }

    // Note: Hard delete - deleted users won't exist in database, so no need to check deletedAt
    // Removed deletedAt check since we're using hard delete

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        ResponseBuilder.error('ACCOUNT_DEACTIVATED'),
        { 
          status: 403,
          headers: corsHeaders
        }
      );
    }

    // Verify password FIRST - only check email verification AFTER password is correct
    const isPasswordValid = await comparePassword(validatedData.password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_CREDENTIALS'),
        { 
          status: 401,
          headers: corsHeaders
        }
      );
    }

    return await buildAuthLoginSuccessResponse(request, user, corsHeaders);
    
  } catch (error: any) {
    // 🔍 DIAGNOSTIC LOGGING: Detailed error information
    console.error('❌ LOGIN ERROR DETAILS:', {
      errorName: error?.name,
      errorMessage: error?.message,
      errorCode: error?.code,
      errorStack: error?.stack?.substring(0, 500),
      isPrismaError: error?.name === 'PrismaClientInitializationError',
      isDatabaseError: error?.message?.includes('database') || error?.message?.includes('Can\'t reach'),
      origin,
      timestamp: new Date().toISOString(),
    });
    
    try {
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    
    console.log('🔍 ERROR RESPONSE:', {
      statusCode,
      errorCode: response.code,
      errorMessage: response.message,
    });
    
    return NextResponse.json(response, { 
      status: statusCode,
      headers: corsHeaders
    });
    } catch (handleError: any) {
      // If handleApiError itself throws, return generic error with CORS headers
      console.error('❌ LOGIN: Error in handleApiError, using fallback:', {
        originalError: error?.message,
        handleError: handleError?.message,
      });
      
      return NextResponse.json(
        ResponseBuilder.error('INTERNAL_SERVER_ERROR'),
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }
  }
} 

/**
 * SYNC PROXY LOGIN API
 * Proxy endpoint specifically for login to old server (avoid CORS issues)
 * No authentication required (public endpoint for login)
 */

import { NextRequest, NextResponse } from 'next/server';

const OLD_SERVER_ENDPOINT = 'https://crm.rentalshop.org';

/**
 * Get allowed CORS origins (matching middleware configuration)
 */
function getAllowedOrigins(): string[] {
  const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  
  return [
    ...corsOrigins,
    // Local development
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    // Custom domains - anyrent.shop (production)
    'https://anyrent.shop',
    'https://www.anyrent.shop',
    'https://api.anyrent.shop',
    'https://admin.anyrent.shop',
    // Custom domains - anyrent.shop (development)
    'https://dev.anyrent.shop',
    'https://dev-api.anyrent.shop',
    'https://dev-admin.anyrent.shop'
  ];
}

/**
 * Build CORS headers for response (matching middleware configuration)
 */
function buildCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = getAllowedOrigins();
  const isAllowedOrigin = allowedOrigins.includes(origin);
  const allowOrigin = isAllowedOrigin ? origin : 'null';
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, X-CSRF-Token, X-Client-Platform, X-App-Version, X-Device-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { login, password } = body;

    if (!login || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing login or password' },
        { 
          status: 400,
          headers: buildCorsHeaders(request)
        }
      );
    }

    const url = `${OLD_SERVER_ENDPOINT}/rental/login`;
    const requestBody = {
      params: {
        login,
        password
      }
    };

    // Build headers as per old server requirements (matching Postman request)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cookie': 'session_id=ddec7a466ab76b2be90e39c2c871bfe265b6b963',
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9,vi;q=0.8',
      'lang': 'vi',
      'origin': 'https://www.rentalshop.org',
      'source': 'mobile',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
    };

    console.log('🔄 [PROXY LOGIN] Forwarding login request to old server:', {
      url,
      login,
      hasPassword: !!password
    });

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    let responseData: any;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    console.log('🔄 [PROXY LOGIN] Response from old server:', {
      status: response.status,
      statusText: response.statusText,
      hasData: !!responseData,
      hasToken: !!(responseData?.result?.token || responseData?.token)
    });

    // Return response with CORS headers matching middleware
    return NextResponse.json(
      { success: response.ok, data: responseData },
      {
        status: response.status,
        headers: buildCorsHeaders(request)
      }
    );
  } catch (error: any) {
    console.error('❌ [PROXY LOGIN] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Proxy login error' },
      {
        status: 500,
        headers: buildCorsHeaders(request)
      }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(null, {
    status: 204,
    headers: buildCorsHeaders(request)
  });
}


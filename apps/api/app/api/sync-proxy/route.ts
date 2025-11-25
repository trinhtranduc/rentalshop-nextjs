/**
 * SYNC PROXY API
 * Proxy endpoint to forward requests to old server (avoid CORS issues)
 * No authentication required for preview (public endpoint)
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
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, params, token } = body;

    if (!path || !token) {
      return NextResponse.json(
        { success: false, error: 'Missing path or token' },
        { 
          status: 400,
          headers: buildCorsHeaders(request)
        }
      );
    }

    const url = `${OLD_SERVER_ENDPOINT}${path}`;
    const requestBody = {
      jsonrpc: '2.0',
      id: null,
      params: params || {}
    };

    // Build headers as per old server requirements
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'TOKEN': token,
      'lat': '15.985848',
      'long': '108.2644128',
      'device': 'Iphone 6s',
      'version': '234'
    };

    console.log('🔄 [PROXY] Forwarding request to old server:', {
      url,
      path,
      hasToken: !!token,
      params: params || {}
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

    console.log('🔄 [PROXY] Response from old server:', {
      status: response.status,
      statusText: response.statusText,
      hasData: !!responseData
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
    console.error('❌ [PROXY] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Proxy error' },
      {
        status: 500,
        headers: buildCorsHeaders(request)
      }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request)
  });
}


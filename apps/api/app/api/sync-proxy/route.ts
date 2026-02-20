/**
 * SYNC PROXY API
 * Proxy endpoint to forward requests to old server (avoid CORS issues)
 * No authentication required for preview (public endpoint)
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildCorsHeaders } from '@rentalshop/utils';

const OLD_SERVER_ENDPOINT = 'https://crm.rentalshop.org';

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


import { NextRequest, NextResponse } from 'next/server';

/**
 * Build CORS headers safely (never throws)
 * This function is guaranteed to return valid CORS headers
 * 
 * Used across all API routes for consistent CORS handling
 * 
 * @param request - NextRequest object to extract origin from
 * @param methods - Allowed HTTP methods (default: 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
 * @param headers - Allowed headers (default: comprehensive list)
 * @returns CORS headers object
 */
export function buildCorsHeaders(
  request: NextRequest,
  methods: string = 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  headers: string = 'Content-Type, Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, X-CSRF-Token, X-Client-Platform, X-App-Version, X-Device-Type'
): Record<string, string> {
  try {
    // Get allowed origins from environment
    const corsOrigins = (process.env.CORS_ORIGINS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    
    // Add localhost, Railway domains, and custom domains
    const allowedOrigins = [
      ...corsOrigins,
      // Local development
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      // Custom domains - anyrent.shop (production)
      'https://anyrent.shop',
      'https://www.anyrent.shop', // Production website (www subdomain)
      'https://api.anyrent.shop', // Production API
      'https://admin.anyrent.shop',
      // Custom domains - anyrent.shop (development)
      'https://dev.anyrent.shop',
      'https://dev-api.anyrent.shop', // Development API
      'https://dev-admin.anyrent.shop'
    ];
    
    // Get request origin safely
    const requestOrigin = request.headers.get('origin') || '';
    
    // SECURITY: Exact match only - no startsWith to prevent subdomain attacks
    const isAllowedOrigin = allowedOrigins.includes(requestOrigin);
    
    // Use request origin if allowed, otherwise null (reject)
    const allowOrigin = isAllowedOrigin ? requestOrigin : 'null';
    
    return {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': methods,
      'Access-Control-Allow-Headers': headers,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    };
  } catch (error) {
    // Fallback: return permissive CORS headers if anything fails
    console.error('❌ CORS: Error building CORS headers, using fallback:', error);
    const requestOrigin = request.headers.get('origin') || '*';
    return {
      'Access-Control-Allow-Origin': requestOrigin,
      'Access-Control-Allow-Methods': methods,
      'Access-Control-Allow-Headers': headers,
      'Access-Control-Allow-Credentials': 'true',
    };
  }
}

/**
 * Handle CORS preflight (OPTIONS) requests
 * 
 * This function creates a proper OPTIONS response with CORS headers.
 * Note: Middleware already handles OPTIONS requests, but this is useful
 * for routes that want to handle OPTIONS explicitly.
 * 
 * @param request - NextRequest object
 * @param methods - Allowed HTTP methods (default: 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
 * @param headers - Allowed headers (default: comprehensive list)
 * @returns NextResponse with 204 status and CORS headers
 */
export function handleCorsPreflight(
  request: NextRequest,
  methods?: string,
  headers?: string
): NextResponse {
  const corsHeaders = buildCorsHeaders(request, methods, headers);
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

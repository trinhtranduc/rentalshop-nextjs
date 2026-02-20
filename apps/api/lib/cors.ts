import { NextRequest } from 'next/server';

/**
 * Get all allowed CORS origins
 * Centralized configuration - update this file to add/remove allowed origins
 * 
 * @returns Array of allowed origin strings
 */
export function getAllowedOrigins(): string[] {
  // Get allowed origins from environment variable
  const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  
  // Base allowed origins (always included)
  const baseOrigins = [
    // Local development
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    // Custom domains - anyrent.shop (production)
    'https://anyrent.shop',
    'https://www.anyrent.shop', // Production website (www subdomain)
    'https://api.anyrent.shop', // Production API
    'https://admin.anyrent.shop', // Production admin (Railway)
    'https://adminvercel.anyrent.shop', // Production admin (Vercel)
    // Custom domains - anyrent.shop (development)
    'https://dev.anyrent.shop',
    'https://dev-api.anyrent.shop', // Development API
    'https://dev-admin.anyrent.shop', // Development admin (Railway)
    'https://dev-adminvercel.anyrent.shop', // Development admin (Vercel)
    // Vercel preview URLs
    'https://anyrent-admin-git-dev-trinhduc20-gmailcoms-projects.vercel.app'
  ];
  
  return [...corsOrigins, ...baseOrigins];
}

/**
 * Check if an origin is allowed
 * 
 * @param origin - The origin to check
 * @returns true if origin is allowed, false otherwise
 */
export function isAllowedOrigin(origin: string): boolean {
  const allowedOrigins = getAllowedOrigins();
  // SECURITY: Exact match only - no startsWith to prevent subdomain attacks
  return allowedOrigins.includes(origin);
}

/**
 * Build CORS headers for a request (safe, never throws)
 * This function is guaranteed to return valid CORS headers
 * 
 * @param request - Next.js request object
 * @returns CORS headers object
 */
export function buildCorsHeaders(request: NextRequest): Record<string, string> {
  try {
    const requestOrigin = request.headers.get('origin') || '';
    const isAllowed = isAllowedOrigin(requestOrigin);
    
    // Use request origin if allowed, otherwise null (reject)
    const allowOrigin = isAllowed ? requestOrigin : 'null';
    
    return {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, X-CSRF-Token, X-Client-Platform, X-App-Version, X-Device-Type',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    };
  } catch (error) {
    // Fallback: return permissive CORS headers if anything fails
    console.error('❌ CORS: Error building CORS headers, using fallback:', error);
    const requestOrigin = request.headers.get('origin') || '*';
    return {
      'Access-Control-Allow-Origin': requestOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
      'Access-Control-Allow-Credentials': 'true',
    };
  }
}

/**
 * Build simple CORS headers (for routes that don't need all headers)
 * 
 * @param request - Next.js request object
 * @returns Simple CORS headers object
 */
export function buildSimpleCorsHeaders(request: NextRequest): Record<string, string> {
  try {
    const requestOrigin = request.headers.get('origin') || '';
    const isAllowed = isAllowedOrigin(requestOrigin);
    
    const allowOrigin = isAllowed ? requestOrigin : 'null';
    
    return {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
      'Access-Control-Allow-Credentials': 'true',
    };
  } catch (error) {
    console.error('❌ CORS: Error building simple CORS headers, using fallback:', error);
    const requestOrigin = request.headers.get('origin') || '*';
    return {
      'Access-Control-Allow-Origin': requestOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
      'Access-Control-Allow-Credentials': 'true',
    };
  }
}

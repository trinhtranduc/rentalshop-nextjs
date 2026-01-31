import { NextRequest } from 'next/server';

/**
 * Build CORS headers safely (never throws)
 * This function is guaranteed to return valid CORS headers
 * 
 * Used across all API routes for consistent CORS handling
 */
export function buildCorsHeaders(request: NextRequest): Record<string, string> {
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

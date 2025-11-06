import { NextRequest, NextResponse } from 'next/server';

/**
 * Extract subdomain from hostname
 * Edge Runtime compatible - no Node.js dependencies
 */
function extractSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];
  
  // Split by dots
  const parts = host.split('.');
  
  // For localhost subdomains: shop1.localhost
  if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
    return parts[0];
  }
  
  // For production: shop1.example.com
  if (parts.length > 2) {
    return parts[0];
  }
  
  return null;
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  
  // Extract subdomain (Edge Runtime compatible)
  const subdomain = extractSubdomain(hostname);
  
  // For API routes, add subdomain to headers
  // Validation will happen in API route handler (Node.js runtime)
  if (request.nextUrl.pathname.startsWith('/api')) {
    if (subdomain) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-tenant-subdomain', subdomain);
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};

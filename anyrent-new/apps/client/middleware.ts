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
  // Assuming root domain has 2 parts (example.com)
  // Subdomain would be the first part
  if (parts.length > 2) {
    return parts[0];
  }
  
  return null;
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.pathname;
  
  // Skip middleware for API routes and static files
  if (url.startsWith('/api') || url.startsWith('/_next')) {
    return NextResponse.next();
  }
  
  // Extract subdomain (Edge Runtime compatible)
  const subdomain = extractSubdomain(hostname);
  
  // Block root domain access - redirect to admin registration
  if (!subdomain) {
    // Only redirect if accessing root domain (not if subdomain exists)
    const redirectUrl = new URL('http://localhost:3000');
    return NextResponse.redirect(redirectUrl);
  }
  
  // Add subdomain to headers for page to validate
  // Validation will happen in page component via API call
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-subdomain', subdomain);
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

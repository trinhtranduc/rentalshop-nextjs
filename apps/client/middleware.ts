import { NextRequest, NextResponse } from 'next/server';
import { extractSubdomain } from '@rentalshop/database';

/**
 * Client App Middleware
 * 
 * Routing Logic:
 * - client.anyrent.shop → Public pages (register, landing, pricing)
 * - {subdomain}.anyrent.shop → Tenant dashboard (login required)
 * - localhost:3001 → Development mode (allow both public and tenant modes)
 */
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.pathname;
  
  // Skip middleware for API routes and static files
  if (url.startsWith('/api') || url.startsWith('/_next') || url.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }

  // Extract subdomain from hostname
  const subdomain = extractSubdomain(hostname);
  
  // Get root domain from environment
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'anyrent.shop';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Development mode: Allow access without subdomain (localhost:3001)
  if (!isProduction && (hostname.includes('localhost') || hostname.includes('127.0.0.1'))) {
    // In dev, if no subdomain, treat as public pages
    if (!subdomain) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-is-public', 'true');
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    
    // In dev, if subdomain exists, treat as tenant mode
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-subdomain', subdomain);
    requestHeaders.set('x-is-tenant', 'true');
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  
  // Production mode routing
  if (isProduction) {
    // Case 1: client.anyrent.shop → Public pages
    if (subdomain === 'client') {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-is-public', 'true');
      requestHeaders.set('x-subdomain', 'client');
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    
    // Case 2: No subdomain on root domain → Redirect to client subdomain
    if (!subdomain && hostname === rootDomain) {
      const redirectUrl = new URL(request.url);
      redirectUrl.hostname = `client.${rootDomain}`;
      return NextResponse.redirect(redirectUrl);
    }
    
    // Case 3: {subdomain}.anyrent.shop → Tenant mode
    if (subdomain && subdomain !== 'client' && subdomain !== 'admin' && subdomain !== 'api') {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-tenant-subdomain', subdomain);
      requestHeaders.set('x-is-tenant', 'true');
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    
    // Case 4: Reserved subdomains (admin, api) → Block access
    if (subdomain === 'admin' || subdomain === 'api') {
      return NextResponse.redirect(new URL('https://client.anyrent.shop'));
    }
  }
  
  // Default: Allow through with subdomain in header if exists
  const requestHeaders = new Headers(request.headers);
  if (subdomain) {
    requestHeaders.set('x-tenant-subdomain', subdomain);
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|.*\\.(?:jpg|jpeg|gif|png|svg|ico|css|js)).*)',
  ],
};

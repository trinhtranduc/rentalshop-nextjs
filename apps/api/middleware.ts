import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from './lib/jwt-edge';

// Protected routes that require authentication
const protectedRoutes = [
  '/api/users',
  '/api/orders',
  '/api/payments',
  '/api/shops',
  '/api/products',
  '/api/customers',
  '/api/notifications',
];

// Public routes that don't require authentication
const publicRoutes = [
  '/api/auth',
  '/api/health',
  '/api/docs',
];

// Admin-only routes
const adminRoutes = [
  '/api/admin',
  '/api/users',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow OPTIONS requests to pass through for CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200 });
  }
  
  // Skip middleware for public routes
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  if (isPublicRoute) {
    return new NextResponse(null, { status: 200 });
  }
  
  // For now, let all requests pass through to route handlers
  // Authentication will be handled in individual route handlers
  return new NextResponse(null, { status: 200 });
}

export const config = {
  matcher: [
    // Temporarily disable middleware for testing
    // '/api/:path*',
  ],
  runtime: 'nodejs',
}; 
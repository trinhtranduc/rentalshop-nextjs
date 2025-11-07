// ============================================================================
// TENANT UTILITIES - For API Handlers
// ============================================================================
// This file provides utilities for multi-tenant API route handlers

import { NextRequest, NextResponse } from 'next/server';
import { getTenantDb } from '@rentalshop/database';
import { ResponseBuilder } from './response-builder';

/**
 * Get tenant database from request headers
 * Returns both the database instance and subdomain, or null if subdomain missing
 * 
 * @param request - Next.js request object
 * @returns Object with db and subdomain, or null if subdomain missing
 */
export async function getTenantDbFromRequest(request: NextRequest) {
  const subdomain = request.headers.get('x-tenant-subdomain');
  
  if (!subdomain) {
    return null;
  }
  
  const db = await getTenantDb(subdomain);
  
  return { db, subdomain };
}

/**
 * Wrapper for API handlers that need tenant DB with automatic error handling
 * Automatically extracts subdomain and gets tenant DB
 * Returns error response if subdomain is missing
 * 
 * Usage:
 * const result = await withTenantDb(request);
 * if (result.error) return result.error;
 * const { db, subdomain } = result;
 */
export const withTenantDb = async (request: NextRequest) => {
  const result = await getTenantDbFromRequest(request);
  
  if (!result) {
    return {
      error: NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      )
    };
  }
  
  return result;
};


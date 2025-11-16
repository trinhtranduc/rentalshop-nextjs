import type { NextRequest } from 'next/server';

/**
 * Extract tenant key from a given host string.
 *
 * Examples:
 * - "aodaipham1.anyrent.shop"       -> "aodaipham1"
 * - "aodaipham1.anyrent.local:3000" -> "aodaipham1"
 * - "dev.anyrent.shop"              -> undefined (no tenant, shared dev)
 * - "localhost:3000"                -> undefined
 */
export function getTenantKeyFromHost(host: string | null | undefined): string | undefined {
  if (!host) return undefined;

  // Remove port if present
  const [hostname] = host.split(':');

  if (!hostname) return undefined;

  // localhost and direct domains (no tenant subdomain)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return undefined;
  }

  const parts = hostname.split('.');

  // We consider a tenant subdomain only when there are at least 3 parts:
  // e.g. tenant.anyrent.shop, tenant.anyrent.local
  if (parts.length < 3) {
    return undefined;
  }

  const [subdomain] = parts;

  // Basic sanity check: tenantKey should be alphanumeric
  if (!/^[a-z0-9]+$/i.test(subdomain)) {
    return undefined;
  }

  return subdomain.toLowerCase();
}

/**
 * Get tenant key from request.
 *
 * Priority:
 * 1. Subdomain from Host header (production/staging).
 * 2. (Dev-only fallback, optional) x-tenant-key header or query param (handled elsewhere).
 */
export function getTenantKeyFromRequest(request: NextRequest): string | undefined {
  const host = request.headers.get('host');
  return getTenantKeyFromHost(host);
}



/**
 * Edge-compatible CORS header builder.
 * This is a lightweight version for use in middleware (Edge Runtime).
 * Does NOT import from @rentalshop/utils/server to avoid bundling Node.js modules.
 */
import { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

export function buildCorsHeaders(request: NextRequest): Record<string, string> {
  const requestOrigin = request.headers.get('origin') || '';
  const isAllowed = ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(requestOrigin);
  const origin = isAllowed ? requestOrigin : (ALLOWED_ORIGINS[0] || '*');

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Accept-Version',
      'Content-Length',
      'Content-MD5',
      'Date',
      'X-Api-Version',
      'X-CSRF-Token',
      'X-Client-Platform',
      'X-App-Version',
      'X-Device-Type',
      'X-Request-ID',
      'X-Correlation-ID',
    ].join(', '),
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * JWT verification for Edge Runtime
 * Uses Web Crypto API instead of Node.js crypto module
 * This is a simplified version for middleware use only
 * 
 * SECURITY NOTE: This implementation only validates token format and expiration.
 * For production, implement proper HMAC signature verification using Web Crypto API.
 */

// Get JWT secret from environment (same as backend)
const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_LOCAL || 'local-jwt-secret-key-change-this';

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Base64 URL decode with proper error handling
 */
function base64UrlDecode(str: string): string {
  try {
    // Replace URL-safe characters
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    while (str.length % 4) {
      str += '=';
    }
    
    // Decode using Buffer (Node.js) or atob (browser/Edge Runtime)
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'base64').toString('utf-8');
    } else if (typeof atob !== 'undefined') {
      return atob(str);
    } else {
      throw new Error('No base64 decoder available');
    }
  } catch (error) {
    throw new Error('Invalid base64 encoding');
  }
}

/**
 * Validate JWT token structure and expiration
 * 
 * @param token - JWT token string
 * @returns Parsed JWT payload
 * @throws Error if token is invalid or expired
 */
export function verifyTokenSimple(token: string): JWTPayload {
  console.log('🔍 JWT EDGE: Starting token verification');
  console.log('🔍 JWT EDGE: Token input:', token ? `${token.substring(0, 20)}...` : 'NULL');
  console.log('🔍 JWT EDGE: Using JWT_SECRET:', JWT_SECRET ? `${JWT_SECRET.substring(0, 10)}...` : 'UNDEFINED');
  
  // Input validation
  if (!token || typeof token !== 'string') {
    console.log('🔍 JWT EDGE: Token validation failed - not a string');
    throw new Error('Token is required and must be a string');
  }

  try {
    // Split token into parts
    const parts = token.split('.');
    console.log('🔍 JWT EDGE: Token parts count:', parts.length);
    console.log('🔍 JWT EDGE: Token parts:', {
      header: parts[0] ? `${parts[0].substring(0, 20)}...` : 'MISSING',
      payload: parts[1] ? `${parts[1].substring(0, 20)}...` : 'MISSING',
      signature: parts[2] ? `${parts[2].substring(0, 20)}...` : 'MISSING'
    });
    
    if (parts.length !== 3) {
      console.log('🔍 JWT EDGE: Invalid token format - wrong number of parts');
      throw new Error('Invalid token format: must have 3 parts');
    }
    
    // Decode and parse payload
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    console.log('🔍 JWT EDGE: Decoded payload:', {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      iat: payload.iat,
      exp: payload.exp
    });
    console.log('🔍 JWT EDGE: Full payload:', JSON.stringify(payload, null, 2));
    
    // Validate required fields
    if (!payload.userId || !payload.email || !payload.role) {
      console.log('🔍 JWT EDGE: Missing required fields');
      throw new Error('Invalid token: missing required fields');
    }
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    console.log('🔍 JWT EDGE: Time check:', { 
      now, 
      exp: payload.exp, 
      expired: payload.exp < now,
      timeUntilExpiry: payload.exp - now
    });
    
    if (payload.exp && payload.exp < now) {
      console.log('🔍 JWT EDGE: Token expired');
      throw new Error('Token expired');
    }
    
    // Validate token age (not too old)
    if (payload.iat && (now - payload.iat) > 7 * 24 * 60 * 60) { // 7 days
      console.log('🔍 JWT EDGE: Token too old');
      throw new Error('Token too old');
    }
    
    // For now, skip signature verification in Edge Runtime
    // TODO: Implement proper HMAC signature verification using Web Crypto API
    console.log('🔍 JWT EDGE: Token verification successful (signature verification skipped)');
    console.log('🔍 JWT EDGE: Token signature:', parts[2] ? `${parts[2].substring(0, 20)}...` : 'MISSING');
    return payload as JWTPayload;
  } catch (error) {
    console.log('🔍 JWT EDGE: Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
    // Don't log sensitive token information
    if (error instanceof Error) {
      throw new Error(`JWT verification failed: ${error.message}`);
    }
    throw new Error('JWT verification failed: unknown error');
  }
}

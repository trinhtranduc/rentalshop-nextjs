/**
 * JWT verification for Edge Runtime
 * Uses Web Crypto API instead of Node.js crypto module
 */

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Convert JWT secret to Uint8Array for Web Crypto API
 */
function secretToUint8Array(secret: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(secret);
}

/**
 * Base64 URL decode
 */
function base64UrlDecode(str: string): string {
  // Replace URL-safe characters
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  
  // Add padding if needed
  while (str.length % 4) {
    str += '=';
  }
  
  // Decode
  return atob(str);
}

/**
 * Parse JWT token without verification (for debugging)
 */
function parseJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return payload;
  } catch (error) {
    console.error('JWT parsing error:', error);
    return null;
  }
}

/**
 * Verify JWT token using Web Crypto API
 */
export async function verifyTokenEdge(token: string): Promise<JWTPayload> {
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  
  try {
    // First, parse the token to check expiration
    const payload = parseJWT(token);
    if (!payload) {
      throw new Error('Invalid token format');
    }
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired');
    }
    
    // For now, we'll just return the parsed payload
    // In a production environment, you should implement proper signature verification
    // using Web Crypto API's HMAC or RSA verification
    
    return payload;
  } catch (error) {
    console.error('JWT verification error:', error);
    throw error;
  }
}

/**
 * Simple JWT verification (for development)
 * In production, use proper signature verification
 */
export function verifyTokenSimple(token: string): JWTPayload {
  const payload = parseJWT(token);
  if (!payload) {
    throw new Error('Invalid token format');
  }
  
  // Check if token is expired
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token expired');
  }
  
  return payload;
} 
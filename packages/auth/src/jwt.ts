import * as jwt from 'jsonwebtoken';
import { getSubscriptionError } from '@rentalshop/utils/server';

// Get JWT secret from environment or use a fallback
const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_LOCAL || 'local-jwt-secret-key-change-this';

export interface JWTPayload {
  userId: number;  // This should be the id (number) for consistency
  email: string;
  role: string;
  merchantId?: number | null;  // Optional merchant ID for merchant/outlet users
  outletId?: number | null;    // Optional outlet ID for outlet users
  sessionId?: string;           // Session ID for single session enforcement
  passwordChangedAt?: number | null;  // Timestamp when password was last changed (to invalidate old tokens)
  permissionsChangedAt?: number | null;  // Timestamp when permissions were last changed (to invalidate old tokens)
  // Note: planName and allowWebAccess removed - fetch from DB when needed to keep JWT small
}

export const generateToken = (payload: JWTPayload): string => {
  console.log('🔍 JWT GENERATE: Creating token with payload:', JSON.stringify(payload, null, 2));
  console.log('🔍 JWT GENERATE: Using JWT_SECRET:', JWT_SECRET ? `${JWT_SECRET.substring(0, 10)}...` : 'UNDEFINED');
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  console.log('🔍 JWT GENERATE: Generated token:', token ? `${token.substring(0, 20)}...` : 'FAILED');
  return token;
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

export const verifyTokenSimple = async (token: string) => {
  try {
    console.log('🔍 JWT: verifyTokenSimple called with token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
    const payload = verifyToken(token);
    console.log('🔍 JWT: Token payload:', payload);
    
    // Return the payload directly without database lookup
    // Database validation should be done in the API route that calls this function
    console.log('✅ JWT: Token verification successful');
    return {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      merchantId: payload.merchantId ?? null,
      outletId: payload.outletId ?? null,
      sessionId: payload.sessionId,
      passwordChangedAt: payload.passwordChangedAt ?? null, // Include passwordChangedAt for validation
      permissionsChangedAt: payload.permissionsChangedAt ?? null, // Include permissionsChangedAt for validation
      // Note: planName and allowWebAccess removed - fetch from DB when needed
    };
  } catch (error) {
    console.error('❌ JWT: Token verification failed:', error);
    return null;
  }
};

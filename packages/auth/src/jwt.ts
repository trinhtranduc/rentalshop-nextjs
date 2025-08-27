import * as jwt from 'jsonwebtoken';
import { prisma } from '@rentalshop/database';

// Get JWT secret from environment or use a fallback
const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_LOCAL || 'local-jwt-secret-key-change-this';

export interface JWTPayload {
  userId: string;  // Changed from number to string - this should be the internal database ID
  email: string;
  role: string;
}

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

export const verifyTokenSimple = async (token: string) => {
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }, // Now payload.userId is string, matching Prisma's expected type
      include: {
        merchant: true,
        outlet: true,
      },
    });
    return user;
  } catch (error) {
    console.error('JWT verification - Error:', error);
    return null;
  }
}; 
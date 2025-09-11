import * as jwt from 'jsonwebtoken';
import { prisma } from '@rentalshop/database';

// Get JWT secret from environment or use a fallback
const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_LOCAL || 'local-jwt-secret-key-change-this';

export interface JWTPayload {
  userId: number;  // This should be the publicId (number) for consistency
  email: string;
  role: string;
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
    console.log('🔍 JWT: Looking for user with publicId:', payload.userId);
    
    const user = await prisma.user.findUnique({
      where: { publicId: payload.userId }, // Now payload.userId is number (publicId)
      include: {
        merchant: true,
        outlet: true,
      },
    });

    console.log('🔍 JWT: Database query result:', {
      userFound: !!user,
      userId: user?.id,
      publicId: user?.publicId,
      email: user?.email,
      role: user?.role,
      hasMerchant: !!user?.merchant,
      hasOutlet: !!user?.outlet
    });

    if (!user) {
      console.log('🔍 JWT: User not found, returning null');
      return null;
    }

    // Check subscription status for merchants
    if (user.merchant) {
      const currentSubscription = await prisma.subscription.findFirst({
        where: {
          merchantId: user.merchant.id,
          status: {
            in: ['active', 'trial', 'cancelled', 'expired', 'suspended', 'past_due']
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (currentSubscription) {
        const subscriptionStatus = currentSubscription.status.toLowerCase();
        
        // If subscription is cancelled, expired, or suspended, throw error
        if (['cancelled', 'expired', 'suspended', 'past_due'].includes(subscriptionStatus)) {
          const errorMessage = getSubscriptionStatusMessage(subscriptionStatus);
          throw new Error(errorMessage);
        }
      }
    }

    return user;
  } catch (error) {
    console.error('🔍 JWT: JWT verification - Error:', error);
    console.error('🔍 JWT: Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
};

/**
 * Get subscription status message
 */
const getSubscriptionStatusMessage = (status: string): string => {
  const statusMessages: Record<string, string> = {
    'cancelled': 'Your subscription has been cancelled. Please contact support to reactivate your account.',
    'expired': 'Your subscription has expired. Please renew to continue using our services.',
    'suspended': 'Your subscription has been suspended. Please contact support for assistance.',
    'past_due': 'Your subscription payment is past due. Please update your payment method.'
  };
  
  return statusMessages[status.toLowerCase()] || 'There is an issue with your subscription. Please contact support.';
}; 
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

    if (!user) {
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
    console.error('JWT verification - Error:', error);
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
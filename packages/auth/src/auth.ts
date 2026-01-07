import { prisma } from '@rentalshop/database';
import { comparePassword, hashPassword } from './password';
import { generateToken } from './jwt';
import { getSubscriptionError } from '@rentalshop/utils';
import { ROLE_PERMISSIONS } from './core';
import type { LoginCredentials, RegisterData, AuthResponse, AuthUser } from './types';

export const loginUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const user = await prisma.user.findUnique({
    where: { email: credentials.email },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          description: true,
          tenantKey: true, // Include tenantKey for referral link
        },
      },
      outlet: {
        select: {
          id: true,
          name: true,
          address: true,
          merchant: {
            select: {
              id: true,
              name: true,
              tenantKey: true, // Include tenantKey for referral link
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValidPassword = await comparePassword(credentials.password, user.password);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  // Check subscription status before allowing login
  // This prevents users with expired/cancelled subscriptions from logging in
  const subscriptionError = await getSubscriptionError({
    role: user.role,
    merchant: user.merchant,
  });
  
  if (subscriptionError) {
    console.log('🔍 LOGIN: Subscription check failed:', subscriptionError.message);
    throw subscriptionError; // This will be caught and return 402 status
  }

  // Get permissions from ROLE_PERMISSIONS based on user role
  const permissions = ROLE_PERMISSIONS[user.role] || [];

  // Include passwordChangedAt in token to invalidate old tokens when password changes
  const passwordChangedAt = (user as any).passwordChangedAt 
    ? Math.floor((user as any).passwordChangedAt.getTime() / 1000) // Convert to Unix timestamp
    : null;

  // Include permissionsChangedAt in token to invalidate old tokens when permissions change
  const permissionsChangedAt = (user as any).permissionsChangedAt 
    ? Math.floor((user as any).permissionsChangedAt.getTime() / 1000) // Convert to Unix timestamp
    : null;

  const token = generateToken({
    userId: user.id, // Use id (number) for JWT token consistency
    email: user.email,
    role: user.role,
    passwordChangedAt: passwordChangedAt,
    permissionsChangedAt: permissionsChangedAt,
  });

  // Get base URL for public product links
  const getBaseUrl = () => {
    // Try to get from environment variable first
    if (process.env.NEXT_PUBLIC_CLIENT_URL) {
      return process.env.NEXT_PUBLIC_CLIENT_URL;
    }
    // Fallback to default
    return 'https://dev.anyrent.shop';
  };

  const baseUrl = getBaseUrl();

  // Generate referral link and public product link for merchant
  const getMerchantLinks = (tenantKey?: string | null) => {
    if (!tenantKey) {
      return {
        referralLink: undefined,
        publicProductLink: undefined,
      };
    }
    return {
      referralLink: tenantKey, // Referral code is the tenantKey itself
      publicProductLink: `${baseUrl}/${tenantKey}/products`,
    };
  };

  // Get merchant links
  const merchantTenantKey = (user.merchant as any)?.tenantKey;
  const merchantLinks = getMerchantLinks(merchantTenantKey);

  // Get outlet merchant links
  const outletMerchantTenantKey = (user.outlet as any)?.merchant?.tenantKey;
  const outletMerchantLinks = getMerchantLinks(outletMerchantTenantKey);

  return {
    user: {
      id: user.id, // Return id to frontend (number)
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      phone: user.phone || undefined,
      merchantId: user.merchantId ? Number(user.merchantId) : undefined,
      outletId: user.outletId ? Number(user.outletId) : undefined,
      permissions: permissions,
      merchant: user.merchant ? {
        id: user.merchant.id, // Return merchant id to frontend (number)
        name: user.merchant.name,
        description: user.merchant.description || undefined,
        tenantKey: merchantTenantKey || undefined, // Include tenantKey for referral link
        referralLink: merchantLinks.referralLink, // Referral code (tenantKey)
        publicProductLink: merchantLinks.publicProductLink, // Public product link
      } : undefined,
      outlet: user.outlet ? {
        id: user.outlet.id, // Return outlet id to frontend (number)
        name: user.outlet.name,
        address: user.outlet.address || undefined,
        merchant: (user.outlet as any).merchant ? {
          id: (user.outlet as any).merchant.id,
          name: (user.outlet as any).merchant.name,
          tenantKey: outletMerchantTenantKey || undefined,
          referralLink: outletMerchantLinks.referralLink, // Referral code (tenantKey)
          publicProductLink: outletMerchantLinks.publicProductLink, // Public product link
        } : undefined,
      } : undefined,
    },
    token,
  };
};

export const registerUser = async (data: RegisterData): Promise<AuthResponse> => {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error('User already exists');
  }

  const hashedPassword = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName || data.name?.split(' ')[0] || '',
      lastName: data.lastName || data.name?.split(' ').slice(1).join(' ') || '',
      phone: data.phone,
      role: (data.role || 'OUTLET_STAFF') as any, // ✅ Type safe with Prisma enum
    },
  });

  // Include passwordChangedAt in token to invalidate old tokens when password changes
  const passwordChangedAt = (user as any).passwordChangedAt 
    ? Math.floor((user as any).passwordChangedAt.getTime() / 1000) // Convert to Unix timestamp
    : null;

  // Include permissionsChangedAt in token to invalidate old tokens when permissions change
  const permissionsChangedAt = (user as any).permissionsChangedAt 
    ? Math.floor((user as any).permissionsChangedAt.getTime() / 1000) // Convert to Unix timestamp
    : null;

  const token = generateToken({
    userId: user.id, // Use id (number) for JWT token consistency
    email: user.email,
    role: user.role,
    passwordChangedAt: passwordChangedAt,
    permissionsChangedAt: permissionsChangedAt,
  });

  return {
    user: {
      id: user.id, // Return id to frontend (number)
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      phone: user.phone || undefined,
      merchantId: user.merchantId ? Number(user.merchantId) : undefined,
      outletId: user.outletId ? Number(user.outletId) : undefined,
    },
    token,
  };
}; 
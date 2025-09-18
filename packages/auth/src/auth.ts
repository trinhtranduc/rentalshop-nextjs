import { prisma } from '@rentalshop/database';
import { comparePassword, hashPassword } from './password';
import { generateToken } from './jwt';
import { getSubscriptionError } from '@rentalshop/utils';
import type { LoginCredentials, RegisterData, AuthResponse, AuthUser } from './types';

export const loginUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const user = await prisma.user.findUnique({
    where: { email: credentials.email },
    include: {
      merchant: true,
      outlet: true,
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
    merchant: user.merchant
  });
  
  if (subscriptionError) {
    console.log('🔍 LOGIN: Subscription check failed:', subscriptionError.message);
    throw subscriptionError; // This will be caught and return 402 status
  }

  const token = generateToken({
    userId: user.publicId, // Use publicId (number) for JWT token consistency
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.publicId, // Return publicId as "id" to frontend (number)
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      phone: user.phone || undefined,
      merchantId: user.merchantId ? Number(user.merchantId) : undefined,
      outletId: user.outletId ? Number(user.outletId) : undefined,
      merchant: user.merchant ? {
        id: user.merchant.publicId, // Return merchant publicId as "id" to frontend (number)
        name: user.merchant.name,
        description: user.merchant.description || undefined,
      } : undefined,
      outlet: user.outlet ? {
        id: user.outlet.publicId, // Return outlet publicId as "id" to frontend (number)
        name: user.outlet.name,
        address: user.outlet.address || undefined,
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

  // Generate a unique publicId for the new user
  const publicId = Math.floor(Math.random() * 1000000) + 100000; // 6-digit number

  const user = await prisma.user.create({
    data: {
      publicId, // Set the generated publicId
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName || data.name?.split(' ')[0] || '',
      lastName: data.lastName || data.name?.split(' ').slice(1).join(' ') || '',
      phone: data.phone,
      role: data.role || 'OUTLET_STAFF',
    },
  });

  const token = generateToken({
    userId: user.publicId, // Use publicId (number) for JWT token consistency
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.publicId, // Return publicId as "id" to frontend (number)
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
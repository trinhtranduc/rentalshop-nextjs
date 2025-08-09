import { prisma } from './client';
import type { User } from '@prisma/client';

// User Management
export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
    include: {
      merchant: true,
    },
  });
};

export const findUserById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    include: {
      merchant: true,
    },
  });
};

export const createUser = async (data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
}) => {
  return prisma.user.create({
    data: {
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: data.role || 'OUTLET_STAFF',
    },
    include: { merchant: true },
  });
};

export const updateUser = async (id: string, data: Partial<User>) => {
  return prisma.user.update({
    where: { id },
    data,
    include: { merchant: true },
  });
};

// Merchant Management
export const createMerchant = async (data: { name: string; description?: string; isActive?: boolean }) => {
  return prisma.merchant.create({
    data,
    include: { users: true, outlets: true },
  });
};

export const findMerchantByUserId = async (userId: string) => {
  return prisma.merchant.findFirst({
    where: { users: { some: { id: userId } } },
    include: { users: true, outlets: true },
  });
};

export const findMerchantById = async (id: string) => {
  return prisma.merchant.findUnique({
    where: { id },
    include: { users: true, outlets: true },
  });
};

// Outlet Management
export const createOutlet = async (data: { merchantId: string; name: string; address?: string; description?: string }) => {
  return prisma.outlet.create({ data, include: { merchant: true, products: true, users: true } });
};

export const findOutletById = async (id: string) => {
  return prisma.outlet.findUnique({ where: { id }, include: { merchant: true, products: true, users: true } });
};

export const findOutletsByMerchantId = async (merchantId: string) => {
  return prisma.outlet.findMany({ where: { merchantId }, include: { products: true, users: true } });
};

// Outlet Staff Management
// Outlet staff model removed in new schema

// Outlet staff model removed in new schema

// Outlet staff model removed in new schema

// Password Reset Token Management
// Password reset token model removed in new schema

// Removed

// Removed

// Removed

// Email Verification Token Management
// Email verification token model removed in new schema

// Removed

// Removed

// Removed

// Session Management
// Sessions removed in new schema

// Removed

// Removed

// Removed

// Removed

// Admin Management
// Admin model removed in new schema

// Removed

// Database Health Check
export const checkDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'connected' };
  } catch (error) {
    return { status: 'disconnected', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}; 
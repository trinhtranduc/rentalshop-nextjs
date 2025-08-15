import { prisma } from './client';
import type { User } from '@prisma/client';

// User Management
export const findUserByEmail = async (email: string) => {
  console.log('Database: Finding user by email:', email);
  
  try {
    const result = await prisma.user.findUnique({
      where: { email },
      include: {
        merchant: true,
      },
    });
    
    console.log('Database: User found by email:', result ? 'Yes' : 'No');
    return result;
  } catch (error) {
    console.error('Database: Error finding user by email:', error);
    throw error;
  }
};

export const findUserById = async (id: string) => {
  console.log('Database: Finding user by ID:', id);
  
  try {
    const result = await prisma.user.findUnique({
      where: { id },
      include: {
        merchant: true,
      },
    });
    
    console.log('Database: User found by ID:', result ? 'Yes' : 'No');
    return result;
  } catch (error) {
    console.error('Database: Error finding user by ID:', error);
    throw error;
  }
};

export const createUser = async (data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
  merchantId?: string; // Add merchantId to the function signature
}) => {
  console.log('Database: Creating user with data:', data);
  
  try {
    // Check for merchant-scoped uniqueness before creating
    if (data.merchantId) {
      // Check if email already exists within the same merchant
      const existingEmailUser = await prisma.user.findFirst({
        where: {
          email: data.email.toLowerCase(),
          merchantId: data.merchantId
        }
      });
      
      if (existingEmailUser) {
        throw new Error(`User with email '${data.email}' already exists in this merchant organization`);
      }
      
      // Check if phone already exists within the same merchant (if phone is provided)
      if (data.phone && data.phone.trim()) {
        const existingPhoneUser = await prisma.user.findFirst({
          where: {
            phone: data.phone.trim(),
            merchantId: data.merchantId
          }
        });
        
        if (existingPhoneUser) {
          throw new Error(`User with phone '${data.phone}' already exists in this merchant organization`);
        }
      }
    }
    
    const result = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone?.trim(),
        role: data.role || 'OUTLET_STAFF',
        merchantId: data.merchantId, // Include merchantId in creation
      },
      include: { merchant: true },
    });
    
    console.log('Database: User created successfully:', result);
    return result;
  } catch (error) {
    console.error('Database: Error creating user:', error);
    throw error;
  }
};

export const updateUser = async (id: string, data: Partial<User>) => {
  console.log('Database: Updating user with ID:', id, 'data:', data);
  
  try {
    const result = await prisma.user.update({
      where: { id },
      data,
      include: { merchant: true },
    });
    
    console.log('Database: User updated successfully:', result);
    return result;
  } catch (error) {
    console.error('Database: Error updating user:', error);
    throw error;
  }
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
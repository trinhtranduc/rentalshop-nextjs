import { prisma } from './client';
import type { User } from '@prisma/client';

// Utility functions to generate the next public ID for each model type
const generateNextUserPublicId = async (): Promise<number> => {
  const lastUser = await prisma.user.findFirst({
    orderBy: { publicId: 'desc' },
    select: { publicId: true }
  });
  return (lastUser?.publicId || 0) + 1;
};

const generateNextMerchantPublicId = async (): Promise<number> => {
  const lastMerchant = await prisma.merchant.findFirst({
    orderBy: { publicId: 'desc' },
    select: { publicId: true }
  });
  return (lastMerchant?.publicId || 0) + 1;
};

const generateNextOutletPublicId = async (): Promise<number> => {
  const lastOutlet = await prisma.outlet.findFirst({
    orderBy: { publicId: 'desc' },
    select: { publicId: true }
  });
  return (lastOutlet?.publicId || 0) + 1;
};

const generateNextProductPublicId = async (): Promise<number> => {
  const lastProduct = await prisma.product.findFirst({
    orderBy: { publicId: 'desc' },
    select: { publicId: true }
  });
  return (lastProduct?.publicId || 0) + 1;
};

const generateNextCustomerPublicId = async (): Promise<number> => {
  const lastCustomer = await prisma.customer.findFirst({
    orderBy: { publicId: 'desc' },
    select: { publicId: true }
  });
  return (lastCustomer?.publicId || 0) + 1;
};

const generateNextCategoryPublicId = async (): Promise<number> => {
  const lastCategory = await prisma.category.findFirst({
    orderBy: { publicId: 'desc' },
    select: { publicId: true }
  });
  return (lastCategory?.publicId || 0) + 1;
};

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

export const findUserByPublicId = async (publicId: number) => {
  console.log('Database: Finding user by public ID:', publicId);
  
  try {
    const result = await prisma.user.findFirst({
      where: { publicId },
      include: {
        merchant: true,
        outlet: true,
      },
    });
    
    console.log('Database: User found by public ID:', result ? 'Yes' : 'No');
    return result;
  } catch (error) {
    console.error('Database: Error finding user by public ID:', error);
    throw error;
  }
};

export const createUser = async (data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string; // Phone is now required due to database constraint
  role: 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
  merchantId?: string; // Required for MERCHANT, OUTLET_ADMIN, OUTLET_STAFF roles
  outletId?: string; // Required for OUTLET_ADMIN and OUTLET_STAFF roles
}) => {
  console.log('Database: Creating user with data:', { ...data, password: '[HIDDEN]' });
  
  try {
    // Validate role-specific requirements
    if (data.role === 'ADMIN') {
      // Admin users don't need merchant or outlet assignment
      if (data.merchantId || data.outletId) {
        console.log('❌ Database: Admin users should not have merchant or outlet assignments');
        return {
          success: false,
          error: 'Admin users cannot be assigned to specific merchants or outlets',
          code: 400
        };
      }
    } else if (data.role === 'MERCHANT') {
      // Merchant users must have a merchantId but no outletId
      if (!data.merchantId) {
        console.log('❌ Database: Merchant users must have a merchantId');
        return {
          success: false,
          error: 'Merchant users must be assigned to a merchant organization',
          code: 400
        };
      }
      if (data.outletId) {
        console.log('❌ Database: Merchant users should not have outlet assignments');
        return {
          success: false,
          error: 'Merchant users cannot be assigned to specific outlets',
          code: 400
        };
      }
    } else if (data.role === 'OUTLET_ADMIN' || data.role === 'OUTLET_STAFF') {
      // Outlet users must have both merchantId and outletId
      if (!data.merchantId) {
        console.log('❌ Database: Outlet users must have a merchantId');
        return {
          success: false,
          error: 'Outlet users must be assigned to a merchant organization',
          code: 400
        };
      }
      if (!data.outletId) {
        console.log('❌ Database: Outlet users must have an outletId');
        return {
          success: false,
          error: 'Outlet users must be assigned to a specific outlet',
          code: 400
        };
      }
      
      // Verify that the outlet belongs to the specified merchant
      const outlet = await prisma.outlet.findFirst({
        where: {
          id: data.outletId,
          merchantId: data.merchantId
        }
      });
      
      if (!outlet) {
        console.log('❌ Database: Outlet does not belong to the specified merchant');
        return {
          success: false,
          error: 'The specified outlet does not belong to the specified merchant',
          code: 400
        };
      }
    }
    
    // Check if user with email already exists
    const existingEmailUser = await prisma.user.findFirst({
      where: data.merchantId 
        ? { 
            email: data.email.toLowerCase(),
            merchantId: data.merchantId
          }
        : { email: data.email.toLowerCase() }
    });
    
    if (existingEmailUser) {
      const scope = data.merchantId ? 'in this merchant organization' : 'in the system';
      console.log('❌ Database: Email already exists, returning early:', { email: data.email, scope });
      return {
        success: false,
        error: `User with email '${data.email}' already exists ${scope}`,
        code: 409 // Conflict - duplicate resource
      };
    }
    
    // Check if user with phone already exists (when phone is provided)
    const existingPhoneUser = await prisma.user.findFirst({
      where: data.merchantId 
        ? { 
            phone: data.phone.trim(),
            merchantId: data.merchantId
          }
        : { phone: data.phone.trim() }
    });
    
    if (existingPhoneUser) {
      const scope = data.merchantId ? 'in this merchant organization' : 'in the system';
      console.log('❌ Database: Phone already exists, returning early:', { phone: data.phone, scope });
      return {
        success: false,
        error: `User with phone '${data.phone}' already exists ${scope}`,
        code: 409 // Conflict - duplicate resource
      };
    }
    
    // Generate the next public ID for the user
    const nextPublicId = await generateNextUserPublicId();
    
    const result = await prisma.user.create({
      data: {
        publicId: nextPublicId,
        email: data.email.toLowerCase().trim(),
        password: data.password,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone.trim(),
        role: data.role,
        merchantId: data.merchantId,
        outletId: data.outletId,
        isActive: true
      }
    });
    
    console.log('✅ Database: User created successfully:', {
      id: result.id,
      publicId: result.publicId,
      email: result.email,
      role: result.role,
      merchantId: result.merchantId,
      outletId: result.outletId
    });
    
    return {
      success: true,
      user: result
    };
  } catch (error) {
    console.error('❌ Database: Error creating user:', error);
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
  // Generate the next public ID for the merchant
  const lastMerchant = await prisma.merchant.findFirst({
    orderBy: { publicId: 'desc' },
    select: { publicId: true }
  });
  const nextPublicId = (lastMerchant?.publicId || 0) + 1;

  return prisma.merchant.create({
    data: {
      ...data,
      publicId: nextPublicId,
    },
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
  // Generate the next public ID for the outlet
  const lastOutlet = await prisma.outlet.findFirst({
    orderBy: { publicId: 'desc' },
    select: { publicId: true }
  });
  const nextPublicId = (lastOutlet?.publicId || 0) + 1;

  return prisma.outlet.create({ 
    data: {
      ...data,
      publicId: nextPublicId,
    }, 
    include: { merchant: true, products: true, users: true } 
  });
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
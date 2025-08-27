// ============================================================================
// NEW: CORRECT DUAL ID UTILITY FUNCTIONS
// ============================================================================
// This file contains only the correct functions that follow the dual ID system:
// - Input: publicId (number)
// - Database: queries by publicId
// - Return: includes both id (CUID) and publicId (number)

import { prisma } from './client';

// ============================================================================
// ENTITY LOOKUP FUNCTIONS (BY PUBLIC ID)
// ============================================================================

/**
 * Find outlet by publicId (number) - follows dual ID system
 */
export const findOutletByPublicId = async (publicId: number) => {
  return await prisma.outlet.findUnique({ 
    where: { publicId }, 
    include: { merchant: true, products: true, users: true } 
  });
};

/**
 * Find customer by publicId (number) - follows dual ID system
 */
export const findCustomerByPublicId = async (publicId: number) => {
  return await prisma.customer.findUnique({ 
    where: { publicId }, 
    include: { merchant: true, orders: true } 
  });
};

/**
 * Find product by publicId (number) - follows dual ID system
 */
export const findProductByPublicId = async (publicId: number) => {
  return await prisma.product.findUnique({ 
    where: { publicId }, 
    include: { merchant: true, category: true } 
  });
};

/**
 * Find user by publicId (number) - follows dual ID system
 */
export const findUserByPublicId = async (publicId: number) => {
  return await prisma.user.findUnique({ 
    where: { publicId }, 
    include: { merchant: true, outlet: true } 
  });
};

/**
 * Find merchant by publicId (number) - follows dual ID system
 */
export const findMerchantByPublicId = async (publicId: number) => {
  return await prisma.merchant.findUnique({ 
    where: { publicId }, 
    include: { users: true, outlets: true } 
  });
};

/**
 * Find category by publicId (number) - follows dual ID system
 */
export const findCategoryByPublicId = async (publicId: number) => {
  return await prisma.category.findUnique({ 
    where: { publicId }, 
    include: { merchant: true, products: true } 
  });
};

/**
 * Find order by publicId (number) - follows dual ID system
 */
export const findOrderByPublicId = async (publicId: number) => {
  return await prisma.order.findUnique({ 
    where: { publicId }, 
    include: { 
      customer: true, 
      outlet: { include: { merchant: true } }, 
      orderItems: { include: { product: true } }, 
      payments: true 
    } 
  });
};

// ============================================================================
// PUBLIC ID GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate next public ID for users
 */
export const generateNextUserPublicId = async (): Promise<number> => {
  const lastUser = await prisma.user.findFirst({
    orderBy: { publicId: 'desc' },
    select: { publicId: true }
  });
  return (lastUser?.publicId || 0) + 1;
};

/**
 * Generate next public ID for merchants
 */
export const generateNextMerchantPublicId = async (): Promise<number> => {
  const lastMerchant = await prisma.merchant.findFirst({
    orderBy: { publicId: 'desc' },
    select: { publicId: true }
  });
  return (lastMerchant?.publicId || 0) + 1;
};

/**
 * Generate next public ID for outlets
 */
export const generateNextOutletPublicId = async (): Promise<number> => {
  const lastOutlet = await prisma.outlet.findFirst({
    orderBy: { publicId: 'desc' },
    select: { publicId: true }
  });
  return (lastOutlet?.publicId || 0) + 1;
};

/**
 * Generate next public ID for products
 */
export const generateNextProductPublicId = async (): Promise<number> => {
  const lastProduct = await prisma.product.findFirst({
    orderBy: { publicId: 'desc' },
    select: { publicId: true }
  });
  return (lastProduct?.publicId || 0) + 1;
};

/**
 * Generate next public ID for customers
 */
export const generateNextCustomerPublicId = async (): Promise<number> => {
  const lastCustomer = await prisma.customer.findFirst({
    orderBy: { publicId: 'desc' },
    select: { publicId: true }
  });
  return (lastCustomer?.publicId || 0) + 1;
};

/**
 * Generate next public ID for categories
 */
export const generateNextCategoryPublicId = async (): Promise<number> => {
  const lastCategory = await prisma.category.findFirst({
    orderBy: { publicId: 'desc' },
    select: { publicId: true }
  });
  return (lastCategory?.publicId || 0) + 1;
};

/**
 * Generate next public ID for orders
 */
export const generateNextOrderPublicId = async (): Promise<number> => {
  const lastOrder = await prisma.order.findFirst({
    orderBy: { publicId: 'desc' },
    select: { publicId: true }
  });
  return (lastOrder?.publicId || 0) + 1;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check database connection health
 */
export const checkDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'connected' };
  } catch (error) {
    return { status: 'disconnected', error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Convert outlet publicId to database id (CUID)
 */
export const convertOutletPublicIdToDatabaseId = async (publicId: number): Promise<string> => {
  const outlet = await prisma.outlet.findUnique({
    where: { publicId },
    select: { id: true }
  });
  
  if (!outlet) {
    throw new Error(`Outlet with publicId ${publicId} not found`);
  }
  
  return outlet.id;
};

/**
 * Convert customer publicId to database id (CUID)
 */
export const convertCustomerPublicIdToDatabaseId = async (publicId: number): Promise<string> => {
  const customer = await prisma.customer.findUnique({
    where: { publicId },
    select: { id: true }
  });
  
  if (!customer) {
    throw new Error(`Customer with publicId ${publicId} not found`);
  }
  
  return customer.id;
};

/**
 * Convert product publicId to database id (CUID)
 */
export const convertProductPublicIdToDatabaseId = async (publicId: number): Promise<string> => {
  const product = await prisma.product.findUnique({
    where: { publicId },
    select: { id: true }
  });
  
  if (!product) {
    throw new Error(`Product with publicId ${publicId} not found`);
  }
  
  return product.id;
};

/**
 * Convert user publicId to database id (CUID)
 */
export const convertUserPublicIdToDatabaseId = async (publicId: number): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { publicId },
    select: { id: true }
  });
  
  if (!user) {
    throw new Error(`User with publicId ${publicId} not found`);
  }
  
  return user.id;
};

/**
 * Convert merchant publicId to database id (CUID)
 */
export const convertMerchantPublicIdToDatabaseId = async (publicId: number): Promise<string> => {
  const merchant = await prisma.merchant.findUnique({
    where: { publicId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with publicId ${publicId} not found`);
  }
  
  return merchant.id;
};

/**
 * Convert category publicId to database id (CUID)
 */
export const convertCategoryPublicIdToDatabaseId = async (publicId: number): Promise<string> => {
  const category = await prisma.category.findUnique({
    where: { publicId },
    select: { id: true }
  });
  
  if (!category) {
    throw new Error(`Category with publicId ${publicId} not found`);
  }
  
  return category.id;
};

/**
 * Convert order publicId to database id (CUID)
 */
export const convertOrderPublicIdToDatabaseId = async (publicId: number): Promise<string> => {
  const order = await prisma.order.findUnique({
    where: { publicId },
    select: { id: true }
  });
  
  if (!order) {
    throw new Error(`Order with publicId ${publicId} not found`);
  }
  
  return order.id;
};

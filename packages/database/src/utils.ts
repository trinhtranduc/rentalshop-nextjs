// ============================================================================
// NEW: CORRECT DUAL ID UTILITY FUNCTIONS
// ============================================================================
// This file contains only the correct functions that follow the dual ID system:
// - Input: id (number)
// - Database: queries by id
// - Return: includes both id (CUID) and id (number)

import { prisma } from './client';

// ============================================================================
// ENTITY LOOKUP FUNCTIONS (BY PUBLIC ID)
// ============================================================================

/**
 * Find outlet by id (number) - follows dual ID system
 */
export const findOutletByPublicId = async (id: number) => {
  return await prisma.outlet.findUnique({ 
    where: { id }, 
    include: { merchant: true, products: true, users: true } 
  });
};

/**
 * Find customer by id (number) - follows dual ID system
 */
export const findCustomerByPublicId = async (id: number) => {
  return await prisma.customer.findUnique({ 
    where: { id }, 
    include: { merchant: true, orders: true } 
  });
};

/**
 * Find product by id (number) - follows dual ID system
 */
export const findProductByPublicId = async (id: number) => {
  return await prisma.product.findUnique({ 
    where: { id }, 
    include: { merchant: true, category: true } 
  });
};

/**
 * Find user by id (number) - follows dual ID system
 */
export const findUserByPublicId = async (id: number) => {
  return await prisma.user.findUnique({ 
    where: { id }, 
    include: { merchant: true, outlet: true } 
  });
};

/**
 * Find merchant by id (number) - follows dual ID system
 */
export const findMerchantByPublicId = async (id: number) => {
  return await prisma.merchant.findUnique({ 
    where: { id }, 
    include: { users: true, outlets: true } 
  });
};

/**
 * Find category by id (number) - follows dual ID system
 */
export const findCategoryByPublicId = async (id: number) => {
  return await prisma.category.findUnique({ 
    where: { id }, 
    include: { merchant: true, products: true } 
  });
};

/**
 * Find order by id (number) - follows dual ID system
 */
export const findOrderByPublicId = async (id: number) => {
  return await prisma.order.findUnique({ 
    where: { id }, 
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
    orderBy: { id: 'desc' },
    select: { id: true }
  });
  return (lastUser?.id || 0) + 1;
};

/**
 * Generate next public ID for merchants
 */
export const generateNextMerchantPublicId = async (): Promise<number> => {
  const lastMerchant = await prisma.merchant.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true }
  });
  return (lastMerchant?.id || 0) + 1;
};

/**
 * Generate next public ID for outlets
 */
export const generateNextOutletPublicId = async (): Promise<number> => {
  const lastOutlet = await prisma.outlet.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true }
  });
  return (lastOutlet?.id || 0) + 1;
};

/**
 * Generate next public ID for products
 */
export const generateNextProductPublicId = async (): Promise<number> => {
  const lastProduct = await prisma.product.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true }
  });
  return (lastProduct?.id || 0) + 1;
};

/**
 * Generate next public ID for customers
 */
export const generateNextCustomerPublicId = async (): Promise<number> => {
  const lastCustomer = await prisma.customer.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true }
  });
  return (lastCustomer?.id || 0) + 1;
};

/**
 * Generate next public ID for categories
 */
export const generateNextCategoryPublicId = async (): Promise<number> => {
  const lastCategory = await prisma.category.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true }
  });
  return (lastCategory?.id || 0) + 1;
};

/**
 * Generate next public ID for orders
 */
export const generateNextOrderPublicId = async (): Promise<number> => {
  const lastOrder = await prisma.order.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true }
  });
  return (lastOrder?.id || 0) + 1;
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
 * Convert outlet id to database id (CUID)
 */
export const convertOutletPublicIdToDatabaseId = async (id: number): Promise<string> => {
  const outlet = await prisma.outlet.findUnique({
    where: { id },
    select: { id: true }
  });
  
  if (!outlet) {
    throw new Error(`Outlet with id ${id} not found`);
  }
  
  return outlet.id;
};

/**
 * Convert customer id to database id (CUID)
 */
export const convertCustomerPublicIdToDatabaseId = async (id: number): Promise<string> => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: { id: true }
  });
  
  if (!customer) {
    throw new Error(`Customer with id ${id} not found`);
  }
  
  return customer.id;
};

/**
 * Convert product id to database id (CUID)
 */
export const convertProductPublicIdToDatabaseId = async (id: number): Promise<string> => {
  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true }
  });
  
  if (!product) {
    throw new Error(`Product with id ${id} not found`);
  }
  
  return product.id;
};

/**
 * Convert user id to database id (CUID)
 */
export const convertUserPublicIdToDatabaseId = async (id: number): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true }
  });
  
  if (!user) {
    throw new Error(`User with id ${id} not found`);
  }
  
  return user.id;
};

/**
 * Convert merchant id to database id (CUID)
 */
export const convertMerchantPublicIdToDatabaseId = async (id: number): Promise<string> => {
  const merchant = await prisma.merchant.findUnique({
    where: { id },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with id ${id} not found`);
  }
  
  return merchant.id;
};

/**
 * Convert category id to database id (CUID)
 */
export const convertCategoryPublicIdToDatabaseId = async (id: number): Promise<string> => {
  const category = await prisma.category.findUnique({
    where: { id },
    select: { id: true }
  });
  
  if (!category) {
    throw new Error(`Category with id ${id} not found`);
  }
  
  return category.id;
};

/**
 * Convert order id to database id (CUID)
 */
export const convertOrderPublicIdToDatabaseId = async (id: number): Promise<string> => {
  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true }
  });
  
  if (!order) {
    throw new Error(`Order with id ${id} not found`);
  }
  
  return order.id;
};

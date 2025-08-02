import { z } from 'zod';

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  role: z.enum(['CLIENT', 'SHOP_OWNER', 'ADMIN']).optional(),
});

// Product validation schemas
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  deposit: z.number().min(0, 'Deposit must be non-negative'),
  categoryId: z.string().min(1, 'Category is required'),
  images: z.array(z.string().url()).optional(),
});

// Rental validation schemas
export const rentalSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  startDate: z.date(),
  endDate: z.date(),
  notes: z.string().optional(),
}).refine((data) => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type RentalInput = z.infer<typeof rentalSchema>; 
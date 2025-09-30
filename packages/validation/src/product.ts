import { z } from 'zod';

export const ProductUpdateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.number().int().positive().optional(),
  rentPrice: z.number().positive(),
  salePrice: z.number().positive().optional(),
  deposit: z.number().min(0),
  totalStock: z.number().int().min(0),
  images: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  outletStock: z.array(z.object({
    outletId: z.number().int().positive(),
    stock: z.number().int().min(0)
  })).optional()
});

export const ProductCreateSchema = ProductUpdateSchema.required({
  name: true,
  rentPrice: true,
  deposit: true,
  totalStock: true
});

export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;
export type ProductCreateInput = z.infer<typeof ProductCreateSchema>;
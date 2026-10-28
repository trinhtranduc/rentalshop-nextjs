import { z } from 'zod';

/** #1189 pricing options of a product save; `pricingSchemaVersion: 2` marks a client that knows BLOCK options */
export const ProductPricingOptionSchema = z.object({
  id: z.number().int().positive().optional(),
  type: z.enum(['FIXED', 'DAILY', 'BLOCK']),
  price: z.number().min(0), // BLOCK: day-1 price (the server sets it to blockTiers[0])
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  blockTiers: z.array(z.number().min(0)).min(1).max(31).optional(), // all-in price of renting startDay + i days
  blockStartDay: z.number().int().min(1).max(31).optional(),
  blockExtraMode: z.enum(['EXTRA_PER_DAY', 'HOLD_LAST']).optional(),
  blockExtraPrice: z.number().min(0).optional()
}).refine((o) => o.type !== 'BLOCK' || (o.blockTiers?.length ?? 0) >= 1, {
  message: 'BLOCK_TABLE_INVALID',
  path: ['blockTiers']
});

export const ProductPricingOptionsSchema = z.array(ProductPricingOptionSchema).refine(
  (list) => list.filter((o) => o.type === 'BLOCK').length <= 1,
  { message: 'BLOCK_TABLE_INVALID' }
);

export const PricingSchemaVersionSchema = z.literal(2);

export const ProductUpdateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.number().int().positive().optional(),
  rentPrice: z.number().min(0), // #951: 0đ is a price
  salePrice: z.number().min(0).optional(),
  deposit: z.number().min(0),
  totalStock: z.number().int().min(0),
  images: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  pricingOptions: ProductPricingOptionsSchema.optional(),
  pricingSchemaVersion: PricingSchemaVersionSchema.optional(),
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
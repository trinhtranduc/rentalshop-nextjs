// src/product.ts
import { z } from "zod";
var ProductUpdateSchema = z.object({
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
var ProductCreateSchema = ProductUpdateSchema.required({
  name: true,
  rentPrice: true,
  deposit: true,
  totalStock: true
});

// src/common.ts
import { z as z2 } from "zod";
var IdSchema = z2.number().int().positive();
var PaginationSchema = z2.object({
  page: z2.number().int().min(1).default(1),
  limit: z2.number().int().min(1).max(100).default(20)
});

// src/index.ts
import { z as z3 } from "zod";
var validateRequest = (schema, data) => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
  };
};
export {
  IdSchema,
  PaginationSchema,
  ProductCreateSchema,
  ProductUpdateSchema,
  validateRequest,
  z3 as z
};

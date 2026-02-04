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

// src/post.ts
import { z as z2 } from "zod";
var slugRegex = /^[a-z0-9-]+$/;
var postCreateSchema = z2.object({
  title: z2.string().min(1).max(255),
  slug: z2.string().min(1).max(255).regex(slugRegex, "Slug must contain only lowercase letters, numbers, and hyphens"),
  content: z2.string().min(1, "Content is required"),
  excerpt: z2.string().max(500).optional(),
  seoTitle: z2.string().max(60).optional(),
  seoDescription: z2.string().max(160).optional(),
  seoKeywords: z2.string().max(255).optional(),
  status: z2.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  categoryIds: z2.array(z2.number().int().positive()).optional(),
  tagIds: z2.array(z2.number().int().positive()).optional(),
  featuredImage: z2.string().refine(
    (val) => {
      if (!val || val === "") return true;
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Featured image must be a valid URL or empty string" }
  ).optional()
});
var postUpdateSchema = postCreateSchema.partial().extend({
  status: z2.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional()
});
var postCategoryCreateSchema = z2.object({
  name: z2.string().min(1).max(255),
  slug: z2.string().min(1).max(255).regex(slugRegex, "Slug must contain only lowercase letters, numbers, and hyphens"),
  description: z2.string().max(500).optional(),
  isActive: z2.boolean().default(true)
});
var postCategoryUpdateSchema = postCategoryCreateSchema.partial();
var postTagCreateSchema = z2.object({
  name: z2.string().min(1).max(255),
  slug: z2.string().min(1).max(255).regex(slugRegex, "Slug must contain only lowercase letters, numbers, and hyphens")
});
var postTagUpdateSchema = postTagCreateSchema.partial();
var postSearchSchema = z2.object({
  status: z2.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  categoryId: z2.number().int().positive().optional(),
  tagId: z2.number().int().positive().optional(),
  authorId: z2.number().int().positive().optional(),
  search: z2.string().optional(),
  page: z2.number().int().positive().default(1),
  limit: z2.number().int().positive().max(100).default(20),
  sortBy: z2.enum(["createdAt", "updatedAt", "publishedAt", "title"]).default("createdAt"),
  sortOrder: z2.enum(["asc", "desc"]).default("desc")
});

// src/common.ts
import { z as z3 } from "zod";
var IdSchema = z3.number().int().positive();
var PaginationSchema = z3.object({
  page: z3.number().int().min(1).default(1),
  limit: z3.number().int().min(1).max(100).default(20)
});

// src/index.ts
import { z as z4 } from "zod";
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
  postCategoryCreateSchema,
  postCategoryUpdateSchema,
  postCreateSchema,
  postSearchSchema,
  postTagCreateSchema,
  postTagUpdateSchema,
  postUpdateSchema,
  slugRegex,
  validateRequest,
  z4 as z
};

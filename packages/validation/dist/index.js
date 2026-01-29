"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  IdSchema: () => IdSchema,
  PaginationSchema: () => PaginationSchema,
  ProductCreateSchema: () => ProductCreateSchema,
  ProductUpdateSchema: () => ProductUpdateSchema,
  postCategoryCreateSchema: () => postCategoryCreateSchema,
  postCategoryUpdateSchema: () => postCategoryUpdateSchema,
  postCreateSchema: () => postCreateSchema,
  postSearchSchema: () => postSearchSchema,
  postTagCreateSchema: () => postTagCreateSchema,
  postTagUpdateSchema: () => postTagUpdateSchema,
  postUpdateSchema: () => postUpdateSchema,
  slugRegex: () => slugRegex,
  validateRequest: () => validateRequest,
  z: () => import_zod4.z
});
module.exports = __toCommonJS(index_exports);

// src/product.ts
var import_zod = require("zod");
var ProductUpdateSchema = import_zod.z.object({
  name: import_zod.z.string().min(1).max(255),
  description: import_zod.z.string().optional(),
  barcode: import_zod.z.string().optional(),
  categoryId: import_zod.z.number().int().positive().optional(),
  rentPrice: import_zod.z.number().positive(),
  salePrice: import_zod.z.number().positive().optional(),
  deposit: import_zod.z.number().min(0),
  totalStock: import_zod.z.number().int().min(0),
  images: import_zod.z.array(import_zod.z.string()).optional(),
  isActive: import_zod.z.boolean().optional(),
  outletStock: import_zod.z.array(import_zod.z.object({
    outletId: import_zod.z.number().int().positive(),
    stock: import_zod.z.number().int().min(0)
  })).optional()
});
var ProductCreateSchema = ProductUpdateSchema.required({
  name: true,
  rentPrice: true,
  deposit: true,
  totalStock: true
});

// src/post.ts
var import_zod2 = require("zod");
var slugRegex = /^[a-z0-9-]+$/;
var postCreateSchema = import_zod2.z.object({
  title: import_zod2.z.string().min(1).max(255),
  slug: import_zod2.z.string().min(1).max(255).regex(slugRegex, "Slug must contain only lowercase letters, numbers, and hyphens"),
  content: import_zod2.z.string().min(1, "Content is required"),
  excerpt: import_zod2.z.string().max(500).optional(),
  seoTitle: import_zod2.z.string().max(60).optional(),
  seoDescription: import_zod2.z.string().max(160).optional(),
  seoKeywords: import_zod2.z.string().max(255).optional(),
  status: import_zod2.z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  categoryIds: import_zod2.z.array(import_zod2.z.number().int().positive()).optional(),
  tagIds: import_zod2.z.array(import_zod2.z.number().int().positive()).optional(),
  featuredImage: import_zod2.z.string().url().optional().or(import_zod2.z.literal(""))
});
var postUpdateSchema = postCreateSchema.partial().extend({
  status: import_zod2.z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional()
});
var postCategoryCreateSchema = import_zod2.z.object({
  name: import_zod2.z.string().min(1).max(255),
  slug: import_zod2.z.string().min(1).max(255).regex(slugRegex, "Slug must contain only lowercase letters, numbers, and hyphens"),
  description: import_zod2.z.string().max(500).optional(),
  isActive: import_zod2.z.boolean().default(true)
});
var postCategoryUpdateSchema = postCategoryCreateSchema.partial();
var postTagCreateSchema = import_zod2.z.object({
  name: import_zod2.z.string().min(1).max(255),
  slug: import_zod2.z.string().min(1).max(255).regex(slugRegex, "Slug must contain only lowercase letters, numbers, and hyphens")
});
var postTagUpdateSchema = postTagCreateSchema.partial();
var postSearchSchema = import_zod2.z.object({
  status: import_zod2.z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  categoryId: import_zod2.z.number().int().positive().optional(),
  tagId: import_zod2.z.number().int().positive().optional(),
  authorId: import_zod2.z.number().int().positive().optional(),
  search: import_zod2.z.string().optional(),
  page: import_zod2.z.number().int().positive().default(1),
  limit: import_zod2.z.number().int().positive().max(100).default(20),
  sortBy: import_zod2.z.enum(["createdAt", "updatedAt", "publishedAt", "title"]).default("createdAt"),
  sortOrder: import_zod2.z.enum(["asc", "desc"]).default("desc")
});

// src/common.ts
var import_zod3 = require("zod");
var IdSchema = import_zod3.z.number().int().positive();
var PaginationSchema = import_zod3.z.object({
  page: import_zod3.z.number().int().min(1).default(1),
  limit: import_zod3.z.number().int().min(1).max(100).default(20)
});

// src/index.ts
var import_zod4 = require("zod");
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
  z
});

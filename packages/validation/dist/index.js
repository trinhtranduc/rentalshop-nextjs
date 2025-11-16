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
  validateRequest: () => validateRequest,
  z: () => import_zod3.z
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

// src/common.ts
var import_zod2 = require("zod");
var IdSchema = import_zod2.z.number().int().positive();
var PaginationSchema = import_zod2.z.object({
  page: import_zod2.z.number().int().min(1).default(1),
  limit: import_zod2.z.number().int().min(1).max(100).default(20)
});

// src/index.ts
var import_zod3 = require("zod");
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
  validateRequest,
  z
});

import { z } from 'zod';
export { z } from 'zod';

declare const ProductUpdateSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    barcode: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodNumber>;
    rentPrice: z.ZodNumber;
    salePrice: z.ZodOptional<z.ZodNumber>;
    deposit: z.ZodNumber;
    totalStock: z.ZodNumber;
    images: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    outletStock: z.ZodOptional<z.ZodArray<z.ZodObject<{
        outletId: z.ZodNumber;
        stock: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        outletId: number;
        stock: number;
    }, {
        outletId: number;
        stock: number;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    rentPrice: number;
    deposit: number;
    totalStock: number;
    description?: string | undefined;
    barcode?: string | undefined;
    categoryId?: number | undefined;
    salePrice?: number | undefined;
    images?: string[] | undefined;
    isActive?: boolean | undefined;
    outletStock?: {
        outletId: number;
        stock: number;
    }[] | undefined;
}, {
    name: string;
    rentPrice: number;
    deposit: number;
    totalStock: number;
    description?: string | undefined;
    barcode?: string | undefined;
    categoryId?: number | undefined;
    salePrice?: number | undefined;
    images?: string[] | undefined;
    isActive?: boolean | undefined;
    outletStock?: {
        outletId: number;
        stock: number;
    }[] | undefined;
}>;
declare const ProductCreateSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    barcode: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodNumber>;
    rentPrice: z.ZodNumber;
    salePrice: z.ZodOptional<z.ZodNumber>;
    deposit: z.ZodNumber;
    totalStock: z.ZodNumber;
    images: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    outletStock: z.ZodOptional<z.ZodArray<z.ZodObject<{
        outletId: z.ZodNumber;
        stock: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        outletId: number;
        stock: number;
    }, {
        outletId: number;
        stock: number;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    rentPrice: number;
    deposit: number;
    totalStock: number;
    description?: string | undefined;
    barcode?: string | undefined;
    categoryId?: number | undefined;
    salePrice?: number | undefined;
    images?: string[] | undefined;
    isActive?: boolean | undefined;
    outletStock?: {
        outletId: number;
        stock: number;
    }[] | undefined;
}, {
    name: string;
    rentPrice: number;
    deposit: number;
    totalStock: number;
    description?: string | undefined;
    barcode?: string | undefined;
    categoryId?: number | undefined;
    salePrice?: number | undefined;
    images?: string[] | undefined;
    isActive?: boolean | undefined;
    outletStock?: {
        outletId: number;
        stock: number;
    }[] | undefined;
}>;
type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;
type ProductCreateInput = z.infer<typeof ProductCreateSchema>;

declare const IdSchema: z.ZodNumber;
declare const PaginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: number | undefined;
    limit?: number | undefined;
}>;
type IdInput = z.infer<typeof IdSchema>;
type PaginationInput = z.infer<typeof PaginationSchema>;

declare const validateRequest: <T>(schema: any, data: unknown) => {
    success: true;
    data: T;
} | {
    success: false;
    errors: string[];
};

export { type IdInput, IdSchema, type PaginationInput, PaginationSchema, type ProductCreateInput, ProductCreateSchema, type ProductUpdateInput, ProductUpdateSchema, validateRequest };

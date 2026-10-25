import { z } from 'zod';
export { z } from 'zod';

/** #1189 pricing options of a product save; `pricingSchemaVersion: 2` marks a client that knows BLOCK options */
declare const ProductPricingOptionSchema: z.ZodEffects<z.ZodObject<{
    id: z.ZodOptional<z.ZodNumber>;
    type: z.ZodEnum<["FIXED", "DAILY", "BLOCK"]>;
    price: z.ZodNumber;
    isDefault: z.ZodOptional<z.ZodBoolean>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
    blockTiers: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    blockStartDay: z.ZodOptional<z.ZodNumber>;
    blockExtraMode: z.ZodOptional<z.ZodEnum<["EXTRA_PER_DAY", "HOLD_LAST"]>>;
    blockExtraPrice: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "FIXED" | "DAILY" | "BLOCK";
    price: number;
    id?: number | undefined;
    isDefault?: boolean | undefined;
    isActive?: boolean | undefined;
    sortOrder?: number | undefined;
    blockTiers?: number[] | undefined;
    blockStartDay?: number | undefined;
    blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
    blockExtraPrice?: number | undefined;
}, {
    type: "FIXED" | "DAILY" | "BLOCK";
    price: number;
    id?: number | undefined;
    isDefault?: boolean | undefined;
    isActive?: boolean | undefined;
    sortOrder?: number | undefined;
    blockTiers?: number[] | undefined;
    blockStartDay?: number | undefined;
    blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
    blockExtraPrice?: number | undefined;
}>, {
    type: "FIXED" | "DAILY" | "BLOCK";
    price: number;
    id?: number | undefined;
    isDefault?: boolean | undefined;
    isActive?: boolean | undefined;
    sortOrder?: number | undefined;
    blockTiers?: number[] | undefined;
    blockStartDay?: number | undefined;
    blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
    blockExtraPrice?: number | undefined;
}, {
    type: "FIXED" | "DAILY" | "BLOCK";
    price: number;
    id?: number | undefined;
    isDefault?: boolean | undefined;
    isActive?: boolean | undefined;
    sortOrder?: number | undefined;
    blockTiers?: number[] | undefined;
    blockStartDay?: number | undefined;
    blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
    blockExtraPrice?: number | undefined;
}>;
declare const ProductPricingOptionsSchema: z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodObject<{
    id: z.ZodOptional<z.ZodNumber>;
    type: z.ZodEnum<["FIXED", "DAILY", "BLOCK"]>;
    price: z.ZodNumber;
    isDefault: z.ZodOptional<z.ZodBoolean>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
    blockTiers: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    blockStartDay: z.ZodOptional<z.ZodNumber>;
    blockExtraMode: z.ZodOptional<z.ZodEnum<["EXTRA_PER_DAY", "HOLD_LAST"]>>;
    blockExtraPrice: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "FIXED" | "DAILY" | "BLOCK";
    price: number;
    id?: number | undefined;
    isDefault?: boolean | undefined;
    isActive?: boolean | undefined;
    sortOrder?: number | undefined;
    blockTiers?: number[] | undefined;
    blockStartDay?: number | undefined;
    blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
    blockExtraPrice?: number | undefined;
}, {
    type: "FIXED" | "DAILY" | "BLOCK";
    price: number;
    id?: number | undefined;
    isDefault?: boolean | undefined;
    isActive?: boolean | undefined;
    sortOrder?: number | undefined;
    blockTiers?: number[] | undefined;
    blockStartDay?: number | undefined;
    blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
    blockExtraPrice?: number | undefined;
}>, {
    type: "FIXED" | "DAILY" | "BLOCK";
    price: number;
    id?: number | undefined;
    isDefault?: boolean | undefined;
    isActive?: boolean | undefined;
    sortOrder?: number | undefined;
    blockTiers?: number[] | undefined;
    blockStartDay?: number | undefined;
    blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
    blockExtraPrice?: number | undefined;
}, {
    type: "FIXED" | "DAILY" | "BLOCK";
    price: number;
    id?: number | undefined;
    isDefault?: boolean | undefined;
    isActive?: boolean | undefined;
    sortOrder?: number | undefined;
    blockTiers?: number[] | undefined;
    blockStartDay?: number | undefined;
    blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
    blockExtraPrice?: number | undefined;
}>, "many">, {
    type: "FIXED" | "DAILY" | "BLOCK";
    price: number;
    id?: number | undefined;
    isDefault?: boolean | undefined;
    isActive?: boolean | undefined;
    sortOrder?: number | undefined;
    blockTiers?: number[] | undefined;
    blockStartDay?: number | undefined;
    blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
    blockExtraPrice?: number | undefined;
}[], {
    type: "FIXED" | "DAILY" | "BLOCK";
    price: number;
    id?: number | undefined;
    isDefault?: boolean | undefined;
    isActive?: boolean | undefined;
    sortOrder?: number | undefined;
    blockTiers?: number[] | undefined;
    blockStartDay?: number | undefined;
    blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
    blockExtraPrice?: number | undefined;
}[]>;
declare const PricingSchemaVersionSchema: z.ZodLiteral<2>;
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
    pricingOptions: z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodObject<{
        id: z.ZodOptional<z.ZodNumber>;
        type: z.ZodEnum<["FIXED", "DAILY", "BLOCK"]>;
        price: z.ZodNumber;
        isDefault: z.ZodOptional<z.ZodBoolean>;
        isActive: z.ZodOptional<z.ZodBoolean>;
        sortOrder: z.ZodOptional<z.ZodNumber>;
        blockTiers: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        blockStartDay: z.ZodOptional<z.ZodNumber>;
        blockExtraMode: z.ZodOptional<z.ZodEnum<["EXTRA_PER_DAY", "HOLD_LAST"]>>;
        blockExtraPrice: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "FIXED" | "DAILY" | "BLOCK";
        price: number;
        id?: number | undefined;
        isDefault?: boolean | undefined;
        isActive?: boolean | undefined;
        sortOrder?: number | undefined;
        blockTiers?: number[] | undefined;
        blockStartDay?: number | undefined;
        blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
        blockExtraPrice?: number | undefined;
    }, {
        type: "FIXED" | "DAILY" | "BLOCK";
        price: number;
        id?: number | undefined;
        isDefault?: boolean | undefined;
        isActive?: boolean | undefined;
        sortOrder?: number | undefined;
        blockTiers?: number[] | undefined;
        blockStartDay?: number | undefined;
        blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
        blockExtraPrice?: number | undefined;
    }>, {
        type: "FIXED" | "DAILY" | "BLOCK";
        price: number;
        id?: number | undefined;
        isDefault?: boolean | undefined;
        isActive?: boolean | undefined;
        sortOrder?: number | undefined;
        blockTiers?: number[] | undefined;
        blockStartDay?: number | undefined;
        blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
        blockExtraPrice?: number | undefined;
    }, {
        type: "FIXED" | "DAILY" | "BLOCK";
        price: number;
        id?: number | undefined;
        isDefault?: boolean | undefined;
        isActive?: boolean | undefined;
        sortOrder?: number | undefined;
        blockTiers?: number[] | undefined;
        blockStartDay?: number | undefined;
        blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
        blockExtraPrice?: number | undefined;
    }>, "many">, {
        type: "FIXED" | "DAILY" | "BLOCK";
        price: number;
        id?: number | undefined;
        isDefault?: boolean | undefined;
        isActive?: boolean | undefined;
        sortOrder?: number | undefined;
        blockTiers?: number[] | undefined;
        blockStartDay?: number | undefined;
        blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
        blockExtraPrice?: number | undefined;
    }[], {
        type: "FIXED" | "DAILY" | "BLOCK";
        price: number;
        id?: number | undefined;
        isDefault?: boolean | undefined;
        isActive?: boolean | undefined;
        sortOrder?: number | undefined;
        blockTiers?: number[] | undefined;
        blockStartDay?: number | undefined;
        blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
        blockExtraPrice?: number | undefined;
    }[]>>;
    pricingSchemaVersion: z.ZodOptional<z.ZodLiteral<2>>;
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
    isActive?: boolean | undefined;
    description?: string | undefined;
    barcode?: string | undefined;
    categoryId?: number | undefined;
    salePrice?: number | undefined;
    images?: string[] | undefined;
    pricingOptions?: {
        type: "FIXED" | "DAILY" | "BLOCK";
        price: number;
        id?: number | undefined;
        isDefault?: boolean | undefined;
        isActive?: boolean | undefined;
        sortOrder?: number | undefined;
        blockTiers?: number[] | undefined;
        blockStartDay?: number | undefined;
        blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
        blockExtraPrice?: number | undefined;
    }[] | undefined;
    pricingSchemaVersion?: 2 | undefined;
    outletStock?: {
        outletId: number;
        stock: number;
    }[] | undefined;
}, {
    name: string;
    rentPrice: number;
    deposit: number;
    totalStock: number;
    isActive?: boolean | undefined;
    description?: string | undefined;
    barcode?: string | undefined;
    categoryId?: number | undefined;
    salePrice?: number | undefined;
    images?: string[] | undefined;
    pricingOptions?: {
        type: "FIXED" | "DAILY" | "BLOCK";
        price: number;
        id?: number | undefined;
        isDefault?: boolean | undefined;
        isActive?: boolean | undefined;
        sortOrder?: number | undefined;
        blockTiers?: number[] | undefined;
        blockStartDay?: number | undefined;
        blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
        blockExtraPrice?: number | undefined;
    }[] | undefined;
    pricingSchemaVersion?: 2 | undefined;
    outletStock?: {
        outletId: number;
        stock: number;
    }[] | undefined;
}>;
declare const ProductCreateSchema: z.ZodObject<{
    isActive: z.ZodOptional<z.ZodBoolean>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    barcode: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodNumber>;
    rentPrice: z.ZodNumber;
    salePrice: z.ZodOptional<z.ZodNumber>;
    deposit: z.ZodNumber;
    totalStock: z.ZodNumber;
    images: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    pricingOptions: z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodObject<{
        id: z.ZodOptional<z.ZodNumber>;
        type: z.ZodEnum<["FIXED", "DAILY", "BLOCK"]>;
        price: z.ZodNumber;
        isDefault: z.ZodOptional<z.ZodBoolean>;
        isActive: z.ZodOptional<z.ZodBoolean>;
        sortOrder: z.ZodOptional<z.ZodNumber>;
        blockTiers: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        blockStartDay: z.ZodOptional<z.ZodNumber>;
        blockExtraMode: z.ZodOptional<z.ZodEnum<["EXTRA_PER_DAY", "HOLD_LAST"]>>;
        blockExtraPrice: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "FIXED" | "DAILY" | "BLOCK";
        price: number;
        id?: number | undefined;
        isDefault?: boolean | undefined;
        isActive?: boolean | undefined;
        sortOrder?: number | undefined;
        blockTiers?: number[] | undefined;
        blockStartDay?: number | undefined;
        blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
        blockExtraPrice?: number | undefined;
    }, {
        type: "FIXED" | "DAILY" | "BLOCK";
        price: number;
        id?: number | undefined;
        isDefault?: boolean | undefined;
        isActive?: boolean | undefined;
        sortOrder?: number | undefined;
        blockTiers?: number[] | undefined;
        blockStartDay?: number | undefined;
        blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
        blockExtraPrice?: number | undefined;
    }>, {
        type: "FIXED" | "DAILY" | "BLOCK";
        price: number;
        id?: number | undefined;
        isDefault?: boolean | undefined;
        isActive?: boolean | undefined;
        sortOrder?: number | undefined;
        blockTiers?: number[] | undefined;
        blockStartDay?: number | undefined;
        blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
        blockExtraPrice?: number | undefined;
    }, {
        type: "FIXED" | "DAILY" | "BLOCK";
        price: number;
        id?: number | undefined;
        isDefault?: boolean | undefined;
        isActive?: boolean | undefined;
        sortOrder?: number | undefined;
        blockTiers?: number[] | undefined;
        blockStartDay?: number | undefined;
        blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
        blockExtraPrice?: number | undefined;
    }>, "many">, {
        type: "FIXED" | "DAILY" | "BLOCK";
        price: number;
        id?: number | undefined;
        isDefault?: boolean | undefined;
        isActive?: boolean | undefined;
        sortOrder?: number | undefined;
        blockTiers?: number[] | undefined;
        blockStartDay?: number | undefined;
        blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
        blockExtraPrice?: number | undefined;
    }[], {
        type: "FIXED" | "DAILY" | "BLOCK";
        price: number;
        id?: number | undefined;
        isDefault?: boolean | undefined;
        isActive?: boolean | undefined;
        sortOrder?: number | undefined;
        blockTiers?: number[] | undefined;
        blockStartDay?: number | undefined;
        blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
        blockExtraPrice?: number | undefined;
    }[]>>;
    pricingSchemaVersion: z.ZodOptional<z.ZodLiteral<2>>;
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
    isActive?: boolean | undefined;
    description?: string | undefined;
    barcode?: string | undefined;
    categoryId?: number | undefined;
    salePrice?: number | undefined;
    images?: string[] | undefined;
    pricingOptions?: {
        type: "FIXED" | "DAILY" | "BLOCK";
        price: number;
        id?: number | undefined;
        isDefault?: boolean | undefined;
        isActive?: boolean | undefined;
        sortOrder?: number | undefined;
        blockTiers?: number[] | undefined;
        blockStartDay?: number | undefined;
        blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
        blockExtraPrice?: number | undefined;
    }[] | undefined;
    pricingSchemaVersion?: 2 | undefined;
    outletStock?: {
        outletId: number;
        stock: number;
    }[] | undefined;
}, {
    name: string;
    rentPrice: number;
    deposit: number;
    totalStock: number;
    isActive?: boolean | undefined;
    description?: string | undefined;
    barcode?: string | undefined;
    categoryId?: number | undefined;
    salePrice?: number | undefined;
    images?: string[] | undefined;
    pricingOptions?: {
        type: "FIXED" | "DAILY" | "BLOCK";
        price: number;
        id?: number | undefined;
        isDefault?: boolean | undefined;
        isActive?: boolean | undefined;
        sortOrder?: number | undefined;
        blockTiers?: number[] | undefined;
        blockStartDay?: number | undefined;
        blockExtraMode?: "EXTRA_PER_DAY" | "HOLD_LAST" | undefined;
        blockExtraPrice?: number | undefined;
    }[] | undefined;
    pricingSchemaVersion?: 2 | undefined;
    outletStock?: {
        outletId: number;
        stock: number;
    }[] | undefined;
}>;
type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;
type ProductCreateInput = z.infer<typeof ProductCreateSchema>;

declare const postLocaleSchema: z.ZodEnum<["vi", "en", "ja", "ko", "zh", "ru", "zh-TW", "fr", "de", "th", "id", "es"]>;
declare const slugRegex: RegExp;
declare const postCreateSchema: z.ZodObject<{
    title: z.ZodString;
    slug: z.ZodString;
    locale: z.ZodDefault<z.ZodEnum<["vi", "en", "ja", "ko", "zh", "ru", "zh-TW", "fr", "de", "th", "id", "es"]>>;
    translationSourceId: z.ZodOptional<z.ZodNumber>;
    content: z.ZodString;
    excerpt: z.ZodOptional<z.ZodString>;
    seoTitle: z.ZodOptional<z.ZodString>;
    seoDescription: z.ZodOptional<z.ZodString>;
    seoKeywords: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["DRAFT", "PUBLISHED"]>>;
    categoryIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    tagIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    featuredImage: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    status: "DRAFT" | "PUBLISHED";
    title: string;
    slug: string;
    locale: "id" | "en" | "vi" | "ja" | "ko" | "zh" | "ru" | "zh-TW" | "fr" | "de" | "th" | "es";
    content: string;
    translationSourceId?: number | undefined;
    excerpt?: string | undefined;
    seoTitle?: string | undefined;
    seoDescription?: string | undefined;
    seoKeywords?: string | undefined;
    categoryIds?: number[] | undefined;
    tagIds?: number[] | undefined;
    featuredImage?: string | undefined;
}, {
    title: string;
    slug: string;
    content: string;
    status?: "DRAFT" | "PUBLISHED" | undefined;
    locale?: "id" | "en" | "vi" | "ja" | "ko" | "zh" | "ru" | "zh-TW" | "fr" | "de" | "th" | "es" | undefined;
    translationSourceId?: number | undefined;
    excerpt?: string | undefined;
    seoTitle?: string | undefined;
    seoDescription?: string | undefined;
    seoKeywords?: string | undefined;
    categoryIds?: number[] | undefined;
    tagIds?: number[] | undefined;
    featuredImage?: string | undefined;
}>;
declare const postUpdateSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    locale: z.ZodOptional<z.ZodDefault<z.ZodEnum<["vi", "en", "ja", "ko", "zh", "ru", "zh-TW", "fr", "de", "th", "id", "es"]>>>;
    content: z.ZodOptional<z.ZodString>;
    excerpt: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    seoTitle: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    seoDescription: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    seoKeywords: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    categoryIds: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>>;
    tagIds: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>>;
    featuredImage: z.ZodOptional<z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>>;
} & {
    status: z.ZodOptional<z.ZodEnum<["DRAFT", "PUBLISHED", "ARCHIVED"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | undefined;
    title?: string | undefined;
    slug?: string | undefined;
    locale?: "id" | "en" | "vi" | "ja" | "ko" | "zh" | "ru" | "zh-TW" | "fr" | "de" | "th" | "es" | undefined;
    content?: string | undefined;
    excerpt?: string | undefined;
    seoTitle?: string | undefined;
    seoDescription?: string | undefined;
    seoKeywords?: string | undefined;
    categoryIds?: number[] | undefined;
    tagIds?: number[] | undefined;
    featuredImage?: string | undefined;
}, {
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | undefined;
    title?: string | undefined;
    slug?: string | undefined;
    locale?: "id" | "en" | "vi" | "ja" | "ko" | "zh" | "ru" | "zh-TW" | "fr" | "de" | "th" | "es" | undefined;
    content?: string | undefined;
    excerpt?: string | undefined;
    seoTitle?: string | undefined;
    seoDescription?: string | undefined;
    seoKeywords?: string | undefined;
    categoryIds?: number[] | undefined;
    tagIds?: number[] | undefined;
    featuredImage?: string | undefined;
}>;
declare const postCategoryCreateSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isActive: boolean;
    name: string;
    slug: string;
    description?: string | undefined;
}, {
    name: string;
    slug: string;
    isActive?: boolean | undefined;
    description?: string | undefined;
}>;
declare const postCategoryUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    isActive?: boolean | undefined;
    name?: string | undefined;
    description?: string | undefined;
    slug?: string | undefined;
}, {
    isActive?: boolean | undefined;
    name?: string | undefined;
    description?: string | undefined;
    slug?: string | undefined;
}>;
declare const postTagCreateSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    slug: string;
}, {
    name: string;
    slug: string;
}>;
declare const postTagUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    slug?: string | undefined;
}, {
    name?: string | undefined;
    slug?: string | undefined;
}>;
declare const postSearchSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["DRAFT", "PUBLISHED", "ARCHIVED"]>>;
    locale: z.ZodOptional<z.ZodEnum<["vi", "en", "ja", "ko", "zh", "ru", "zh-TW", "fr", "de", "th", "id", "es"]>>;
    categoryId: z.ZodOptional<z.ZodNumber>;
    tagId: z.ZodOptional<z.ZodNumber>;
    authorId: z.ZodOptional<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodDefault<z.ZodEnum<["createdAt", "updatedAt", "publishedAt", "title"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    sortOrder: "asc" | "desc";
    page: number;
    limit: number;
    sortBy: "title" | "createdAt" | "updatedAt" | "publishedAt";
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | undefined;
    categoryId?: number | undefined;
    locale?: "id" | "en" | "vi" | "ja" | "ko" | "zh" | "ru" | "zh-TW" | "fr" | "de" | "th" | "es" | undefined;
    tagId?: number | undefined;
    authorId?: number | undefined;
    search?: string | undefined;
}, {
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    categoryId?: number | undefined;
    locale?: "id" | "en" | "vi" | "ja" | "ko" | "zh" | "ru" | "zh-TW" | "fr" | "de" | "th" | "es" | undefined;
    tagId?: number | undefined;
    authorId?: number | undefined;
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: "title" | "createdAt" | "updatedAt" | "publishedAt" | undefined;
}>;
type PostCreateInput = z.infer<typeof postCreateSchema>;
type PostUpdateInput = z.infer<typeof postUpdateSchema>;
type PostCategoryCreateInput = z.infer<typeof postCategoryCreateSchema>;
type PostCategoryUpdateInput = z.infer<typeof postCategoryUpdateSchema>;
type PostTagCreateInput = z.infer<typeof postTagCreateSchema>;
type PostTagUpdateInput = z.infer<typeof postTagUpdateSchema>;
type PostSearchInput = z.infer<typeof postSearchSchema>;

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

export { type IdInput, IdSchema, type PaginationInput, PaginationSchema, type PostCategoryCreateInput, type PostCategoryUpdateInput, type PostCreateInput, type PostSearchInput, type PostTagCreateInput, type PostTagUpdateInput, type PostUpdateInput, PricingSchemaVersionSchema, type ProductCreateInput, ProductCreateSchema, ProductPricingOptionSchema, ProductPricingOptionsSchema, type ProductUpdateInput, ProductUpdateSchema, postCategoryCreateSchema, postCategoryUpdateSchema, postCreateSchema, postLocaleSchema, postSearchSchema, postTagCreateSchema, postTagUpdateSchema, postUpdateSchema, slugRegex, validateRequest };

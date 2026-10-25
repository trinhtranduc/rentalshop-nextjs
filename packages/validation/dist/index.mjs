// src/product.ts
import { z } from "zod";
var ProductPricingOptionSchema = z.object({
  id: z.number().int().positive().optional(),
  type: z.enum(["FIXED", "DAILY", "BLOCK"]),
  price: z.number().min(0),
  // BLOCK: day-1 price (the server sets it to blockTiers[0])
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  blockTiers: z.array(z.number().min(0)).min(1).max(31).optional(),
  // all-in price of renting startDay + i days
  blockStartDay: z.number().int().min(1).max(31).optional(),
  blockExtraMode: z.enum(["EXTRA_PER_DAY", "HOLD_LAST"]).optional(),
  blockExtraPrice: z.number().min(0).optional()
}).refine((o) => o.type !== "BLOCK" || (o.blockTiers?.length ?? 0) >= 1, {
  message: "BLOCK_TABLE_INVALID",
  path: ["blockTiers"]
});
var ProductPricingOptionsSchema = z.array(ProductPricingOptionSchema).refine(
  (list) => list.filter((o) => o.type === "BLOCK").length <= 1,
  { message: "BLOCK_TABLE_INVALID" }
);
var PricingSchemaVersionSchema = z.literal(2);
var ProductUpdateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.number().int().positive().optional(),
  rentPrice: z.number().min(0),
  // #951: 0đ is a price
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
var ProductCreateSchema = ProductUpdateSchema.required({
  name: true,
  rentPrice: true,
  deposit: true,
  totalStock: true
});

// src/post.ts
import { z as z2 } from "zod";

// ../constants/src/validation.ts
var VALIDATION = {
  // Rental Rules
  MIN_RENTAL_DAYS: 1,
  MAX_RENTAL_DAYS: 365,
  // Stock and Inventory
  LOW_STOCK_THRESHOLD: 2,
  CRITICAL_STOCK_THRESHOLD: 0,
  MAX_STOCK_QUANTITY: 9999,
  // User Input
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 100,
  MAX_PHONE_LENGTH: 20,
  MAX_EMAIL_LENGTH: 255,
  // Order Rules
  MIN_ORDER_AMOUNT: 0.01,
  MAX_ORDER_AMOUNT: 999999.99,
  MAX_ORDER_ITEMS: 50,
  /** Photos on one order note (general, pickup, return, damage). */
  MAX_ORDER_NOTE_IMAGES: 5,
  // Financial
  MIN_DEPOSIT_AMOUNT: 0,
  MAX_DEPOSIT_AMOUNT: 99999.99,
  MIN_DISCOUNT_AMOUNT: 0,
  MAX_DISCOUNT_PERCENTAGE: 100,
  // File Uploads - Optimized sizes for web/mobile performance
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  // 5MB (general upload limit)
  // Image size limits by type (optimized for performance)
  IMAGE_SIZES: {
    THUMBNAIL: 150 * 1024,
    // 150KB - Small thumbnails, avatars
    PRODUCT: 200 * 1024,
    // 200KB - Product images (recommended)
    PRODUCT_STRICT: 100 * 1024,
    // 300KB - Strict limit for mobile-first
    DOCUMENT: 2 * 1024 * 1024,
    // 2MB - Documents, contracts
    MAX: 5 * 1024 * 1024
    // 5MB - Maximum allowed (rare cases)
  },
  // Image quality settings
  IMAGE_QUALITY: {
    THUMBNAIL: 70,
    // Lower quality for small images
    PRODUCT: 75,
    // Balanced quality for product images
    HIGH: 85
    // High quality for special cases
  },
  // Image dimensions (max width to maintain performance)
  IMAGE_DIMENSIONS: {
    THUMBNAIL: 300,
    // 300px width
    PRODUCT: 1920,
    // 1920px width (Full HD)
    PRODUCT_MOBILE: 800
    // 800px for mobile-optimized
  },
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"]
};

// ../constants/src/environment.ts
var ENVIRONMENT = {
  // API Configuration
  API_TIMEOUT: process.env.NODE_ENV === "production" ? 1e4 : 3e4,
  API_RETRY_ATTEMPTS: process.env.NODE_ENV === "production" ? 3 : 1,
  // Search and Pagination (Production vs Development)
  SEARCH_LIMIT: process.env.NODE_ENV === "production" ? 50 : 20,
  DASHBOARD_ITEMS: process.env.NODE_ENV === "production" ? 20 : 10,
  // Caching
  CACHE_TTL: process.env.NODE_ENV === "production" ? 300 : 60,
  // seconds
  CACHE_MAX_SIZE: process.env.NODE_ENV === "production" ? 1e3 : 100,
  // Logging
  LOG_LEVEL: process.env.NODE_ENV === "production" ? "error" : "debug",
  LOG_RETENTION: process.env.NODE_ENV === "production" ? 30 : 7,
  // days
  // Performance
  DEBOUNCE_DELAY: process.env.NODE_ENV === "production" ? 500 : 300,
  THROTTLE_DELAY: process.env.NODE_ENV === "production" ? 200 : 100,
  // Security
  SESSION_TIMEOUT: process.env.NODE_ENV === "production" ? 3600 : 7200,
  // seconds
  MAX_LOGIN_ATTEMPTS: process.env.NODE_ENV === "production" ? 5 : 10,
  // Feature Flags
  ENABLE_ANALYTICS: process.env.NODE_ENV === "production",
  ENABLE_DEBUG_MODE: process.env.NODE_ENV !== "production",
  ENABLE_PERFORMANCE_MONITORING: process.env.NODE_ENV === "production"
};

// ../constants/src/colors.ts
var ORDER_STATUS_COLORS = {
  RESERVED: {
    bg: "bg-blue-50",
    // Blue 50 - light blue background
    text: "text-blue-700",
    // Blue 700 - text color
    border: "border-blue-200",
    // Blue 200 - border
    hex: "#3B82F6",
    // Blue 500 - primary color
    buttonBg: "#3B82F6",
    // Blue 500 - button background
    buttonHover: "#2563EB",
    // Blue 600 - button hover
    buttonText: "#FFFFFF",
    // White - button text
    className: "bg-blue-50 text-blue-700 border-blue-200"
    // Full className for badges
  },
  PICKUPED: {
    bg: "bg-orange-50",
    // Orange 50 - light orange background
    text: "text-orange-700",
    // Orange 700 - text color
    border: "border-orange-200",
    // Orange 200 - border
    hex: "#F97316",
    // Orange 500 - primary color
    buttonBg: "#F97316",
    // Orange 500 - button background
    buttonHover: "#EA580C",
    // Orange 600 - button hover
    buttonText: "#FFFFFF",
    // White - button text
    className: "bg-orange-50 text-orange-700 border-orange-200"
    // Full className for badges
  },
  RETURNED: {
    bg: "bg-green-50",
    // Green 50 - light green background
    text: "text-green-700",
    // Green 700 - text color
    border: "border-green-200",
    // Green 200 - border
    hex: "#22C55E",
    // Green 500 - primary color
    buttonBg: "#22C55E",
    // Green 500 - button background
    buttonHover: "#16A34A",
    // Green 600 - button hover
    buttonText: "#FFFFFF",
    // White - button text
    className: "bg-green-50 text-green-700 border-green-200"
    // Full className for badges
  },
  COMPLETED: {
    bg: "bg-green-50",
    // Green 50 - light green background (same as RETURNED for consistency)
    text: "text-green-700",
    // Green 700 - text color
    border: "border-green-200",
    // Green 200 - border
    hex: "#22C55E",
    // Green 500 - primary color
    buttonBg: "#22C55E",
    // Green 500 - button background
    buttonHover: "#16A34A",
    // Green 600 - button hover
    buttonText: "#FFFFFF",
    // White - button text
    className: "bg-green-50 text-green-700 border-green-200"
    // Full className for badges
  },
  CANCELLED: {
    bg: "bg-red-50",
    // Red 50 - light red background
    text: "text-red-700",
    // Red 700 - text color
    border: "border-red-200",
    // Red 200 - border
    hex: "#EF4444",
    // Red 500 - primary color
    buttonBg: "#EF4444",
    // Red 500 - button background
    buttonHover: "#DC2626",
    // Red 600 - button hover
    buttonText: "#FFFFFF",
    // White - button text
    className: "bg-red-50 text-red-700 border-red-200"
    // Full className for badges
  }
};
var ORDER_TYPE_COLORS = {
  RENT: {
    bg: "#DBEAFE",
    // Blue 100 - badge background
    text: "#1E40AF",
    // Blue 800 - badge text
    hex: "#3B82F6",
    // Blue 500 - primary color
    buttonBg: "#3B82F6",
    // Blue 500 - button background
    buttonHover: "#2563EB",
    // Blue 600 - button hover
    buttonText: "#FFFFFF"
    // White - button text
  },
  SALE: {
    bg: "#D1FAE5",
    // Emerald 100 - badge background
    text: "#065F46",
    // Emerald 800 - badge text
    hex: "#10B981",
    // Emerald 500 - primary color
    buttonBg: "#10B981",
    // Emerald 500 - button background
    buttonHover: "#059669",
    // Emerald 600 - button hover
    buttonText: "#FFFFFF"
    // White - button text
  }
};

// ../constants/src/status.ts
var ORDER_STATUS = {
  // RENT order statuses
  RESERVED: "RESERVED",
  // New order, scheduled for pickup
  PICKUPED: "PICKUPED",
  // Currently being rented
  RETURNED: "RETURNED",
  // Rental completed
  // SALE order statuses
  COMPLETED: "COMPLETED",
  // Sale finalized
  // Common statuses
  CANCELLED: "CANCELLED"
  // Order cancelled (applies to both types)
};
var ORDER_TYPE = {
  RENT: "RENT",
  SALE: "SALE"
};
var ORDER_STATUS_TRANSITIONS = {
  [ORDER_TYPE.RENT]: {
    [ORDER_STATUS.RESERVED]: [ORDER_STATUS.PICKUPED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PICKUPED]: [ORDER_STATUS.RETURNED, ORDER_STATUS.CANCELLED]
  },
  [ORDER_TYPE.SALE]: {
    [ORDER_STATUS.RESERVED]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.COMPLETED]: [ORDER_STATUS.CANCELLED]
  }
};
var USER_ROLE = {
  ADMIN: "ADMIN",
  // System Administrator
  OPS: "OPS",
  // Platform operations (system-wide, below ADMIN)
  ARTICLE: "ARTICLE",
  // Blog / CMS editor only
  MERCHANT: "MERCHANT",
  // Business Owner
  OUTLET_ADMIN: "OUTLET_ADMIN",
  // Outlet Manager
  OUTLET_STAFF: "OUTLET_STAFF",
  // Outlet Employee
  OUTLET_INVENTORY: "OUTLET_INVENTORY"
  // Outlet Employee who also manages products and categories (#682)
};
var SYSTEM_LEVEL_USER_ROLES = [
  USER_ROLE.ADMIN,
  USER_ROLE.OPS,
  USER_ROLE.ARTICLE
];
var PLATFORM_OPS_ROLES = [
  USER_ROLE.ADMIN,
  USER_ROLE.OPS
];
var OUTLET_USER_ROLES = [
  USER_ROLE.OUTLET_ADMIN,
  USER_ROLE.OUTLET_STAFF,
  USER_ROLE.OUTLET_INVENTORY
];
var STAFF_LIKE_ROLES = [
  USER_ROLE.OUTLET_STAFF,
  USER_ROLE.OUTLET_INVENTORY
];

// ../constants/src/orders.ts
var ORDER_STATUS_BUTTON_COLORS = {
  RESERVED: ORDER_STATUS_COLORS.RESERVED,
  PICKUPED: ORDER_STATUS_COLORS.PICKUPED,
  RETURNED: ORDER_STATUS_COLORS.RETURNED,
  COMPLETED: ORDER_STATUS_COLORS.COMPLETED,
  CANCELLED: ORDER_STATUS_COLORS.CANCELLED
};
var ORDER_TYPE_BUTTON_COLORS = {
  RENT: ORDER_TYPE_COLORS.RENT,
  SALE: ORDER_TYPE_COLORS.SALE
};

// ../constants/src/subscription.ts
var BILLING_CYCLES = {
  MONTHLY: {
    id: "monthly",
    name: "Monthly",
    duration: 1,
    unit: "month",
    discount: 0
  },
  QUARTERLY: {
    id: "quarterly",
    name: "Quarterly",
    duration: 3,
    unit: "months",
    discount: 0
    // 0% discount
  },
  SEMI_ANNUAL: {
    id: "semi_annual",
    name: "Semi-Annual",
    duration: 6,
    unit: "months",
    discount: 0.05
    // 5% discount
  },
  ANNUAL: {
    id: "annual",
    name: "Annual",
    duration: 12,
    unit: "months",
    discount: 0.1
    // 10% discount
  }
};
var BILLING_CYCLES_ARRAY = [
  {
    value: "monthly",
    label: BILLING_CYCLES.MONTHLY.name,
    months: BILLING_CYCLES.MONTHLY.duration,
    discount: BILLING_CYCLES.MONTHLY.discount * 100,
    // Convert to percentage
    description: "Pay monthly, cancel anytime"
  },
  {
    value: "quarterly",
    label: BILLING_CYCLES.QUARTERLY.name,
    months: BILLING_CYCLES.QUARTERLY.duration,
    discount: BILLING_CYCLES.QUARTERLY.discount * 100,
    // Convert to percentage
    description: `Save ${BILLING_CYCLES.QUARTERLY.discount * 100}% with quarterly billing`
  },
  {
    value: "semi_annual",
    label: BILLING_CYCLES.SEMI_ANNUAL.name,
    months: BILLING_CYCLES.SEMI_ANNUAL.duration,
    discount: BILLING_CYCLES.SEMI_ANNUAL.discount * 100,
    // Convert to percentage
    description: `Save ${BILLING_CYCLES.SEMI_ANNUAL.discount * 100}% with semi-annual billing`
  },
  {
    value: "annual",
    label: BILLING_CYCLES.ANNUAL.name,
    months: BILLING_CYCLES.ANNUAL.duration,
    discount: BILLING_CYCLES.ANNUAL.discount * 100,
    // Convert to percentage
    description: `Save ${BILLING_CYCLES.ANNUAL.discount * 100}% with annual billing`
  }
];

// ../constants/src/currency.ts
var SUPPORTED_CURRENCIES = ["USD", "VND"];
var CURRENCY_SYMBOLS = {
  USD: "$",
  VND: "\u0111"
};
var CURRENCY_NAMES = {
  USD: "US Dollar",
  VND: "Vietnamese Dong"
};
var CURRENCY_LOCALES = {
  USD: "en-US",
  VND: "vi-VN"
};
var CURRENCY_DECIMALS = {
  USD: 2,
  VND: 0
};
var CURRENCY_SYMBOL_POSITION = {
  USD: "before",
  VND: "after"
};
var EXCHANGE_RATES = {
  USD: 1,
  VND: 24500
};
var CURRENCY_CONFIGS = {
  USD: {
    code: "USD",
    symbol: CURRENCY_SYMBOLS.USD,
    name: CURRENCY_NAMES.USD,
    locale: CURRENCY_LOCALES.USD,
    decimals: CURRENCY_DECIMALS.USD,
    symbolPosition: CURRENCY_SYMBOL_POSITION.USD,
    exchangeRate: EXCHANGE_RATES.USD
  },
  VND: {
    code: "VND",
    symbol: CURRENCY_SYMBOLS.VND,
    name: CURRENCY_NAMES.VND,
    locale: CURRENCY_LOCALES.VND,
    decimals: CURRENCY_DECIMALS.VND,
    symbolPosition: CURRENCY_SYMBOL_POSITION.VND,
    exchangeRate: EXCHANGE_RATES.VND
  }
};
var CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map((code) => ({
  value: code,
  label: `${CURRENCY_SYMBOLS[code]} ${code} - ${CURRENCY_NAMES[code]}`,
  symbol: CURRENCY_SYMBOLS[code],
  name: CURRENCY_NAMES[code]
}));

// ../constants/src/modules.ts
var MODULE_KEY = {
  ATTENDANCE: "attendance",
  LOYALTY: "loyalty"
};
var MODULES = [
  { key: MODULE_KEY.ATTENDANCE, requires: [] },
  { key: MODULE_KEY.LOYALTY, requires: [] }
];

// ../constants/src/business-tags.ts
var BUSINESS_TAG = {
  AO_DAI: "AO_DAI",
  COSTUME: "COSTUME",
  WEDDING_DRESS: "WEDDING_DRESS",
  EQUIPMENT: "EQUIPMENT",
  VEHICLE: "VEHICLE",
  FILM_EQUIPMENT: "FILM_EQUIPMENT",
  OTHER: "OTHER"
};
var BUSINESS_TAG_VALUES = [
  BUSINESS_TAG.AO_DAI,
  BUSINESS_TAG.COSTUME,
  BUSINESS_TAG.WEDDING_DRESS,
  BUSINESS_TAG.EQUIPMENT,
  BUSINESS_TAG.VEHICLE,
  BUSINESS_TAG.FILM_EQUIPMENT,
  BUSINESS_TAG.OTHER
];
var BUSINESS_TAG_OPTIONS = [
  {
    value: BUSINESS_TAG.AO_DAI,
    label: "Ao dai rental",
    businessType: "CLOTHING"
  },
  {
    value: BUSINESS_TAG.COSTUME,
    label: "Costume rental",
    businessType: "CLOTHING"
  },
  {
    value: BUSINESS_TAG.WEDDING_DRESS,
    label: "Wedding dress rental",
    businessType: "CLOTHING"
  },
  {
    value: BUSINESS_TAG.EQUIPMENT,
    label: "Equipment rental",
    businessType: "EQUIPMENT"
  },
  {
    value: BUSINESS_TAG.VEHICLE,
    label: "Vehicle rental",
    businessType: "VEHICLE"
  },
  {
    value: BUSINESS_TAG.FILM_EQUIPMENT,
    label: "Film equipment rental",
    businessType: "EQUIPMENT"
  },
  {
    value: BUSINESS_TAG.OTHER,
    label: "Other",
    businessType: "GENERAL"
  }
];
var TAG_SET = new Set(BUSINESS_TAG_VALUES);

// ../constants/src/public-locales.ts
var PUBLIC_LOCALES = ["vi", "en", "ja", "ko", "zh", "ru", "zh-TW", "fr", "de", "th", "id", "es"];

// src/post.ts
var postLocaleSchema = z2.enum(PUBLIC_LOCALES);
var slugRegex = /^[a-z0-9-]+$/;
var postCreateSchema = z2.object({
  title: z2.string().min(1).max(255),
  slug: z2.string().min(1).max(255).regex(slugRegex, "Slug must contain only lowercase letters, numbers, and hyphens"),
  locale: postLocaleSchema.default("vi"),
  translationSourceId: z2.number().int().positive().optional(),
  content: z2.string().min(1, "Content is required"),
  excerpt: z2.string().max(1e3).optional(),
  // Increased from 500 to 1000 for longer excerpts
  seoTitle: z2.string().max(60).optional(),
  seoDescription: z2.string().max(320).optional(),
  // Increased from 160 to 320 (Google allows up to 320 chars)
  seoKeywords: z2.string().max(255).optional(),
  status: z2.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  categoryIds: z2.array(z2.number().int().positive()).optional(),
  tagIds: z2.array(z2.number().int().positive()).optional(),
  featuredImage: z2.string().refine(
    (val) => {
      if (!val || val === "")
        return true;
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
var postUpdateSchema = postCreateSchema.omit({ translationSourceId: true }).partial().extend({
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
  locale: postLocaleSchema.optional(),
  categoryId: z2.coerce.number().int().positive().optional(),
  tagId: z2.coerce.number().int().positive().optional(),
  authorId: z2.coerce.number().int().positive().optional(),
  search: z2.string().optional(),
  page: z2.coerce.number().int().positive().default(1),
  limit: z2.coerce.number().int().positive().max(100).default(20),
  sortBy: z2.enum(["createdAt", "updatedAt", "publishedAt", "title"]).default("createdAt"),
  sortOrder: z2.enum(["asc", "desc"]).default("desc")
});

// src/common.ts
import { z as z3 } from "zod";
var IdSchema = z3.number().int().positive();
var PaginationSchema = z3.object({
  page: z3.coerce.number().int().min(1).default(1),
  limit: z3.coerce.number().int().min(1).max(100).default(50)
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
  PricingSchemaVersionSchema,
  ProductCreateSchema,
  ProductPricingOptionSchema,
  ProductPricingOptionsSchema,
  ProductUpdateSchema,
  postCategoryCreateSchema,
  postCategoryUpdateSchema,
  postCreateSchema,
  postLocaleSchema,
  postSearchSchema,
  postTagCreateSchema,
  postTagUpdateSchema,
  postUpdateSchema,
  slugRegex,
  validateRequest,
  z4 as z
};

import {
  getDefaultOutletName,
  getOnboardingCopy,
  getSampleCopy,
  ONBOARDING_SAMPLE_MARKER,
} from './onboarding-seed-i18n';

export {
  getDefaultOutletName,
  getOnboardingCopy,
  getSampleCopy,
  ONBOARDING_SAMPLE_MARKER,
  resolveOnboardingLocale,
  resolveOnboardingLocaleFromContext,
  DEFAULT_CATEGORY_NAMES,
} from './onboarding-seed-i18n';
export type {
  OnboardingLocale,
  OnboardingBusinessType,
  SampleCopy,
} from './onboarding-seed-i18n';

type MinimalTx = any;

type OnboardingContext = {
  merchantId: number;
  outletId: number;
  categoryId: number;
  createdByUserId?: number;
  /** UI / Accept-Language / country-derived locale */
  locale?: string | null;
  /** Merchant business type for sample product copy */
  businessType?: string | null;
};

function normalizeEnvValues(): string[] {
  return [
    process.env.APP_ENV,
    process.env.NEXT_PUBLIC_APP_ENV,
    process.env.RAILWAY_ENVIRONMENT,
    process.env.RAILWAY_ENVIRONMENT_NAME,
    process.env.NODE_ENV
  ]
    .filter((v): v is string => Boolean(v))
    .map((v) => v.toLowerCase().trim());
}

export function shouldCreateOnboardingSampleData(): boolean {
  const force = process.env.ENABLE_ONBOARDING_SAMPLE;
  if (force === 'true') return true;
  if (force === 'false') return false;

  const envs = normalizeEnvValues();
  if (envs.some((e) => e.includes('staging'))) return true;
  if (envs.some((e) => e === 'development' || e === 'dev' || e === 'local')) return true;
  if (envs.some((e) => e === 'production' || e === 'prod')) return false;

  // Safe-by-default: disabled unless we can confidently detect dev/staging.
  return false;
}

/**
 * Create localized demo product + customer + order for a new merchant.
 * Idempotent via ONBOARDING_SAMPLE_MARKER.
 */
export async function createMerchantOnboardingSampleData(
  tx: MinimalTx,
  context: OnboardingContext
): Promise<{ created: boolean; reason?: string }> {
  if (!shouldCreateOnboardingSampleData()) {
    return { created: false, reason: 'disabled-by-environment' };
  }

  const { merchantId, outletId, categoryId, createdByUserId, locale, businessType } = context;
  const sample = getSampleCopy(businessType, locale);
  const marker = ONBOARDING_SAMPLE_MARKER;

  const existingSampleOrder = await tx.order.findFirst({
    where: {
      outlet: { merchantId },
      notes: { contains: marker }
    },
    select: { id: true }
  });

  const existingSampleProduct = await tx.product.findFirst({
    where: {
      merchantId,
      description: { contains: marker }
    },
    select: { id: true }
  });

  const existingSampleCustomer = await tx.customer.findFirst({
    where: {
      merchantId,
      notes: { contains: marker }
    },
    select: { id: true }
  });

  if (existingSampleOrder || existingSampleProduct || existingSampleCustomer) {
    return { created: false, reason: 'already-exists' };
  }

  const sampleProduct = await tx.product.create({
    data: {
      merchantId,
      categoryId,
      name: sample.productName,
      description: `${marker} ${sample.productDescription}`,
      barcode: null,
      totalStock: 10,
      rentPrice: 350000,
      salePrice: 1200000,
      costPrice: 700000,
      deposit: 500000,
      isActive: true,
      outletStock: {
        create: [
          {
            outletId,
            stock: 10,
            available: 10,
            renting: 0
          }
        ]
      }
    }
  });

  const sampleCustomer = await tx.customer.create({
    data: {
      merchantId,
      firstName: sample.customerFirstName,
      lastName: sample.customerLastName,
      phone: null,
      email: null,
      address: sample.customerAddress,
      city: sample.customerCity,
      notes: `${marker} ${sample.customerNotes}`,
      isActive: true
    }
  });

  const orderNumber = `SAMPLE-${merchantId}-${Date.now()}`;

  const sampleOrder = await tx.order.create({
    data: {
      orderNumber,
      orderType: 'RENT',
      status: 'RESERVED',
      totalAmount: 350000,
      depositAmount: 500000,
      securityDeposit: 0,
      damageFee: 0,
      lateFee: 0,
      discountValue: 0,
      discountAmount: 0,
      isReadyToDeliver: false,
      notes: `${marker} ${sample.orderNotes}`,
      outletId,
      customerId: sampleCustomer.id,
      createdById: createdByUserId ?? null
    }
  });

  await tx.orderItem.create({
    data: {
      orderId: sampleOrder.id,
      productId: sampleProduct.id,
      quantity: 1,
      unitPrice: 350000,
      totalPrice: 350000,
      deposit: 500000,
      rentalDays: 1,
      notes: `${marker} ${sample.orderItemNotes}`,
      productName: sampleProduct.name,
      productBarcode: sampleProduct.barcode,
      productImages: sampleProduct.images
    }
  });

  return { created: true };
}

/** Localized default outlet + category strings for registration. */
export function getLocalizedRegistrationDefaults(
  merchantName: string | null | undefined,
  locale?: string | null,
) {
  const copy = getOnboardingCopy(locale);
  return {
    locale: copy.locale,
    outletName: getDefaultOutletName(merchantName, locale),
    outletDescription: copy.outlet.description,
    categoryName: copy.category.name,
    categoryDescription: copy.category.description,
  };
}

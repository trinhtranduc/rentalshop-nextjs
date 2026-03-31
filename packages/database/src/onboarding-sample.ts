const SAMPLE_MARKER = '[DU_LIEU_MAU_HE_THONG_V1]';

type MinimalTx = any;

type OnboardingContext = {
  merchantId: number;
  outletId: number;
  categoryId: number;
  createdByUserId?: number;
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

export async function createMerchantOnboardingSampleData(
  tx: MinimalTx,
  context: OnboardingContext
): Promise<{ created: boolean; reason?: string }> {
  if (!shouldCreateOnboardingSampleData()) {
    return { created: false, reason: 'disabled-by-environment' };
  }

  const { merchantId, outletId, categoryId, createdByUserId } = context;

  const existingSampleOrder = await tx.order.findFirst({
    where: {
      outlet: { merchantId },
      notes: { contains: SAMPLE_MARKER }
    },
    select: { id: true }
  });

  const existingSampleProduct = await tx.product.findFirst({
    where: {
      merchantId,
      description: { contains: SAMPLE_MARKER }
    },
    select: { id: true }
  });

  const existingSampleCustomer = await tx.customer.findFirst({
    where: {
      merchantId,
      notes: { contains: SAMPLE_MARKER }
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
      name: 'Áo dài truyền thống mẫu',
      description: `${SAMPLE_MARKER} Sản phẩm mẫu giúp người dùng mới làm quen quy trình sản phẩm và đơn hàng.`,
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
      firstName: 'Khách',
      lastName: 'Mẫu',
      phone: null,
      email: null,
      notes: `${SAMPLE_MARKER} Khách hàng mẫu giúp người dùng mới làm quen quy trình khách hàng và đơn hàng.`,
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
      notes: `${SAMPLE_MARKER} Đơn hàng mẫu thuê áo dài để người dùng mới hiểu vòng đời đơn hàng.`,
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
      notes: `${SAMPLE_MARKER} Chi tiết đơn hàng mẫu`,
      productName: sampleProduct.name,
      productBarcode: sampleProduct.barcode,
      productImages: sampleProduct.images
    }
  });

  return { created: true };
}

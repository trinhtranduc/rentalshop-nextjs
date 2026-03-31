import assert from 'node:assert/strict';
import {
  createMerchantOnboardingSampleData,
  shouldCreateOnboardingSampleData
} from '../packages/database/src/onboarding-sample';

function resetEnv(snapshot: NodeJS.ProcessEnv) {
  process.env = { ...snapshot };
}

async function run() {
  const snapshot = { ...process.env };
  try {
    process.env.APP_ENV = 'staging';
    delete process.env.ENABLE_ONBOARDING_SAMPLE;
    assert.equal(shouldCreateOnboardingSampleData(), true, 'staging should enable onboarding sample');

    process.env.NODE_ENV = 'production';
    process.env.APP_ENV = 'production';
    delete process.env.ENABLE_ONBOARDING_SAMPLE;
    assert.equal(shouldCreateOnboardingSampleData(), false, 'production should disable onboarding sample by default');

    process.env.APP_ENV = 'development';
    const tx: any = {
      order: {
        findFirst: async () => ({ id: 123 })
      },
      product: {
        findFirst: async () => null,
        create: async () => {
          throw new Error('product should not be created when sample already exists');
        }
      },
      customer: {
        findFirst: async () => null,
        create: async () => {
          throw new Error('customer should not be created when sample already exists');
        }
      },
      orderItem: {
        create: async () => {
          throw new Error('order item should not be created when sample already exists');
        }
      }
    };

    const result = await createMerchantOnboardingSampleData(tx, {
      merchantId: 1,
      outletId: 1,
      categoryId: 1,
      createdByUserId: 1
    });
    assert.deepEqual(result, { created: false, reason: 'already-exists' });

    console.log('✅ onboarding sample checks passed');
  } finally {
    resetEnv(snapshot);
  }
}

run().catch((error) => {
  console.error('❌ onboarding sample checks failed:', error);
  process.exit(1);
});

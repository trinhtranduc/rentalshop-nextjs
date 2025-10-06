/**
 * Pricing Validation Tests
 * 
 * Comprehensive tests for the pricing validation system
 */

import { PricingValidator } from '../core/pricing-validation';
import type { Product, Merchant } from '@rentalshop/types';

// Mock data for testing
const mockProduct: Product = {
  id: '1',
  name: 'Test Product',
  rentPrice: 50,
  deposit: 100,
  available: 5,
  stock: 10,
  renting: 5
} as Product;

const mockMerchant: Merchant = {
  id: 1,
  name: 'Test Merchant',
  email: 'test@example.com',
  businessType: 'VEHICLE',
  pricingConfig: {
    businessType: 'VEHICLE',
    defaultPricingType: 'HOURLY',
    businessRules: {
      requireRentalDates: true,
      showPricingOptions: true
    },
    durationLimits: {
      minDuration: 2,
      maxDuration: 168,
      defaultDuration: 4
    }
  }
} as Merchant;

describe('PricingValidator', () => {
  describe('validateRentalPeriod', () => {
    it('should validate a valid rental period', () => {
      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-15T13:00:00Z'); // 4 hours

      const result = PricingValidator.validateRentalPeriod(
        mockProduct,
        mockMerchant,
        startAt,
        endAt,
        1
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject rental period shorter than minimum duration', () => {
      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-15T10:00:00Z'); // 1 hour

      const result = PricingValidator.validateRentalPeriod(
        mockProduct,
        mockMerchant,
        startAt,
        endAt,
        1
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Minimum rental duration is 2 hour(s)');
      expect(result.suggestions).toContain('Try selecting a rental period of at least 2 hour(s)');
    });

    it('should reject rental period longer than maximum duration', () => {
      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-22T09:00:00Z'); // 7 days = 168 hours

      const result = PricingValidator.validateRentalPeriod(
        mockProduct,
        mockMerchant,
        startAt,
        endAt,
        1
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Maximum rental duration is 168 hour(s)');
    });

    it('should reject past start dates', () => {
      const startAt = new Date('2023-01-15T09:00:00Z'); // Past date
      const endAt = new Date('2024-01-15T13:00:00Z');

      const result = PricingValidator.validateRentalPeriod(
        mockProduct,
        mockMerchant,
        startAt,
        endAt,
        1
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Rental start date cannot be in the past');
    });

    it('should reject end date before start date', () => {
      const startAt = new Date('2024-01-15T13:00:00Z');
      const endAt = new Date('2024-01-15T09:00:00Z'); // Before start

      const result = PricingValidator.validateRentalPeriod(
        mockProduct,
        mockMerchant,
        startAt,
        endAt,
        1
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Rental start date must be before end date');
    });

    it('should validate vehicle-specific rules', () => {
      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-15T11:00:00Z'); // 2 hours (minimum)

      const result = PricingValidator.validateRentalPeriod(
        mockProduct,
        mockMerchant,
        startAt,
        endAt,
        1
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about weekend rentals for vehicles', () => {
      // Saturday
      const startAt = new Date('2024-01-20T09:00:00Z');
      const endAt = new Date('2024-01-20T13:00:00Z');

      const result = PricingValidator.validateRentalPeriod(
        mockProduct,
        mockMerchant,
        startAt,
        endAt,
        1
      );

      expect(result.warnings).toContain('Weekend rental rates may apply');
    });

    it('should validate quantity limits', () => {
      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-15T13:00:00Z');

      const result = PricingValidator.validateRentalPeriod(
        mockProduct,
        mockMerchant,
        startAt,
        endAt,
        6 // More than available (5)
      );

      expect(result.warnings).toContain('Only 5 units available (requested: 6)');
    });
  });

  describe('validatePricingConfig', () => {
    it('should validate a valid pricing configuration', () => {
      const config = {
        businessType: 'VEHICLE',
        defaultPricingType: 'HOURLY',
        businessRules: {
          requireRentalDates: true,
          showPricingOptions: true
        },
        durationLimits: {
          minDuration: 1,
          maxDuration: 24,
          defaultDuration: 4
        }
      };

      const result = PricingValidator.validatePricingConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject missing business type', () => {
      const config = {
        defaultPricingType: 'HOURLY',
        businessRules: {
          requireRentalDates: true,
          showPricingOptions: true
        },
        durationLimits: {
          minDuration: 1,
          maxDuration: 24,
          defaultDuration: 4
        }
      };

      const result = PricingValidator.validatePricingConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Business type is required');
    });

    it('should reject invalid business type', () => {
      const config = {
        businessType: 'INVALID',
        defaultPricingType: 'HOURLY',
        businessRules: {
          requireRentalDates: true,
          showPricingOptions: true
        },
        durationLimits: {
          minDuration: 1,
          maxDuration: 24,
          defaultDuration: 4
        }
      };

      const result = PricingValidator.validatePricingConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid business type: INVALID');
    });

    it('should reject invalid pricing type', () => {
      const config = {
        businessType: 'VEHICLE',
        defaultPricingType: 'INVALID',
        businessRules: {
          requireRentalDates: true,
          showPricingOptions: true
        },
        durationLimits: {
          minDuration: 1,
          maxDuration: 24,
          defaultDuration: 4
        }
      };

      const result = PricingValidator.validatePricingConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid pricing type: INVALID');
    });

    it('should reject invalid duration limits', () => {
      const config = {
        businessType: 'VEHICLE',
        defaultPricingType: 'HOURLY',
        businessRules: {
          requireRentalDates: true,
          showPricingOptions: true
        },
        durationLimits: {
          minDuration: 10,
          maxDuration: 5, // Less than min
          defaultDuration: 7
        }
      };

      const result = PricingValidator.validatePricingConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Maximum duration must be greater than minimum duration');
    });

    it('should reject default duration outside limits', () => {
      const config = {
        businessType: 'VEHICLE',
        defaultPricingType: 'HOURLY',
        businessRules: {
          requireRentalDates: true,
          showPricingOptions: true
        },
        durationLimits: {
          minDuration: 1,
          maxDuration: 24,
          defaultDuration: 48 // Outside limits
        }
      };

      const result = PricingValidator.validatePricingConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Default duration must be between minimum and maximum');
    });

    it('should reject invalid business rules types', () => {
      const config = {
        businessType: 'VEHICLE',
        defaultPricingType: 'HOURLY',
        businessRules: {
          requireRentalDates: 'yes', // Should be boolean
          showPricingOptions: true
        },
        durationLimits: {
          minDuration: 1,
          maxDuration: 24,
          defaultDuration: 4
        }
      };

      const result = PricingValidator.validatePricingConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('requireRentalDates must be a boolean');
    });
  });
});

describe('Business Type Specific Validation', () => {
  const equipmentMerchant: Merchant = {
    ...mockMerchant,
    businessType: 'EQUIPMENT',
    pricingConfig: {
      businessType: 'EQUIPMENT',
      defaultPricingType: 'DAILY',
      businessRules: {
        requireRentalDates: true,
        showPricingOptions: false
      },
      durationLimits: {
        minDuration: 1,
        maxDuration: 30,
        defaultDuration: 3
      }
    }
  } as Merchant;

  const clothingMerchant: Merchant = {
    ...mockMerchant,
    businessType: 'CLOTHING',
    pricingConfig: {
      businessType: 'CLOTHING',
      defaultPricingType: 'FIXED',
      businessRules: {
        requireRentalDates: false,
        showPricingOptions: false
      },
      durationLimits: {
        minDuration: 1,
        maxDuration: 1,
        defaultDuration: 1
      }
    }
  } as Merchant;

  it('should validate equipment rental rules', () => {
    const startAt = new Date('2024-01-15T09:00:00Z');
    const endAt = new Date('2024-01-16T09:00:00Z'); // 1 day

    const result = PricingValidator.validateRentalPeriod(
      mockProduct,
      equipmentMerchant,
      startAt,
      endAt,
      1
    );

    expect(result.isValid).toBe(true);
  });

  it('should warn about equipment rental outside business hours', () => {
    const startAt = new Date('2024-01-15T06:00:00Z'); // 6 AM
    const endAt = new Date('2024-01-16T09:00:00Z');

    const result = PricingValidator.validateRentalPeriod(
      mockProduct,
      equipmentMerchant,
      startAt,
      endAt,
      1
    );

    expect(result.warnings).toContain('Equipment pickup outside business hours (8 AM - 6 PM)');
  });

  it('should warn about long-term equipment rental', () => {
    const startAt = new Date('2024-01-15T09:00:00Z');
    const endAt = new Date('2024-02-15T09:00:00Z'); // 31 days

    const result = PricingValidator.validateRentalPeriod(
      mockProduct,
      equipmentMerchant,
      startAt,
      endAt,
      1
    );

    expect(result.warnings).toContain('Rental period exceeds 30 days - consider purchase option');
  });

  it('should validate clothing rental rules', () => {
    const startAt = new Date('2024-01-15T09:00:00Z');
    const endAt = new Date('2024-01-16T09:00:00Z'); // 1 day

    const result = PricingValidator.validateRentalPeriod(
      mockProduct,
      clothingMerchant,
      startAt,
      endAt,
      1
    );

    expect(result.isValid).toBe(true);
  });

  it('should warn about short notice clothing rental', () => {
    const startAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    const endAt = new Date(startAt.getTime() + 24 * 60 * 60 * 1000); // 1 day later

    const result = PricingValidator.validateRentalPeriod(
      mockProduct,
      clothingMerchant,
      startAt,
      endAt,
      1
    );

    expect(result.warnings).toContain('Less than 24 hours notice for clothing rental');
  });
});

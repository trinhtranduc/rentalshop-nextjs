/**
 * Pricing System Integration Tests
 * 
 * End-to-end tests for the complete pricing system
 */

import { PricingResolver, PricingValidator } from '../core';
import { BUSINESS_TYPE_DEFAULTS } from '@rentalshop/constants';
import type { Product, Merchant } from '@rentalshop/types';

// Mock data for different business types
const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: '1',
  name: 'Test Product',
  rentPrice: 50,
  deposit: 100,
  available: 5,
  stock: 10,
  renting: 5,
  ...overrides
} as Product);

const createMockMerchant = (businessType: string, overrides: Partial<Merchant> = {}): Merchant => ({
  id: 1,
  name: 'Test Merchant',
  email: 'test@example.com',
  businessType,
  pricingConfig: BUSINESS_TYPE_DEFAULTS[businessType as keyof typeof BUSINESS_TYPE_DEFAULTS] || BUSINESS_TYPE_DEFAULTS.GENERAL,
  ...overrides
} as Merchant);

describe('Pricing System Integration Tests', () => {
  describe('Vehicle Rental Flow', () => {
    const vehicleMerchant = createMockMerchant('VEHICLE');
    const vehicleProduct = createMockProduct({ rentPrice: 25 }); // $25/hour

    it('should handle complete vehicle rental workflow', () => {
      // 1. Validate rental period
      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-15T17:00:00Z'); // 8 hours

      const validation = PricingValidator.validateRentalPeriod(
        vehicleProduct,
        vehicleMerchant,
        startAt,
        endAt,
        1
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // 2. Calculate pricing
      const pricing = PricingResolver.calculatePrice(
        vehicleProduct,
        vehicleMerchant,
        startAt,
        endAt,
        1
      );

      expect(pricing.unitPrice).toBe(25);
      expect(pricing.totalPrice).toBe(200); // 8 hours * $25
      expect(pricing.deposit).toBe(100);
      expect(pricing.rentalDays).toBe(8);

      // 3. Verify effective pricing config
      const config = PricingResolver.getEffectivePricingConfig(vehicleProduct, vehicleMerchant);
      expect(config.pricingType).toBe('HOURLY');
      expect(config.businessRules.requireRentalDates).toBe(true);
      expect(config.businessRules.showPricingOptions).toBe(true);
    });

    it('should handle weekend vehicle rental with warnings', () => {
      // Saturday rental
      const startAt = new Date('2024-01-20T09:00:00Z'); // Saturday
      const endAt = new Date('2024-01-20T17:00:00Z'); // 8 hours

      const validation = PricingValidator.validateRentalPeriod(
        vehicleProduct,
        vehicleMerchant,
        startAt,
        endAt,
        1
      );

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Weekend rental rates may apply');
    });

    it('should reject vehicle rental shorter than minimum duration', () => {
      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-15T10:00:00Z'); // 1 hour

      const validation = PricingValidator.validateRentalPeriod(
        vehicleProduct,
        vehicleMerchant,
        startAt,
        endAt,
        1
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Minimum vehicle rental is 2 hours');
    });
  });

  describe('Equipment Rental Flow', () => {
    const equipmentMerchant = createMockMerchant('EQUIPMENT');
    const equipmentProduct = createMockProduct({ rentPrice: 150 }); // $150/day

    it('should handle complete equipment rental workflow', () => {
      // 1. Validate rental period
      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-18T09:00:00Z'); // 3 days

      const validation = PricingValidator.validateRentalPeriod(
        equipmentProduct,
        equipmentMerchant,
        startAt,
        endAt,
        1
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // 2. Calculate pricing
      const pricing = PricingResolver.calculatePrice(
        equipmentProduct,
        equipmentMerchant,
        startAt,
        endAt,
        1
      );

      expect(pricing.unitPrice).toBe(150);
      expect(pricing.totalPrice).toBe(450); // 3 days * $150
      expect(pricing.deposit).toBe(100);
      expect(pricing.rentalDays).toBe(3);

      // 3. Verify effective pricing config
      const config = PricingResolver.getEffectivePricingConfig(equipmentProduct, equipmentMerchant);
      expect(config.pricingType).toBe('DAILY');
      expect(config.businessRules.requireRentalDates).toBe(true);
      expect(config.businessRules.showPricingOptions).toBe(false);
    });

    it('should warn about equipment pickup outside business hours', () => {
      const startAt = new Date('2024-01-15T06:00:00Z'); // 6 AM
      const endAt = new Date('2024-01-16T09:00:00Z');

      const validation = PricingValidator.validateRentalPeriod(
        equipmentProduct,
        equipmentMerchant,
        startAt,
        endAt,
        1
      );

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Equipment pickup outside business hours (8 AM - 6 PM)');
    });

    it('should warn about long-term equipment rental', () => {
      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-02-15T09:00:00Z'); // 31 days

      const validation = PricingValidator.validateRentalPeriod(
        equipmentProduct,
        equipmentMerchant,
        startAt,
        endAt,
        1
      );

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Rental period exceeds 30 days - consider purchase option');
    });
  });

  describe('Clothing Rental Flow', () => {
    const clothingMerchant = createMockMerchant('CLOTHING');
    const clothingProduct = createMockProduct({ rentPrice: 75 }); // $75 fixed

    it('should handle complete clothing rental workflow', () => {
      // 1. Validate rental period
      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-16T09:00:00Z'); // 1 day

      const validation = PricingValidator.validateRentalPeriod(
        clothingProduct,
        clothingMerchant,
        startAt,
        endAt,
        1
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // 2. Calculate pricing
      const pricing = PricingResolver.calculatePrice(
        clothingProduct,
        clothingMerchant,
        startAt,
        endAt,
        1
      );

      expect(pricing.unitPrice).toBe(75);
      expect(pricing.totalPrice).toBe(75); // Fixed price regardless of duration
      expect(pricing.deposit).toBe(100);
      expect(pricing.rentalDays).toBe(1);

      // 3. Verify effective pricing config
      const config = PricingResolver.getEffectivePricingConfig(clothingProduct, clothingMerchant);
      expect(config.pricingType).toBe('FIXED');
      expect(config.businessRules.requireRentalDates).toBe(false);
      expect(config.businessRules.showPricingOptions).toBe(false);
    });

    it('should warn about short notice clothing rental', () => {
      const startAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      const endAt = new Date(startAt.getTime() + 24 * 60 * 60 * 1000); // 1 day later

      const validation = PricingValidator.validateRentalPeriod(
        clothingProduct,
        clothingMerchant,
        startAt,
        endAt,
        1
      );

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Less than 24 hours notice for clothing rental');
    });

    it('should warn about long clothing rental period', () => {
      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-22T09:00:00Z'); // 7 days

      const validation = PricingValidator.validateRentalPeriod(
        clothingProduct,
        clothingMerchant,
        startAt,
        endAt,
        1
      );

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Clothing rental exceeds 1 week');
    });
  });

  describe('General Rental Flow', () => {
    const generalMerchant = createMockMerchant('GENERAL');
    const generalProduct = createMockProduct({ rentPrice: 100 }); // $100 fixed

    it('should handle complete general rental workflow', () => {
      // 1. Validate rental period
      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-16T09:00:00Z'); // Any duration

      const validation = PricingValidator.validateRentalPeriod(
        generalProduct,
        generalMerchant,
        startAt,
        endAt,
        1
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // 2. Calculate pricing
      const pricing = PricingResolver.calculatePrice(
        generalProduct,
        generalMerchant,
        startAt,
        endAt,
        1
      );

      expect(pricing.unitPrice).toBe(100);
      expect(pricing.totalPrice).toBe(100); // Fixed price
      expect(pricing.deposit).toBe(100);
      expect(pricing.rentalDays).toBe(1);

      // 3. Verify effective pricing config
      const config = PricingResolver.getEffectivePricingConfig(generalProduct, generalMerchant);
      expect(config.pricingType).toBe('FIXED');
      expect(config.businessRules.requireRentalDates).toBe(false);
      expect(config.businessRules.showPricingOptions).toBe(false);
    });
  });

  describe('Multi-Quantity Scenarios', () => {
    const vehicleMerchant = createMockMerchant('VEHICLE');
    const vehicleProduct = createMockProduct({ rentPrice: 25, available: 10 });

    it('should handle multiple vehicle rentals', () => {
      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-15T17:00:00Z'); // 8 hours

      const validation = PricingValidator.validateRentalPeriod(
        vehicleProduct,
        vehicleMerchant,
        startAt,
        endAt,
        3
      );

      expect(validation.isValid).toBe(true);

      const pricing = PricingResolver.calculatePrice(
        vehicleProduct,
        vehicleMerchant,
        startAt,
        endAt,
        3
      );

      expect(pricing.totalPrice).toBe(600); // 8 hours * $25 * 3 vehicles
      expect(pricing.deposit).toBe(300); // $100 * 3 vehicles
    });

    it('should warn about insufficient inventory', () => {
      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-15T17:00:00Z'); // 8 hours

      const validation = PricingValidator.validateRentalPeriod(
        vehicleProduct,
        vehicleMerchant,
        startAt,
        endAt,
        12 // More than available (10)
      );

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Only 10 units available (requested: 12)');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate all business type configurations', () => {
      Object.entries(BUSINESS_TYPE_DEFAULTS).forEach(([businessType, config]) => {
        const validation = PricingValidator.validatePricingConfig(config);
        expect(validation.isValid).toBe(true);
        expect(validation.error).toBeUndefined();
      });
    });

    it('should handle invalid pricing configurations', () => {
      const invalidConfig = {
        businessType: 'INVALID_TYPE',
        defaultPricingType: 'INVALID_PRICING',
        businessRules: {
          requireRentalDates: 'invalid', // Should be boolean
          showPricingOptions: true
        },
        durationLimits: {
          minDuration: 10,
          maxDuration: 5, // Less than min
          defaultDuration: 20 // Outside range
        }
      };

      const validation = PricingValidator.validatePricingConfig(invalidConfig);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Invalid business type');
      expect(validation.error).toContain('Invalid pricing type');
      expect(validation.error).toContain('Maximum duration must be greater than minimum duration');
      expect(validation.error).toContain('Default duration must be between minimum and maximum');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    const vehicleMerchant = createMockMerchant('VEHICLE');
    const vehicleProduct = createMockProduct();

    it('should handle null/undefined merchant pricing config', () => {
      const merchantWithoutConfig = {
        ...vehicleMerchant,
        pricingConfig: null
      } as any;

      const config = PricingResolver.getEffectivePricingConfig(vehicleProduct, merchantWithoutConfig);
      expect(config.pricingType).toBe('FIXED'); // Default fallback
      expect(config.businessRules.requireRentalDates).toBe(false);
    });

    it('should handle malformed pricing config JSON', () => {
      const merchantWithBadConfig = {
        ...vehicleMerchant,
        pricingConfig: 'invalid json'
      } as any;

      const config = PricingResolver.getEffectivePricingConfig(vehicleProduct, merchantWithBadConfig);
      expect(config.pricingType).toBe('FIXED'); // Default fallback
    });

    it('should handle extreme date ranges', () => {
      const startAt = new Date('1900-01-01T00:00:00Z');
      const endAt = new Date('2100-12-31T23:59:59Z');

      const pricing = PricingResolver.calculatePrice(
        vehicleProduct,
        vehicleMerchant,
        startAt,
        endAt,
        1
      );

      expect(pricing.totalPrice).toBeGreaterThan(0);
      expect(pricing.rentalDays).toBeGreaterThan(1000000); // Very large number
    });

    it('should handle zero and negative quantities gracefully', () => {
      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-15T13:00:00Z');

      // Zero quantity
      const pricingZero = PricingResolver.calculatePrice(
        vehicleProduct,
        vehicleMerchant,
        startAt,
        endAt,
        0
      );

      expect(pricingZero.totalPrice).toBe(0);
      expect(pricingZero.deposit).toBe(0);

      // Negative quantity
      const pricingNegative = PricingResolver.calculatePrice(
        vehicleProduct,
        vehicleMerchant,
        startAt,
        endAt,
        -1
      );

      expect(pricingNegative.totalPrice).toBe(0);
      expect(pricingNegative.deposit).toBe(0);
    });
  });
});

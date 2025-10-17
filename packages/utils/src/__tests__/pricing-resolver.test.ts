/**
 * Pricing Resolver Tests
 * 
 * Tests for the pricing calculation and resolution logic
 */

import { PricingResolver } from '../core/pricing-resolver';
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

describe('PricingResolver', () => {
  describe('resolvePricingType', () => {
    it('should return merchant default pricing type when no product override', () => {
      const result = PricingResolver.resolvePricingType(mockProduct, mockMerchant);
      expect(result).toBe('HOURLY');
    });

    it('should return FIXED when merchant config is FIXED', () => {
      const fixedMerchant = {
        ...mockMerchant,
        pricingConfig: {
          ...mockMerchant.pricingConfig,
          defaultPricingType: 'FIXED'
        }
      };

      const result = PricingResolver.resolvePricingType(mockProduct, fixedMerchant);
      expect(result).toBe('FIXED');
    });

    it('should return DAILY when merchant config is DAILY', () => {
      const dailyMerchant = {
        ...mockMerchant,
        pricingConfig: {
          ...mockMerchant.pricingConfig,
          defaultPricingType: 'DAILY'
        }
      };

      const result = PricingResolver.resolvePricingType(mockProduct, dailyMerchant);
      expect(result).toBe('DAILY');
    });
  });

  describe('getEffectivePricingConfig', () => {
    it('should return merchant pricing configuration', () => {
      const result = PricingResolver.getEffectivePricingConfig(mockProduct, mockMerchant);

      expect(result.pricingType).toBe('HOURLY');
      expect(result.businessRules.requireRentalDates).toBe(true);
      expect(result.businessRules.showPricingOptions).toBe(true);
      expect(result.durationLimits.minDuration).toBe(2);
      expect(result.durationLimits.maxDuration).toBe(168);
    });

    it('should handle missing pricing config gracefully', () => {
      const merchantWithoutConfig = {
        ...mockMerchant,
        pricingConfig: undefined
      } as any;

      const result = PricingResolver.getEffectivePricingConfig(mockProduct, merchantWithoutConfig);

      expect(result.pricingType).toBe('FIXED');
      expect(result.businessRules.requireRentalDates).toBe(false);
      expect(result.businessRules.showPricingOptions).toBe(false);
    });
  });

  describe('calculatePrice', () => {
    it('should calculate hourly pricing correctly', () => {
      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-15T13:00:00Z'); // 4 hours

      const result = PricingResolver.calculatePrice(
        mockProduct,
        mockMerchant,
        startAt,
        endAt,
        1
      );

      expect(result.unitPrice).toBe(50);
      expect(result.totalPrice).toBe(200); // 4 hours * $50
      expect(result.deposit).toBe(100);
      expect(result.rentalDays).toBe(4);
    });

    it('should calculate daily pricing correctly', () => {
      const dailyMerchant = {
        ...mockMerchant,
        pricingConfig: {
          ...mockMerchant.pricingConfig,
          defaultPricingType: 'DAILY'
        }
      };

      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-18T09:00:00Z'); // 3 days

      const result = PricingResolver.calculatePrice(
        mockProduct,
        dailyMerchant,
        startAt,
        endAt,
        1
      );

      expect(result.unitPrice).toBe(50);
      expect(result.totalPrice).toBe(150); // 3 days * $50
      expect(result.deposit).toBe(100);
      expect(result.rentalDays).toBe(3);
    });

    // WEEKLY pricing has been removed - test skipped
    it.skip('should calculate weekly pricing correctly', () => {
      const weeklyMerchant = {
        ...mockMerchant,
        pricingConfig: {
          ...mockMerchant.pricingConfig,
          defaultPricingType: 'WEEKLY'
        }
      };

      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-22T09:00:00Z'); // 1 week

      const result = PricingResolver.calculatePrice(
        mockProduct,
        weeklyMerchant,
        startAt,
        endAt,
        1
      );

      expect(result.unitPrice).toBe(50);
      expect(result.totalPrice).toBe(50); // 1 week * $50
      expect(result.deposit).toBe(100);
      expect(result.rentalDays).toBe(1);
    });

    it('should calculate fixed pricing correctly', () => {
      const fixedMerchant = {
        ...mockMerchant,
        pricingConfig: {
          ...mockMerchant.pricingConfig,
          defaultPricingType: 'FIXED'
        }
      };

      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-22T09:00:00Z'); // Any duration

      const result = PricingResolver.calculatePrice(
        mockProduct,
        fixedMerchant,
        startAt,
        endAt,
        1
      );

      expect(result.unitPrice).toBe(50);
      expect(result.totalPrice).toBe(50); // Fixed price regardless of duration
      expect(result.deposit).toBe(100);
      expect(result.rentalDays).toBe(1);
    });

    it('should handle multiple quantities correctly', () => {
      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-15T13:00:00Z'); // 4 hours

      const result = PricingResolver.calculatePrice(
        mockProduct,
        mockMerchant,
        startAt,
        endAt,
        3 // 3 units
      );

      expect(result.unitPrice).toBe(50);
      expect(result.totalPrice).toBe(600); // 4 hours * $50 * 3 units
      expect(result.deposit).toBe(300); // $100 * 3 units
      expect(result.rentalDays).toBe(4);
    });

    it('should handle partial hours correctly', () => {
      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-15T11:30:00Z'); // 2.5 hours

      const result = PricingResolver.calculatePrice(
        mockProduct,
        mockMerchant,
        startAt,
        endAt,
        1
      );

      expect(result.unitPrice).toBe(50);
      expect(result.totalPrice).toBe(150); // 3 hours (rounded up) * $50
      expect(result.rentalDays).toBe(3);
    });

    it('should handle partial days correctly', () => {
      const dailyMerchant = {
        ...mockMerchant,
        pricingConfig: {
          ...mockMerchant.pricingConfig,
          defaultPricingType: 'DAILY'
        }
      };

      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-17T15:00:00Z'); // 2.25 days

      const result = PricingResolver.calculatePrice(
        mockProduct,
        dailyMerchant,
        startAt,
        endAt,
        1
      );

      expect(result.unitPrice).toBe(50);
      expect(result.totalPrice).toBe(150); // 3 days (rounded up) * $50
      expect(result.rentalDays).toBe(3);
    });

    it('should handle edge case of same start and end time', () => {
      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-15T09:00:00Z'); // Same time

      const result = PricingResolver.calculatePrice(
        mockProduct,
        mockMerchant,
        startAt,
        endAt,
        1
      );

      expect(result.unitPrice).toBe(50);
      expect(result.totalPrice).toBe(50); // Minimum 1 hour
      expect(result.rentalDays).toBe(1);
    });

    it('should handle missing rental dates for fixed pricing', () => {
      const fixedMerchant = {
        ...mockMerchant,
        pricingConfig: {
          ...mockMerchant.pricingConfig,
          defaultPricingType: 'FIXED'
        }
      };

      const result = PricingResolver.calculatePrice(
        mockProduct,
        fixedMerchant,
        undefined,
        undefined,
        1
      );

      expect(result.unitPrice).toBe(50);
      expect(result.totalPrice).toBe(50);
      expect(result.deposit).toBe(100);
      expect(result.rentalDays).toBe(1);
    });

    it('should throw error for missing rental dates when required', () => {
      const startAt = undefined;
      const endAt = undefined;

      expect(() => {
        PricingResolver.calculatePrice(
          mockProduct,
          mockMerchant, // HOURLY pricing requires dates
          startAt,
          endAt,
          1
        );
      }).toThrow('Rental dates are required for time-based pricing');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large durations', () => {
      const startAt = new Date('2024-01-01T00:00:00Z');
      const endAt = new Date('2024-12-31T23:59:59Z'); // Almost a full year

      const result = PricingResolver.calculatePrice(
        mockProduct,
        mockMerchant,
        startAt,
        endAt,
        1
      );

      expect(result.totalPrice).toBeGreaterThan(0);
      expect(result.rentalDays).toBeGreaterThan(8000); // ~365 * 24 hours
    });

    it('should handle zero quantity', () => {
      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-15T13:00:00Z');

      const result = PricingResolver.calculatePrice(
        mockProduct,
        mockMerchant,
        startAt,
        endAt,
        0
      );

      expect(result.unitPrice).toBe(50);
      expect(result.totalPrice).toBe(0);
      expect(result.deposit).toBe(0);
      expect(result.rentalDays).toBe(4);
    });

    it('should handle negative quantity', () => {
      const startAt = new Date('2024-01-15T09:00:00Z');
      const endAt = new Date('2024-01-15T13:00:00Z');

      const result = PricingResolver.calculatePrice(
        mockProduct,
        mockMerchant,
        startAt,
        endAt,
        -1
      );

      expect(result.unitPrice).toBe(50);
      expect(result.totalPrice).toBe(0); // Should handle gracefully
      expect(result.deposit).toBe(0);
    });
  });
});

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Label, Badge, Alert, AlertDescription } from '@rentalshop/ui';
import { PricingResolver, PricingValidator, formatCurrency } from '@rentalshop/utils';
import type { Product, Merchant } from '@rentalshop/types';
import type { PricingType } from '@rentalshop/constants';

interface RentalPeriodSelectorProps {
  product: Product;
  merchant: Merchant;
  onPeriodChange: (startAt: Date, endAt: Date) => void;
  onPriceChange?: (pricing: any) => void;
}

export const RentalPeriodSelector: React.FC<RentalPeriodSelectorProps> = ({
  product,
  merchant,
  onPeriodChange,
  onPriceChange
}) => {
  const [rentalStartAt, setRentalStartAt] = useState<Date | null>(null);
  const [rentalEndAt, setRentalEndAt] = useState<Date | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  
  const config = PricingResolver.getEffectivePricingConfig(product, merchant);
  
  useEffect(() => {
    if (rentalStartAt && rentalEndAt) {
      // Validate rental period
      const validation = PricingValidator.validateRentalPeriod(
        product, merchant, rentalStartAt, rentalEndAt, 1
      );
      setValidationResult(validation);
      
      // Only proceed if validation passes
      if (validation.isValid) {
        onPeriodChange(rentalStartAt, rentalEndAt);
        
        // Calculate and notify price change
        if (onPriceChange) {
          try {
            const pricing = PricingResolver.calculatePrice(
              product, merchant, rentalStartAt, rentalEndAt, 1
            );
            onPriceChange(pricing);
          } catch (error) {
            console.error('Price calculation error:', error);
          }
        }
      }
    }
  }, [rentalStartAt, rentalEndAt, product, merchant, onPeriodChange, onPriceChange]);

  const setQuickDuration = (duration: number, unit: 'hour' | 'day' | 'week') => {
    const now = new Date();
    let endTime: Date;
    
    switch (unit) {
      case 'hour':
        endTime = new Date(now.getTime() + (duration * 60 * 60 * 1000));
        break;
      case 'day':
        endTime = new Date(now.getTime() + (duration * 24 * 60 * 60 * 1000));
        break;
      case 'week':
        endTime = new Date(now.getTime() + (duration * 7 * 24 * 60 * 60 * 1000));
        break;
      default:
        endTime = now;
    }
    
    setRentalStartAt(now);
    setRentalEndAt(endTime);
  };

  const calculateDuration = (start: Date, end: Date, pricingType: PricingType): string => {
    const durationMs = end.getTime() - start.getTime();
    
    switch (pricingType) {
      case 'HOURLY':
        const hours = Math.ceil(durationMs / (1000 * 60 * 60));
        return `${hours} hour${hours > 1 ? 's' : ''}`;
      case 'DAILY':
        const days = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
        return `${days} day${days > 1 ? 's' : ''}`;
      case 'WEEKLY':
        const weeks = Math.ceil(durationMs / (1000 * 60 * 60 * 24 * 7));
        return `${weeks} week${weeks > 1 ? 's' : ''}`;
      default:
        return 'N/A';
    }
  };

  const calculateTotalPrice = (): number => {
    if (!rentalStartAt || !rentalEndAt) return 0;
    
    try {
      const pricing = PricingResolver.calculatePrice(
        product, merchant, rentalStartAt, rentalEndAt, 1
      );
      return pricing.totalPrice;
    } catch (error) {
      return 0;
    }
  };

  if (config.pricingType === 'FIXED') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fixed Price Rental</CardTitle>
          <CardDescription>
            This product uses fixed pricing - no time selection needed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4">
            <h3 className="text-lg font-semibold">
              {formatCurrency(product.rentPrice)}
            </h3>
            <p className="text-gray-600">
              Fixed price per rental
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Select Rental Period ({config.pricingType.toLowerCase()} pricing)
        </CardTitle>
        <CardDescription>
          Price: {formatCurrency(product.rentPrice)} per {config.pricingType.toLowerCase().slice(0, -2)}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Start Date/Time */}
        <div>
          <Label>Start Date & Time</Label>
          <Input
            type="datetime-local"
            value={rentalStartAt ? rentalStartAt.toISOString().slice(0, 16) : ''}
            onChange={(e) => setRentalStartAt(new Date(e.target.value))}
            min={new Date().toISOString().slice(0, 16)}
          />
        </div>

        {/* End Date/Time */}
        <div>
          <Label>End Date & Time</Label>
          <Input
            type="datetime-local"
            value={rentalEndAt ? rentalEndAt.toISOString().slice(0, 16) : ''}
            onChange={(e) => setRentalEndAt(new Date(e.target.value))}
            min={rentalStartAt ? rentalStartAt.toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)}
          />
        </div>

        {/* Quick Duration Buttons */}
        <div>
          <Label>Quick Select</Label>
          <div className="flex gap-2 mt-2 flex-wrap">
            {config.pricingType === 'HOURLY' && (
              <>
                <Button variant="outline" size="sm" onClick={() => setQuickDuration(1, 'hour')}>
                  1 Hour
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDuration(4, 'hour')}>
                  4 Hours
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDuration(8, 'hour')}>
                  8 Hours
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDuration(24, 'hour')}>
                  24 Hours
                </Button>
              </>
            )}
            
            {config.pricingType === 'DAILY' && (
              <>
                <Button variant="outline" size="sm" onClick={() => setQuickDuration(1, 'day')}>
                  1 Day
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDuration(3, 'day')}>
                  3 Days
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDuration(7, 'day')}>
                  1 Week
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDuration(14, 'day')}>
                  2 Weeks
                </Button>
              </>
            )}
            
            {config.pricingType === 'WEEKLY' && (
              <>
                <Button variant="outline" size="sm" onClick={() => setQuickDuration(1, 'week')}>
                  1 Week
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDuration(2, 'week')}>
                  2 Weeks
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDuration(4, 'week')}>
                  1 Month
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Validation Results */}
        {validationResult && (
          <div className="space-y-2">
            {/* Errors */}
            {validationResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="space-y-1">
                    {validationResult.errors.map((error: string, index: number) => (
                      <div key={index} className="text-sm">• {error}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings */}
            {validationResult.warnings.length > 0 && (
              <Alert>
                <AlertDescription>
                  <div className="space-y-1">
                    {validationResult.warnings.map((warning: string, index: number) => (
                      <div key={index} className="text-sm">⚠️ {warning}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Suggestions */}
            {validationResult.suggestions.length > 0 && (
              <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                <div className="font-medium mb-1">💡 Suggestions:</div>
                <div className="space-y-1">
                  {validationResult.suggestions.map((suggestion: string, index: number) => (
                    <div key={index}>• {suggestion}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Price Preview */}
        {rentalStartAt && rentalEndAt && validationResult?.isValid && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Price Preview</h4>
            <div className="space-y-1 text-sm text-blue-700">
              <div>Duration: {calculateDuration(rentalStartAt, rentalEndAt, config.pricingType)}</div>
              <div>Unit Price: {formatCurrency(product.rentPrice)} per {config.pricingType.toLowerCase().slice(0, -2)}</div>
              <div>Total Price: {formatCurrency(calculateTotalPrice())}</div>
              <div>Deposit: {formatCurrency(product.deposit)}</div>
              <div className="font-semibold pt-2 border-t border-blue-200">
                Total Amount: {formatCurrency(calculateTotalPrice() + product.deposit)}
              </div>
            </div>
          </div>
        )}

        {/* Invalid Price Display */}
        {rentalStartAt && rentalEndAt && validationResult && !validationResult.isValid && (
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h4 className="font-medium text-red-900 mb-2">Price Calculation Unavailable</h4>
            <p className="text-sm text-red-700">
              Please fix the validation errors above to see price calculation.
            </p>
          </div>
        )}

        {/* Validation Messages */}
        {config.requireRentalDates && (!rentalStartAt || !rentalEndAt) && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Please select rental dates for {config.pricingType.toLowerCase()} pricing
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Label, Badge, Alert, AlertDescription, DateRangePicker } from '@rentalshop/ui/base';
import { PricingResolver, PricingValidator, formatCurrency } from '@rentalshop/utils';
import { useOrderTranslations } from '@rentalshop/hooks';
import type { Product, Merchant } from '@rentalshop/types';
import type { PricingType } from '@rentalshop/constants';

interface RentalPeriodSelectorProps {
  product: Product;
  merchant: Merchant;
  onPeriodChange: (startAt: Date, endAt: Date) => void;
  onPriceChange?: (pricing: any) => void;
  initialStartDate?: string; // ISO date string from formData
  initialEndDate?: string; // ISO date string from formData
}

export const RentalPeriodSelector: React.FC<RentalPeriodSelectorProps> = ({
  product,
  merchant,
  onPeriodChange,
  onPriceChange,
  initialStartDate,
  initialEndDate
}) => {
  const t = useOrderTranslations();
  // Initialize with formData values if available
  const [rentalStartAt, setRentalStartAt] = useState<Date | null>(() => 
    initialStartDate ? new Date(initialStartDate) : null
  );
  const [rentalEndAt, setRentalEndAt] = useState<Date | null>(() => 
    initialEndDate ? new Date(initialEndDate) : null
  );
  const [validationResult, setValidationResult] = useState<any>(null);
  const [lastNotifiedDates, setLastNotifiedDates] = useState<string>('');
  
  const config = PricingResolver.getEffectivePricingConfig(product, merchant);
  
  // Hourly-specific state (must be at component level, not inside render function)
  const [pickupHour, setPickupHour] = useState<number>(() => {
    if (initialStartDate) {
      return new Date(initialStartDate).getHours();
    }
    return 9;
  });
  const [returnHour, setReturnHour] = useState<number>(() => {
    if (initialEndDate) {
      return new Date(initialEndDate).getHours();
    }
    return 17;
  });
  
  // Debug logs
  console.log('🔍 RentalPeriodSelector rendered:', {
    pricingType: config.pricingType,
    productName: product.name,
    merchantBusinessType: merchant.businessType
  });
  
  useEffect(() => {
    if (rentalStartAt && rentalEndAt) {
      // Create a unique key for current dates
      const currentDatesKey = `${rentalStartAt.toISOString()}_${rentalEndAt.toISOString()}`;
      
      // Only notify if dates actually changed
      if (currentDatesKey !== lastNotifiedDates) {
        console.log('🔍 RentalPeriodSelector dates changed:', {
          rentalStartAt,
          rentalEndAt,
          currentDatesKey,
          lastNotifiedDates
        });
        
        // Update last notified dates FIRST to prevent re-trigger
        setLastNotifiedDates(currentDatesKey);
        
        // ALWAYS call onPeriodChange when dates are selected, even before validation
        onPeriodChange(rentalStartAt, rentalEndAt);
        
        // Validate rental period
        const validation = PricingValidator.validateRentalPeriod(
          product, merchant, rentalStartAt, rentalEndAt, 1
        );
        setValidationResult(validation);
        
        console.log('🔍 Validation result:', validation);
        
        // Calculate and notify price change if validation passes
        if (validation.isValid && onPriceChange) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rentalStartAt, rentalEndAt]);

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

  // Render UI based on merchant's pricing type (no manual override)
  const renderPricingUI = () => {
    switch (config.pricingType) {
      case 'HOURLY':
        return renderHourlyPricing();
      case 'DAILY':
        return renderDailyPricing();
      case 'WEEKLY':
        return renderWeeklyPricing();
      case 'FIXED':
      default:
        return renderFixedPricing();
    }
  };

  // Shared Calendar UI for FIXED, DAILY, WEEKLY
  const renderCalendarUI = (label: string, quickButtons?: { value: number; unit: 'day' | 'week'; label: string }[]) => (
    <div className="space-y-3">
      <Label className="text-sm font-medium">
        {label} <span className="text-red-500">*</span>
      </Label>
      <DateRangePicker
        value={{
          from: rentalStartAt || undefined,
          to: rentalEndAt || undefined
        }}
        onChange={(range) => {
          if (range?.from) setRentalStartAt(range.from);
          if (range?.to) setRentalEndAt(range.to);
        }}
        placeholder="Select pickup and return dates"
        minDate={new Date()}
        showPresets={true}
      />
      
      {/* Quick Duration Buttons (optional) */}
      {quickButtons && quickButtons.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {quickButtons.map((btn) => (
            <Button
              key={btn.value}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickDuration(btn.value, btn.unit)}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );

  // Fixed pricing - calendar with fixed price
  const renderFixedPricing = () => renderCalendarUI('Rental Period');

  // Hourly pricing - Single date picker + Pickup/Return hour selectors
  const renderHourlyPricing = () => {
    // Update dates when hours change
    const updateHourlyDates = (pickup: number, returnH: number) => {
      if (rentalStartAt) {
        const newStart = new Date(rentalStartAt);
        newStart.setHours(pickup, 0, 0, 0);
        setRentalStartAt(newStart);
        
        const newEnd = new Date(rentalStartAt);
        newEnd.setHours(returnH, 0, 0, 0);
        setRentalEndAt(newEnd);
      }
    };

    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Rental Period (Hourly) <span className="text-red-500">*</span>
        </Label>
        
        {/* Single Date Picker - Same day rental using DateRangePicker */}
        <div className="space-y-2">
          <DateRangePicker
            value={{
              from: rentalStartAt || undefined,
              to: rentalStartAt || undefined // Same day for hourly
            }}
            onChange={(range) => {
              if (range?.from) {
                const selectedDate = new Date(range.from);
                const newStart = new Date(selectedDate);
                newStart.setHours(pickupHour, 0, 0, 0);
                setRentalStartAt(newStart);
                
                const newEnd = new Date(selectedDate);
                newEnd.setHours(returnHour, 0, 0, 0);
                setRentalEndAt(newEnd);
              }
            }}
            placeholder="Select rental date"
            minDate={new Date()}
            showPresets={false}
          />
        </div>
        
        {/* Pickup Hour Selector */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-600">Pickup Hour</Label>
          <div className="grid grid-cols-8 gap-1">
            {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
              <Button
                key={hour}
                type="button"
                variant={pickupHour === hour ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setPickupHour(hour);
                  updateHourlyDates(hour, returnHour);
                }}
                disabled={!rentalStartAt}
                className="text-xs px-1"
              >
                {hour.toString().padStart(2, '0')}
              </Button>
            ))}
          </div>
        </div>

        {/* Return Hour Selector */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-600">Return Hour</Label>
          <div className="grid grid-cols-8 gap-1">
            {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
              <Button
                key={hour}
                type="button"
                variant={returnHour === hour ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setReturnHour(hour);
                  updateHourlyDates(pickupHour, hour);
                }}
                disabled={!rentalStartAt || hour <= pickupHour}
                className="text-xs px-1"
              >
                {hour.toString().padStart(2, '0')}
              </Button>
            ))}
          </div>
        </div>

        {/* Duration Display */}
        {rentalStartAt && rentalEndAt && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium text-blue-700">
                {Math.ceil((rentalEndAt.getTime() - rentalStartAt.getTime()) / (1000 * 60 * 60))} hours
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Daily pricing - calendar with daily quick buttons
  const renderDailyPricing = () => renderCalendarUI(
    t('messages.rentalPeriodDaily'),
    [] // Bỏ suggest dates theo yêu cầu
  );

  // Weekly pricing - calendar with weekly quick buttons
  const renderWeeklyPricing = () => renderCalendarUI(
    t('messages.rentalPeriodWeekly'),
    [] // Bỏ suggest dates theo yêu cầu
  );

  // Render pricing UI directly based on merchant's pricing type
  return renderPricingUI();
};

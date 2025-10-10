'use client';

import React, { useState, useEffect } from 'react';
import { Input } from './input';
import { cn } from '../../lib/utils';

export interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  label?: string;
  allowDecimals?: boolean;
  maxDecimalPlaces?: number;
  suffix?: string;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  placeholder = "0",
  className,
  error = false,
  disabled = false,
  min = 0,
  max,
  step = 1,
  required = false,
  label,
  allowDecimals = true,
  maxDecimalPlaces = 2,
  suffix
}) => {
  const [displayValue, setDisplayValue] = useState<string>('');

  // Update display value when prop value changes
  useEffect(() => {
    setDisplayValue(formatValueForDisplay(value || 0));
  }, [value]);

  // Format value for display with thousand separators
  const formatValueForDisplay = (numValue: number): string => {
    // Handle undefined, null, or NaN values
    if (numValue === undefined || numValue === null || isNaN(numValue)) {
      return '';
    }
    
    if (numValue === 0) return '';
    
    if (allowDecimals) {
      return numValue.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDecimalPlaces
      });
    } else {
      return numValue.toLocaleString('en-US');
    }
  };

  // Handle input change with proper formatting
  const handleInputChange = (inputValue: string) => {
    // Handle empty input
    if (!inputValue || inputValue.trim() === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }
    
    // Remove all non-numeric characters except decimal point (if decimals allowed)
    const regex = allowDecimals ? /[^\d.]/g : /[^\d]/g;
    const cleanValue = inputValue.replace(regex, '');
    
    // Handle decimal points (only allow one if decimals are allowed)
    if (allowDecimals) {
      const parts = cleanValue.split('.');
      if (parts.length > 2) return; // More than one decimal point
      
      // Limit decimal places
      if (parts[1] && parts[1].length > maxDecimalPlaces) return;
    }
    
    // Convert to number
    const numericValue = allowDecimals ? parseFloat(cleanValue) || 0 : parseInt(cleanValue) || 0;
    
    // Apply min/max constraints
    if (min !== undefined && numericValue < min) return;
    if (max !== undefined && numericValue > max) return;
    
    // Update display value
    setDisplayValue(cleanValue);
    
    // Call parent onChange with numeric value
    onChange(numericValue);
  };

  // Handle blur to format the display value
  const handleBlur = () => {
    if (value && value > 0) {
      setDisplayValue(formatValueForDisplay(value));
    }
  };

  // Handle focus to show raw value for editing
  const handleFocus = () => {
    if (value && value > 0) {
      setDisplayValue(value.toString());
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-text-primary">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <Input
          type="text"
          value={displayValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={cn(
            suffix ? "pr-12" : "",
            error && "border-red-500 focus:border-red-500",
            className
          )}
          disabled={disabled}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
};

// Keep the old name for backward compatibility
export const PriceInput = NumericInput;
export default NumericInput;

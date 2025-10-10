'use client';

import React from 'react';
import { Input } from './input';
import { Label } from './label';
import { cn } from '../../lib/utils';

export interface LimitInputProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  required?: boolean;
  helpText?: string;
}

export const LimitInput: React.FC<LimitInputProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder = "-1 (unlimited)",
  className,
  error = false,
  disabled = false,
  min = -1,
  max,
  required = false,
  helpText = "Use -1 for unlimited"
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Handle empty input - set to -1 (unlimited) when empty
    if (!inputValue || inputValue.trim() === '') {
      onChange(-1);
      return;
    }
    
    // Parse the value
    const numericValue = parseInt(inputValue);
    
    // Handle NaN (invalid input)
    if (isNaN(numericValue)) {
      return; // Don't update if invalid
    }
    
    // Apply min/max constraints (but allow -1 for unlimited)
    if (min !== undefined && numericValue < min && numericValue !== -1) {
      return;
    }
    if (max !== undefined && numericValue > max) {
      return;
    }
    
    // Update the value
    onChange(numericValue);
  };

  const getDisplayValue = () => {
    if (value === undefined || value === null) {
      return '';
    }
    // Handle -1 (unlimited) and other values properly
    return value.toString();
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        id={id}
        type="number"
        value={getDisplayValue()}
        onChange={handleChange}
        placeholder={placeholder}
        min={min === -1 ? undefined : min} // Don't set min if it's -1 to allow unlimited
        max={max}
        disabled={disabled}
        className={cn(
          error && "border-red-500 focus:border-red-500",
          className
        )}
      />
      {helpText && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  );
};

export default LimitInput;

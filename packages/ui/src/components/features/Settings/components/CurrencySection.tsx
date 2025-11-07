'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import type { CurrencyCode } from '@rentalshop/types';
import { formatCurrency, getCurrency } from '@rentalshop/utils';

// Import UI components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from '@rentalshop/ui/base';

// Currency options for selection
const CURRENCY_OPTIONS: Array<{ value: CurrencyCode; label: string; symbol: string; name: string }> = [
  { value: 'USD', label: '$ USD - US Dollar', symbol: '$', name: 'US Dollar' },
  { value: 'VND', label: 'đ VND - Vietnamese Dong', symbol: 'đ', name: 'Vietnamese Dong' },
];

/**
 * Currency Section Props
 */
interface CurrencySectionProps {
  /** Current user */
  user?: any;
  /** Current selected currency */
  currentCurrency: CurrencyCode;
  /** Is updating */
  isUpdating?: boolean;
  /** On currency change */
  onCurrencyChange: (currency: CurrencyCode) => Promise<void>;
}

/**
 * Currency Section Component
 * 
 * Allows merchants to select and change their preferred currency.
 * Displays currency options with preview formatting.
 */
export const CurrencySection: React.FC<CurrencySectionProps> = ({
  user,
  currentCurrency,
  isUpdating = false,
  onCurrencyChange,
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(currentCurrency);
  const [hasChanges, setHasChanges] = useState(false);

  // Update selected currency when prop changes
  useEffect(() => {
    setSelectedCurrency(currentCurrency);
    setHasChanges(false);
  }, [currentCurrency]);

  // Handle currency selection
  const handleSelect = (currency: CurrencyCode) => {
    setSelectedCurrency(currency);
    setHasChanges(currency !== currentCurrency);
  };

  // Handle save
  const handleSave = async () => {
    if (!hasChanges) return;
    await onCurrencyChange(selectedCurrency);
    setHasChanges(false);
  };

  // Handle cancel
  const handleCancel = () => {
    setSelectedCurrency(currentCurrency);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-blue-700" />
          Currency Settings
        </h2>
        <p className="text-gray-600 mt-1">
          Choose your preferred currency for displaying prices across your rental shop.
        </p>
      </div>

      {/* Warning Message */}
      {hasChanges && (
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-900">
              Unsaved Changes
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              You have unsaved currency changes. Click "Save Changes" to apply them.
            </p>
          </div>
        </div>
      )}

      {/* Current Currency Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Currency</CardTitle>
          <CardDescription>
            Your currently active currency for all price displays
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-3xl">{getCurrency(currentCurrency)?.symbol || '$'}</div>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900">
                {getCurrency(currentCurrency)?.name || 'US Dollar'}
              </div>
              <div className="text-sm text-gray-600">
                Code: {currentCurrency}
              </div>
            </div>
            {selectedCurrency === currentCurrency && !hasChanges && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Currency Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Currency</CardTitle>
          <CardDescription>
            Choose from our supported currencies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CURRENCY_OPTIONS.map((option: { value: CurrencyCode; label: string; symbol: string; name: string }) => {
              const config = getCurrency(option.value);
              if (!config) return null;
              const isSelected = selectedCurrency === option.value;
              const isCurrent = currentCurrency === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  disabled={isUpdating}
                  className={`
                    relative p-4 border-2 rounded-lg text-left transition-all
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-50 shadow-sm' 
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }
                    ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{config.symbol}</div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {config.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {option.value}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-5 w-5 text-blue-700" />
                    )}
                  </div>

                  {/* Preview Examples */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">Preview:</div>
                    <div className="space-y-1">
                      <div className="text-sm text-gray-700">
                        <span className="text-gray-500">Small: </span>
                        <span className="font-medium">{formatCurrency(10, option.value)}</span>
                      </div>
                      <div className="text-sm text-gray-700">
                        <span className="text-gray-500">Medium: </span>
                        <span className="font-medium">{formatCurrency(1000, option.value)}</span>
                      </div>
                      <div className="text-sm text-gray-700">
                        <span className="text-gray-500">Large: </span>
                        <span className="font-medium">{formatCurrency(1000000, option.value)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Current Badge */}
                  {isCurrent && !hasChanges && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                        Current
                      </Badge>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Currency Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Currency Details</CardTitle>
          <CardDescription>
            Technical information about {getCurrency(selectedCurrency)?.name || 'Selected Currency'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Symbol</div>
              <div className="text-lg font-semibold">{getCurrency(selectedCurrency)?.symbol || '$'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Code</div>
              <div className="text-lg font-semibold">{selectedCurrency}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Decimal Places</div>
              <div className="text-lg font-semibold">{getCurrency(selectedCurrency)?.maxFractionDigits || 2}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Symbol Position</div>
              <div className="text-lg font-semibold capitalize">
                {getCurrency(selectedCurrency)?.symbolBefore ? 'before' : 'after'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Locale</div>
              <div className="text-lg font-semibold">{getCurrency(selectedCurrency)?.locale || 'en-US'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {hasChanges && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isUpdating || !hasChanges}
          >
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}

      {/* Help Text */}
      <div className="text-sm text-gray-500 space-y-2">
        <p>
          <strong>Note:</strong> Changing your currency will affect how prices are displayed 
          throughout your rental shop. All existing prices will remain in their original values 
          but will be formatted according to the selected currency.
        </p>
        <p>
          If you need to convert existing prices to the new currency, please contact support.
        </p>
      </div>
    </div>
  );
};

export default CurrencySection;


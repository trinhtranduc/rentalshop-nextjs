'use client';

import React from 'react';
import { Store } from 'lucide-react';
import { LanguageSwitcher } from '@rentalshop/ui';
import { cn } from '@rentalshop/ui';

interface MerchantHeaderProps {
  merchant: {
    name: string;
    description?: string | null;
  };
  className?: string;
}

export function MerchantHeader({ merchant, className }: MerchantHeaderProps) {
  return (
    <div className={cn('bg-white border-b border-gray-200', className)}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Merchant Info */}
          <div className="flex items-center gap-3">
            <Store className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{merchant.name}</h1>
              {merchant.description && (
                <p className="text-sm text-gray-600 mt-1">{merchant.description}</p>
              )}
            </div>
          </div>

          {/* Language Switcher */}
          <LanguageSwitcher variant="compact" />
        </div>
      </div>
    </div>
  );
}

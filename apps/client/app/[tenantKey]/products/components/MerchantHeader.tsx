'use client';

import React from 'react';
import { Store, MapPin, Phone } from 'lucide-react';
import { LanguageSwitcher } from '@rentalshop/ui';
import { cn } from '@rentalshop/ui';

interface Outlet {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
}

interface MerchantHeaderProps {
  merchant: {
    name: string;
    description?: string | null;
  };
  outlets?: Outlet[];
  className?: string;
}

export function MerchantHeader({ merchant, outlets = [], className }: MerchantHeaderProps) {
  // Get the first active outlet or default outlet
  const displayOutlet = outlets.length > 0 ? outlets[0] : null;
  
  // Build full address
  const buildAddress = (outlet: Outlet) => {
    const parts = [
      outlet.address,
      outlet.city,
      outlet.state,
      outlet.zipCode,
      outlet.country
    ].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <div className={cn('bg-white border-b border-gray-200', className)}>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* Merchant Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Store className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{merchant.name}</h1>
                {merchant.description && (
                  <p className="text-sm text-gray-600 mt-1">{merchant.description}</p>
                )}
              </div>
            </div>

            {/* Outlet Information */}
            {displayOutlet && (
              <div className="mt-4 space-y-2 pl-9">
                {/* Outlet Name */}
                {displayOutlet.name && (
                  <div className="flex items-start gap-2">
                    <Store className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900">{displayOutlet.name}</span>
                  </div>
                )}
                
                {/* Outlet Address */}
                {buildAddress(displayOutlet) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{buildAddress(displayOutlet)}</span>
                  </div>
                )}
                
                {/* Outlet Phone */}
                {displayOutlet.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <a 
                      href={`tel:${displayOutlet.phone}`}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {displayOutlet.phone}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Language Switcher */}
          <div className="flex-shrink-0">
            <LanguageSwitcher variant="compact" />
          </div>
        </div>
      </div>
    </div>
  );
}

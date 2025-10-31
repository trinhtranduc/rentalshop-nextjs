'use client';

import React from 'react';
import { Card, CardContent } from '@rentalshop/ui';
import { Shirt, Car, Wrench, Package } from 'lucide-react';
import { BUSINESS_TYPE_LABELS, BUSINESS_TYPE_DESCRIPTIONS, BUSINESS_TYPE_DEFAULTS } from '@rentalshop/constants';
import type { BusinessType } from '@rentalshop/types';

interface BusinessTypeSelectorProps {
  selectedType: BusinessType | null;
  onSelect: (type: BusinessType) => void;
}

export const BusinessTypeSelector: React.FC<BusinessTypeSelectorProps> = ({
  selectedType,
  onSelect
}) => {
  const businessTypes = [
    {
      type: 'CLOTHING' as BusinessType,
      icon: Shirt,
      title: 'Clothing Rental',
      description: 'Dresses, suits, costumes, accessories',
      defaultPricing: 'Fixed pricing'
    },
    {
      type: 'VEHICLE' as BusinessType,
      icon: Car,
      title: 'Vehicle Rental',
      description: 'Cars, bikes, motorcycles',
      defaultPricing: 'Hourly pricing'
    },
    {
      type: 'EQUIPMENT' as BusinessType,
      icon: Wrench,
      title: 'Equipment Rental',
      description: 'Tools, machinery, equipment',
      defaultPricing: 'Daily pricing'
    },
    {
      type: 'GENERAL' as BusinessType,
      icon: Package,
      title: 'General Rental',
      description: 'Various items and services',
      defaultPricing: 'Fixed pricing'
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose Your Business Type</h3>
        <p className="text-gray-600 mb-6">
          This will set default pricing rules for all your products. You can change this later in settings.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {businessTypes.map(({ type, icon: Icon, title, description, defaultPricing }) => (
          <Card 
            key={type}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedType === type 
                ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50' 
                : 'hover:border-gray-300'
            }`}
            onClick={() => onSelect(type)}
          >
            <CardContent className="p-6 text-center">
              <Icon className="w-12 h-12 mx-auto mb-4 text-blue-700" />
              <h4 className="font-semibold text-lg mb-2">{title}</h4>
              <p className="text-gray-600 text-sm mb-3">{description}</p>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {defaultPricing}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {selectedType && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">
            Selected: {BUSINESS_TYPE_LABELS[selectedType]}
          </h4>
          <p className="text-blue-700 text-sm mb-2">
            Your products will use {BUSINESS_TYPE_DEFAULTS[selectedType].defaultPricingType.toLowerCase()} pricing by default.
          </p>
          <p className="text-blue-700 text-xs">
            💡 You can change pricing type and other settings later in your merchant settings.
          </p>
        </div>
      )}
    </div>
  );
};

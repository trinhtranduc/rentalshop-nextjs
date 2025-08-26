/**
 * OrderFormHeader - Header component for edit mode
 */

import React from 'react';
import { Badge } from '@rentalshop/ui';

interface OrderFormHeaderProps {
  orderNumber?: string;
  isEditMode?: boolean;
}

export const OrderFormHeader: React.FC<OrderFormHeaderProps> = ({ 
  orderNumber, 
  isEditMode 
}) => {
  if (!isEditMode || !orderNumber) {
    return null;
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Edit Order #{orderNumber}
          </h1>
          <p className="text-sm text-gray-600">
            Modify order information and items
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="default" className="bg-blue-100 text-blue-800">
            EDIT MODE
          </Badge>
        </div>
      </div>
    </div>
  );
};

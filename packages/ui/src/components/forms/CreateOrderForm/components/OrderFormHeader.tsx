/**
 * OrderFormHeader - Component for order form header with back button
 */

import React from 'react';
import { Badge, Button } from '@rentalshop/ui';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OrderFormHeaderProps {
  orderNumber?: string;
  isEditMode?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
}

export const OrderFormHeader: React.FC<OrderFormHeaderProps> = ({ 
  orderNumber, 
  isEditMode,
  showBackButton = true,
  onBack
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/orders');
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 mb-6">
      <div className="flex items-center gap-4">
        {/* Back Button */}
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        {/* Title & Badge */}
        <div className="flex-1 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode && orderNumber ? `Edit Order #${orderNumber}` : 'Create New Order'}
            </h1>
            <p className="text-sm text-gray-600">
              {isEditMode ? 'Modify order information and items' : 'Fill in the order details to create a new rental or sale order'}
            </p>
          </div>
          {isEditMode && (
            <Badge variant="default" className="bg-blue-100 text-blue-800">
              EDIT MODE
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

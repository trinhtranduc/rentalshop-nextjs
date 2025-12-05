/**
 * OrderFormHeader - Component for order form header with breadcrumb
 */

import React from 'react';
import { Badge, Breadcrumb } from '@rentalshop/ui';
import type { BreadcrumbItem } from '@rentalshop/ui';
import { useOrderTranslations } from '@rentalshop/hooks';

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
  const t = useOrderTranslations();
  // Build breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    {
      label: t('messages.orders'),
      href: '/orders'
    },
    {
      label: isEditMode && orderNumber ? `${t('messages.editOrder')} #${orderNumber}` : t('messages.createNewOrder'),
      href: '#'
    }
  ];

  return (
    <div className="px-6 py-3">
      <div className="flex items-center gap-3">
        <Breadcrumb items={breadcrumbItems} />
        {isEditMode && (
          <Badge variant="default" className="bg-blue-100 text-blue-800 ml-2">
            {t('messages.editOrder')}
          </Badge>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { Info } from 'lucide-react';
import { useOrderTranslations } from '@rentalshop/hooks';
import { useFormattedFullDate, useFormattedDateTime } from '@rentalshop/utils/client';
import { formatPhoneNumberMasked } from '@rentalshop/utils';
import type { OrderWithDetails } from '@rentalshop/types';

interface OrderInformationProps {
  order: OrderWithDetails;
}

export const OrderInformation: React.FC<OrderInformationProps> = ({ order }) => {
  const t = useOrderTranslations();
  
  // Use centralized date formatting hooks (DRY principle)
  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return 'N/A';
    return useFormattedFullDate(dateString);
  };
  const formatDateTime = (dateString: string | Date | undefined) => {
    if (!dateString) return 'N/A';
    return useFormattedDateTime(dateString);
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Info className="w-5 h-5" />
          {t('detail.orderInformation')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-3">
            {/* Customer Name */}
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{t('customer.name')}:</span>
              <span className="text-sm font-medium">
                {order.customer?.firstName
                  ? [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ').trim()
                  : order.customerName || t('customer.noCustomer')}
              </span>
            </div>

            {/* Customer Phone */}
            {(order.customer?.phone && order.customer.phone.trim() !== '') || order.customerPhone ? (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('customer.phone')}:</span>
                <span className="text-sm font-medium">
                  {formatPhoneNumberMasked(order.customer?.phone || order.customerPhone)}
                </span>
              </div>
            ) : null}

            {/* Seller */}
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{t('detail.seller')}:</span>
              <span className="text-sm font-medium">
                {order.outlet?.name || (order as any).outletName || 'N/A'}
              </span>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            {order.orderType === 'RENT' && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('dates.pickupDate')}:</span>
                  <span className="text-sm font-medium">
                    {formatDate(order.pickupPlanAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('dates.returnDate')}:</span>
                  <span className="text-sm font-medium">
                    {formatDate(order.returnPlanAt)}
                  </span>
                </div>
              </>
            )}
            
            {/* Order Date */}
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{t('detail.orderDate')}:</span>
              <span className="text-sm font-medium">
                {formatDateTime(order.createdAt)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Spacer to fill remaining height */}
        <div className="flex-1"></div>
      </CardContent>
    </Card>
  );
};


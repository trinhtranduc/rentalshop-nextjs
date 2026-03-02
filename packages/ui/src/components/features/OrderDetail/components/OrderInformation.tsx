import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { Info } from 'lucide-react';
import { useOrderTranslations } from '@rentalshop/hooks';
import { useFormattedFullDate, useFormattedDateTime } from '@rentalshop/utils/client';
import { formatPhoneNumber } from '@rentalshop/utils';
import type { OrderWithDetails } from '@rentalshop/types';
import { Copy } from 'lucide-react';
import { useToast } from '@rentalshop/ui';

interface OrderInformationProps {
  order: OrderWithDetails;
}

export const OrderInformation: React.FC<OrderInformationProps> = ({ order }) => {
  const t = useOrderTranslations();
  const { toastSuccess } = useToast();
  
  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toastSuccess('Copied', 'Phone number copied to clipboard');
  };
  
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
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t('customer.phone')}:</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">
                    {formatPhoneNumber(order.customer?.phone || order.customerPhone)}
                  </span>
                  <button
                    onClick={() => handleCopyPhone(order.customer?.phone || order.customerPhone || '')}
                    className="opacity-60 hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    title="Copy phone number"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
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


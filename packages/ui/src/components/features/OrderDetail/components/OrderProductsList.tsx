import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { Package } from 'lucide-react';
import { useOrderTranslations } from '@rentalshop/hooks';
import { useFormatCurrency } from '@rentalshop/ui';
import type { OrderWithDetails } from '@rentalshop/types';

interface OrderProductsListProps {
  order: OrderWithDetails;
}

export const OrderProductsList: React.FC<OrderProductsListProps> = ({ order }) => {
  const t = useOrderTranslations();
  const formatMoney = useFormatCurrency();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="w-5 h-5" />
          {t('detail.products')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {order.orderItems.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">{t('items.noItems')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {order.orderItems.map((item, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-start gap-3">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                  </div>
                  
                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    {(() => {
                      // Use productName from snapshot if product object is missing
                      const productName = item.product?.name || (item as any).productName || 'Unknown Product';
                      
                      console.log('🔍 OrderProductsList: Rendering item:', {
                        itemId: item.id,
                        productId: item.productId,
                        hasProduct: !!item.product,
                        productNameFromProduct: item.product?.name,
                        productNameFromSnapshot: (item as any).productName,
                        finalProductName: productName
                      });
                      
                      return (
                        <>
                          <div className="font-medium text-gray-900 text-sm">
                            {productName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {productName ? `${t('items.product')}: ${productName}` : ''}
                          </div>
                        </>
                      );
                    })()}
                    <div className="text-xs text-gray-600">
                      {formatMoney(item.unitPrice)} x {item.quantity}
                    </div>
                    {(item as any).notes && (
                      <div className="text-xs text-gray-500 mt-1">
                        {t('detail.notes')}: {(item as any).notes || t('detail.noNotes')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};


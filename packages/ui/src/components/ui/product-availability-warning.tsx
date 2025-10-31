import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
}

export interface ProductAvailabilityData {
  [productId: number]: {
    status: 'available' | 'unavailable' | 'unknown';
    available: number;
    storage: number;
    hasDateConflict?: boolean;
    conflictingQuantity?: number;
    remainingStock?: number;
  };
}

interface ProductAvailabilityWarningProps {
  orderItems: OrderItem[];
  availabilityData: ProductAvailabilityData;
}

/**
 * Component hiển thị cảnh báo tình trạng sẵn có của sản phẩm trong đơn hàng
 */
export const ProductAvailabilityWarning: React.FC<ProductAvailabilityWarningProps> = ({ 
  orderItems, 
  availabilityData 
}) => {
  if (!orderItems || orderItems.length === 0) {
    return null;
  }

  // Kiểm tra các sản phẩm không khả dụng
  const problematicProducts = orderItems.filter(order => {
    const availability = availabilityData[order.productId];
    if (!availability) return false;
    
    return availability.status === 'unavailable';
  });

  if (problematicProducts.length === 0) {
    return null;
  }

  const getWarningType = () => {
    const hasUnavailable = problematicProducts.some(p => 
      availabilityData[p.productId]?.status === 'unavailable'
    );
    
    if (hasUnavailable) return 'warning';
    return 'info';
  };

  const getWarningIcon = () => {
    const type = getWarningType();
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-blue-700" />;
    }
  };

  const getWarningClass = () => {
    const type = getWarningType();
    switch (type) {
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getWarningTitle = () => {
    const type = getWarningType();
    switch (type) {
      case 'warning':
        return 'Some products may not be available';
      default:
        return 'Stock information';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getWarningClass()} mb-4`}>
      <div className="flex items-start gap-3">
        {getWarningIcon()}
        <div className="flex-1">
          <h4 className="font-medium mb-2">{getWarningTitle()}</h4>
          <div className="space-y-2">
            {problematicProducts.map((product) => {
              const availability = availabilityData[product.productId];
              if (!availability) return null;

              const getProductStatusText = () => {
                const { hasDateConflict, conflictingQuantity } = availability;
                
                switch (availability.status) {
                  case 'unavailable':
                    if (hasDateConflict) {
                      return `Date conflict: ${conflictingQuantity} items`;
                    } else {
                      return 'Currently unavailable';
                    }
                  default:
                    return 'Unknown status';
                }
              };

              return (
                <div key={product.productId} className="text-sm">
                  <span className="font-medium">{product.productName}</span>
                  <span className="mx-2">-</span>
                  <span>{getProductStatusText()}</span>
                  <span className="text-xs opacity-75 ml-2">
                    (Requested: {product.quantity})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

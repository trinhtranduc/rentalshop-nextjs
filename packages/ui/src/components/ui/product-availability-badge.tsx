import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Package, Loader2 } from 'lucide-react';

export interface ProductAvailability {
  status: 'available' | 'unavailable' | 'unknown';
  available: number;
  storage: number;
  hasDateConflict?: boolean;
  conflictingQuantity?: number;
  remainingStock?: number;
}

interface ProductAvailabilityBadgeProps {
  availability: ProductAvailability;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Component hiển thị badge tình trạng sẵn có của sản phẩm
 */
export const ProductAvailabilityBadge: React.FC<ProductAvailabilityBadgeProps> = ({ 
  availability, 
  isLoading = false, 
  size = 'sm' 
}) => {
  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Checking...</span>
      </div>
    );
  }

  if (!availability) {
    return null;
  }

  const { status, available, storage } = availability;

  // Xác định style dựa trên trạng thái
  const getStatusStyle = () => {
    switch (status) {
      case 'available':
        return {
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
          icon: CheckCircle,
          iconColor: 'text-green-600'
        };
      case 'unavailable':
        return {
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200',
          icon: XCircle,
          iconColor: 'text-red-600'
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          icon: Package,
          iconColor: 'text-gray-600'
        };
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'unavailable':
        return 'Unavailable';
      default:
        return 'Unknown';
    }
  };

  const getTooltipText = () => {
    const { hasDateConflict, conflictingQuantity, remainingStock } = availability;
    
    switch (status) {
      case 'available':
        return `Available for rent: ${remainingStock || available}/${storage}`;
      case 'unavailable':
        if (hasDateConflict) {
          return `Date conflict: ${conflictingQuantity} items rented during this period`;
        } else {
          return `Currently unavailable: ${storage - (remainingStock || available)} items rented out`;
        }
      default:
        return 'Stock information unavailable';
    }
  };

  const style = getStatusStyle();
  const IconComponent = style.icon;

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div 
      className={`inline-flex items-center gap-1 rounded-full font-medium border transition-colors duration-200 ${sizeClasses[size]} ${style.bgColor} ${style.textColor} ${style.borderColor}`}
      title={getTooltipText()}
    >
      <IconComponent className={`${iconSizes[size]} ${style.iconColor}`} />
      <span>{getStatusText()}</span>
    </div>
  );
};

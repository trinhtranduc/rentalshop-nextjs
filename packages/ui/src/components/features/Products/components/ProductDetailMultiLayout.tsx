'use client'

import React from 'react';
import { ProductDetailList } from './ProductDetailList';
import type { ProductWithDetails } from '../types';

interface ProductDetailMultiLayoutProps {
  product: ProductWithDetails;
  onEdit?: () => void;
  onViewOrders?: () => void;
  showActions?: boolean;
  isMerchantAccount?: boolean;
  className?: string;
}

export const ProductDetailMultiLayout: React.FC<ProductDetailMultiLayoutProps> = ({
  product,
  onEdit,
  onViewOrders,
  showActions = true,
  isMerchantAccount = false,
  className = ''
}) => {
  return (
    <ProductDetailList
      product={product}
      onEdit={onEdit}
      showActions={showActions}
      isMerchantAccount={isMerchantAccount}
      className={className}
    />
  );
};

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Products } from '@rentalshop/ui';
import { useAuth, useCanExportData } from '@rentalshop/hooks';
import { PAGINATION } from '@rentalshop/constants';

export default function ProductsPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const canExport = useCanExportData();

  const handleProductAction = (action: string, productId: number) => {
    switch (action) {
      case 'view-orders':
        // Navigate to product orders page
        router.push(`/products/${productId}/orders`);
        break;
      default:
        // Let the hook handle add/view/edit actions with dialogs
        console.log('Product action handled by hook:', action, productId);
    }
  };

  return (
    <Products
      mode="management"
      title="Products"
      subtitle="Manage your product catalog with outlet stock allocation"
      showExportButton={canExport}
      showAddButton={canExport}
      addButtonText="Add Product"
      exportButtonText="Export Products"
      showStats={false}
      useSearchProducts={true}
      initialLimit={PAGINATION.DEFAULT_PAGE_SIZE}
      currentUser={currentUser}
      onProductAction={handleProductAction}
    />
  );
} 
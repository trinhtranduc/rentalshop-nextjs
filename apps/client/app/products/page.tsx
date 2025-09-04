'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Products } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';

export default function ProductsPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const isMerchantLevel = currentUser && ((currentUser.role === 'ADMIN' && !currentUser.outlet?.id) || currentUser.role === 'MERCHANT');

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
      showExportButton={!!isMerchantLevel}
      showAddButton={!!isMerchantLevel}
      addButtonText="Add Product"
      exportButtonText="Export Products"
      showStats={false}
      useSearchProducts={false}
      initialLimit={10}
      currentUser={currentUser}
      onProductAction={handleProductAction}
    />
  );
} 
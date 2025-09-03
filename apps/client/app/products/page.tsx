'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Products,
  Button
} from '@rentalshop/ui';
import { Plus } from 'lucide-react';
import { useAuth } from '@rentalshop/hooks';

export default function ProductsPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const isMerchantLevel = currentUser && ((currentUser.role === 'ADMIN' && !currentUser.outlet?.id) || currentUser.role === 'MERCHANT');

  const handleProductAction = (action: string, productId: number) => {
    switch (action) {
      case 'view':
        router.push(`/products/${productId}`);
        break;
      case 'view-orders':
        // This will be handled by the ProductOrdersDialog in the Products component
        console.log('View orders for product:', productId);
        break;
      case 'edit':
        router.push(`/products/${productId}/edit`);
        break;
      case 'add':
        router.push('/products/add');
        break;
      default:
        console.log('Product action:', action, productId);
    }
  };

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>Products</PageTitle>
            <p className="text-gray-600">Manage your product catalog with outlet stock allocation</p>
          </div>
          {isMerchantLevel && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  // TODO: Implement export functionality
                  console.log('Export functionality coming soon!');
                }}
                className="flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export
              </Button>
              <Button 
                onClick={() => router.push('/products/add')}
                className="flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Product
              </Button>
            </div>
          )}
        </div>
      </PageHeader>

      <PageContent>
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
      </PageContent>
    </PageWrapper>
  );
} 
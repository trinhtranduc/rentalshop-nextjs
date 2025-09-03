'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Products,
  Button
} from '@rentalshop/ui';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@rentalshop/hooks';

export default function MerchantProductsPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const merchantId = params.id as string;

  const handleProductAction = (action: string, productId: number) => {
    switch (action) {
      case 'view':
        router.push(`/merchants/${merchantId}/products/${productId}`);
        break;
      case 'view-orders':
        // This will be handled by the ProductOrdersDialog in the Products component
        console.log('View orders for product:', productId);
        break;
      case 'edit':
        router.push(`/merchants/${merchantId}/products/${productId}/edit`);
        break;
      case 'add':
        router.push(`/merchants/${merchantId}/products/add`);
        break;
      default:
        console.log('Product action:', action, productId);
    }
  };

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/merchants/${merchantId}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Merchant
            </Button>
            <PageTitle subtitle={`Manage products for merchant ${merchantId}`}>
              Merchant Products
            </PageTitle>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        <Products
          mode="management"
          title="Merchant Products"
          subtitle={`Manage products for merchant ${merchantId}`}
          showExportButton={true}
          showAddButton={true}
          addButtonText="Add Product"
          exportButtonText="Export Products"
          showStats={true}
          useSearchProducts={true}
          initialLimit={20}
          merchantId={parseInt(merchantId)}
          currentUser={currentUser}
          onProductAction={handleProductAction}
        />
      </PageContent>
    </PageWrapper>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  Button,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  useToasts,
  ToastContainer,
  FormSkeleton
} from '@rentalshop/ui';
import { CreateOrderForm } from '@rentalshop/ui';
import type { CustomerSearchResult, ProductWithStock, OrderInput } from '@rentalshop/types';
import { 
  customersApi, 
  productsApi, 
  outletsApi, 
  ordersApi 
} from '@rentalshop/utils';
import { useAuth } from '@rentalshop/hooks';

export default function CreateOrderPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [customers, setCustomers] = useState<CustomerSearchResult[]>([]);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [outlets, setOutlets] = useState<Array<{ id: number; name: string; merchantId?: number }>>([]);
  const [resetForm, setResetForm] = useState<(() => void) | null>(null);

  // Toast notifications
  const { toasts, showSuccess, showError, removeToast } = useToasts();

  // Get merchant ID from user context
  const merchantId = user?.merchant?.id;

  useEffect(() => {
    if (!merchantId) return; // Don't fetch without merchant ID
    
    const fetchAll = async () => {
      try {
        setLoading(true);

        console.log('🔍 Fetching data for merchant ID:', merchantId);

        const [customersRes, productsRes, outletsRes] = await Promise.all([
          // Use API clients (they automatically attach auth token)
          customersApi.searchCustomers({ 
            merchantId: Number(merchantId), 
            isActive: true, 
            limit: 50 
          }),
          productsApi.searchProducts({ 
            merchantId: Number(merchantId), 
            isActive: true, 
            limit: 100 
          }),
          outletsApi.getOutletsByMerchant(Number(merchantId)),
        ]);

        if (customersRes.success) {
          // searchCustomers returns { success: true, data: { customers: [...] } }
          setCustomers(customersRes.data?.customers || []);
          console.log('✅ Loaded customers:', customersRes.data?.customers?.length || 0);
        } else {
          console.error('Failed to fetch customers:', customersRes.error);
          showError('Load Error', 'Failed to load customers');
        }

        if (productsRes.success) {
          // searchProducts returns { success: true, data: { products: [...] } }
          setProducts(productsRes.data?.products || []);
          console.log('✅ Loaded products:', productsRes.data?.products?.length || 0);
        } else {
          console.error('Failed to fetch products:', productsRes.error);
          showError('Load Error', 'Failed to load products');
        }

        if (outletsRes.success) {
          console.log('🔍 Raw outlets response:', outletsRes.data);
          console.log('🔍 Raw outlets array:', outletsRes.data?.outlets);
          
          // outletsRes.data is now OutletsResponse with nested outlets array
          const outletsArray = outletsRes.data?.outlets || [];
          
          // Debug: Log each outlet object structure
          outletsArray.forEach((outlet: any, index: number) => {
            console.log(`🔍 Outlet ${index}:`, {
              id: outlet.id,
              name: outlet.name,
              merchantId: outlet.merchantId,
              merchant: outlet.merchant,
              fullObject: outlet
            });
          });
          
          // The API already returns outlets with id field (which is the id)
          // No need to remap - use the data as-is
          const mapped = outletsArray.map((o: any) => ({ 
            id: o.id, // Use the id field that's already provided by the API
            name: o.name,
            merchantId: o.merchantId || o.merchant?.id
          }));
          
          console.log('🔍 Mapped outlets for frontend:', mapped);
          console.log('🔍 Outlet IDs being sent:', mapped.map(o => o.id));
          
          setOutlets(mapped);
        } else {
          console.error('Failed to fetch outlets:', outletsRes.error);
        }
      } catch (error) {
        console.error('Error loading data for order creation:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [merchantId]);

  const handleSubmit = async (orderData: OrderInput) => {
    try {
      setSubmitting(true);
      const result = await ordersApi.createOrder(orderData);
      if (result.success) {
        // Show success message
        showSuccess('Order created successfully!');
        // Navigate back to orders list after successful creation
        router.push('/orders');
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Create order failed:', error);
      showError('Create order failed', (error as Error).message || 'Create order failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/orders');
  };

  const handleFormReady = (resetFormFn: () => void) => {
    setResetForm(() => resetFormFn);
  };

  if (!merchantId) {
    return (
      <PageWrapper>
        <PageContent>
          <Card>
            <CardContent className="p-8 text-center text-gray-600">
              <div className="mb-4">Merchant ID not found</div>
              <div className="text-sm text-gray-500">Please log in again to access this page</div>
            </CardContent>
          </Card>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      {loading ? (
        <div className="p-6">
          <FormSkeleton />
        </div>
      ) : (
        <CreateOrderForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          customers={customers}
          products={products}
          outlets={outlets}
          loading={submitting}
          layout="three-column"
          merchantId={Number(merchantId)}
          onFormReady={handleFormReady}
        />
      )}
    </div>
  );
}



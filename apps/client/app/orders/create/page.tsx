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
  PageContent
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
  const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);

  // Get merchant ID from user context
  const merchantId = user?.merchant?.id;

  useEffect(() => {
    if (!merchantId) return; // Don't fetch without merchant ID
    
    const fetchAll = async () => {
      try {
        setLoading(true);

        const [customersRes, productsRes, outletsRes] = await Promise.all([
          customersApi.getCustomers({ 
            page: 1, 
            limit: 50, 
            isActive: true,
            merchantId: merchantId || undefined
          }),
          productsApi.getProducts({ 
            page: 1, 
            limit: 100,
            merchantId: merchantId || undefined
          }),
          outletsApi.getOutlets({ 
            merchantId: merchantId || undefined
          }),
        ]);

        if (customersRes.success) {
          setCustomers(customersRes.data?.customers || []);
        } else {
          console.error('Failed to fetch customers:', customersRes.error);
        }

        if (productsRes.success) {
          setProducts(productsRes.data?.products || []);
        } else {
          console.error('Failed to fetch products:', productsRes.error);
        }

        if (outletsRes.success) {
          const mapped = (outletsRes.data?.outlets || []).map((o: any) => ({ id: o.id, name: o.name }));
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
        router.push('/orders');
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Create order failed:', error);
      alert((error as Error).message || 'Create order failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/orders');
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
    <PageWrapper>
      <PageContent>
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-600">Loading data...</CardContent>
          </Card>
        ) : (
          <CreateOrderForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            customers={customers}
            products={products}
            outlets={outlets}
            loading={submitting}
            layout="split"
            merchantId={merchantId?.toString()}
          />
        )}
      </PageContent>
    </PageWrapper>
  );
}



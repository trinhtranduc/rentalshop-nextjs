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
import type { CustomerSearchResult, ProductWithStock, ProductSearchResult, OrderInput } from '@rentalshop/database';
import { authenticatedFetch } from '@rentalshop/utils';
import { useAuth } from '../../../hooks/useAuth';

export default function CreateOrderPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [customers, setCustomers] = useState<CustomerSearchResult[]>([]);
  const [products, setProducts] = useState<ProductSearchResult[]>([]);
  const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);

  // Get merchant ID from user context
  const merchantId = user?.merchant?.id;

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);

        const [customersRes, productsRes, outletsRes] = await Promise.all([
          authenticatedFetch('/api/customers?page=1&limit=50&isActive=true'),
          authenticatedFetch('/api/products?page=1&limit=100'),
          authenticatedFetch('/api/outlets'),
        ]);

        if (customersRes.ok) {
          const data = await customersRes.json();
          setCustomers(data.data?.customers || []);
        }

        if (productsRes.ok) {
          const data = await productsRes.json();
          // Transform ProductWithStock to ProductSearchResult format
          const transformedProducts = (data.data?.products || []).map((product: ProductWithStock) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            barcode: product.barcode,
            stock: product.outletStock?.[0]?.stock || 0,
            renting: product.outletStock?.[0]?.renting || 0,
            available: product.outletStock?.[0]?.available || 0,
            rentPrice: product.rentPrice,
            salePrice: product.salePrice,
            deposit: product.deposit,
            images: product.images,
            isActive: product.isActive,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
            outlet: {
              id: product.outletStock?.[0]?.outlet?.id || '',
              name: product.outletStock?.[0]?.outlet?.name || '',
              merchant: {
                id: product.merchant?.id || '',
                companyName: product.merchant?.name || '',
              },
            },
            category: product.category,
          }));
          setProducts(transformedProducts);
        }

        if (outletsRes.ok) {
          const data = await outletsRes.json();
          const mapped = (data.data?.outlets || []).map((o: any) => ({ id: o.id, name: o.name }));
          setOutlets(mapped);
        }
      } catch (error) {
        console.error('Error loading data for order creation:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const handleSubmit = async (orderData: OrderInput) => {
    try {
      setSubmitting(true);
      const response = await authenticatedFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to create order');
      }
      router.push('/orders');
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

  return (
    <PageWrapper>
      <PageContent>
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-600">Đang tải dữ liệu...</CardContent>
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
            merchantId={merchantId}
          />
        )}
      </PageContent>
    </PageWrapper>
  );
}



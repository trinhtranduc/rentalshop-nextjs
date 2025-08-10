'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardWrapper, Card, CardContent, Button } from '@rentalshop/ui';
import { OrderForm } from '@rentalshop/ui';
import type { CustomerSearchResult, ProductWithStock, OrderInput } from '@rentalshop/database';
import { authenticatedFetch } from '@rentalshop/utils';
import { useAuth } from '../../../hooks/useAuth';

export default function CreateOrderPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [customers, setCustomers] = useState<CustomerSearchResult[]>([]);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);

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
          // The API already returns outletStock with outlet info; cast to expected type
          setProducts((data.data?.products || []) as ProductWithStock[]);
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
    <DashboardWrapper user={user} onLogout={logout} currentPath="/orders/create">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Tạo đơn hàng</h1>
          <Button variant="outline" onClick={() => router.push('/orders')}>Quay lại danh sách</Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-600">Đang tải dữ liệu...</CardContent>
          </Card>
        ) : (
          <OrderForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            customers={customers}
            products={products}
            outlets={outlets}
            loading={submitting}
            layout="split"
          />
        )}
      </div>
    </DashboardWrapper>
  );
}



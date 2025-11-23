'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  Button,
  PageWrapper,
  useToast,
  FormSkeleton,
  Breadcrumb
} from '@rentalshop/ui';
import type { BreadcrumbItem } from '@rentalshop/ui';
import { CreateOrderForm } from '@rentalshop/ui';
import { ProductAddDialog } from '@rentalshop/ui';
import { AddCategoryDialog } from '@rentalshop/ui';
import { AddCustomerDialog } from '@rentalshop/ui';
import { ReceiptPreviewModal } from '@rentalshop/ui';
import type { CustomerSearchResult, ProductWithStock, OrderInput, Category, Order } from '@rentalshop/types';
import { 
  customersApi, 
  productsApi, 
  outletsApi, 
  ordersApi,
  categoriesApi
} from '@rentalshop/utils';
import { useAuth, useOrderTranslations, useCommonTranslations, useDashboardTranslations } from '@rentalshop/hooks';
import { Package, Tag, Users, ArrowUpRight, PackageCheck } from 'lucide-react';

export default function CreateOrderPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const t = useOrderTranslations();
  const tc = useCommonTranslations();
  const td = useDashboardTranslations();

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [customers, setCustomers] = useState<CustomerSearchResult[]>([]);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [outlets, setOutlets] = useState<Array<{ id: number; name: string; merchantId?: number }>>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [resetForm, setResetForm] = useState<(() => void) | null>(null);
  
  // Quick action dialogs state
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  
  // Receipt preview state
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Toast notifications
  const { toastSuccess, toastError, removeToast } = useToast();

  // Get merchant ID from user context
  const merchantId = user?.merchant?.id;

  useEffect(() => {
    if (!merchantId) return; // Don't fetch without merchant ID
    
    const fetchAll = async () => {
      try {
        setLoading(true);

        console.log('🔍 Fetching data for merchant ID:', merchantId);

        const [customersRes, productsRes, outletsRes, categoriesRes] = await Promise.all([
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
          categoriesApi.searchCategories({ merchantId: Number(merchantId) }),
        ]);

        if (customersRes.success) {
          // searchCustomers returns { success: true, data: { customers: [...] } }
          setCustomers(customersRes.data?.customers || []);
          console.log('✅ Loaded customers:', customersRes.data?.customers?.length || 0);
        } else {
          console.error('Failed to fetch customers:', customersRes.error);
          toastError(tc('labels.error'), tc('messages.errorLoadingData'));
        }

        if (productsRes.success) {
          // searchProducts returns { success: true, data: [...] } or { success: true, data: { products: [...] } }
          const productsData = (productsRes.data as any)?.products || productsRes.data || [];
          setProducts(Array.isArray(productsData) ? productsData : []);
          console.log('✅ Loaded products:', Array.isArray(productsData) ? productsData.length : 0);
        } else {
          console.error('Failed to fetch products:', productsRes.error);
          toastError(tc('labels.error'), tc('messages.errorLoadingData'));
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

        if (categoriesRes.success) {
          // searchCategories returns { success: true, data: { categories: [...] } }
          const categoriesData = (categoriesRes.data as any)?.categories || categoriesRes.data || [];
          setCategories(Array.isArray(categoriesData) ? categoriesData : []);
          console.log('✅ Loaded categories:', Array.isArray(categoriesData) ? categoriesData.length : 0);
        } else {
          console.error('Failed to fetch categories:', categoriesRes.error);
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
      if (result.success && result.data) {
        // Show success message
        toastSuccess(t('messages.createSuccess'));
        // Store created order and show receipt preview
        setCreatedOrder(result.data as Order);
        setShowReceiptPreview(true);
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (err) {
      console.error('Create order failed:', err);
      toastError(t('messages.createFailed'), (err as Error).message || t('messages.createFailed'));
    } finally{
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/orders');
  };

  const handleFormReady = (resetFormFn: () => void) => {
    setResetForm(() => resetFormFn);
  };

  // Quick action handlers
  const handleProductCreated = async (productData: any) => {
    try {
      const result = await productsApi.createProduct(productData);
      if (result.success) {
        toastSuccess(tc('labels.success'), 'Product created successfully');
        // Refresh products list
        const productsRes = await productsApi.searchProducts({ 
          merchantId: Number(merchantId), 
          isActive: true, 
          limit: 100 
        });
        if (productsRes.success) {
          setProducts((productsRes.data as any)?.products || productsRes.data || []);
        }
      } else {
        throw new Error(result.error || 'Failed to create product');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      toastError(tc('labels.error'), (error as Error).message || 'Failed to create product');
      throw error;
    }
  };

  const handleCategoryCreated = async (categoryData: Category) => {
    try {
      const result = await categoriesApi.createCategory(categoryData);
      if (result.success) {
        toastSuccess(tc('labels.success'), 'Category created successfully');
        // Refresh categories list
        const categoriesRes = await categoriesApi.searchCategories({ merchantId: Number(merchantId) });
        if (categoriesRes.success) {
          const categoriesData = (categoriesRes.data as any)?.categories || categoriesRes.data || [];
          setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        }
      } else {
        throw new Error(result.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      toastError(tc('labels.error'), (error as Error).message || 'Failed to create category');
      throw error;
    }
  };

  const handleCustomerCreated = async (customer: any) => {
    try {
      // AddCustomerDialog passes Customer object, but we need CustomerCreateInput for API
      // If it's already a Customer (has id), we don't need to create again
      if (customer.id) {
        // Customer already created, just refresh the list
        toastSuccess(tc('labels.success'), 'Customer created successfully');
        const customersRes = await customersApi.searchCustomers({ 
          merchantId: Number(merchantId), 
          isActive: true, 
          limit: 50 
        });
        if (customersRes.success) {
          setCustomers(customersRes.data?.customers || []);
        }
        return;
      }
      
      // Otherwise, create the customer
      const result = await customersApi.createCustomer(customer);
      if (result.success) {
        toastSuccess(tc('labels.success'), 'Customer created successfully');
        // Refresh customers list
        const customersRes = await customersApi.searchCustomers({ 
          merchantId: Number(merchantId), 
          isActive: true, 
          limit: 50 
        });
        if (customersRes.success) {
          setCustomers(customersRes.data?.customers || []);
        }
      } else {
        throw new Error(result.error || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      toastError(tc('labels.error'), (error as Error).message || 'Failed to create customer');
      throw error;
    }
  };

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: t('title'), href: '/orders' },
    { label: t('createOrder') }
  ];

  if (!merchantId) {
    return (
      <PageWrapper>
        <Breadcrumb items={breadcrumbItems} showHome={false} className="mb-6" />
        <Card>
          <CardContent className="p-8 text-center text-gray-600">
            <div className="mb-4">{tc('labels.error')}</div>
            <div className="text-sm text-gray-500">{tc('messages.sessionExpired')}</div>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* Breadcrumb - At top */}
      <div className="px-6 py-3">
        <Breadcrumb items={breadcrumbItems} showHome={false} />
      </div>
      
      {/* Main Content */}
      <div className="w-full">
        {loading ? (
          <div className="p-6">
            <FormSkeleton />
          </div>
        ) : (
          <>
            <div className="space-y-6 px-6">
          <CreateOrderForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            customers={customers}
            products={products}
            outlets={outlets}
            loading={submitting}
                layout="split"
            merchantId={Number(merchantId)}
            onFormReady={handleFormReady}
          />
              
              {/* Quick Actions - Similar to Dashboard */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h2 className="text-lg font-semibold mb-4 text-gray-900">{td('quickActions.title')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-3 p-4 h-auto bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-lg transition-colors duration-200 group justify-start"
                    onClick={() => setShowProductDialog(true)}
                  >
                    <PackageCheck className="w-5 h-5 text-gray-700" />
                    <div className="text-left flex-1">
                      <p className="font-semibold text-sm text-gray-900">{td('quickActions.addProduct')}</p>
                      <p className="text-xs text-gray-600 font-normal">{tc('labels.create')}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="flex items-center gap-3 p-4 h-auto bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-lg transition-colors duration-200 group justify-start"
                    onClick={() => setShowCategoryDialog(true)}
                  >
                    <Tag className="w-5 h-5 text-gray-700" />
                    <div className="text-left flex-1">
                      <p className="font-semibold text-sm text-gray-900">{td('quickActions.addCategory')}</p>
                      <p className="text-xs text-gray-600 font-normal">{tc('labels.create')}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="flex items-center gap-3 p-4 h-auto bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-lg transition-colors duration-200 group justify-start"
                    onClick={() => setShowCustomerDialog(true)}
                  >
                    <Users className="w-5 h-5 text-gray-700" />
                    <div className="text-left flex-1">
                      <p className="font-semibold text-sm text-gray-900">{td('quickActions.addCustomer')}</p>
                      <p className="text-xs text-gray-600 font-normal">{tc('labels.create')}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Action Dialogs */}
            <ProductAddDialog
              open={showProductDialog}
              onOpenChange={setShowProductDialog}
              categories={categories}
              outlets={outlets.map((o: any) => ({ 
                id: o.id, 
                name: o.name, 
                merchantId: o.merchantId,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
              }))}
              merchantId={String(merchantId)}
              onProductCreated={handleProductCreated}
              onError={(error: string) => toastError(tc('labels.error'), error)}
            />

            <AddCategoryDialog
              open={showCategoryDialog}
              onOpenChange={setShowCategoryDialog}
              onCategoryCreated={handleCategoryCreated}
              onError={(error: string) => toastError(tc('labels.error'), error)}
            />

            <AddCustomerDialog
              open={showCustomerDialog}
              onOpenChange={setShowCustomerDialog}
              onCustomerCreated={handleCustomerCreated}
              onError={(error: string) => toastError(tc('labels.error'), error)}
            />

            {/* Receipt Preview Modal */}
            <ReceiptPreviewModal
              isOpen={showReceiptPreview}
              onClose={() => {
                setShowReceiptPreview(false);
                setCreatedOrder(null);
                // Navigate to orders list after closing receipt
                router.push('/orders');
              }}
              order={createdOrder}
              outlet={createdOrder?.outletId ? outlets.find(o => o.id === createdOrder?.outletId) as any : null}
              merchant={user?.merchant || null}
            />
          </>
        )}
      </div>
    </div>
  );
}



'use client';

// Disable prerendering to avoid module resolution issues
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, 
  Button,
  Breadcrumb,
  ProductsLoading,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  ConfirmationDialog,
  useToast } from '@rentalshop/ui';
import type { BreadcrumbItem } from '@rentalshop/ui';
import { productBreadcrumbs } from '@rentalshop/utils';
import { ProductDetail } from '@rentalshop/ui';

import { Edit, ArrowLeft, Package, BarChart3, Trash2 } from 'lucide-react';
import { useAuth, useProductTranslations, useCommonTranslations } from '@rentalshop/hooks';
import { canManageProducts } from '@rentalshop/auth';
import { 
  productsApi, 
  categoriesApi, 
  outletsApi
} from '@rentalshop/utils';
import type { ProductWithStock, Category, Outlet } from '@rentalshop/types';

export default function ProductViewPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { toastSuccess, toastError, removeToast } = useToast();
  const t = useProductTranslations();
  const tc = useCommonTranslations();
  
  const [product, setProduct] = useState<ProductWithStock | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const productId = parseInt(params.id as string);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch product details
        const productResponse = await productsApi.getProductById(productId);
        if (productResponse.data) {
          setProduct(productResponse.data);
        }

        // Fetch categories and outlets for the form
        const [categoriesData, outletsData] = await Promise.all([
          categoriesApi.getCategories(),
          outletsApi.getOutlets()
        ]);
        
        if (categoriesData.success) {
          setCategories(categoriesData.data || []);
        }
        if (outletsData.success) {
          setOutlets(outletsData.data?.outlets || []);
        }

      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch product');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchData();
    }
  }, [productId]);

  const handleEdit = () => {
    router.push(`/products/${productId}/edit`);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await productsApi.deleteProduct(productId);
      toastSuccess(tc('messages.deleteSuccess'), t('messages.deleteSuccess'));
      router.push('/products');
    } catch (err) {
      console.error('Error deleting product:', err);
      toastError(tc('labels.error'), t('messages.deleteFailed'));
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleViewOrders = () => {
    // Navigate to product orders page
    router.push(`/products/${productId}/orders`);
  };

  const handleBack = () => {
    router.push('/products');
  };

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>{t('productDetails')}</PageTitle>
        </PageHeader>
        <PageContent>
          <ProductsLoading />
        </PageContent>
      </PageWrapper>
    );
  }

  if (error || !product) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>{t('productDetails')}</PageTitle>
        </PageHeader>
        <PageContent>
          <Card>
            <div className="p-6 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('messages.noProducts')}</h3>
              <p className="text-muted-foreground mb-4">
                {error || t('messages.noProducts')}
              </p>
              <div className="flex justify-center space-x-2">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {tc('buttons.back')}
                </Button>
              </div>
            </div>
          </Card>
        </PageContent>
      </PageWrapper>
    );
  }

  // Breadcrumb items - inline
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: t('title'), href: '/products' },
    { label: product.name }
  ];

  return (
    <PageWrapper>
      <Breadcrumb items={breadcrumbItems} showHome={false} homeHref="/" className="mb-4" />
      <PageHeader>
        <div className="flex items-center justify-between">
          <div>
            <PageTitle>{product.name}</PageTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleViewOrders}>
              <BarChart3 className="h-4 w-4 mr-2" />
              {t('actions.viewOrders')}
            </Button>
            <Button onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              {t('editProduct')}
            </Button>
            {user && canManageProducts(user) && (
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('actions.delete')}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </PageHeader>
      <PageContent>
        <ProductDetail
          product={product}
          onEdit={handleEdit}
          showActions={true} // Show actions to display create/update times and total stock
          isMerchantAccount={true} // Show merchant features
          className="max-w-7xl mx-auto"
        />
      </PageContent>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        type="danger"
        title={t('actions.delete')}
        description={t('messages.confirmDelete')}
        confirmText={t('actions.delete')}
        cancelText="Cancel"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />

    </PageWrapper>
  );
}

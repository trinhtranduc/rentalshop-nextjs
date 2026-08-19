'use client'

import React, { useState, useEffect } from 'react';
import {
  Button
} from '@rentalshop/ui';
import { useToast } from '@rentalshop/ui';
import { useProductTranslations, useCommonTranslations, usePermissions } from '@rentalshop/hooks';
import { Save, Loader2, ScanSearch } from 'lucide-react';
import { ProductForm } from '../../../forms/ProductForm';
import { productsApi } from '@rentalshop/utils';
import type { ProductInput, ProductWithStock, Outlet, Category } from '@rentalshop/types';

interface ProductEditFormProps {
  product: ProductWithStock;
  categories: Category[];
  outlets: Outlet[];
  merchantId: number;
  onSave: (data: ProductInput, files?: File[]) => Promise<void>; // Updated to support files
  onCancel: () => void;
  onBack?: () => void;
  useMultipartUpload?: boolean; // New prop to enable multipart upload
}

export const ProductEdit: React.FC<ProductEditFormProps> = ({
  product,
  categories,
  outlets,
  merchantId,
  onSave,
  onCancel,
  onBack,
  useMultipartUpload = false
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingEmbeddings, setIsSyncingEmbeddings] = useState(false);
  const [imageSearchQueued, setImageSearchQueued] = useState(false);
  const { toastSuccess, toastError } = useToast();
  const t = useProductTranslations();
  const tc = useCommonTranslations();
  const { hasPermission } = usePermissions();
  const canManageProducts = hasPermission('products.manage'); // Cost + rent/sale on edit require products.manage

  // Debug: Log product data structure and props
  useEffect(() => {
    console.log('🔍 ProductEdit - product data:', product);
    console.log('🔍 ProductEdit - product.category:', product.category);
    console.log('🔍 ProductEdit - product.outletStock:', product.outletStock);
    console.log('🔍 ProductEdit - outlets:', outlets);
    console.log('🔍 ProductEdit - onSave type:', typeof onSave);
    console.log('🔍 ProductEdit - onSave:', onSave);
    console.log('🔍 ProductEdit - onCancel type:', typeof onCancel);
    console.log('🔍 ProductEdit - merchantId:', merchantId);
  }, [product, outlets, onSave, onCancel, merchantId]);

  // Transform product data to form format
  const initialFormData = {
    name: product.name,
    description: product.description || '',
    barcode: product.barcode || '',
    categoryId: product.category?.id || product.categoryId,
    rentPrice: product.rentPrice,
    salePrice: (product as any).salePrice || 0, // Use actual salePrice if available, default to 0
    // Only include costPrice if user has products.manage permission
    ...(canManageProducts ? { costPrice: (product as any).costPrice || 0 } : { costPrice: 0 }),
    deposit: product.deposit,
    totalStock: (() => {
      // Calculate total stock from all outlets (including those with 0 stock)
      const total = outlets.reduce((sum, outlet) => {
        const existingStock = product.outletStock.find(os => os.outlet?.id === outlet.id)?.stock || 0;
        return sum + existingStock;
      }, 0);
      console.log('🔍 ProductEdit - calculated totalStock:', total, 'from all outlets:', outlets.length);
      return total;
    })(),
    images: (() => {
      console.log('🔍 ProductEdit - product.images:', product.images);
      console.log('🔍 ProductEdit - typeof product.images:', typeof product.images);
      console.log('🔍 ProductEdit - Array.isArray(product.images):', Array.isArray(product.images));
      return Array.isArray(product.images) ? product.images : []; // Ensure images is always an array
    })(),
    isActive: product.isActive,
    outletStock: (() => {
      console.log('🔍 ProductEdit - product.outletStock:', product.outletStock);
      console.log('🔍 ProductEdit - available outlets:', outlets);
      
      // Create a map of existing outlet stock for quick lookup
      const existingStockMap = new Map();
      product.outletStock.forEach(os => {
        const outletId = os.outlet?.id || 0;
        if (outletId > 0) {
          existingStockMap.set(outletId, os.stock || 0);
        }
      });
      
      // Create outlet stock entries for ALL outlets
      const allOutletStock = outlets.map(outlet => {
        const existingStock = existingStockMap.get(outlet.id) || 0;
        const mapped = {
          outletId: outlet.id,
          stock: existingStock
        };
        console.log(`🔍 ProductEdit - outlet ${outlet.name} (ID: ${outlet.id}): existing stock = ${existingStock}`);
        return mapped;
      });
      
      console.log('🔍 ProductEdit - final mapped outletStock (all outlets):', allOutletStock);
      return allOutletStock;
    })(),
    sku: product.barcode || ''
  };

  const handleSubmit = async (data: ProductInput, files?: File[]) => {
    setIsSubmitting(true);

    try {
      if (typeof onSave !== 'function') {
        throw new Error('onSave function is not provided or invalid');
      }
      // Pass files when using multipart upload
      if (useMultipartUpload && files) {
        await onSave(data, files);
      } else {
        await onSave(data);
      }
      // Parent component will handle success toast
    } catch (err) {
      console.error('❌ ProductEdit: Error in handleSubmit:', err);
      toastError(t('messages.updateFailed'), err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting || isSyncingEmbeddings) return;
    onCancel();
  };

  const handleSyncEmbeddings = async () => {
    if (isSubmitting || isSyncingEmbeddings) return;
    setIsSyncingEmbeddings(true);
    try {
      const response = await productsApi.syncProductEmbeddings(product.id);
      if (response.success) {
        setImageSearchQueued(true);
        toastSuccess(
          'Image search',
          'Indexing started. Search this product in a few minutes after the job finishes.'
        );
      } else {
        toastError(
          'Could not sync image search',
          response.message || 'Add at least one photo, then try again.'
        );
      }
    } catch (err) {
      toastError(
        'Could not sync image search',
        err instanceof Error ? err.message : 'Try again in a moment.'
      );
    } finally {
      setIsSyncingEmbeddings(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Product Form */}
      <ProductForm
        initialData={initialFormData}
        categories={categories}
        outlets={outlets}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={isSubmitting}
        mode="edit"
        merchantId={merchantId}
        hideHeader={true}
        hideSubmitButton={true}
        formId="product-form"
        useMultipartUpload={useMultipartUpload}
      />

      {canManageProducts && (
        <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5">
          <ScanSearch className="h-3.5 w-3.5 shrink-0 text-blue-700" />
          <span className="text-xs font-medium text-slate-800">
            {t('imageSearch.section')}
          </span>
          <span
            className={
              imageSearchQueued || isSyncingEmbeddings
                ? 'ml-auto rounded-full bg-blue-700/10 px-2 py-0.5 text-[11px] font-semibold text-blue-700'
                : product.embeddingGeneratedAt
                  ? 'ml-auto rounded-full bg-emerald-700/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-800'
                  : 'ml-auto rounded-full bg-slate-500/10 px-2 py-0.5 text-[11px] font-semibold text-slate-600'
            }
          >
            {imageSearchQueued || isSyncingEmbeddings
              ? t('imageSearch.updating')
              : product.embeddingGeneratedAt
                ? t('imageSearch.indexed')
                : t('imageSearch.notIndexed')}
          </span>
          {isSyncingEmbeddings ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-700" />
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSyncEmbeddings}
              disabled={isSubmitting}
              className="h-7 shrink-0 px-2 text-xs font-semibold text-blue-700 hover:text-blue-800"
            >
              {t('imageSearch.update')}
            </Button>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-3 mt-6 pt-4 border-t">
        <Button variant="outline" onClick={handleCancel} disabled={isSubmitting || isSyncingEmbeddings}>
          {tc('buttons.cancel')}
        </Button>
        <Button 
          type="submit" 
          form="product-form" 
          disabled={isSubmitting || isSyncingEmbeddings}
          className="min-w-[120px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('messages.updating')}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {t('messages.updateProduct')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

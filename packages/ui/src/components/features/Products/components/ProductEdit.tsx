'use client'

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button
} from '@rentalshop/ui';
import { useToast } from '@rentalshop/ui';
import { useProductTranslations, useCommonTranslations } from '@rentalshop/hooks';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { ProductForm } from '../../../forms/ProductForm';
import type { ProductInput, ProductWithStock, Outlet, Category } from '@rentalshop/types';

interface ProductEditFormProps {
  product: ProductWithStock;
  categories: Category[];
  outlets: Outlet[];
  merchantId: number;
  onSave: (data: ProductInput) => Promise<void>;
  onCancel: () => void;
  onBack?: () => void;
}

export const ProductEdit: React.FC<ProductEditFormProps> = ({
  product,
  categories,
  outlets,
  merchantId,
  onSave,
  onCancel,
  onBack
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toastSuccess, toastError } = useToast();
  const t = useProductTranslations();
  const tc = useCommonTranslations();

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

  const handleSubmit = async (data: ProductInput) => {
    setIsSubmitting(true);

    try {
      if (typeof onSave !== 'function') {
        throw new Error('onSave function is not provided or invalid');
      }
      await onSave(data);
      // Parent component will handle success toast
    } catch (err) {
      console.error('❌ ProductEdit: Error in handleSubmit:', err);
      toastError(t('messages.updateFailed'), err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting) return; // Prevent cancellation while submitting
    onCancel();
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
      />

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
          {tc('buttons.cancel')}
        </Button>
        <Button 
          type="submit" 
          form="product-form" 
          disabled={isSubmitting}
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

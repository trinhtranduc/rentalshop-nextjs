'use client'

import React, { useState } from 'react';
import { Button } from '../../../ui';
import { Plus, Loader2, AlertCircle } from 'lucide-react';
import { ProductForm } from '../../../forms/ProductForm';
import { useToast } from '@rentalshop/ui';
import { useProductTranslations, useCommonTranslations } from '@rentalshop/hooks';
import type { Category, Outlet, ProductCreateInput } from '@rentalshop/types';

interface ProductAddFormProps {
  categories: Category[];
  outlets: Outlet[];
  merchantId: string;
  onSave: (data: ProductCreateInput, files?: File[]) => Promise<void>; // Updated to support files
  onCancel: () => void;
  onBack?: () => void;
  useMultipartUpload?: boolean; // New prop to enable multipart upload
}

export const ProductAddForm: React.FC<ProductAddFormProps> = ({
  categories,
  outlets,
  merchantId,
  onSave,
  onCancel,
  onBack,
  useMultipartUpload = false
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toastError } = useToast();
  const t = useProductTranslations();
  const tc = useCommonTranslations();

  // Safety check: Ensure outlets is always an array
  const safeOutlets = Array.isArray(outlets) ? outlets : [];

  const handleSubmit = async (data: any, files?: File[]) => {
    setIsSubmitting(true);

    try {
      // Transform ProductInput to ProductCreateInput format
      const transformedData: ProductCreateInput = {
        name: data.name,
        description: data.description,
        barcode: data.barcode,
        categoryId: data.categoryId,
        rentPrice: data.rentPrice,
        salePrice: data.salePrice,
        deposit: data.deposit,
        totalStock: data.totalStock,
        images: useMultipartUpload ? [] : (Array.isArray(data.images) ? data.images.join(',') : (data.images || '')),
        outletStock: data.outletStock,
      };
      
      if (useMultipartUpload && files) {
        await onSave(transformedData, files);
      } else {
        await onSave(transformedData);
      }
      
      // Parent component will handle success toast
      
      // Reset form after successful creation
      // The form will be reset by the parent component
    } catch (err) {
      console.error('❌ ProductAddForm: Error in handleSubmit:', err);
      toastError(t('messages.createFailed'), err instanceof Error ? err.message : t('messages.createFailed'));
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
            categories={categories}
            outlets={safeOutlets}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={isSubmitting}
            mode="create"
            merchantId={merchantId}
            hideHeader={true}
            hideSubmitButton={true}
            formId="product-form"
            useMultipartUpload={useMultipartUpload}
            submitText={isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Product
              </>
            )}
          />
      {/* Action Buttons */}
      <div className="space-y-4">
        {/* Warning message when no outlets */}
        {safeOutlets.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">{t('inventory.needOutletMessage')}</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  {t('inventory.contactAdmin')}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Info message when only 1 outlet (default outlet) */}
        {safeOutlets.length === 1 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center">
              <div className="text-sm text-blue-700">
                <span className="font-medium">Outlet mặc định:</span> {safeOutlets[0].name}. Sản phẩm sẽ tự động được phân bổ cho outlet này.
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            {tc('buttons.cancel')}
          </Button>
          <Button 
            type="submit" 
            form="product-form" 
            disabled={isSubmitting || safeOutlets.length === 0}
            className="min-w-[120px]"
            title={safeOutlets.length === 0 ? t('inventory.needOutletMessage') : undefined}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {tc('buttons.creating')}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                {t('createProduct')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

'use client'

import React, { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Button
} from '@rentalshop/ui/base';
import { ArrowLeft, Plus, Loader2, AlertCircle } from 'lucide-react';
import { ProductForm } from '../../../forms/ProductForm';
import { useToast } from '@rentalshop/ui/base';
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
  const { toastSuccess, toastError } = useToast();
  const t = useProductTranslations();
  const tc = useCommonTranslations();

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
            outlets={outlets}
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
        {outlets.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">{t('messages.noOutletsAvailable')}</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  {t('messages.needOutletFirst')}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            {tc('buttons.cancel')}
          </Button>
          <Button 
            type="submit" 
            form="product-form" 
            disabled={isSubmitting || outlets.length === 0}
            className="min-w-[120px]"
            title={outlets.length === 0 ? t('messages.needOutletFirst') : undefined}
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

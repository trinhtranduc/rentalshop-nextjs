'use client'

import React, { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Button
} from '../../../ui';
import { ArrowLeft, Plus, Loader2, AlertCircle } from 'lucide-react';
import { ProductForm } from '../../../forms/ProductForm';
import { useToasts } from '../../../ui/toast';
import type { Category, Outlet, ProductCreateInput } from '@rentalshop/types';

interface ProductAddFormProps {
  categories: Category[];
  outlets: Outlet[];
  merchantId: string;
  onSave: (data: ProductCreateInput) => Promise<void>;
  onCancel: () => void;
  onBack?: () => void;
}

export const ProductAddForm: React.FC<ProductAddFormProps> = ({
  categories,
  outlets,
  merchantId,
  onSave,
  onCancel,
  onBack
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showSuccess, showError } = useToasts();

  const handleSubmit = async (data: any) => {
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
        images: data.images || '',
        outletStock: data.outletStock,
      };
      await onSave(transformedData);
      showSuccess('Product Created', 'Product created successfully!');
      
      // Reset form after successful creation
      // The form will be reset by the parent component
    } catch (err) {
      console.error('❌ ProductAddForm: Error in handleSubmit:', err);
      showError('Creation Failed', err instanceof Error ? err.message : 'Failed to create product');
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
                <h4 className="text-sm font-medium text-yellow-800">No Outlets Available</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  You need to create at least one outlet before you can add products. Please contact your administrator.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="product-form" 
            disabled={isSubmitting || outlets.length === 0}
            className="min-w-[120px]"
            title={outlets.length === 0 ? 'No outlets available. Please set up outlets first.' : undefined}
          >
            {isSubmitting ? (
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
          </Button>
        </div>
      </div>
    </div>
  );
};

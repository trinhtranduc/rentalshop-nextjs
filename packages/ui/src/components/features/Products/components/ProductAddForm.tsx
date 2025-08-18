'use client'

import React, { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Button
} from '../../../ui';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { ProductForm } from '../../../forms/ProductForm';
import { useToasts } from '../../../ui/toast';
import type { ProductInput } from '@rentalshop/database';
import type { Category, Outlet } from '../types';

interface ProductAddFormProps {
  categories: Category[];
  outlets: Outlet[];
  merchantId: string;
  onSave: (data: ProductInput) => Promise<void>;
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

  const handleSubmit = async (data: ProductInput) => {
    setIsSubmitting(true);

    try {
      await onSave(data);
      showSuccess('Product Created', 'Product created successfully!');
      
      // Reset form after successful creation
      // The form will be reset by the parent component
    } catch (err) {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">Add New Product</h1>
            <p className="text-muted-foreground">
              Create a new product with pricing, stock, and category information
            </p>
          </div>
        </div>
      </div>





      {/* Product Form */}
      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            categories={categories}
            outlets={outlets}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={isSubmitting}
            mode="create"
            merchantId={merchantId}
            hideHeader={true}
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
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
          Cancel
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
  );
};

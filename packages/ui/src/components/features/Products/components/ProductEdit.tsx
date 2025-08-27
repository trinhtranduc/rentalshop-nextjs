'use client'

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button
} from '../../../ui';
import { useToasts } from '../../../ui/toast';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { ProductForm } from '../../../forms/ProductForm';
import type { ProductInput } from '@rentalshop/types';
import type { ProductWithStock, Outlet } from '@rentalshop/types';

interface ProductEditFormProps {
  product: ProductWithStock;
  categories: Array<{ id: number; name: string; isActive?: boolean }>;
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
  const { showSuccess, showError } = useToasts();

  // Transform product data to form format
  const initialFormData = {
    name: product.name,
    description: product.description || '',
    barcode: product.barcode || '',
    categoryId: product.categoryId,
    rentPrice: product.rentPrice,
    salePrice: 0, // ProductWithStock doesn't have salePrice
    deposit: product.deposit,
    totalStock: product.stock, // Use stock instead of totalStock
    images: (() => {
      console.log('🔍 ProductEdit - product.images:', product.images);
      console.log('🔍 ProductEdit - typeof product.images:', typeof product.images);
      console.log('🔍 ProductEdit - Array.isArray(product.images):', Array.isArray(product.images));
      return Array.isArray(product.images) ? product.images : []; // Ensure images is always an array
    })(),
    isActive: product.isActive,
    outletStock: (() => {
      console.log('🔍 ProductEdit - product.outletStock:', product.outletStock);
      return product.outletStock.map(os => {
        console.log('🔍 ProductEdit - outletStock item:', os);
        return {
          outletId: os.outlet?.id || os.id || 0, // Use outlet.id if available, fallback to os.id or 0
          stock: os.stock || 0
        };
      }).filter(os => os.outletId > 0); // Filter out invalid outlet entries
    })(),
    sku: product.barcode || ''
  };

  const handleSubmit = async (data: ProductInput) => {
    setIsSubmitting(true);

    try {
      await onSave(data);
      showSuccess('Success', 'Product updated successfully!');
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to update product');
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
            <h1 className="text-2xl font-bold">Edit Product</h1>
            <p className="text-muted-foreground">
              Update product information and inventory levels
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
              Updating...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Update Product
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

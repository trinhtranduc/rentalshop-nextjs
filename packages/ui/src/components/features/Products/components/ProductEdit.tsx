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
  const { showSuccess, showError } = useToasts();

  // Debug: Log product data structure
  useEffect(() => {
    console.log('🔍 ProductEdit - product data:', product);
    console.log('🔍 ProductEdit - product.category:', product.category);
    console.log('🔍 ProductEdit - product.outletStock:', product.outletStock);
    console.log('🔍 ProductEdit - outlets:', outlets);
  }, [product, outlets]);

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
          <div>
            <h1 className="text-2xl font-bold">Edit Product</h1>
            <p className="text-muted-foreground">
              Update product information and inventory levels
            </p>
          </div>
        </div>
      </div>



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
      />

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

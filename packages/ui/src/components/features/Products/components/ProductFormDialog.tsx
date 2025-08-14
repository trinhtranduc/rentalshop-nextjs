'use client'

import React, { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Card,
  CardContent
} from '@rentalshop/ui';
import { Loader2, X } from 'lucide-react';
import { ProductForm } from '../../../forms/ProductForm';
import type { ProductInput, ProductUpdateInput } from '@rentalshop/database';
import type { ProductWithDetails, Category, Outlet } from '../types';

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductWithDetails | null; // null for create, ProductWithDetails for edit
  categories: Category[];
  outlets: Outlet[];
  merchantId: string;
  onSuccess?: (product: ProductWithDetails) => void;
  onError?: (error: string) => void;
}

export const ProductFormDialog: React.FC<ProductFormDialogProps> = ({
  open,
  onOpenChange,
  product,
  categories,
  outlets,
  merchantId,
  onSuccess,
  onError
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isEditMode = !!product;
  const title = isEditMode ? 'Edit Product' : 'Add New Product';
  const description = isEditMode 
    ? 'Update product information and inventory levels.'
    : 'Create a new product with pricing, stock, and category information.';

  // Reset states when dialog opens/closes
  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(null);
    }
  }, [open]);

  const handleSubmit = async (data: ProductInput) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const endpoint = isEditMode 
        ? `${apiUrl}/api/products?productId=${product!.id}`
        : `${apiUrl}/api/products`;

      const method = isEditMode ? 'PUT' : 'POST';
      
      // Transform form data to API format
      const apiData = {
        ...data,
        images: Array.isArray(data.images) ? data.images.join(',') : data.images,
        outletStock: data.outletStock?.map(os => ({
          outletId: os.outletId,
          stock: os.stock
        }))
      };

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(apiData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Failed to ${isEditMode ? 'update' : 'create'} product`);
      }

      setSuccess(`Product ${isEditMode ? 'updated' : 'created'} successfully!`);
      
      // Call success callback
      if (onSuccess && result.data) {
        onSuccess(result.data);
      }

      // Close dialog after a short delay
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  // Transform product data for form if editing
  const getInitialData = () => {
    if (!product) return {};

    return {
      name: product.name,
      description: product.description || '',
      barcode: product.barcode || '',
      categoryId: product.categoryId,
      rentPrice: product.rentPrice,
      salePrice: product.salePrice || 0,
      deposit: product.deposit,
      totalStock: product.totalStock,
      images: product.images ? product.images.split(',').filter(Boolean) : [],
      isActive: product.isActive,
      outletStock: product.outletStock.map(os => ({
        outletId: os.outletId,
        stock: os.stock
      })),
      sku: ''
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div>
            <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-1">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="mt-6">
          {/* Error Alert */}
          {error && (
            <Card className="mb-4 border-red-200 bg-red-50">
              <CardContent className="p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Success Alert */}
          {success && (
            <Card className="mb-4 border-green-200 bg-green-50">
              <CardContent className="p-4">
                <p className="text-green-800 text-sm">{success}</p>
              </CardContent>
            </Card>
          )}

          {/* Product Form */}
          <ProductForm
            initialData={getInitialData()}
            categories={categories}
            outlets={outlets}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={isSubmitting}
            title=""
            submitText={isSubmitting ? 
              (isEditMode ? 'Updating...' : 'Creating...') : 
              (isEditMode ? 'Update Product' : 'Create Product')
            }
            mode={isEditMode ? 'edit' : 'create'}
            merchantId={merchantId}
            hideHeader={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

import React, { useState } from 'react';
import { Card } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { cn } from '../../../../lib/cn';

import type { ProductWithDetails, Category, Outlet } from '@rentalshop/types';

export interface ProductCardProps {
  id: string;
  name: string;
  description?: string;
  stock: number;
  renting: number;
  available: number;
  rentPrice: number;
  salePrice?: number;
  deposit: number;
  images: string[];
  category: {
    name: string;
  };
  outlet: {
    name: string;
  };
  onRent?: (productId: string) => void;
  onView?: (productId: string) => void;
  onEdit?: (productId: string) => void;
  onDelete?: (productId: string) => void;
  variant?: 'client' | 'admin' | 'mobile';
  className?: string;
  // New props for enhanced functionality
  categories?: Category[];
  outlets?: Outlet[];
  merchantId?: string;
  onProductUpdated?: (product: ProductWithDetails) => void;
  onError?: (error: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  description,
  stock,
  renting,
  available,
  rentPrice,
  salePrice,
  deposit,
  images,
  category,
  outlet,
  onRent,
  onView,
  onEdit,
  onDelete,
  variant = 'client',
  className,
  // New props
  categories = [],
  outlets = [],
  merchantId = '',
  onProductUpdated,
  onError
}) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const mainImage = images?.[0] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBDMTE2LjU2OSA3MCAxMzAgODMuNDMxIDMwIDEwMEMxMzAgMTE2LjU2OSAxMTYuNTY5IDEzMCAxMDAgMTMwQzgzLjQzMSAxMzAgNzAgMTE2LjU2OSA3MCAxMEM3MCA4My40MzEgODMuNDMxIDcwIDEwMCA3MFoiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTEwMCAxMTVDMTA4LjI4NCAxMTUgMTE1IDEwOC4yODQgMTE1IDEwMEMxMTUgOTEuNzE2IDEwOC4yODQgODUgMTAwIDg1QzkxLjcxNiA4NSA4NSA5MS43MTYgODUgMTAwQzg1IDEwOC4yODQgOTEuNzE2IDExNSAxMDAgMTE1WiIgZmlsbD0iI0E5Q0JCRiIvPgo8L3N2Zz4K';
  const isAvailable = available > 0;

  // Enhanced edit handler that opens the dialog
  const handleEdit = () => {
    if (categories.length > 0 && outlets.length > 0 && merchantId) {
      setIsEditDialogOpen(true);
    } else if (onEdit) {
      // Fallback to original onEdit if enhanced props not provided
      onEdit(id);
    }
  };

  // Transform current product data to ProductWithDetails format for editing
  const getProductForEdit = (): ProductWithDetails => ({
    id,
    name,
    description: description || '',
    barcode: '',
    categoryId: '', // This would need to be passed from parent
    rentPrice,
    salePrice,
    deposit,
    totalStock: stock,
    images: images.join(','),
    isActive: true,
    outletStock: [{
      outletId: '', // This would need to be passed from parent
      stock,
      available,
      renting
    }],
    category: { id: '', name: category.name },
    merchant: { id: merchantId, name: '' },
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const handleSuccess = (updatedProduct: ProductWithDetails) => {
    onProductUpdated?.(updatedProduct);
    setIsEditDialogOpen(false);
  };

  const handleError = (error: string) => {
    onError?.(error);
  };

  return (
    <>
      <Card className={cn('overflow-hidden transition-all hover:shadow-lg', className)}>
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <img
            src={mainImage}
            alt={name}
            className="h-full w-full object-cover transition-transform hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBDMTE2LjU2OSA3MCAxMzAgODMuNDMxIDMwIDEwMEMxMzAgMTE2LjU2OSAxMTYuNTY5IDEzMCAxMDAgMTMwQzgzLjQzMSAxMzAgNzAgMTE2LjU2OSA3MCAxMEM3MCA4My40MzEgODMuNDMxIDcwIDEwMCA3MFoiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTEwMCAxMTVDMTA4LjI4NCAxMTUgMTE1IDEwOC4yODQgMTE1IDEwMEMxMTUgOTEuNzE2IDEwOC4yODQgODUgMTAwIDg1QzkxLjcxNiA4NSA4NSA5MS43MTYgODUgMTAwQzg1IDEwOC4yODQgOTEuNzE2IDExNSAxMDAgMTE1WiIgZmlsbD0iI0E5Q0JCRiIvPgo8L3N2Zz4K';
            }}
          />
          {!isAvailable && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-semibold text-lg">Out of Stock</span>
            </div>
          )}
          <div className="absolute top-2 left-2">
            <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              {category.name}
            </span>
          </div>
          {variant === 'admin' && (
            <div className="absolute top-2 right-2 flex gap-1">
              {onEdit && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleEdit}
                  className="h-8 w-8 p-0"
                >
                  ✏️
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(id)}
                  className="h-8 w-8 p-0"
                >
                  🗑️
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4">
          <div className="mb-2">
            <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">{name}</h3>
            <p className="text-sm text-gray-500">{outlet.name}</p>
          </div>

          {description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{description}</p>
          )}

          {/* Stock Information */}
          <div className="mb-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Stock:</span>
              <span className="font-medium">{stock}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Currently Rented:</span>
              <span className="font-medium text-orange-600">{renting}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Available:</span>
              <span className={cn('font-medium', isAvailable ? 'text-green-600' : 'text-red-600')}>
                {available}
              </span>
            </div>
          </div>

          {/* Pricing */}
          <div className="mb-4 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Rent Price:</span>
              <span className="font-semibold text-lg text-blue-600">
                ${rentPrice.toFixed(2)}/day
              </span>
            </div>
            {salePrice && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Sale Price:</span>
                <span className="font-semibold text-green-600">
                  ${salePrice.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Deposit:</span>
              <span className="font-medium text-gray-700">
                ${deposit.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {variant === 'client' && (
              <>
                {onView && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onView(id)}
                    className="flex-1"
                  >
                    View Details
                  </Button>
                )}
                {onRent && isAvailable && (
                  <Button
                    size="sm"
                    onClick={() => onRent(id)}
                    className="flex-1"
                    disabled={!isAvailable}
                  >
                    Rent Now
                  </Button>
                )}
              </>
            )}

            {variant === 'mobile' && (
              <>
                {onView && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onView(id)}
                    className="flex-1"
                  >
                    Details
                  </Button>
                )}
                {onRent && isAvailable && (
                  <Button
                    size="sm"
                    onClick={() => onRent(id)}
                    className="flex-1"
                    disabled={!isAvailable}
                  >
                    Rent
                  </Button>
                )}
              </>
            )}

            {variant === 'admin' && (
              <>
                {onView && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onView(id)}
                    className="flex-1"
                  >
                    View
                  </Button>
                )}
                {onEdit && (
                  <Button
                    size="sm"
                    onClick={handleEdit}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </Card>


    </>
  );
}; 
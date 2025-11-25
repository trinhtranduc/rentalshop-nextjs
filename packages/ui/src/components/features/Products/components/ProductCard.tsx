'use client';

import React, { useState } from 'react';
import { Card } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { cn } from '../../../../lib/cn';
import { Eye, Edit, Package } from 'lucide-react';
import { getProductImageUrl } from '@rentalshop/utils';
import { useTranslations } from 'next-intl';
import { getRentalPriceLabel, formatRentalPrice } from '../utils';
import { formatCurrency } from '../../../../lib';

import type { ProductWithDetails, Category, Outlet } from '@rentalshop/types';
import type { PricingType } from '@rentalshop/constants';

export interface ProductCardProps {
  id: number;
  name: string;
  description?: string;
  stock: number;
  renting: number;
  available: number;
  rentPrice: number;
  salePrice?: number;
  deposit: number;
  images: string[] | string;
  category: {
    name: string;
  };
  outlet: {
    name: string;
  };
  pricingType?: PricingType | null;
  onRent?: (productId: number) => void;
  onView?: (productId: number) => void;
  onEdit?: (productId: number) => void;
  onDelete?: (productId: number) => void;
  variant?: 'client' | 'admin' | 'mobile';
  className?: string;
  // New props for enhanced functionality
  categories?: Category[];
  outlets?: Outlet[];
  merchantId?: number;
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
  pricingType,
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
  const t = useTranslations('products');
  
  // Normalize images to check if we have any
  const normalizeImages = (images: string[] | string | null | undefined): string[] => {
    if (!images) return [];
    if (Array.isArray(images)) return images.filter(Boolean);
    if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : images.split(',').filter(Boolean);
      } catch {
        return images.split(',').filter(Boolean);
      }
    }
    return [];
  };

  const imageArray = normalizeImages(images);
  
  // Use utility function to get proper image URL from S3 or placeholder
  const productData = {
    id,
    name,
    images: images
  };
  const mainImage = getProductImageUrl(productData as any);
  const hasImages = imageArray.length > 0 && mainImage && mainImage.trim() !== '';
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
  const getProductForEdit = (): ProductWithDetails => {
    const normalizedImages = Array.isArray(images) ? images : (typeof images === 'string' ? [images] : []);
    const normalizedMerchantId = typeof merchantId === 'number' ? merchantId : (typeof merchantId === 'string' ? parseInt(merchantId) || 0 : 0);
    
    return {
    id,
    name,
    description: description || '',
    barcode: '',
      merchantId: normalizedMerchantId,
    categoryId: 0, // This would need to be passed from parent
    rentPrice,
    salePrice,
    deposit,
      stock,
      renting,
      available,
      images: normalizedImages,
    isActive: true,
    outletStock: [{
      id: 0, // This would need to be passed from parent
      outletId: 0, // This would need to be passed from parent
      stock,
      available,
      renting,
        outlet: { id: 0, name: outlet.name, merchantId: normalizedMerchantId }
    }],
    category: { id: 0, name: category.name },
      merchant: { id: normalizedMerchantId, name: '' },
    createdAt: new Date(),
    updatedAt: new Date()
    };
  };

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
          {hasImages ? (
            <img
              src={mainImage}
              alt={name}
              className="h-full w-full object-cover transition-transform hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          {/* Placeholder - shown when no images or image fails */}
          <div className={`${hasImages ? 'hidden' : ''} h-full w-full flex items-center justify-center bg-gray-100`}>
            <Package className="w-16 h-16 text-gray-400" />
          </div>
          {!isAvailable && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-semibold text-lg">{t('status.outOfStock')}</span>
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
              <span className="text-gray-600">{t('inventory.totalStock')}:</span>
              <span className="font-medium">{stock}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('fields.renting')}:</span>
              <span className="font-medium text-orange-600">{renting}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('fields.available')}:</span>
              <span className={cn('font-medium', isAvailable ? 'text-green-600' : 'text-red-600')}>
                {available}
              </span>
            </div>
          </div>

          {/* Pricing */}
          <div className="mb-4 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{getRentalPriceLabel(pricingType, t)}:</span>
              <span className="font-semibold text-lg text-blue-700">
                {formatRentalPrice(rentPrice, pricingType, t, formatCurrency)}
              </span>
            </div>
            {salePrice && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t('fields.salePrice')}:</span>
                <span className="font-semibold text-green-600">
                  ${salePrice.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('fields.deposit')}:</span>
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
                    {t('actions.viewDetails')}
                  </Button>
                )}
                {onRent && isAvailable && (
                  <Button
                    size="sm"
                    onClick={() => onRent(id)}
                    className="flex-1"
                    disabled={!isAvailable}
                  >
                    {t('rentNow')}
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
                    {t('details')}
                  </Button>
                )}
                {onRent && isAvailable && (
                  <Button
                    size="sm"
                    onClick={() => onRent(id)}
                    className="flex-1"
                    disabled={!isAvailable}
                  >
                    {t('rent')}
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
                    {t('actions.view')}
                  </Button>
                )}
                {onEdit && (
                  <Button
                    size="sm"
                    onClick={handleEdit}
                    className="flex-1"
                  >
                    {t('actions.edit')}
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
'use client'

import React, { useState } from 'react';
import { useProductTranslations, useCommonTranslations } from '@rentalshop/hooks';
import { Package, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../../ui';
import type { ProductWithStock } from '@rentalshop/types';
import { formatDate } from '../../../../lib';
import { getRentalPriceLabel, formatRentalPrice } from '../utils';
import { useFormatCurrency } from '@rentalshop/ui';

interface ProductDetailListProps {
  product: ProductWithStock;
  onEdit?: () => void;
  onViewOrders?: () => void;
  showActions?: boolean;
  isMerchantAccount?: boolean;
  className?: string;
}

export const ProductDetailList: React.FC<ProductDetailListProps> = ({
  product,
  onEdit,
  onViewOrders,
  showActions = true,
  isMerchantAccount = false,
  className = ''
}) => {
  const t = useProductTranslations();
  const formatCurrency = useFormatCurrency();
  const tc = useCommonTranslations();
  const [showOutletDetails, setShowOutletDetails] = useState(false);

  // Helper function to normalize images array
  const normalizeImages = (images: string | string[] | null | undefined): string[] => {
    if (!images) return [];
    
    try {
      if (Array.isArray(images)) {
        return images.filter(Boolean);
      } else if (typeof images === 'string') {
        // Try to parse as JSON first, then fallback to comma-separated
        try {
          const parsed = JSON.parse(images);
          return Array.isArray(parsed) ? parsed.filter(Boolean) : images.split(',').filter(Boolean);
        } catch {
          return images.split(',').filter(Boolean);
        }
      }
      return [];
    } catch {
      return [];
    }
  };

  const imageArray = normalizeImages(product.images);


  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
  };

  const totalAvailable = product.outletStock.reduce((sum, os) => sum + os.available, 0);
  const totalRenting = product.outletStock.reduce((sum, os) => sum + os.renting, 0);
  const totalStock = product.outletStock.reduce((sum, os) => sum + os.stock, 0);



  return (
    <div className={`space-y-4 ${className}`}>
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t('fields.name')}</label>
          <p className="text-base font-semibold">{product.name}</p>
        </div>
        {product.barcode && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t('fields.barcode')}</label>
            <p className="text-base">{product.barcode}</p>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">{tc('labels.category')}</label>
          <p className="text-base">{product.category?.name || 'Uncategorized'}</p>
        </div>
        {product.merchant && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">{tc('labels.merchant')}</label>
            <p className="text-base">{product.merchant.name}</p>
            </div>
        )}
            {product.description && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t('fields.description')}</label>
            <p className="text-base whitespace-pre-wrap">{product.description}</p>
              </div>
            )}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">{tc('labels.createdAt')}</label>
          <p className="text-base">{formatDate(product.createdAt)}</p>
        </div>
              <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">{tc('labels.updatedAt')}</label>
          <p className="text-base">{formatDate(product.updatedAt)}</p>
              </div>
            </div>
            
      {/* Pricing Information */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">{t('pricing.title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t('fields.rentPrice')}</label>
            <p className="text-base font-semibold">
              {formatRentalPrice(product.rentPrice, product.pricingType, t, formatCurrency)}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">{getRentalPriceLabel(product.pricingType, t)}</p>
            </div>
            {product.salePrice && product.salePrice > 0 && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t('fields.salePrice')}</label>
              <p className="text-base font-semibold text-action-success">
                  {formatCurrency(product.salePrice)}
              </p>
              </div>
            )}
          {product.costPrice && product.costPrice > 0 && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t('fields.costPrice')}</label>
              <p className="text-base font-semibold text-muted-foreground">
                {formatCurrency(product.costPrice)}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t('fields.deposit')}</label>
            <p className="text-base font-semibold">
                {formatCurrency(product.deposit)}
            </p>
          </div>
        </div>
      </div>

      {/* Stock Information */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">{t('inventory.stockSummary')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t('inventory.totalStock')}</label>
            <p className="text-base font-semibold">{totalStock}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t('inventory.availableStock')}</label>
            <p className="text-base font-semibold text-action-success">{totalAvailable}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t('fields.renting')}</label>
            <p className="text-base font-semibold text-action-info">{totalRenting}</p>
          </div>
        </div>
      </div>

      {/* Outlet Stock Details (Merchant Only) */}
      {isMerchantAccount && product.outletStock && product.outletStock.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground">{t('inventory.outletStockDistribution')}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOutletDetails(!showOutletDetails)}
              className="h-auto p-1 text-sm text-muted-foreground hover:text-text-primary"
            >
              {showOutletDetails ? (
                <>
                  <span className="mr-1">{tc('buttons.hideDetails') || 'Hide Details'}</span>
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span className="mr-1">{tc('buttons.viewMoreDetails') || 'View More Details'}</span>
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          {showOutletDetails && (
            <div className="space-y-4">
              {product.outletStock.map((outletStock, index) => (
                <div key={outletStock.outlet?.id || outletStock.id || index} className={`${index > 0 ? 'border-t pt-4' : ''}`}>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      {outletStock.outlet?.name || 'Unknown Outlet'}
                    </label>
                    {outletStock.outlet?.address && (
                      <p className="text-sm text-muted-foreground">{outletStock.outlet.address}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1.5">{tc('labels.total')}</label>
                      <p className="text-base font-semibold">{outletStock.stock}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t('fields.available')}</label>
                      <p className="text-base font-semibold text-action-info">{outletStock.available}</p>
                      </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t('fields.renting')}</label>
                      <p className="text-base font-semibold text-action-success">{outletStock.renting}</p>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            )}
        </div>
      )}

      {/* Product Images */}
      {imageArray.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">{t('fields.images')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {imageArray.map((image: string, index: number) => (
                  <div
                    key={index}
                className="aspect-square rounded-lg overflow-hidden border-2 border-border hover:border-border-hover transition-all hover:scale-105"
                  >
                    <div className="relative w-full h-full">
                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) {
                        fallback.classList.remove('hidden');
                        fallback.classList.add('flex');
                      }
                        }}
                      />
                      {/* Fallback placeholder for this image */}
                  <div className="hidden absolute inset-0 w-full h-full bg-bg-secondary items-center justify-center">
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </div>
                </div>
            </div>
            ))}
          </div>
        </div>
      )}


    </div>
  );
};

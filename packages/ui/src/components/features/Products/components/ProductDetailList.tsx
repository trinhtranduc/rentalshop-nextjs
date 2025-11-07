'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  Badge 
} from '@rentalshop/ui/base';
import { useProductTranslations, useCommonTranslations } from '@rentalshop/hooks';
import { getProductImageUrl } from '@rentalshop/utils';
import { 
  Package, 
  DollarSign, 
  Edit, 
  Eye, 
  Image,
  Info,
  Store,
  Zap,
  Copy,
  Share,
  Clock,
  User,
  Tag,
  Calendar,
  MapPin,
  BarChart3,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import type { ProductWithStock } from '@rentalshop/types';
import { formatCurrency, formatDate } from '../../../../lib';

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
  const router = useRouter();
  const t = useProductTranslations();
  const tc = useCommonTranslations();

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
    <div className={`space-y-6 ${className}`}>
      {/* Product Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Product Title */}
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">{product.name}</h1>
            
            {/* Basic Info */}
            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
              <span>ID: {product.id}</span>
              {product.barcode && <span>{t('fields.barcode')}: {product.barcode}</span>}
              <span>{tc('labels.category')}: {product.category?.name || 'Uncategorized'}</span>
            </div>
            
            {/* Description */}
            {product.description && (
              <div className="mb-6">
                <p className="text-gray-700">{product.description}</p>
              </div>
            )}
            
            {/* Additional Info */}
            <div className="grid grid-cols-1 gap-4 text-sm mb-4">
              <div>
                <span className="text-gray-500">{tc('labels.merchant')}:</span>
                <span className="ml-2 text-gray-900">{product.merchant?.name || 'Unknown'}</span>
              </div>
            </div>
            
            {/* Product Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div>
                <span className="text-gray-500">{tc('labels.createdAt')}:</span>
                <span className="ml-2 text-gray-900">{formatDate(product.createdAt)}</span>
              </div>
              <div>
                <span className="text-gray-500">{tc('labels.updatedAt')}:</span>
                <span className="ml-2 text-gray-900">{formatDate(product.updatedAt)}</span>
              </div>
            </div>
            
            {/* Stock Information */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">{t('inventory.stockSummary')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{totalStock}</div>
                  <div className="text-sm text-gray-600">{t('inventory.totalStock')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{totalAvailable}</div>
                  <div className="text-sm text-gray-600">{t('inventory.availableStock')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{totalRenting}</div>
                  <div className="text-sm text-gray-600">{t('fields.renting')}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Pricing */}
          <div className="ml-8 text-right">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {formatCurrency(product.rentPrice)}
            </div>
            <div className="text-sm text-gray-600 mb-1">{t('fields.rentPrice')}</div>
            
            {product.salePrice && product.salePrice > 0 && (
              <div className="mt-3">
                <div className="text-base font-medium text-green-600">
                  {formatCurrency(product.salePrice)}
                </div>
                <div className="text-sm text-gray-600">{t('fields.salePrice')}</div>
              </div>
            )}
            
            <div className="mt-3">
              <div className="text-lg font-medium text-gray-900">
                {formatCurrency(product.deposit)}
              </div>
              <div className="text-sm text-gray-600">{t('fields.deposit')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Outlet Stock Details (Merchant Only) */}
      {isMerchantAccount && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t('inventory.outletStockDistribution')}</h2>
            <p className="text-sm text-gray-600 mt-1">{t('inventory.stockAllocation')}</p>
          </div>
          
          <div className="p-6">
            {product.outletStock && product.outletStock.length > 0 ? (
              product.outletStock.map((outletStock, index) => (
              <div key={outletStock.outlet?.id || outletStock.id || index} className={`${index > 0 ? 'border-t border-gray-100 pt-6 mt-6' : ''}`}>
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {outletStock.outlet?.name || 'Unknown Outlet'}
                      </h3>
                      {outletStock.outlet?.address ? (
                        <p className="text-sm text-gray-600 mt-1">{outletStock.outlet.address}</p>
                      ) : (
                        <p className="text-sm text-gray-400 mt-1 italic">No address available</p>
                      )}
                    </div>
                    
                    {/* Stock metrics on the same line */}
                    <div className="flex items-center space-x-10">
                      <div className="text-center min-w-[60px]">
                        <div className="text-lg font-bold text-gray-900">{outletStock.stock}</div>
                        <div className="text-xs text-gray-600">{tc('labels.total')}</div>
                      </div>
                      
                      <div className="text-center min-w-[60px]">
                        <div className="text-lg font-bold text-blue-700">{outletStock.available}</div>
                        <div className="text-xs text-blue-700">{t('fields.available')}</div>
                      </div>
                      
                      <div className="text-center min-w-[60px]">
                        <div className="text-lg font-bold text-green-600">{outletStock.renting}</div>
                        <div className="text-xs text-green-600">{t('fields.renting')}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )))
            : (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-2">{t('inventory.noOutletStock')}</div>
                <div className="text-sm text-gray-400">{t('inventory.notAssignedToOutlets')}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Images - Show all images in detail view */}
      {imageArray.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-4 py-2 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t('fields.images')}</h2>
          </div>
          
          <div className="p-3">
            {/* Image Grid - Responsive grid layout */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {imageArray.length > 0 ? (
                imageArray.map((image: string, index: number) => (
                  <div
                    key={index}
                    className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-gray-300 transition-all hover:scale-105"
                  >
                    <div className="relative w-full h-full">
                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      {/* Fallback placeholder for this image */}
                      <div className="hidden absolute inset-0 w-full h-full bg-gray-100 flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full flex items-center justify-center h-32 text-gray-500">
                  <span>No images available</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

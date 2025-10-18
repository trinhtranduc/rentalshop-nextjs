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
} from '../../../ui';
import { useProductTranslations, useCommonTranslations } from '@rentalshop/hooks';
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
  const [selectedImage, setSelectedImage] = useState<string | null>(
    product.images && product.images.length > 0 ? product.images[0] : null
  );


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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">{tc('labels.createdAt')}:</span>
                <span className="ml-2 text-gray-900">{formatDate(product.createdAt)}</span>
              </div>
              <div>
                <span className="text-gray-500">{tc('labels.updatedAt')}:</span>
                <span className="ml-2 text-gray-900">{formatDate(product.updatedAt)}</span>
              </div>
              <div>
                <span className="text-gray-500">{t('inventory.totalStock')}:</span>
                <span className="ml-2 text-gray-900">{totalStock}</span>
              </div>
              <div>
                <span className="text-gray-500">{t('inventory.availableStock')}:</span>
                <span className="ml-2 text-gray-900">{totalAvailable}</span>
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

      {/* Product Images */}
      {product.images && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-4 py-2 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t('fields.images')}</h2>
          </div>
          
          <div className="p-3">
            {/* Image List - Horizontal */}
            <div className="flex gap-2 overflow-x-auto">
              {(() => {
                try {
                  const imageArray = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                  if (Array.isArray(imageArray) && imageArray.length > 0) {
                    return imageArray.map((image: string, index: number) => (
                      <div
                        key={index}
                        onClick={() => setSelectedImage(image)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 cursor-pointer transition-all hover:scale-105 ${
                          selectedImage === image
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${product.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={handleImageError}
                        />
                      </div>
                    ));
                  }
                  return null;
                } catch (error) {
                  return null;
                }
              })()}
            </div>
            
            {/* Selected Image Preview - Only show if there are multiple images */}
            {selectedImage && (() => {
              try {
                const imageArray = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                return Array.isArray(imageArray) && imageArray.length > 1;
              } catch {
                return false;
              }
            })() && (
              <div className="mt-2">
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={selectedImage}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  );
};

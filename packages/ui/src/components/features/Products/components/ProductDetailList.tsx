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
              {product.barcode && <span>Barcode: {product.barcode}</span>}
              <span>Category: {product.category?.name || 'Uncategorized'}</span>
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
                <span className="text-gray-500">Merchant:</span>
                <span className="ml-2 text-gray-900">{product.merchant?.name || 'Unknown'}</span>
              </div>
            </div>
            
            {/* Product Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Created:</span>
                <span className="ml-2 text-gray-900">{formatDate(product.createdAt)}</span>
              </div>
              <div>
                <span className="text-gray-500">Updated:</span>
                <span className="ml-2 text-gray-900">{formatDate(product.updatedAt)}</span>
              </div>
              <div>
                <span className="text-gray-500">Total Outlet Stock:</span>
                <span className="ml-2 text-gray-900">{totalStock}</span>
              </div>
              <div>
                <span className="text-gray-500">Total Available:</span>
                <span className="ml-2 text-gray-900">{totalAvailable}</span>
              </div>
            </div>
          </div>
          
          {/* Pricing */}
          <div className="ml-8 text-right">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {formatCurrency(product.rentPrice)}
            </div>
            <div className="text-sm text-gray-600 mb-1">Rent Price</div>
            
            {product.salePrice && product.salePrice > 0 && (
              <div className="mt-3">
                <div className="text-base font-medium text-green-600">
                  {formatCurrency(product.salePrice)}
                </div>
                <div className="text-sm text-gray-600">Sale Price</div>
              </div>
            )}
            
            <div className="mt-3">
              <div className="text-lg font-medium text-gray-900">
                {formatCurrency(product.deposit)}
              </div>
              <div className="text-sm text-gray-600">Deposit</div>
            </div>
          </div>
        </div>
      </div>

      {/* Outlet Stock Details (Merchant Only) */}
      {isMerchantAccount && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Outlet Stock Distribution</h2>
            <p className="text-sm text-gray-600 mt-1">Stock allocation across different outlets</p>
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
                        <div className="text-xs text-gray-600">Total</div>
                      </div>
                      
                      <div className="text-center min-w-[60px]">
                        <div className="text-lg font-bold text-blue-600">{outletStock.available}</div>
                        <div className="text-xs text-blue-600">Available</div>
                      </div>
                      
                      <div className="text-center min-w-[60px]">
                        <div className="text-lg font-bold text-green-600">{outletStock.renting}</div>
                        <div className="text-xs text-green-600">Renting</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )))
            : (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-2">No outlet stock information available</div>
                <div className="text-sm text-gray-400">This product may not be assigned to any outlets yet.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Images */}
      {product.images && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Images</h2>
          </div>
          
          <div className="p-6">
            {/* Main Image */}
            {selectedImage && (
              <div className="mb-6">
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
            
            {/* Thumbnails */}
            <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
              {(() => {
                try {
                  const imageArray = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                  if (Array.isArray(imageArray) && imageArray.length > 0) {
                    return imageArray.map((image: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(image)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                          selectedImage === image
                            ? 'border-blue-500'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${product.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={handleImageError}
                        />
                      </button>
                    ));
                  }
                  return null;
                } catch (error) {
                  return null;
                }
              })()}
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

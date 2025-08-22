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
import type { ProductWithDetails } from '@rentalshop/types';
import { formatCurrency, formatDate } from '../../../../lib';

interface ProductDetailListProps {
  product: ProductWithDetails;
  onEdit?: () => void;
  showActions?: boolean;
  isMerchantAccount?: boolean;
  className?: string;
}

export const ProductDetailList: React.FC<ProductDetailListProps> = ({
  product,
  onEdit,
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
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <Badge variant={product.isActive ? "default" : "secondary"}>
                {product.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
              <span>ID: {product.id}</span>
              {product.barcode && <span>Barcode: {product.barcode}</span>}
              <span>Category: {product.category?.name || 'Uncategorized'}</span>
            </div>
            
            {/* Description */}
            {product.description && (
              <div className="mb-4">
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>
            )}
            
            {/* Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Merchant: </span>
                <span className="text-gray-900 font-medium">{product.merchant?.name || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-gray-600">Created: </span>
                <span className="text-gray-900 font-medium">{formatDate(product.createdAt)}</span>
              </div>
              <div>
                <span className="text-gray-600">Last Updated: </span>
                <span className="text-gray-900 font-medium">{formatDate(product.updatedAt)}</span>
              </div>
            </div>
          </div>
          <div className="text-right ml-6">
            <div className="text-4xl font-bold text-primary mb-1">
              {formatCurrency(product.rentPrice)}
            </div>
            <div className="text-sm text-gray-600 mb-3">per day</div>
            <div className="text-lg font-semibold text-green-600 mb-4">
              {formatCurrency(product.deposit)} deposit
            </div>
          </div>
        </div>
      </div>

      {/* Outlet Stock Details (Merchant Only) */}
      {isMerchantAccount && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Store className="h-5 w-5 mr-2 text-indigo-600" />
              Outlet Stock Details
            </h2>
          </div>
          
          <div className="divide-y divide-gray-100">
            {product.outletStock.map((outletStock, index) => (
              <div key={outletStock.outletId} className="px-6 py-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                    <span className="font-semibold text-lg text-gray-900">Outlet {outletStock.outletId}</span>
                    <Badge variant={outletStock.available > 0 ? "default" : "secondary"}>
                      {outletStock.available > 0 ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </div>
                  
                  {/* Availability Rate */}
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">Availability</div>
                    <div className="text-lg font-bold text-indigo-600">
                      {outletStock.stock > 0 ? Math.round((outletStock.available / outletStock.stock) * 100) : 0}%
                    </div>
                  </div>
                </div>
                
                {/* Stock Metrics */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">{outletStock.stock}</div>
                    <div className="text-sm text-gray-600">Total Stock</div>
                    <div className="w-8 h-1 bg-gray-200 rounded-full mx-auto mt-2">
                      <div className="w-full h-1 bg-gray-400 rounded-full"></div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">{outletStock.available}</div>
                    <div className="text-sm text-blue-600">Available</div>
                    <div className="w-8 h-1 bg-blue-200 rounded-full mx-auto mt-2">
                      <div className="w-full h-1 bg-blue-400 rounded-full"></div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">{outletStock.renting}</div>
                    <div className="text-sm text-green-600">Renting</div>
                    <div className="w-8 h-1 bg-green-200 rounded-full mx-auto mt-2">
                      <div className="w-full h-1 bg-green-400 rounded-full"></div>
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Stock Utilization</span>
                    <span className="text-gray-900 font-medium">
                      {outletStock.renting} / {outletStock.stock} items
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${outletStock.stock > 0 ? (outletStock.renting / outletStock.stock) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Images List */}
      {product.images && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Image className="h-5 w-5 mr-2 text-amber-600" />
              Product Images
            </h2>
          </div>
          <div className="p-6">
            {/* Main Image */}
            {selectedImage && (
              <div className="mb-4">
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
            
            {/* Thumbnail Grid */}
            <div className="grid grid-cols-6 gap-2">
              {(() => {
                try {
                  const imageArray = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                  if (Array.isArray(imageArray) && imageArray.length > 0) {
                    return imageArray.map((image: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(image)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                          selectedImage === image
                            ? 'border-primary ring-2 ring-primary/20'
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

      {/* Bottom Action Bar */}
      {showActions && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Last updated: {formatDate(product.updatedAt)}
              </span>
              <span className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                Product ID: {product.id}
              </span>
              <span className="flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Stock: {totalStock} | Available: {totalAvailable} | Rented: {totalRenting}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              {onEdit && (
                <Button onClick={onEdit} size="sm" className="bg-primary hover:bg-primary/90 text-white">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

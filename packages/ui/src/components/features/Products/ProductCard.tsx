'use client'

import React, { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Badge,
  Button,
  formatCurrency
} from '@rentalshop/ui';
import { Edit, Package, DollarSign, Warehouse, Tag, Eye } from 'lucide-react';
import { ProductDialog } from './ProductDialog';
import type { ProductWithDetails, Category, Outlet } from './types';

interface ProductCardProps {
  product: ProductWithDetails;
  categories: Category[];
  outlets: Outlet[];
  merchantId: string;
  onProductUpdated?: (product: ProductWithDetails) => void;
  onError?: (error: string) => void;
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  categories,
  outlets,
  merchantId,
  onProductUpdated,
  onError,
  variant = 'default',
  showActions = true,
  className = ''
}) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsEditDialogOpen(false);
  };

  const handleSuccess = (updatedProduct: ProductWithDetails) => {
    onProductUpdated?.(updatedProduct);
    setIsEditDialogOpen(false);
  };

  const handleError = (error: string) => {
    onError?.(error);
  };

  const getAvailabilityColor = (available: number, total: number) => {
    const ratio = available / total;
    if (ratio === 0) return 'destructive';
    if (ratio < 0.2) return 'secondary';
    return 'default';
  };

  const getAvailabilityText = (available: number, total: number) => {
    if (available === 0) return 'Out of Stock';
    if (available < total * 0.2) return 'Low Stock';
    return 'In Stock';
  };

  const renderCompactCard = () => (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
              <p className="text-sm text-gray-500">{product.category.name}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="font-semibold text-gray-900">
              {formatCurrency(product.rentPrice)}/day
            </div>
            <Badge 
              variant={getAvailabilityColor(product.outletStock[0]?.available || 0, product.totalStock)}
              className="text-xs"
            >
              {getAvailabilityText(product.outletStock[0]?.available || 0, product.totalStock)}
            </Badge>
          </div>
        </div>

        {showActions && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderDetailedCard = () => (
    <Card className={`hover:shadow-lg transition-shadow ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
              <Package className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {product.name}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {product.category.name}
                </Badge>
                {product.barcode && (
                  <Badge variant="secondary" className="text-xs font-mono">
                    {product.barcode}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(product.rentPrice)}
            </div>
            <div className="text-sm text-gray-500">per day</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {product.description && (
          <p className="text-gray-600 text-sm leading-relaxed">
            {product.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {formatCurrency(product.deposit)}
              </div>
              <div className="text-xs text-gray-500">Deposit</div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Warehouse className="h-4 w-4 text-orange-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {product.totalStock}
              </div>
              <div className="text-xs text-gray-500">Total Stock</div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Availability</span>
            <Badge 
              variant={getAvailabilityColor(product.outletStock[0]?.available || 0, product.totalStock)}
            >
              {getAvailabilityText(product.outletStock[0]?.available || 0, product.totalStock)}
            </Badge>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${((product.outletStock[0]?.available || 0) / product.totalStock) * 100}%` 
              }}
            />
          </div>
          
          <div className="text-xs text-gray-500 text-center">
            {product.outletStock[0]?.available || 0} of {product.totalStock} available
          </div>
        </div>

        {showActions && (
          <div className="flex space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className="flex-1"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Product
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderDefaultCard = () => (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base font-medium">{product.name}</CardTitle>
          </div>
          <Badge 
            variant={getAvailabilityColor(product.outletStock[0]?.available || 0, product.totalStock)}
          >
            {getAvailabilityText(product.outletStock[0]?.available || 0, product.totalStock)}
          </Badge>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span className="flex items-center">
            <Tag className="h-4 w-4 mr-1" />
            {product.category.name}
          </span>
          <span className="flex items-center">
            <DollarSign className="h-4 w-4 mr-1" />
            {formatCurrency(product.rentPrice)}/day
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Stock: {product.outletStock[0]?.available || 0}/{product.totalStock}
          </div>
          
          {showActions && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="text-blue-600 hover:text-blue-700"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      {variant === 'compact' && renderCompactCard()}
      {variant === 'detailed' && renderDetailedCard()}
      {variant === 'default' && renderDefaultCard()}
      
      <ProductDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        product={product}
        categories={categories}
        outlets={outlets}
        merchantId={merchantId}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </>
  );
};

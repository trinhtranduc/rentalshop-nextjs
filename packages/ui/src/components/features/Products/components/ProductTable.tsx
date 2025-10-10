import React from 'react';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';
import { Product } from '@rentalshop/types';
import { Eye, Edit, ShoppingCart, Trash2 } from 'lucide-react';

interface ProductTableProps {
  products: Product[];
  onProductAction: (action: string, productId: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}



export function ProductTable({ 
  products, 
  onProductAction, 
  sortBy = 'name', 
  sortOrder = 'asc',
  onSort 
}: ProductTableProps) {
  if (products.length === 0) {
    return (
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium mb-2">No products found</h3>
            <p className="text-sm">
              Try adjusting your filters or add some products to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getProductImage = (product: Product) => {
    // Use the first image if available, otherwise show a placeholder
    const mainImage = product.images && product.images.length > 0 ? product.images[0] : null;
    
    if (mainImage) {
      return (
        <img
          src={mainImage}
          alt={product.name}
          className="w-16 h-16 object-cover rounded-lg border border-gray-200 shadow-sm"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
      );
    }
    
    // Placeholder when no image is available
    return (
      <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center shadow-sm">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-0">
      {/* Card-style rows without top/bottom padding */}
      <div className="grid gap-0">
        {products.map((product) => (
          <Card 
            key={product.id} 
            className="hover:shadow-md transition-shadow duration-200 border-gray-200 dark:border-gray-700 rounded-none border-t-0 border-l-0 border-r-0 border-b"
          >
            <CardContent className="px-6 py-0">
              <div className="flex items-center justify-between py-4">
                {/* Left side - Main info */}
                <div className="flex items-center gap-3 flex-1">
                  {/* Product Image */}
                  <div className="relative">
                    {getProductImage(product)}
                  </div>
                  
                  {/* Product Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        {product.name}
                      </h3>
                      {product.barcode && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {product.barcode}
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
                      {/* Category */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Category</p>
                        <p className="text-gray-900 dark:text-white capitalize">{product.categoryId}</p>
                      </div>
                      
                      {/* Rent Price */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Rent Price</p>
                        <p className="text-gray-900 dark:text-white font-medium">{formatCurrency(product.rentPrice)}</p>
                        {product.deposit > 0 && (
                          <p className="text-gray-500 dark:text-gray-400 text-xs">
                            Deposit: {formatCurrency(product.deposit)}
                          </p>
                        )}
                      </div>
                      
                      {/* Sale Price */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Sale Price</p>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {(product as any).salePrice ? formatCurrency((product as any).salePrice) : 'N/A'}
                        </p>
                      </div>
                      
                      {/* Stock */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Stock</p>
                        <p className="text-gray-900 dark:text-white font-medium">{product.available}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">
                          {product.renting} renting
                        </p>
                      </div>
                      
                      {/* Created Date */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Created</p>
                        <p className="text-gray-900 dark:text-white">
                          {product.createdAt ? formatDate(product.createdAt.toString()) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right side - Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onProductAction('view', product.id)}
                    className="h-8 px-3"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onProductAction('view-orders', product.id)}
                    className="h-8 px-3"
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Orders
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onProductAction('edit', product.id)}
                    className="h-8 px-3"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onProductAction('delete', product.id)}
                    className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

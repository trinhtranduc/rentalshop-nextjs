'use client';

import React from 'react';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Card, CardContent } from '../../../ui/card';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../ui/dropdown-menu';
import { useFormatCurrency } from '@rentalshop/ui';
import { useProductTranslations } from '@rentalshop/hooks';
import { Product } from '@rentalshop/types';
import { getProductImageUrl } from '@rentalshop/utils/client';
import { Eye, Edit, ShoppingCart, MoreVertical, Package, Percent } from 'lucide-react';

interface SearchResult extends Product {
  similarity: number;
}

interface SearchResultsTableProps {
  products: SearchResult[];
  onProductAction: (action: string, productId: number) => void;
  onAddToCart?: (product: Product) => void;
  onViewProduct?: (product: Product) => void;
  onEditProduct?: (product: Product) => void;
}

export function SearchResultsTable({ 
  products, 
  onProductAction,
  onAddToCart,
  onViewProduct,
  onEditProduct
}: SearchResultsTableProps) {
  const formatMoney = useFormatCurrency();
  const t = useProductTranslations();

  if (products.length === 0) {
    return (
      <Card className="shadow-sm border-gray-200">
        <CardContent className="text-center py-12">
          <div className="text-gray-500">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium mb-2">No similar products found</h3>
            <p className="text-sm">Try uploading a different image</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800">Active</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
    );
  };

  const getAvailabilityBadge = (available: number, stock: number) => {
    if (available === 0) {
      return <Badge className="bg-red-100 text-red-800">Out of Stock</Badge>;
    } else if (available < stock * 0.2) {
      return <Badge className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800">In Stock</Badge>;
    }
  };

  const getSimilarityBadge = (similarity: number) => {
    const percent = Math.round(similarity * 100);
    let className = 'font-bold';
    
    if (percent >= 90) {
      className += ' bg-green-100 text-green-800'; // Excellent match
    } else if (percent >= 75) {
      className += ' bg-blue-100 text-blue-800'; // Good match
    } else if (percent >= 60) {
      className += ' bg-yellow-100 text-yellow-800'; // Fair match
    } else {
      className += ' bg-gray-100 text-gray-800'; // Low match
    }
    
    return <Badge className={className}>{percent}%</Badge>;
  };

  return (
    <Card className="shadow-sm border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left p-4 font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-primary" />
                  Match
                </div>
              </th>
              <th className="text-left p-4 font-semibold text-gray-700">Product</th>
              <th className="text-left p-4 font-semibold text-gray-700">Category</th>
              <th className="text-left p-4 font-semibold text-gray-700">Price</th>
              <th className="text-left p-4 font-semibold text-gray-700">Stock</th>
              <th className="text-left p-4 font-semibold text-gray-700">Status</th>
              <th className="text-right p-4 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((product) => {
              // Images are already parsed by backend API as array of strings
              const mainImage = product.images && product.images.length > 0
                ? (Array.isArray(product.images) ? product.images[0] : product.images)
                : null;
              const imageUrl = mainImage ? getProductImageUrl(mainImage) : null;

              return (
                <tr
                  key={product.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Similarity Column */}
                  <td className="p-4">
                    {getSimilarityBadge(product.similarity)}
                  </td>

                  {/* Product Info with Image */}
                  <td className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Product Image - Larger for better visibility */}
                      <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover hover:scale-110 transition-transform duration-200"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.classList.add('flex', 'items-center', 'justify-center');
                              }
                            }}
                          />
                        ) : null}
                        {/* Placeholder - shown when no image or image fails */}
                        {!imageUrl && (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-10 h-10 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Product Details */}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 mb-1">
                          {product.name}
                        </div>
                        {product.barcode && (
                          <div className="text-xs text-gray-500 mb-1">
                            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                              {product.barcode}
                            </span>
                          </div>
                        )}
                        {product.description && (
                          <div className="text-xs text-gray-600 line-clamp-2">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="p-4">
                    <span className="text-gray-700">
                      {product.category?.name || 'N/A'}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="p-4">
                    <div className="font-medium text-gray-900">
                      {formatMoney(product.rentPrice)}
                    </div>
                    {product.salePrice && (
                      <div className="text-xs text-gray-500">
                        Sale: {formatMoney(product.salePrice)}
                      </div>
                    )}
                  </td>

                  {/* Stock */}
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">Total:</span>
                        <span className="font-medium">{product.stock}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">Available:</span>
                        <span className="font-medium text-green-600">
                          {product.available}
                        </span>
                      </div>
                      {getAvailabilityBadge(product.available, product.stock)}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    {getStatusBadge(product.isActive)}
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onAddToCart && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => onAddToCart(product)}
                          className="flex items-center gap-1"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span className="hidden sm:inline">Add</span>
                        </Button>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onViewProduct && (
                            <DropdownMenuItem onClick={() => onViewProduct(product)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          )}
                          {onEditProduct && (
                            <DropdownMenuItem onClick={() => onEditProduct(product)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Product
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

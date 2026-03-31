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
import { parseProductImages } from '@rentalshop/utils';
import { Eye, Edit, ShoppingCart, MoreVertical, Package, Percent } from 'lucide-react';
import { ImageLightbox } from '../../../ui/image-lightbox';

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
      <Badge className="bg-green-100 text-green-800">{t('status.active')}</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">{t('status.inactive')}</Badge>
    );
  };

  const getAvailabilityBadge = (available: number, stock: number) => {
    if (available === 0) {
      return <Badge className="bg-red-100 text-red-800">{t('status.outOfStock')}</Badge>;
    } else if (available < stock * 0.2) {
      return <Badge className="bg-yellow-100 text-yellow-800">{t('status.lowStock')}</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800">{t('status.inStock')}</Badge>;
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
                  {t('searchResults.match') || 'Match'}
                </div>
              </th>
              <th className="text-left p-4 font-semibold text-gray-700">{t('searchResults.product') || 'Product'}</th>
              {/* Category column hidden */}
              <th className="text-left p-4 font-semibold text-gray-700">{t('searchResults.price') || 'Price'}</th>
              {/* Stock column hidden */}
              {/* <th className="text-left p-4 font-semibold text-gray-700">{t('searchResults.stock') || 'Stock'}</th> */}
              {/* Status column hidden */}
              <th className="text-right p-4 font-semibold text-gray-700">{t('searchResults.actions') || 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((product) => {
              // Parse images (handles JSON string, array, or comma-separated string)
              const parsedImages = parseProductImages(product.images);
              const mainImage = parsedImages.length > 0 ? parsedImages[0] : null;
              // mainImage is already a URL string, use it directly
              const imageUrl = mainImage || null;
              
              // Debug: Log image parsing (remove in production)
              if (process.env.NODE_ENV === 'development') {
                console.log('🔍 Product image debug:', {
                  productId: product.id,
                  productName: product.name,
                  originalImages: product.images,
                  parsedImages,
                  mainImage,
                  imageUrl
                });
              }

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
                      <div className="flex h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                        {imageUrl ? (
                          <ImageLightbox
                            src={imageUrl}
                            alt={product.name}
                            triggerClassName="h-full w-full"
                            imgClassName="object-cover transition-transform duration-200 hover:scale-110"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-10 w-10 text-gray-400" />
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

                  {/* Category - Hidden */}
                  {/* <td className="p-4">
                    <span className="text-gray-700">
                      {product.category?.name || 'N/A'}
                    </span>
                  </td> */}

                  {/* Price */}
                  <td className="p-4">
                    <div className="font-medium text-gray-900">
                      {formatMoney(product.rentPrice)}
                    </div>
                    {product.salePrice && (
                      <div className="text-xs text-gray-500">
                        {t('price.sale')}: {formatMoney(product.salePrice)}
                      </div>
                    )}
                  </td>

                  {/* Stock - Hidden */}
                  {/* <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">{t('inventory.totalStock')}:</span>
                        <span className="font-medium">{(product as any).totalStock ?? product.stock ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">{t('inventory.availableStock')}:</span>
                        <span className="font-medium text-green-600">
                          {product.available ?? 0}
                        </span>
                      </div>
                      {getAvailabilityBadge(
                        product.available ?? 0, 
                        (product as any).totalStock ?? product.stock ?? 0
                      )}
                    </div>
                  </td> */}

                  {/* Status - Hidden */}
                  {/* <td className="p-4">
                    {getStatusBadge(product.isActive)}
                  </td> */}

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
                          <span className="hidden sm:inline">{t('searchResults.add') || 'Add'}</span>
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

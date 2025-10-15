import React from 'react';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Card, CardContent } from '../../../ui/card';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../../../ui/dropdown-menu';
import { useFormatCurrency } from '@rentalshop/ui';
import { Product } from '@rentalshop/types';
import { Eye, Edit, ShoppingCart, Trash2, MoreVertical, Package } from 'lucide-react';

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
  const [openDropdownId, setOpenDropdownId] = React.useState<number | null>(null);
  
  // Use formatCurrency hook - automatically uses merchant's currency
  const formatMoney = useFormatCurrency();
  
  // Debug: Log products received
  console.log('🔍 ProductTable: Received products:', {
    isArray: Array.isArray(products),
    length: products?.length,
    firstProduct: products?.[0]?.name
  });
  
  if (products.length === 0) {
    return (
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">📦</div>
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

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        Active
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
        Inactive
      </Badge>
    );
  };

  const getAvailabilityBadge = (available: number, stock: number) => {
    if (available === 0) {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Out of Stock</Badge>;
    }
    if (available < 5) {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Low Stock</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">In Stock</Badge>;
  };

  const handleSort = (column: string) => {
    if (onSort) {
      onSort(column);
    }
  };

  return (
    <Card className="shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col">
      <div className="overflow-auto flex-1">
        <table className="w-full min-w-[1000px]">
          {/* Table Header with Sorting - Sticky */}
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
            <tr>
              {/* Product Name - Sortable */}
              <th 
                onClick={() => handleSort('name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Product Name
                  {sortBy === 'name' && (
                    <span className="text-xs">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                  )}
                </div>
              </th>
              
              {/* Category */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Category
              </th>
              
              {/* Price */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Price
              </th>
              
              {/* Stock */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Stock
              </th>
              
              {/* Status */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              
              {/* Created Date - Sortable */}
              <th 
                onClick={() => handleSort('createdAt')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Created
                  {sortBy === 'createdAt' && (
                    <span className="text-xs">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                  )}
                </div>
              </th>
              
              {/* Actions */}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          
          {/* Table Body */}
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                {/* Product Name with Image */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {/* Product Icon/Image */}
                    <div className="flex-shrink-0">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded border border-gray-200"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {product.name}
                      </div>
                      {product.barcode && (
                        <div className="text-gray-500 dark:text-gray-400 text-xs">
                          SKU: {product.barcode}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                
                {/* Category */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {(product as any).category?.name || 'N/A'}
                  </div>
                </td>
                
                {/* Price */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatMoney(product.rentPrice || 0)}
                    </div>
                    {product.salePrice && product.salePrice > 0 && (
                      <div className="text-gray-500 dark:text-gray-400 text-xs">
                        Sale: {formatMoney(product.salePrice)}
                      </div>
                    )}
                  </div>
                </td>
                
                {/* Stock */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {product.available} / {product.stock}
                    </div>
                    {product.renting > 0 && (
                      <div className="text-gray-500 dark:text-gray-400 text-xs">
                        Renting: {product.renting}
                      </div>
                    )}
                    <div className="mt-1">
                      {getAvailabilityBadge(product.available, product.stock)}
                    </div>
                  </div>
                </td>
                
                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(product.isActive)}
                </td>
                
                {/* Created Date */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {product.createdAt ? new Date(product.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : 'N/A'}
                  </div>
                </td>
                
                {/* Actions - Dropdown Menu */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setOpenDropdownId(product.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end"
                      open={openDropdownId === product.id}
                      onOpenChange={(open: boolean) => setOpenDropdownId(open ? product.id : null)}
                    >
                      <DropdownMenuItem onClick={() => {
                        onProductAction('view', product.id);
                        setOpenDropdownId(null);
                      }}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        onProductAction('edit', product.id);
                        setOpenDropdownId(null);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Product
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        onProductAction('view-orders', product.id);
                        setOpenDropdownId(null);
                      }}>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        View Orders
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        onProductAction('toggle-status', product.id);
                        setOpenDropdownId(null);
                      }}>
                        <Package className="h-4 w-4 mr-2" />
                        {product.isActive ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => {
                          onProductAction('delete', product.id);
                          setOpenDropdownId(null);
                        }}
                        className="text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Product
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

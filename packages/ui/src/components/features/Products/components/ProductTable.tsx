import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../ui/table';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { Product } from '@rentalshop/types';
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, Edit } from 'lucide-react';

interface ProductTableProps {
  products: Product[];
  onProductAction: (action: string, productId: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

// Move SortableHeader outside to prevent recreation on each render
const SortableHeader = ({ 
  column, 
  children, 
  sortable = true,
  onSort,
  sortBy,
  sortOrder
}: { 
  column: string; 
  children: React.ReactNode; 
  sortable?: boolean;
  onSort?: (column: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  if (!sortable || !onSort) {
    return <TableHead className="px-4 py-3">{children}</TableHead>;
  }

  const isActive = sortBy === column;
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('SortableHeader clicked:', column); // Debug log
    onSort(column);
  };
  
  return (
    <TableHead 
      className={`cursor-pointer transition-all duration-200 select-none px-4 py-3 ${
        isActive 
          ? 'bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-500 dark:border-blue-400 shadow-sm' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm'
      }`}
      onClick={handleClick}
      style={{ userSelect: 'none' }}
    >
      <div className="flex items-center justify-between group">
        <span className={`font-medium transition-colors duration-200 ${
          isActive 
            ? 'text-blue-700 dark:text-blue-300' 
            : 'text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200'
        }`}>
          {children}
        </span>
        <span className={`ml-2 transition-all duration-200 ${
          isActive 
            ? 'text-blue-600 dark:text-blue-400 scale-110' 
            : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:scale-105'
        }`}>
          {isActive ? (
            sortOrder === 'asc' ? (
              <ArrowUp className="w-4 h-4" />
            ) : (
              <ArrowDown className="w-4 h-4" />
            )
          ) : (
            <ArrowUpDown className="w-4 h-4" />
          )}
        </span>
      </div>
    </TableHead>
  );
};

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
    <Card className="shadow-sm border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
          Products
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader column="name" sortable={true} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>Product</SortableHeader>
                <SortableHeader column="category" sortable={false}>Category</SortableHeader>
                <SortableHeader column="rentPrice" sortable={false}>Price</SortableHeader>
                <SortableHeader column="available" sortable={false}>Stock</SortableHeader>
                <SortableHeader column="status" sortable={false}>Status</SortableHeader>
                <SortableHeader column="createdAt" sortable={true} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>Created At</SortableHeader>
                <TableHead className="w-36">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {/* Product Image */}
                      <div className="relative">
                        {getProductImage(product)}
                        {/* Hidden fallback placeholder for when image fails to load */}
                        <div className="hidden w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center shadow-sm">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Product Info */}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {product.name}
                        </div>
                        {product.barcode && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {product.barcode}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <span className="capitalize">{product.categoryId}</span>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <div className="font-medium">{formatCurrency(product.rentPrice)}</div>
                      {product.deposit > 0 && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Deposit: {formatCurrency(product.deposit)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.available}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {product.renting} renting
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge 
                      variant={product.isActive ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {product.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {product.createdAt ? formatDate(product.createdAt.toString()) : 'N/A'}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* View Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onProductAction('view', product.id)}
                        className="h-8 px-3"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      
                      {/* Edit Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onProductAction('edit', product.id)}
                        className="h-8 px-3"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

import React from 'react';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/cn';

interface Product {
  id: string;
  name: string;
  description?: string;
  totalStock: number;
  rentPrice: number;
  salePrice?: number;
  deposit: number;
  images?: string;
  category: {
    name: string;
  };
  merchant: {
    name: string;
  };
  outletStock: Array<{
    id: string;
    stock: number;
    available: number;
    renting: number;
    outlet: {
      id: string;
      name: string;
    };
  }>;
}

interface ProductTableProps {
  products: Product[];
  onEdit?: (productId: string) => void;
  onDelete?: (productId: string) => void;
  onView?: (productId: string) => void;
  className?: string;
  showActions?: boolean;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  onEdit,
  onDelete,
  onView,
  className,
  showActions = true
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStockStatus = (available: number, totalStock: number) => {
    if (available <= 0) {
      return { status: 'Out of Stock', variant: 'destructive' as const };
    } else if (available < totalStock * 0.2) {
      return { status: 'Low Stock', variant: 'secondary' as const };
    } else {
      return { status: 'In Stock', variant: 'default' as const };
    }
  };

  const getTotalAvailable = (outletStock: Product['outletStock']) => {
    return outletStock.reduce((sum, os) => sum + os.available, 0);
  };

  const getTotalRenting = (outletStock: Product['outletStock']) => {
    return outletStock.reduce((sum, os) => sum + os.renting, 0);
  };

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Product</TableHead>
            <TableHead className="w-[120px]">Category</TableHead>
            <TableHead className="w-[100px]">Stock</TableHead>
            <TableHead className="w-[100px]">Renting</TableHead>
            <TableHead className="w-[120px]">Rent Price</TableHead>
            <TableHead className="w-[120px]">Sale Price</TableHead>
            <TableHead className="w-[120px]">Deposit</TableHead>
            <TableHead className="w-[150px]">Outlets</TableHead>
            {showActions && (
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const totalAvailable = getTotalAvailable(product.outletStock);
            const totalRenting = getTotalRenting(product.outletStock);
            const stockStatus = getStockStatus(totalAvailable, product.totalStock);
            
            return (
              <TableRow
                key={product.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <TableCell className="font-medium">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {product.name}
                    </div>
                    {product.description && (
                      <div className="text-sm text-gray-500 truncate max-w-[220px]">
                        {product.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="text-gray-900">
                    {product.category.name}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    <Badge 
                      variant={stockStatus.variant}
                      className={cn(
                        stockStatus.variant === 'default' 
                          ? "bg-green-100 text-green-800 border-green-200" 
                          : stockStatus.variant === 'secondary'
                          ? "bg-orange-100 text-orange-800 border-orange-200"
                          : "bg-red-100 text-red-800 border-red-200"
                      )}
                    >
                      {stockStatus.status}
                    </Badge>
                    <div className="text-xs text-gray-500">
                      {totalAvailable}/{product.totalStock}
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="text-sm text-gray-900">
                    {totalRenting > 0 ? (
                      <span className="font-medium text-blue-600">{totalRenting}</span>
                    ) : (
                      <span className="text-gray-500">0</span>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="text-gray-900 font-medium">
                    {formatCurrency(product.rentPrice)}
                    <span className="text-sm text-gray-500">/day</span>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="text-gray-900">
                    {product.salePrice ? formatCurrency(product.salePrice) : 'N/A'}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="text-gray-900">
                    {formatCurrency(product.deposit)}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="text-sm text-gray-600">
                    {product.outletStock.length > 0 ? (
                      <div className="space-y-1">
                        {product.outletStock.map((os) => (
                          <div key={os.id} className="flex justify-between text-xs">
                            <span>{os.outlet.name}:</span>
                            <span className="font-medium">
                              {os.available}/{os.stock}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">No outlets</span>
                    )}
                  </div>
                </TableCell>
                
                {showActions && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onView && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onView(product.id)}
                          className="h-8 px-3 text-xs"
                        >
                          View
                        </Button>
                      )}
                      {onEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(product.id)}
                          className="h-8 px-3 text-xs"
                        >
                          Edit
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDelete(product.id)}
                          className="h-8 px-3 text-xs text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

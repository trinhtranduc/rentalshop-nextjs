'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input } from '@rentalshop/ui';
import { ProductTable, ProductDialog } from '@rentalshop/ui';
import { DashboardWrapper } from '@rentalshop/ui';

// Extend the Product type for this page
interface ExtendedProduct {
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
import { useAuth } from '../../hooks/useAuth';

export default function ProductsPage() {
  const { user, logout } = useAuth();
  const isMerchantLevel = user && ((user.role === 'ADMIN' && !user.outlet?.id) || user.role === 'MERCHANT');
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ExtendedProduct | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');

  useEffect(() => {
    fetchProducts();
  }, [currentPage]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { authenticatedFetch } = await import('@rentalshop/utils');
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm })
      });

      const response = await authenticatedFetch(`/api/products?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      
      if (data.success) {
        // Handle the new data structure with outletStock
        const transformedProducts: ExtendedProduct[] = data.data.products.map((product: any) => ({
          id: product.id,
          name: product.name,
          description: product.description || '',
          totalStock: product.totalStock,
          rentPrice: product.rentPrice,
          salePrice: product.salePrice || undefined,
          deposit: product.deposit,
          images: product.images || '',
          category: {
            name: product.category?.name || '',
          },
          merchant: {
            name: product.merchant?.name || '',
          },
          outletStock: product.outletStock?.map((os: any) => ({
            id: os.id,
            stock: os.stock,
            available: os.available,
            renting: os.renting,
            outlet: {
              id: os.outlet.id,
              name: os.outlet.name,
            },
          })) || [],
        }));
        setProducts(transformedProducts);
        setTotalPages(data.data.totalPages);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(() => {
    setCurrentPage(1);
    fetchProducts();
  }, [currentPage, searchTerm]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '') {
        handleSearch();
      } else {
        // If search is cleared, fetch all products
        setCurrentPage(1);
        fetchProducts();
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [searchTerm, handleSearch]);

  const handleEditProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setEditingProduct(product);
      setDialogMode('edit');
      setDialogOpen(true);
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleSaveProduct = async (productData: any) => {
    try {
      const { authenticatedFetch } = await import('@rentalshop/utils');

      const url = editingProduct 
        ? `/api/products?productId=${editingProduct.id}`
        : '/api/products';
      
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(productData)
      });

      if (!response.ok) {
        throw new Error('Failed to save product');
      }

      // Refresh the product list
      fetchProducts();
      setDialogOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
      throw error;
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const { authenticatedFetch } = await import('@rentalshop/utils');

      const response = await authenticatedFetch(`/api/products?productId=${productId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Refresh the product list
        fetchProducts();
      } else {
        console.error('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleViewProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setEditingProduct(product);
      setDialogMode('view');
      setDialogOpen(true);
    }
  };

  return (
    <DashboardWrapper user={user} onLogout={logout} currentPath="/products">
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Products</h1>
          <p className="text-gray-600">Manage your product catalog with outlet stock allocation</p>
        </div>
        {isMerchantLevel && (
          <Button onClick={handleAddProduct}>
            Add Product
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card className="mb-6 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Products
              {searchTerm && (
                <span className="ml-2 text-xs text-blue-600 font-normal">
                  (Searching for "{searchTerm}")
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Search by name, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              {searchTerm && (
                <Button 
                  variant="outline" 
                  onClick={() => setSearchTerm('')}
                  className="whitespace-nowrap"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          
          <Button variant="outline" onClick={() => setSearchTerm('')}>
            Reset Filters
          </Button>
        </div>
      </Card>

      {/* Products List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-gray-500">
            <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-lg font-medium mb-2">No products found</h3>
            <p>Try adjusting your search criteria or add new products.</p>
          </div>
        </Card>
      ) : (
        <>
          <Card className="mb-6">
            <ProductTable
              products={products}
              onEdit={isMerchantLevel ? handleEditProduct : undefined}
              onDelete={isMerchantLevel ? handleDeleteProduct : undefined}
              onView={handleViewProduct}
              showActions={true}
            />
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Product Dialog */}
      <ProductDialog
        product={editingProduct}
        onSave={dialogMode === 'view' ? undefined : (handleSaveProduct as any)}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        trigger={null}
        mode={dialogMode}
      />
      </div>
    </DashboardWrapper>
  );
} 
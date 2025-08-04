'use client';

import React, { useState, useEffect } from 'react';
import { ProductGrid, Product } from '@rentalshop/ui';
import { Input, Button } from '@rentalshop/ui';

interface ProductsResponse {
  success: boolean;
  data: {
    products: Product[];
    total: number;
    page: number;
    totalPages: number;
  };
  error?: string;
}

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch products
  const fetchProducts = async (filters?: { search?: string; categoryId?: string }) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.categoryId) params.append('categoryId', filters.categoryId);

      const response = await fetch(`/api/products?${params.toString()}`);
      const data: ProductsResponse = await response.json();

      if (data.success) {
        setProducts(data.data.products);
        
        // Extract unique categories for filter
        const uniqueCategories = Array.from(new Set(data.data.products.map(p => p.category.name)));
        setCategories(uniqueCategories);
      } else {
        setError(data.error || 'Failed to load products');
      }
    } catch (err) {
      setError('Failed to load products. Please try again.');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    fetchProducts({ search: value, categoryId: selectedCategory });
  };

  // Handle category filter
  const handleCategoryFilter = (category: string) => {
    const categoryId = category === selectedCategory ? '' : category;
    setSelectedCategory(categoryId);
    fetchProducts({ search: searchTerm, categoryId });
  };

  // Handle product actions
  const handleViewProduct = (productId: string) => {
    // Navigate to product detail page
    window.location.href = `/dashboard/products/${productId}`;
  };

  const handleEditProduct = (productId: string) => {
    // Navigate to edit product page
    window.location.href = `/dashboard/products/${productId}/edit`;
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Remove product from state
        setProducts(products.filter(p => p.id !== productId));
        alert('Product deleted successfully');
      } else {
        alert(data.error || 'Failed to delete product');
      }
    } catch (err) {
      alert('Failed to delete product. Please try again.');
      console.error('Error deleting product:', err);
    }
  };

  const handleAddProduct = () => {
    // Navigate to add product page
    window.location.href = '/dashboard/products/new';
  };

  // Load products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage all products in the rental system
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {products.length} products total
              </span>
              <Button onClick={handleAddProduct} className="bg-blue-600 hover:bg-blue-700">
                Add Product
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              <button
                onClick={() => handleCategoryFilter('')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === ''
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Categories
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryFilter(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProductGrid
          products={products}
          loading={loading}
          error={error || undefined}
          variant="admin"
          onView={handleViewProduct}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
        />
      </div>
    </div>
  );
} 
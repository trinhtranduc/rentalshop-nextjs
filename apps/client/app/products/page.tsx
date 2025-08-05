'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '@rentalshop/ui';
import { ProductCard, ProductGrid } from '@rentalshop/ui';
import DashboardWrapper from '../../components/DashboardWrapper';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
  imageUrl?: string;
  merchant: {
    id: string;
    companyName: string;
  };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchProducts();
  }, [currentPage]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        console.error('No auth token found');
        return;
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`http://localhost:3002/api/products?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data.products);
        setTotalPages(data.data.totalPages);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchProducts();
  };

  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Products</h1>
        <p className="text-gray-600">Manage your product catalog</p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Products
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Search by name, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch}>
                Search
              </Button>
            </div>
          </div>
          
          <Button variant="outline" onClick={() => setSearchTerm('')}>
            Clear Filter
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
          <ProductGrid products={products} />
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
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
      </div>
    </DashboardWrapper>
  );
} 
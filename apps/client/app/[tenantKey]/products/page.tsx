import React from 'react';
import { notFound } from 'next/navigation';
import { MerchantHeader } from './components/MerchantHeader';
import { PublicProductGrid } from './components/PublicProductGrid';
import { publicFetch, parseApiResponse } from '@rentalshop/utils';
import type { Product, Category } from '@rentalshop/types';

interface PublicProductsPageProps {
  params: Promise<{
    tenantKey: string;
  }>;
  searchParams: Promise<{
    categoryId?: string;
    search?: string;
    page?: string;
  }>;
}

async function fetchPublicProducts(tenantKey: string, searchParams: any) {
  try {
    const queryParams = new URLSearchParams();
    if (searchParams.categoryId) {
      queryParams.append('categoryId', searchParams.categoryId);
    }
    if (searchParams.search) {
      queryParams.append('search', searchParams.search);
    }
    if (searchParams.page) {
      queryParams.append('page', searchParams.page);
    }

    const url = `api/public/${tenantKey}/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    console.log('🌐 Fetching URL:', url);
    const response = await publicFetch(url);
    
    console.log('📡 Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    const result = await parseApiResponse<any>(response);
    console.log('📦 Parsed result:', {
      success: result.success,
      hasData: !!result.data,
      productsCount: result.data?.products?.length || 0,
      merchantName: result.data?.merchant?.name
    });
    
    if (!result.success || !result.data) {
      console.error('❌ Invalid result structure:', result);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('❌ Error fetching public products:', error);
    return null;
  }
}

export default async function PublicProductsPage({ 
  params, 
  searchParams 
}: PublicProductsPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const { tenantKey } = resolvedParams;

  // Validate tenantKey format
  if (!tenantKey || !/^[a-z0-9\-]+$/i.test(tenantKey)) {
    notFound();
  }

  // Fetch products and merchant data
  console.log('🔍 Fetching public products for tenantKey:', tenantKey);
  const data = await fetchPublicProducts(tenantKey, resolvedSearchParams);

  if (!data || !data.merchant) {
    console.error('❌ No data or merchant found for tenantKey:', tenantKey);
    notFound();
  }
  
  console.log('✅ Found merchant:', data.merchant.name, 'with', data.products?.length || 0, 'products');

  const { merchant, products = [], categories = [] } = data;

  // Show merchant info even if no products (for better UX)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Merchant Header */}
      <MerchantHeader merchant={merchant} />

      {/* Products Grid - Will show empty state if no products */}
      <PublicProductGrid 
        products={products as Product[]}
        categories={categories as Category[]}
      />
    </div>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ tenantKey: string }> }) {
  const resolvedParams = await params;
  const data = await fetchPublicProducts(resolvedParams.tenantKey, {});
  
  if (!data || !data.merchant) {
    return {
      title: 'Store Not Found',
    };
  }

  return {
    title: `${data.merchant.name} - Products`,
    description: data.merchant.description || `Browse products from ${data.merchant.name}`,
  };
}


import React from 'react';
import { notFound } from 'next/navigation';
import { MerchantHeader } from './components/MerchantHeader';
import { PublicProductGrid } from './components/PublicProductGrid';
import { parseApiResponse } from '@rentalshop/utils';
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

    // Build API URL - use absolute URL for server-side rendering
    // In Next.js server components, we need to use full URL or relative path
    // Try to detect production vs development
    const isProduction = process.env.NODE_ENV === 'production' || 
                         process.env.NEXT_PUBLIC_APP_ENV === 'production' ||
                         process.env.RAILWAY_ENVIRONMENT === 'production';
    
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 
                      (isProduction ? 'https://api.anyrent.shop' : 'https://dev-api.anyrent.shop');
    const endpoint = `api/public/${tenantKey}/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const url = `${apiBaseUrl}/${endpoint}`;
    
    console.log('🌐 Fetching URL:', url);
    console.log('🔍 Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      isProduction,
      apiBaseUrl,
      tenantKey
    });
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store' // Ensure fresh data on each request
    });
    
    console.log('📡 Response status:', response.status, response.statusText);
    
    // Parse response (handles both success and error cases)
    const result = await parseApiResponse<any>(response);
    console.log('📦 Parsed result:', {
      success: result.success,
      code: result.code,
      message: result.message,
      hasData: !!result.data,
      productsCount: result.data?.products?.length || 0,
      merchantName: result.data?.merchant?.name
    });
    
    // If error response (MERCHANT_NOT_FOUND, etc.)
    if (!result.success) {
      console.error('❌ API Error:', {
        code: result.code,
        message: result.message,
        tenantKey,
        url,
        status: response.status,
        statusText: response.statusText
      });
      
      // Log more details for debugging
      if (result.code === 'MERCHANT_NOT_FOUND') {
        console.error('💡 Debugging tips:');
        console.error('   - Check if merchant exists in database with tenantKey:', tenantKey);
        console.error('   - Verify tenantKey is set correctly (case-insensitive)');
        console.error('   - Check if merchant is active (isActive = true)');
        console.error('   - API URL used:', url);
      }
      
      return null;
    }
    
    // Check if data exists
    if (!result.data) {
      console.error('❌ No data in response:', result);
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

  const { merchant, products = [], categories = [], outlets = [], pagination } = data;

  // Show merchant info even if no products (for better UX)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Merchant Header */}
      <MerchantHeader merchant={merchant} outlets={outlets} />

      {/* Products Grid - Will show empty state if no products */}
      <PublicProductGrid 
        products={products as Product[]}
        categories={categories as Category[]}
        pagination={pagination}
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


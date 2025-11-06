'use client';

import { useEffect, useState } from 'react';

export default function TenantDashboard() {
  const [tenant, setTenant] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const hostname = window.location.hostname;
    console.log('🔍 Hostname:', hostname);
    
    // Extract subdomain properly
    let subdomain: string | null = null;
    const parts = hostname.split('.');
    
    // For shop1.localhost format
    if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
      subdomain = parts[0];
    }
    // For production: shop1.example.com
    else if (parts.length > 2) {
      subdomain = parts[0];
    }
    // Fallback: if hostname is just "localhost", no subdomain
    else if (hostname === 'localhost') {
      // Redirect to admin if no subdomain
      window.location.href = 'http://localhost:3000';
      return;
    }
    
    console.log('🔍 Extracted subdomain:', subdomain);
    
    if (!subdomain) {
      console.error('❌ No subdomain found, redirecting to admin');
      window.location.href = 'http://localhost:3000';
      return;
    }

    const fetchData = async () => {
      try {
        console.log('📡 Fetching tenant info for:', subdomain);
        
        // Fetch tenant info
        const tenantRes = await fetch(
          `http://localhost:3002/api/tenant/info`,
          {
            headers: {
              'x-tenant-subdomain': subdomain!,
            },
          }
        );
        
        console.log('📡 Tenant response status:', tenantRes.status);
        
        if (!tenantRes.ok) {
          const errorData = await tenantRes.json().catch(() => ({}));
          console.error('❌ Tenant fetch failed:', errorData);
          // Show error instead of redirect immediately
          setError(`Tenant not found: ${errorData.error || 'Unknown error'}`);
          setLoading(false);
          return;
        }
        
        const tenantData = await tenantRes.json();
        console.log('✅ Tenant data:', tenantData);
        
        if (!tenantData.tenant || tenantData.tenant.status !== 'active') {
          console.error('❌ Invalid tenant status:', tenantData.tenant?.status);
          setError('Tenant is inactive or invalid');
          setLoading(false);
          return;
        }
        
        setTenant(tenantData.tenant);

        // Fetch products
        console.log('📡 Fetching products for:', subdomain);
        const productsRes = await fetch(
          `http://localhost:3002/api/products`,
          {
            headers: {
              'x-tenant-subdomain': subdomain!,
            },
          }
        );
        
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.products || []);
        }
      } catch (err: any) {
        console.error('❌ Fetch error:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <div className="text-red-600 text-xl">Error: {error}</div>
        <button
          onClick={() => (window.location.href = 'http://localhost:3000')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Registration
        </button>
        <div className="text-sm text-gray-500 mt-4">
          <p>Check console (F12) for debug information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to {tenant?.name}
          </h1>
          <p className="text-gray-600">Subdomain: {tenant?.subdomain}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Products</h2>
          {products.length === 0 ? (
            <p className="text-gray-500">No products yet. Add some products!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                  {product.description && (
                    <p className="text-gray-600 text-sm mb-2">
                      {product.description}
                    </p>
                  )}
                  <p className="text-blue-600 font-bold">
                    ${product.price.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Stock: {product.stock}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Tenant Info</h2>
          <div className="space-y-2">
            <p>
              <span className="font-semibold">ID:</span> {tenant?.id}
            </p>
            <p>
              <span className="font-semibold">Status:</span>{' '}
              <span
                className={`px-2 py-1 rounded text-sm ${
                  tenant?.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {tenant?.status}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

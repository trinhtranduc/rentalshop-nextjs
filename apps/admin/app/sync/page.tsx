'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Button,
  Input,
  Badge,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  useToast,
  Skeleton,
  SearchableSelect
} from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { createApiUrl, getAuthToken, merchantsApi } from '@rentalshop/utils';
import { 
  RefreshCw, 
  Download, 
  Upload,
  Eye,
  Play,
  Loader2,
  Database,
  Users,
  Package,
  ShoppingCart
} from 'lucide-react';

interface Merchant {
  id: number;
  publicId: number;
  name: string;
  email: string;
  isActive: boolean;
}

interface SyncPreview {
  customers: { 
    count: number; 
    sample: any[]; 
    total: number;
    pagination?: {
      total_of_page: number;
      current_page: number;
      page_size: number;
      count: number;
    };
    meta?: {
      status: boolean;
      message: string;
    };
  } | null;
  products: { 
    count: number; 
    sample: any[]; 
    total: number;
    pagination?: {
      total_of_page: number;
      current_page: number;
      page_size: number;
      count: number;
    };
    meta?: {
      status: boolean;
      message: string;
    };
  } | null;
  orders: { 
    count: number; 
    sample: any[]; 
    total: number;
    pagination?: {
      total_of_page: number;
      current_page: number;
      page_size: number;
      count: number;
    };
    meta?: {
      status: boolean;
      message: string;
    };
  } | null;
  errors: Array<{ entity: string; error: string }>;
  logs: Array<{ timestamp: string; level: string; message: string }>;
  rawResponses: Record<string, any>;
}

interface SyncResult {
  sessionId: number;
  stats: {
    customers?: { total: number; created: number; failed: number };
    products?: { total: number; created: number; failed: number };
    orders?: { total: number; created: number; failed: number };
  };
  logs: Array<any>;
  idMappings: Record<string, Array<{ oldId: string | number; newId: number; name?: string }>>;
  rollback?: {
    deleted: number;
    errors: string[];
  };
}

export default function SyncPage() {
  const { user, loading: authLoading } = useAuth();
  const { toastSuccess, toastError } = useToast();
  
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loadingMerchants, setLoadingMerchants] = useState(true);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Form state
  // Old server endpoint is hardcoded
  const OLD_SERVER_ENDPOINT = 'https://crm.rentalshop.org';
  const [token, setToken] = useState('');
  const [merchantId, setMerchantId] = useState<number | ''>('');
  const [entities, setEntities] = useState<string[]>(['customers', 'products', 'orders']);
  
  // Search/filter parameters for old server APIs
  const [searchParams, setSearchParams] = useState<{
    customers?: { keyword_search?: string };
    products?: { keyword_search?: string };
    orders?: { 
      keyword_search?: string;
      start_date?: string;
      end_date?: string;
      product_ids?: number[];
      after_time?: string;
    };
  }>({});
  
  // Results
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Logs for activity tracking
  const [logs, setLogs] = useState<Array<{
    timestamp: string;
    level: 'info' | 'success' | 'warning' | 'error';
    message: string;
    data?: any;
  }>>([]);

  // Add log helper (defined early so it can be used in useEffect)
  const addLog = React.useCallback((level: 'info' | 'success' | 'warning' | 'error', message: string, data?: any) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    setLogs(prev => {
      const newLogs = [...prev, logEntry];
      // Keep only last 100 logs
      return newLogs.length > 100 ? newLogs.slice(-100) : newLogs;
    });
  }, []);

  // Fetch merchants - use merchantsApi like merchant page does
  useEffect(() => {
    const fetchMerchantsList = async () => {
      try {
        setLoadingMerchants(true);
        
        // Check if user is authenticated first
        if (!user || authLoading) {
          console.log('User not authenticated or still loading, skipping merchants fetch');
          return;
        }
        
        // Use merchantsApi.getMerchants() - same as merchant page
        const response = await merchantsApi.getMerchants();
        
        if (response.success && response.data) {
          // Response format: { merchants: Merchant[], total: number, ... }
          const merchantsArray = response.data.merchants || [];
          // Map to sync page format (only fields we need)
          const mappedMerchants: Merchant[] = merchantsArray.map((m: any) => ({
            id: m.id || m.publicId,
            publicId: m.publicId || m.id,
            name: m.name || '',
            email: m.email || '',
            isActive: m.isActive !== undefined ? m.isActive : true
          }));
          setMerchants(mappedMerchants);
          addLog('success', `Loaded ${mappedMerchants.length} merchants`);
        } else {
          addLog('error', `Failed to load merchants: ${response.message || 'Unknown error'}`);
        }
      } catch (error: any) {
        console.error('Error fetching merchants:', error);
        addLog('error', `Error fetching merchants: ${error.message || 'Unknown error'}`);
      } finally {
        setLoadingMerchants(false);
      }
    };

    // Only fetch if user is available and not loading
    if (user && !authLoading) {
      fetchMerchantsList();
    }
  }, [user, authLoading, addLog]);

  const handleEntityToggle = (entity: string) => {
    setEntities(prev => {
      const newEntities = prev.includes(entity) 
        ? prev.filter(e => e !== entity)
        : [...prev, entity];
      addLog('info', `Entities updated: ${newEntities.join(', ') || 'none'}`);
      return newEntities;
    });
  };

  // Call old server API via proxy (to avoid CORS issues)
  const callOldServerAPI = async (path: string, params: Record<string, any> = {}) => {
    const proxyUrl = createApiUrl('/api/sync-proxy');
    const requestBody = {
      path,
      params,
      token
    };

    // Log request
    addLog('info', `[REQUEST] ${path}`);
    addLog('info', `Proxy URL: ${proxyUrl}`);
    addLog('info', `Old Server Path: ${OLD_SERVER_ENDPOINT}${path}`);
    addLog('info', `Params:`, params);

    const requestStartTime = Date.now();
    
    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const requestDuration = Date.now() - requestStartTime;

      // Log response
      addLog('info', `[RESPONSE] ${path}`);
      addLog('info', `Duration: ${requestDuration}ms`);
      addLog('info', `Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        addLog('error', `HTTP Error: ${response.status}`, errorData);
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      // Log response data (truncated for large responses)
      const dataToLog = result.data?.result?.data
        ? {
            ...result.data,
            result: {
              ...result.data.result,
              data: {
                ...result.data.result.data,
                customers: Array.isArray(result.data.result.data.customers)
                  ? `[${result.data.result.data.customers.length} customers]`
                  : result.data.result.data.customers
              }
            }
          }
        : result.data;
      
      addLog('info', `Response Data:`, dataToLog);
      
      return result.data || result;
    } catch (error: any) {
      addLog('error', `Request failed: ${error.message}`);
      throw error;
    }
  };

  // Execute: Call API server to sync data to database (needs authentication)
  const syncApiCall = async (body: any) => {
    const authToken = getAuthToken();
    if (!authToken) {
      addLog('error', 'No authentication token found');
      throw new Error('No authentication token found');
    }

    addLog('info', `Calling sync API: execute`, { 
      endpoint: OLD_SERVER_ENDPOINT,
      entities: body.entities,
      merchantId: body.merchantId
    });

    const apiUrl = createApiUrl('/api/sync-standalone');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(body)
    });

    addLog('info', `Sync API response: ${response.status} ${response.statusText}`);

    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({ message: 'Unauthorized' }));
      addLog('error', `Authentication failed: ${errorData.message || 'Unauthorized'}`);
      throw new Error(errorData.message || 'Unauthorized');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      addLog('error', `API error: ${errorData.message || `HTTP ${response.status}`}`);
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    addLog('info', `Sync API success: execute completed`);
    return data;
  };

  // Fetch customers from old server (all pages)
  const fetchCustomersFromOldServer = async (keywordSearch: string = '') => {
    addLog('info', '👥 Starting customers fetch (all pages)...');
    
    const allCustomers: any[] = [];
    let totalPages = 1;
    let currentPage = 1;
    let pageSize = 20;
    let totalCount = 0;
    let meta: any = null;

    // Fetch first page
    try {
      const firstPageResult = await callOldServerAPI('/rental/get_customers', {
        keyword_search: keywordSearch
      });

      if (firstPageResult.result?.data) {
        const responseData = firstPageResult.result.data;
        totalPages = responseData.total_of_page || 1;
        currentPage = responseData.current_page || 1;
        pageSize = responseData.page_size || 20;
        totalCount = responseData.count || 0;
        meta = firstPageResult.result.meta || null;

        if (Array.isArray(responseData.customers)) {
          allCustomers.push(...responseData.customers);
          addLog('info', `📄 First page: ${responseData.customers.length} customers, Total pages: ${totalPages}, Total count: ${totalCount}`);
        }
      }
    } catch (error: any) {
      addLog('error', `Failed to fetch first page: ${error.message}`);
      throw error;
    }

    // Fetch remaining pages
    if (totalPages > 1) {
      addLog('info', `📄 Fetching ${totalPages} pages total...`);
      
      for (let page = 2; page <= totalPages; page++) {
        addLog('info', `📄 Fetching page ${page}/${totalPages}...`);
        
        try {
          const pageResult = await callOldServerAPI('/rental/get_customers', {
            keyword_search: keywordSearch,
            page: page
          });

          if (pageResult.result?.data?.customers && Array.isArray(pageResult.result.data.customers)) {
            allCustomers.push(...pageResult.result.data.customers);
            addLog('success', `✅ Page ${page} fetched: ${pageResult.result.data.customers.length} customers`);
          }
        } catch (error: any) {
          addLog('warning', `⚠️ Page ${page} failed: ${error.message}`);
        }
      }
    }

    addLog('success', `✅ All customers fetched: ${allCustomers.length} total customers from ${totalPages} pages`);

    return {
      success: true,
      data: allCustomers,
      pagination: {
        total_of_page: totalPages,
        current_page: currentPage,
        page_size: pageSize,
        count: totalCount || allCustomers.length
      },
      meta: meta
    };
  };

  const fetchProductsFromOldServer = async (keywordSearch: string = '') => {
    addLog('info', '📦 Starting products fetch (all pages)...');
    
    const allProducts: any[] = [];
    let totalPages = 1;
    let currentPage = 1;
    let pageSize = 20;
    let totalCount = 0;
    let meta: any = null;

    // Fetch first page
    try {
      const firstPageResult = await callOldServerAPI('/rental/get_products', {
        keyword_search: keywordSearch
      });

      if (firstPageResult.result?.data) {
        const responseData = firstPageResult.result.data;
        totalPages = responseData.total_of_page || 1;
        currentPage = responseData.current_page || 1;
        pageSize = responseData.page_size || 20;
        totalCount = responseData.count || 0;
        meta = firstPageResult.result.meta || null;

        if (Array.isArray(responseData.products)) {
          allProducts.push(...responseData.products);
          addLog('info', `📄 First page: ${responseData.products.length} products, Total pages: ${totalPages}, Total count: ${totalCount}`);
        }
      }
    } catch (error: any) {
      addLog('error', `Failed to fetch first page: ${error.message}`);
      throw error;
    }

    // Fetch remaining pages
    if (totalPages > 1) {
      addLog('info', `📄 Fetching ${totalPages} pages total...`);
      
      for (let page = 2; page <= totalPages; page++) {
        addLog('info', `📄 Fetching page ${page}/${totalPages}...`);
        
        try {
          const pageResult = await callOldServerAPI('/rental/get_products', {
            keyword_search: keywordSearch,
            page: page
          });

          if (pageResult.result?.data?.products && Array.isArray(pageResult.result.data.products)) {
            allProducts.push(...pageResult.result.data.products);
            addLog('success', `✅ Page ${page} fetched: ${pageResult.result.data.products.length} products`);
          }
        } catch (error: any) {
          addLog('warning', `⚠️ Page ${page} failed: ${error.message}`);
        }
      }
    }

    addLog('success', `✅ All products fetched: ${allProducts.length} total products from ${totalPages} pages`);

    return {
      success: true,
      data: allProducts,
      pagination: {
        total_of_page: totalPages,
        current_page: currentPage,
        page_size: pageSize,
        count: totalCount || allProducts.length
      },
      meta: meta
    };
  };

  const fetchOrdersFromOldServer = async (params: {
    keyword_search?: string;
    start_date?: string;
    end_date?: string;
    product_ids?: number[];
    after_time?: string;
  } = {}) => {
    addLog('info', '🛒 Starting orders fetch (all pages)...');
    
    const allOrders: any[] = [];
    let totalPages = 1;
    let currentPage = 1;
    let pageSize = 20;
    let totalCount = 0;
    let meta: any = null;

    // Build request params
    const requestParams: any = {};
    if (params.keyword_search) requestParams.keyword_search = params.keyword_search;
    if (params.start_date) requestParams.start_date = params.start_date;
    if (params.end_date) requestParams.end_date = params.end_date;
    if (params.product_ids && params.product_ids.length > 0) requestParams.product_ids = params.product_ids;
    if (params.after_time) requestParams.after_time = params.after_time;

    // Fetch first page
    try {
      const firstPageResult = await callOldServerAPI('/rental/get_orders', requestParams);

      if (firstPageResult.result?.data) {
        const responseData = firstPageResult.result.data;
        totalPages = responseData.total_of_page || 1;
        currentPage = responseData.current_page || 1;
        pageSize = responseData.page_size || 20;
        totalCount = responseData.count || 0;
        meta = firstPageResult.result.meta || null;

        if (Array.isArray(responseData.orders)) {
          allOrders.push(...responseData.orders);
          addLog('info', `📄 First page: ${responseData.orders.length} orders, Total pages: ${totalPages}, Total count: ${totalCount}`);
        }
      }
    } catch (error: any) {
      addLog('error', `Failed to fetch first page: ${error.message}`);
      throw error;
    }

    // Fetch remaining pages
    if (totalPages > 1) {
      addLog('info', `📄 Fetching ${totalPages} pages total...`);
      
      for (let page = 2; page <= totalPages; page++) {
        addLog('info', `📄 Fetching page ${page}/${totalPages}...`);
        
        try {
          const pageParams = { ...requestParams, page };
          const pageResult = await callOldServerAPI('/rental/get_orders', pageParams);

          if (pageResult.result?.data?.orders && Array.isArray(pageResult.result.data.orders)) {
            allOrders.push(...pageResult.result.data.orders);
            addLog('success', `✅ Page ${page} fetched: ${pageResult.result.data.orders.length} orders`);
          }
        } catch (error: any) {
          addLog('warning', `⚠️ Page ${page} failed: ${error.message}`);
        }
      }
    }

    addLog('success', `✅ All orders fetched: ${allOrders.length} total orders from ${totalPages} pages`);

    return {
      success: true,
      data: allOrders,
      pagination: {
        total_of_page: totalPages,
        current_page: currentPage,
        page_size: pageSize,
        count: totalCount || allOrders.length
      },
      meta: meta
    };
  };

  const handlePreview = async () => {
    if (!token || !merchantId || entities.length === 0) {
      toastError('Validation Error', 'Please fill in all required fields');
      addLog('error', 'Preview failed: Missing required fields');
      return;
    }

    try {
      setPreviewLoading(true);
      setPreview(null);
      setShowPreview(true);
      addLog('info', 'Starting preview...', { merchantId, entities, endpoint: OLD_SERVER_ENDPOINT });

      // Preview: Call old server APIs directly from browser
      const preview: any = {
        customers: null,
        products: null,
        orders: null,
        errors: []
      };

      // Fetch customers
      if (entities.includes('customers')) {
        try {
          const customerKeyword = searchParams.customers?.keyword_search || '';
          const customersResult = await fetchCustomersFromOldServer(customerKeyword);
          
          if (customersResult.success && customersResult.data) {
            preview.customers = {
              count: customersResult.data.length,
              sample: customersResult.data.slice(0, 5),
              total: customersResult.data.length,
              pagination: customersResult.pagination,
              meta: customersResult.meta
            };
          }
        } catch (error: any) {
          preview.errors.push({
            entity: 'customers',
            error: error.message || 'Failed to fetch customers'
          });
        }
      }

      // Fetch products
      if (entities.includes('products')) {
        try {
          const productKeyword = searchParams.products?.keyword_search || '';
          const productsResult = await fetchProductsFromOldServer(productKeyword);
          
          if (productsResult.success && productsResult.data) {
            preview.products = {
              count: productsResult.data.length,
              sample: productsResult.data.slice(0, 5),
              total: productsResult.data.length,
              pagination: productsResult.pagination,
              meta: productsResult.meta
            };
          }
        } catch (error: any) {
          preview.errors.push({
            entity: 'products',
            error: error.message || 'Failed to fetch products'
          });
        }
      }

      // Fetch orders
      if (entities.includes('orders')) {
        try {
          const ordersParams = searchParams.orders || {};
          const ordersResult = await fetchOrdersFromOldServer({
            keyword_search: ordersParams.keyword_search,
            start_date: ordersParams.start_date,
            end_date: ordersParams.end_date,
            product_ids: ordersParams.product_ids,
            after_time: ordersParams.after_time
          });
          
          if (ordersResult.success && ordersResult.data) {
            preview.orders = {
              count: ordersResult.data.length,
              sample: ordersResult.data.slice(0, 5),
              total: ordersResult.data.length,
              pagination: ordersResult.pagination,
              meta: ordersResult.meta
            };
          }
        } catch (error: any) {
          preview.errors.push({
            entity: 'orders',
            error: error.message || 'Failed to fetch orders'
          });
        }
      }

      setPreview(preview);
      
      const customersCount = preview.customers?.count || 0;
      const productsCount = preview.products?.count || 0;
      const ordersCount = preview.orders?.count || 0;
      
      addLog('success', `Preview completed: ${customersCount} customers, ${productsCount} products, ${ordersCount} orders`);
      toastSuccess('Preview Success', `Found ${customersCount} customers, ${productsCount} products, ${ordersCount} orders`);
    } catch (error: any) {
      console.error('Preview error:', error);
      addLog('error', `Preview error: ${error.message || 'Unknown error'}`);
      toastError('Preview Error', error.message || 'Failed to fetch preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!token || !merchantId || entities.length === 0) {
      toastError('Validation Error', 'Please fill in all required fields');
      addLog('error', 'Execute failed: Missing required fields');
      return;
    }

    if (!confirm('Are you sure you want to execute sync? This will create records in the database.')) {
      addLog('info', 'Execute cancelled by user');
      return;
    }

    try {
      setLoading(true);
      setSyncResult(null);
      addLog('info', 'Starting sync execution...', { merchantId, entities, endpoint: OLD_SERVER_ENDPOINT });

      const data = await syncApiCall({
        action: 'execute',
        merchantId,
        entities,
        endpoint: OLD_SERVER_ENDPOINT,
        token,
        searchParams: searchParams
      });

      if (data.success && data.data) {
        setSyncResult(data.data);
        
        // Add sync logs
        if (data.data.logs && Array.isArray(data.data.logs)) {
          data.data.logs.forEach((log: any) => {
            addLog(
              log.level || 'info',
              log.message || 'Log entry',
              log.data
            );
          });
        }
        
        const customersCreated = data.data.stats?.customers?.created || 0;
        const productsCreated = data.data.stats?.products?.created || 0;
        const ordersCreated = data.data.stats?.orders?.created || 0;
        
        addLog('success', `Sync completed: ${customersCreated} customers, ${productsCreated} products, ${ordersCreated} orders created`);
        
        if (data.data.rollback) {
          addLog('warning', `Rollback executed: ${data.data.rollback.deleted} records deleted`);
        }
        
        toastSuccess('Sync Completed', `Created ${customersCreated} customers, ${productsCreated} products, ${ordersCreated} orders`);
      } else {
        addLog('error', `Sync failed: ${data.message || 'Unknown error'}`);
        toastError('Sync Failed', data.message || 'Sync failed');
        if (data.data?.rollback) {
          setSyncResult({
            sessionId: 0,
            stats: {},
            logs: [],
            idMappings: {},
            rollback: data.data.rollback
          });
        }
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      addLog('error', `Sync error: ${error.message || 'Unknown error'}`);
      
      // Handle 401 separately - don't auto-redirect
      if (error.message && error.message.includes('Unauthorized')) {
        toastError('Authentication Error', 'Your session has expired. Please log in again.');
        // Let AdminLayout handle redirect if needed
        return;
      }
      
      toastError('Sync Error', error.message || 'Failed to execute sync');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-text-secondary">Loading...</p>
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Data Sync Management</PageTitle>
      </PageHeader>
      <PageContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Form */}
          <Card>
            <CardHeader>
              <CardTitle>Sync Configuration</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Step 1: Select merchant → Step 2: Configure old server → Step 3: Preview & Sync
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Merchant Selection - Step 1 */}
              <div className="pb-4 border-b">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <h3 className="font-medium text-sm">Select Target Merchant</h3>
                </div>
                
                {/* Merchant Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Target Merchant <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 ml-2">(Select merchant to sync data into)</span>
                  </label>
                  {loadingMerchants ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <SearchableSelect
                      value={merchantId || undefined}
                      onChange={(value) => {
                        setMerchantId(value || '');
                        // Clear previous preview/results when merchant changes
                        setPreview(null);
                        setSyncResult(null);
                        setShowPreview(false);
                        // Add log
                        if (value) {
                          const merchant = merchants.find(m => m.id === value);
                          addLog('info', `Merchant selected: ${merchant?.name || value}`);
                        }
                      }}
                      options={merchants.map(merchant => ({
                        value: merchant.id.toString(),
                        label: `${merchant.name} (${merchant.email})`
                      }))}
                      placeholder="Search and select a merchant..."
                      searchPlaceholder="Search by name or email..."
                      emptyText="No merchants found"
                    />
                  )}
                  
                  {/* Show selected merchant info */}
                  {merchantId && !loadingMerchants && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      {(() => {
                        const selectedMerchant = merchants.find(m => m.id === merchantId);
                        return selectedMerchant ? (
                          <div className="text-sm">
                            <div className="font-medium text-blue-900 mb-1">
                              Selected: {selectedMerchant.name}
                            </div>
                            <div className="text-blue-700">
                              Email: {selectedMerchant.email}
                            </div>
                            <div className="text-xs text-blue-600 mt-1">
                              Data from old server will be synced into this merchant
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Old Server Configuration - Step 2 */}
              <div className="pb-4 border-b">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <h3 className="font-medium text-sm">Configure Old Server Connection</h3>
                </div>
              
              {/* Old Server Endpoint - Hardcoded */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Old Server Endpoint
                </label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <code className="text-sm text-gray-700">{OLD_SERVER_ENDPOINT}</code>
                </div>
                <p className="text-xs text-gray-500 mt-1">Hardcoded endpoint</p>
              </div>

              {/* Old Server Token */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Old Server Admin Token <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Enter old server admin token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Token is not secured (plain text)</p>
              </div>
              </div>

              {/* Entities Selection - Step 3 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <h3 className="font-medium text-sm">Select Entities to Sync</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Entities to Sync <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    {[
                      { key: 'customers', label: 'Customers', icon: Users },
                      { key: 'products', label: 'Products', icon: Package },
                      { key: 'orders', label: 'Orders', icon: ShoppingCart }
                    ].map(({ key, label, icon: Icon }) => (
                      <div key={key} className="space-y-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={entities.includes(key)}
                            onChange={() => handleEntityToggle(key)}
                            className="rounded"
                          />
                          <Icon className="w-4 h-4" />
                          <span>{label}</span>
                        </label>
                        {entities.includes(key) && (
                          <div className="ml-6 space-y-2">
                            {/* Keyword search for all entities */}
                            <Input
                              type="text"
                              placeholder={`Search ${label.toLowerCase()} (optional)`}
                              value={searchParams[key as keyof typeof searchParams]?.keyword_search || ''}
                              onChange={(e) => {
                                setSearchParams(prev => ({
                                  ...prev,
                                  [key]: {
                                    ...prev[key as keyof typeof prev],
                                    keyword_search: e.target.value
                                  }
                                }));
                              }}
                              className="text-sm"
                            />
                            
                            {/* Additional fields for orders */}
                            {key === 'orders' && (
                              <div className="space-y-2 pt-2 border-t border-gray-200">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                                    <Input
                                      type="date"
                                      value={searchParams.orders?.start_date || ''}
                                      onChange={(e) => {
                                        setSearchParams(prev => ({
                                          ...prev,
                                          orders: {
                                            ...prev.orders,
                                            start_date: e.target.value
                                          }
                                        }));
                                      }}
                                      className="text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">End Date</label>
                                    <Input
                                      type="date"
                                      value={searchParams.orders?.end_date || ''}
                                      onChange={(e) => {
                                        setSearchParams(prev => ({
                                          ...prev,
                                          orders: {
                                            ...prev.orders,
                                            end_date: e.target.value
                                          }
                                        }));
                                      }}
                                      className="text-sm"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">After Time</label>
                                  <Input
                                    type="date"
                                    value={searchParams.orders?.after_time || ''}
                                    onChange={(e) => {
                                      setSearchParams(prev => ({
                                        ...prev,
                                        orders: {
                                          ...prev.orders,
                                          after_time: e.target.value
                                        }
                                      }));
                                    }}
                                    className="text-sm"
                                    placeholder="After time (optional)"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Product IDs (comma-separated)</label>
                                  <Input
                                    type="text"
                                    value={searchParams.orders?.product_ids?.join(',') || ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      const productIds = value
                                        ? value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
                                        : [];
                                      setSearchParams(prev => ({
                                        ...prev,
                                        orders: {
                                          ...prev.orders,
                                          product_ids: productIds.length > 0 ? productIds : undefined
                                        }
                                      }));
                                    }}
                                    className="text-sm"
                                    placeholder="e.g., 1, 2, 3"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons - Step 4 */}
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <h3 className="font-medium text-sm">Preview & Execute</h3>
                </div>
                <div className="flex space-x-2">
                <Button
                  onClick={handlePreview}
                  disabled={previewLoading || !token || !merchantId || entities.length === 0}
                  variant="outline"
                  className="flex-1"
                >
                  {previewLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleExecute}
                  disabled={loading || !token || !merchantId || entities.length === 0}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Execute Sync
                    </>
                  )}
                </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results & Logs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Preview Results */}
            {showPreview && preview && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="w-5 h-5 mr-2" />
                    Preview Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {preview.customers && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Customers
                        </span>
                        <Badge variant="default">{preview.customers.count} found</Badge>
                      </div>
                      {preview.customers.pagination && (
                        <div className="text-xs text-gray-600 mb-2 space-y-1">
                          <div>Total: {preview.customers.pagination.count} records</div>
                          <div>Page {preview.customers.pagination.current_page} of {preview.customers.pagination.total_of_page} (Page size: {preview.customers.pagination.page_size})</div>
                        </div>
                      )}
                      {preview.customers.meta && (
                        <div className={`text-xs mb-2 ${preview.customers.meta.status ? 'text-green-600' : 'text-red-600'}`}>
                          Status: {preview.customers.meta.status ? '✓ Success' : '✗ Failed'} 
                          {preview.customers.meta.message && ` - ${preview.customers.meta.message}`}
                        </div>
                      )}
                      {preview.customers.sample && preview.customers.sample.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer text-gray-500 hover:text-gray-700">
                            View sample ({preview.customers.sample.length} items)
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto border border-gray-200 max-h-40">
                            {JSON.stringify(preview.customers.sample, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                  {preview.products && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Products
                        </span>
                        <Badge variant="default">{preview.products.count} found</Badge>
                      </div>
                      {preview.products.pagination && (
                        <div className="text-xs text-gray-600 mb-2 space-y-1">
                          <div>Total: {preview.products.pagination.count} records</div>
                          <div>Page {preview.products.pagination.current_page} of {preview.products.pagination.total_of_page} (Page size: {preview.products.pagination.page_size})</div>
                        </div>
                      )}
                      {preview.products.meta && (
                        <div className={`text-xs mb-2 ${preview.products.meta.status ? 'text-green-600' : 'text-red-600'}`}>
                          Status: {preview.products.meta.status ? '✓ Success' : '✗ Failed'} 
                          {preview.products.meta.message && ` - ${preview.products.meta.message}`}
                        </div>
                      )}
                      {preview.products.sample && preview.products.sample.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer text-gray-500 hover:text-gray-700">
                            View sample ({preview.products.sample.length} items)
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto border border-gray-200 max-h-40">
                            {JSON.stringify(preview.products.sample, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                  {preview.orders && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4" />
                          Orders
                        </span>
                        <Badge variant="default">{preview.orders.count} found</Badge>
                      </div>
                      {preview.orders.pagination && (
                        <div className="text-xs text-gray-600 mb-2 space-y-1">
                          <div>Total: {preview.orders.pagination.count} records</div>
                          <div>Page {preview.orders.pagination.current_page} of {preview.orders.pagination.total_of_page} (Page size: {preview.orders.pagination.page_size})</div>
                        </div>
                      )}
                      {preview.orders.meta && (
                        <div className={`text-xs mb-2 ${preview.orders.meta.status ? 'text-green-600' : 'text-red-600'}`}>
                          Status: {preview.orders.meta.status ? '✓ Success' : '✗ Failed'} 
                          {preview.orders.meta.message && ` - ${preview.orders.meta.message}`}
                        </div>
                      )}
                      {preview.orders.sample && preview.orders.sample.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer text-gray-500 hover:text-gray-700">
                            View sample ({preview.orders.sample.length} items)
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto border border-gray-200 max-h-40">
                            {JSON.stringify(preview.orders.sample, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                  {preview.errors && preview.errors.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-medium text-red-600 mb-2">Errors:</div>
                      {preview.errors.map((error, idx) => (
                        <div key={idx} className="text-sm text-red-500">
                          {error.entity}: {error.error}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Sync Results */}
            {syncResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="w-5 h-5 mr-2" />
                    Sync Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {syncResult.stats.customers && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Customers</span>
                        <div className="flex space-x-2">
                          <Badge variant="default">{syncResult.stats.customers.created} created</Badge>
                          {syncResult.stats.customers.failed > 0 && (
                            <Badge variant="destructive">{syncResult.stats.customers.failed} failed</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {syncResult.stats.products && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Products</span>
                        <div className="flex space-x-2">
                          <Badge variant="default">{syncResult.stats.products.created} created</Badge>
                          {syncResult.stats.products.failed > 0 && (
                            <Badge variant="destructive">{syncResult.stats.products.failed} failed</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {syncResult.stats.orders && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Orders</span>
                        <div className="flex space-x-2">
                          <Badge variant="default">{syncResult.stats.orders.created} created</Badge>
                          {syncResult.stats.orders.failed > 0 && (
                            <Badge variant="destructive">{syncResult.stats.orders.failed} failed</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {syncResult.rollback && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                      <div className="text-sm font-medium text-yellow-800 mb-2">Rollback Executed:</div>
                      <div className="text-sm text-yellow-700">
                        {syncResult.rollback.deleted} records deleted
                        {syncResult.rollback.errors.length > 0 && (
                          <div className="mt-2">
                            Errors: {syncResult.rollback.errors.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Activity Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Activity Logs
                  </span>
                  {logs.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLogs([])}
                      className="text-xs"
                    >
                      Clear Logs
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[600px] overflow-y-auto overflow-x-hidden font-mono text-sm border border-gray-200 rounded p-3 bg-gray-50">
                  <div className="space-y-1">
                    {logs.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <p className="text-sm">No logs yet</p>
                        <p className="text-xs mt-1">Activity logs will appear here</p>
                      </div>
                    ) : (
                      logs.map((log, index) => (
                        <div key={index} className="py-1">
                          <div className="text-gray-600">
                            <span className="text-xs text-gray-500">
                              [{new Date(log.timestamp).toLocaleString()}]
                            </span>
                            <span className="ml-2">{log.message}</span>
                          </div>
                          {log.data && (
                            <details className="mt-1 ml-4">
                              <summary className="text-xs cursor-pointer text-gray-500 hover:text-gray-700">
                                View details
                              </summary>
                              <pre className="mt-1 text-xs bg-white p-2 rounded overflow-auto border border-gray-200">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>
    </PageWrapper>
  );
}

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
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'sync' | 'token' | 'export' | 'import'>('sync');
  
  // Export state
  const [exportLoading, setExportLoading] = useState(false);
  const [exportPreview, setExportPreview] = useState<any>(null);
  const [exportPreviewMode, setExportPreviewMode] = useState(false);
  
  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importValidation, setImportValidation] = useState<any>(null);
  const [importSessionId, setImportSessionId] = useState<number | null>(null);
  const [importProgress, setImportProgress] = useState<any>(null);
  const [importEntityType, setImportEntityType] = useState<string>(''); // Single entity type for single file import
  const [downloadImages, setDownloadImages] = useState<boolean>(true); // Default: download images
  
  // Token test state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenResult, setTokenResult] = useState<{
    success: boolean;
    token?: string;
    error?: string;
    response?: any;
  } | null>(null);
  
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

  // Export functions
  const handleExportPreview = async () => {
    if (!token || entities.length === 0) {
      toastError('Validation Error', 'Please enter token and select at least one entity');
      return;
    }

    setExportLoading(true);
    setExportPreview(null);
    addLog('info', 'Starting export preview...');

    try {
      const apiUrl = createApiUrl('/api/sync-standalone/export');
      const authToken = getAuthToken();
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          entities,
          endpoint: OLD_SERVER_ENDPOINT,
          token,
          preview: true,
          searchParams
        })
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        // Convert files format to preview format for backward compatibility
        const previewData = data.data.files ? {
          ...data.data,
          data: {
            customers: data.data.files.customers?.data || [],
            products: data.data.files.products?.data || [],
            orders: data.data.files.orders?.data || []
          }
        } : data.data;
        setExportPreview(previewData);
        setExportPreviewMode(true);
        addLog('success', 'Export preview loaded');
      } else {
        addLog('error', `Export preview failed: ${data.message || 'Unknown error'}`);
        toastError('Export Preview Failed', data.message || 'Failed to load preview');
      }
    } catch (error: any) {
      console.error('Export preview error:', error);
      addLog('error', `Export preview error: ${error.message || 'Unknown error'}`);
      toastError('Export Preview Error', error.message || 'Failed to load preview');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExport = async () => {
    if (!token || entities.length === 0) {
      toastError('Validation Error', 'Please enter token and select at least one entity');
      return;
    }

    setExportLoading(true);
    addLog('info', 'Starting export...');

    try {
      const apiUrl = createApiUrl('/api/sync-standalone/export');
      const authToken = getAuthToken();
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          entities,
          endpoint: OLD_SERVER_ENDPOINT,
          token,
          preview: false,
          searchParams
        })
      });

      const data = await response.json();
      
      if (data.success && data.data && data.data.files) {
        // Download separate files for each entity
        const files = data.data.files;
        let downloadedCount = 0;
        
        entities.forEach((entity: string) => {
          if (files[entity] && files[entity].data && files[entity].data.length > 0) {
            // Create JSON file for this entity
            const entityData = files[entity].data;
            const jsonStr = JSON.stringify(entityData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            a.download = `export-${entity}-${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            downloadedCount++;
            addLog('success', `✅ Downloaded ${entity} file: ${files[entity].count} records`);
          }
        });

        if (downloadedCount > 0) {
          addLog('success', `✅ Export completed: ${downloadedCount} file(s) downloaded`);
          toastSuccess('Export Success', `${downloadedCount} file(s) downloaded successfully`);
        } else {
          addLog('warning', 'No data to export');
          toastError('Export Warning', 'No data found to export');
        }
      } else {
        addLog('error', `Export failed: ${data.message || 'Unknown error'}`);
        toastError('Export Failed', data.message || 'Failed to export data');
      }
    } catch (error: any) {
      console.error('Export error:', error);
      addLog('error', `Export error: ${error.message || 'Unknown error'}`);
      toastError('Export Error', error.message || 'Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  // Import functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        toastError('Invalid File', 'Only JSON files are supported');
        return;
      }
      setImportFile(file);
      setImportValidation(null);
      setImportEntityType(''); // Reset entity type when file changes
      addLog('info', `File selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    }
  };

  const handleValidateOnly = async () => {
    if (!importFile || !merchantId || !importEntityType) {
      toastError('Validation Error', 'Please select a file, merchant, and entity type');
      return;
    }

    setImportLoading(true);
    addLog('info', 'Validating import file...');

    try {
      const formData = new FormData();
      if (!importEntityType) {
        toastError('Validation Error', 'Please select entity type for this file');
        return;
      }

      formData.append('file', importFile);
      formData.append('merchantId', merchantId.toString());
      formData.append('entityType', importEntityType); // Single entity type
      formData.append('options', JSON.stringify({ 
        validateOnly: true,
        downloadImages: downloadImages
      }));

      const apiUrl = createApiUrl('/api/admin/import-data');
      const authToken = getAuthToken();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        setImportValidation(data.data);
        addLog('success', `Validation complete: ${data.data.valid ? 'Valid' : 'Invalid'}`);
        if (data.data.valid) {
          toastSuccess('Validation Success', 'File is valid and ready to import');
        } else {
          toastError('Validation Failed', `Found ${data.data.errors?.length || 0} errors`);
        }
      } else {
        addLog('error', `Validation failed: ${data.message || 'Unknown error'}`);
        toastError('Validation Failed', data.message || 'Failed to validate file');
      }
    } catch (error: any) {
      console.error('Validation error:', error);
      addLog('error', `Validation error: ${error.message || 'Unknown error'}`);
      toastError('Validation Error', error.message || 'Failed to validate file');
    } finally {
      setImportLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile || !merchantId) {
      toastError('Validation Error', 'Please select a file and merchant');
      return;
    }

    setImportLoading(true);
    setImportProgress(null);
    addLog('info', 'Starting import...');

    try {
      if (!importEntityType) {
        toastError('Validation Error', 'Please select entity type for this file');
        return;
      }

      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('merchantId', merchantId.toString());
      formData.append('entityType', importEntityType); // Single entity type
      formData.append('options', JSON.stringify({ 
        skipDuplicates: true,
        downloadImages: downloadImages
      }));

      const apiUrl = createApiUrl('/api/admin/import-data');
      const authToken = getAuthToken();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        setImportSessionId(data.data.sessionId);
        addLog('success', `Import started with session ID: ${data.data.sessionId}`);
        toastSuccess('Import Started', 'Import process has started. Check progress below.');
        
        // Start polling for progress
        pollImportProgress(data.data.sessionId);
      } else {
        addLog('error', `Import failed: ${data.message || 'Unknown error'}`);
        toastError('Import Failed', data.message || 'Failed to start import');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      addLog('error', `Import error: ${error.message || 'Unknown error'}`);
      toastError('Import Error', error.message || 'Failed to start import');
    } finally {
      setImportLoading(false);
    }
  };

  const pollImportProgress = async (sessionId: number) => {
    const pollInterval = setInterval(async () => {
      try {
        const apiUrl = createApiUrl(`/api/admin/import-data/sessions/${sessionId}`);
        const authToken = getAuthToken();

        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        const data = await response.json();
        
        if (data.success && data.data) {
          setImportProgress(data.data);
          
          if (data.data.status === 'COMPLETED' || data.data.status === 'FAILED') {
            clearInterval(pollInterval);
            if (data.data.status === 'COMPLETED') {
              addLog('success', 'Import completed successfully');
              toastSuccess('Import Completed', 'All data has been imported successfully');
            } else {
              addLog('error', 'Import failed');
              toastError('Import Failed', 'Import process failed. Check errors below.');
            }
          }
        }
      } catch (error) {
        console.error('Error polling import progress:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 5 * 60 * 1000);
  };

  // Test login and get token from old server
  const handleTestLogin = async () => {
    if (!loginEmail || !loginPassword) {
      toastError('Validation Error', 'Please enter both email and password');
      return;
    }

    setTokenLoading(true);
    setTokenResult(null);
    addLog('info', `Testing login with email: ${loginEmail}`);

    const loginUrl = `${OLD_SERVER_ENDPOINT}/rental/login`;
    const requestBody = {
      params: {
        login: loginEmail,
        password: loginPassword
      }
    };

    // Use proxy endpoint to avoid CORS issues
    const proxyUrl = createApiUrl('/api/sync-proxy/login');
    
    let response: Response | null = null;
    let responseText = '';
    let responseData: any = null;

    try {
      addLog('info', `Request URL (via proxy): ${proxyUrl}`);
      addLog('info', `Target URL: ${loginUrl}`);
      addLog('info', `Request Body:`, requestBody);

      response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          login: loginEmail,
          password: loginPassword
        })
      });

      // Get response JSON (proxy returns JSON)
      const proxyResponse = await response.json();
      addLog('info', `Proxy Response Status: ${response.status} ${response.statusText}`);
      addLog('info', `Proxy Response:`, proxyResponse);

      // Proxy response format: { success: boolean, data: any }
      responseData = proxyResponse.data || proxyResponse;
      responseText = JSON.stringify(responseData, null, 2);

      // Always set response data, even on error
      const fullResponse = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: loginUrl,
        proxyUrl: proxyUrl,
        body: responseData,
        rawText: responseText,
        proxyResponse: proxyResponse
      };

      // Check for token in different possible locations
      const token = responseData?.result?.token || responseData?.token || responseData?.data?.token;
      
      if (response.ok && token) {
        const receivedToken = token;
        setTokenResult({
          success: true,
          token: receivedToken,
          response: fullResponse
        });
        setToken(receivedToken); // Auto-fill token field
        addLog('success', `Token received successfully: ${receivedToken.substring(0, 20)}...`);
        toastSuccess('Login Success', 'Token received and saved to sync form');
      } else {
        const errorMessage = responseData?.result?.message || responseData?.message || responseData?.error || `HTTP ${response.status}: ${response.statusText}`;
        setTokenResult({
          success: false,
          error: errorMessage,
          response: fullResponse
        });
        addLog('error', `Login failed: ${errorMessage}`);
        toastError('Login Failed', errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      const errorResponse = {
        error: errorMessage,
        errorType: error.name || 'Error',
        stack: error.stack,
        request: {
          url: loginUrl,
          method: 'POST',
          body: requestBody,
          headers: {
            'accept': 'application/json, text/plain, */*',
            'content-type': 'application/json',
            'lang': 'vi',
            'origin': 'https://www.rentalshop.org',
            'source': 'web'
          }
        },
        response: response ? {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseData,
          rawText: responseText
        } : null
      };

      setTokenResult({
        success: false,
        error: errorMessage,
        response: errorResponse
      });
      addLog('error', `Login error: ${errorMessage}`, errorResponse);
      toastError('Login Error', errorMessage);
    } finally {
      setTokenLoading(false);
    }
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
        {/* Tabs Navigation */}
        <div className="flex space-x-2 border-b mb-6">
          <Button
            variant={activeTab === 'sync' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('sync')}
          >
            <Database className="w-4 h-4 mr-2" />
            Sync Data
          </Button>
          <Button
            variant={activeTab === 'token' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('token')}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Get Token
          </Button>
          <Button
            variant={activeTab === 'export' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('export')}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            variant={activeTab === 'import' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('import')}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
        </div>

        {/* Token Test Tab */}
        {activeTab === 'token' && (
          <Card>
            <CardHeader>
              <CardTitle>Test Login & Get Token</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Test login to old server and get authentication token
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Old Server Endpoint
                  </label>
                  <Input
                    value={OLD_SERVER_ENDPOINT}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Endpoint is hardcoded for testing
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email / Login <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="demo@gmail.com"
                    disabled={tokenLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    disabled={tokenLoading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !tokenLoading) {
                        handleTestLogin();
                      }
                    }}
                  />
                </div>

                <Button
                  onClick={handleTestLogin}
                  disabled={tokenLoading || !loginEmail || !loginPassword}
                  className="w-full"
                >
                  {tokenLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing Login...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Test Login & Get Token
                    </>
                  )}
                </Button>

                {/* Token Result */}
                {tokenResult && (
                  <div className={`p-4 rounded-lg border ${
                    tokenResult.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className={`font-medium ${
                        tokenResult.success ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {tokenResult.success ? '✅ Login Success' : '❌ Login Failed'}
                      </h3>
                    </div>
                    
                    {tokenResult.success && tokenResult.token && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-green-900">
                            Token (auto-filled to sync form):
                          </label>
                          <div className="flex items-center gap-2">
                            <Input
                              value={tokenResult.token}
                              readOnly
                              className="bg-white font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(tokenResult.token || '');
                                toastSuccess('Copied', 'Token copied to clipboard');
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-green-700">
                          Token has been automatically filled in the sync form. Switch to "Sync Data" tab to use it.
                        </p>
                      </div>
                    )}

                    {!tokenResult.success && tokenResult.error && (
                      <div className="mb-3">
                        <p className="text-sm text-red-700 mb-2">
                          <strong>Error:</strong> {tokenResult.error}
                        </p>
                      </div>
                    )}

                    {/* Full Response - Always visible */}
                    {tokenResult.response && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium mb-2 text-gray-700">
                          Full Response:
                        </h4>
                        <pre className="p-3 bg-gray-100 rounded text-xs overflow-auto max-h-96 border border-gray-200">
                          {JSON.stringify(tokenResult.response, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Instructions */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                    <li>Enter your old server login credentials</li>
                    <li>Click "Test Login & Get Token" to authenticate</li>
                    <li>If successful, token will be automatically saved</li>
                    <li>Switch to "Sync Data" tab to use the token for syncing</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <Card>
            <CardHeader>
              <CardTitle>Export from Old Server</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Export data from old server to JSON format
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Old Server Endpoint
                  </label>
                  <Input
                    value={OLD_SERVER_ENDPOINT}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Token <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter old server token"
                    disabled={exportLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Entities to Export <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {['customers', 'products', 'orders'].map((entity) => (
                      <label key={entity} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={entities.includes(entity)}
                          onChange={() => handleEntityToggle(entity)}
                          disabled={exportLoading}
                          className="rounded"
                        />
                        <span className="text-sm capitalize">{entity}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleExportPreview}
                    disabled={exportLoading || !token || entities.length === 0}
                    variant="outline"
                    className="flex-1"
                  >
                    {exportLoading && exportPreviewMode ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading Preview...
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleExport}
                    disabled={exportLoading || !token || entities.length === 0}
                    className="flex-1"
                  >
                    {exportLoading && !exportPreviewMode ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Export & Download
                      </>
                    )}
                  </Button>
                </div>

                {/* Export Preview */}
                {exportPreview && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Preview (First 20 rows)</h4>
                    <div className="space-y-4">
                      {exportPreview.customers && exportPreview.customers.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium mb-1">Customers ({exportPreview.customers.length})</h5>
                          <div className="bg-white rounded p-2 max-h-40 overflow-auto text-xs">
                            <pre>{JSON.stringify(exportPreview.customers.slice(0, 5), null, 2)}</pre>
                            {exportPreview.customers.length > 5 && (
                              <p className="text-gray-500 mt-2">... and {exportPreview.customers.length - 5} more</p>
                            )}
                          </div>
                        </div>
                      )}
                      {exportPreview.products && exportPreview.products.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium mb-1">Products ({exportPreview.products.length})</h5>
                          <div className="bg-white rounded p-2 max-h-40 overflow-auto text-xs">
                            <pre>{JSON.stringify(exportPreview.products.slice(0, 5), null, 2)}</pre>
                            {exportPreview.products.length > 5 && (
                              <p className="text-gray-500 mt-2">... and {exportPreview.products.length - 5} more</p>
                            )}
                          </div>
                        </div>
                      )}
                      {exportPreview.orders && exportPreview.orders.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium mb-1">Orders ({exportPreview.orders.length})</h5>
                          <div className="bg-white rounded p-2 max-h-40 overflow-auto text-xs">
                            <pre>{JSON.stringify(exportPreview.orders.slice(0, 5), null, 2)}</pre>
                            {exportPreview.orders.length > 5 && (
                              <p className="text-gray-500 mt-2">... and {exportPreview.orders.length - 5} more</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {exportPreview.metadata && (
                      <div className="mt-2 text-xs text-blue-700">
                        Total: {exportPreview.metadata.totalCounts?.customers || 0} customers,{' '}
                        {exportPreview.metadata.totalCounts?.products || 0} products,{' '}
                        {exportPreview.metadata.totalCounts?.orders || 0} orders
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Import Data to New System</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Upload JSON file exported from old server and import into new system
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Target Merchant <span className="text-red-500">*</span>
                  </label>
                  {loadingMerchants ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <SearchableSelect
                      value={merchantId || undefined}
                      onChange={(value) => {
                        setMerchantId(value || '');
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
                </div>

                {/* Import Options */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium">
                    Import Options
                  </label>
                  
                  {/* Entity Type Selection (Single File = Single Entity) */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">
                      Entity Type <span className="text-red-500">*</span>
                      <span className="text-gray-400 ml-2">(Select the type of data in this file)</span>
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {['customers', 'products', 'orders'].map((entity) => (
                        <label key={entity} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="importEntityType"
                            value={entity}
                            checked={importEntityType === entity}
                            onChange={(e) => setImportEntityType(e.target.value)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm capitalize">
                            {entity === 'customers' && <Users className="w-4 h-4 inline mr-1" />}
                            {entity === 'products' && <Package className="w-4 h-4 inline mr-1" />}
                            {entity === 'orders' && <ShoppingCart className="w-4 h-4 inline mr-1" />}
                            {entity}
                          </span>
                        </label>
                      ))}
                    </div>
                    {!importEntityType && (
                      <p className="text-xs text-red-500 mt-1">
                        Please select entity type for this file
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      💡 <strong>Note:</strong> Import one entity type per file. Each file should contain only customers, products, or orders.
                    </p>
                  </div>
                  
                  {/* Download Images Option (only for products) */}
                  {importEntityType === 'products' && (
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={downloadImages}
                          onChange={(e) => setDownloadImages(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm">
                          Download and upload product images to S3
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1 ml-6">
                        Images will be downloaded from old server URLs and uploaded to AWS S3
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    JSON File <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="import-file-input"
                      disabled={importLoading}
                    />
                    <label
                      htmlFor="import-file-input"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        {importFile ? importFile.name : 'Click to select JSON file'}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        {importFile ? `${(importFile.size / 1024).toFixed(2)} KB` : 'Max 10MB'}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleValidateOnly}
                    disabled={importLoading || !importFile || !merchantId}
                    variant="outline"
                    className="flex-1"
                  >
                    {importLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Validate Only
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={importLoading || !importFile || !merchantId || !importEntityType}
                    className="flex-1"
                  >
                    {importLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Import
                      </>
                    )}
                  </Button>
                </div>

                {/* Validation Results */}
                {importValidation && (
                  <div className={`p-4 rounded-lg border ${
                    importValidation.valid 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <h4 className={`font-medium mb-2 ${
                      importValidation.valid ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {importValidation.valid ? '✅ Validation Passed' : '❌ Validation Failed'}
                    </h4>
                    {importValidation.preview && (
                      <div className="mb-3">
                        <p className="text-sm mb-2">
                          <strong>Preview:</strong> {importValidation.preview.totalCounts?.customers || 0} customers,{' '}
                          {importValidation.preview.totalCounts?.products || 0} products,{' '}
                          {importValidation.preview.totalCounts?.orders || 0} orders
                        </p>
                      </div>
                    )}
                    {importValidation.errors && importValidation.errors.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Errors ({importValidation.errors.length}):</p>
                        <div className="bg-white rounded p-2 max-h-40 overflow-auto text-xs">
                          {importValidation.errors.slice(0, 10).map((error: any, idx: number) => (
                            <div key={idx} className="mb-1">
                              <span className="font-medium">{error.entity}</span> row {error.row}: {error.error}
                            </div>
                          ))}
                          {importValidation.errors.length > 10 && (
                            <p className="text-gray-500 mt-2">... and {importValidation.errors.length - 10} more errors</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Import Progress */}
                {importProgress && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-3">Import Progress</h4>
                    <div className="space-y-3">
                      {importProgress.progress?.customers && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Customers</span>
                            <span>{importProgress.progress.customers.processed} / {importProgress.progress.customers.total}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${(importProgress.progress.customers.processed / importProgress.progress.customers.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {importProgress.progress?.products && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Products</span>
                            <span>{importProgress.progress.products.processed} / {importProgress.progress.products.total}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${(importProgress.progress.products.processed / importProgress.progress.products.total) * 100}%` }}
                            />
                          </div>
                          {importProgress.stats?.products && (
                            <div className="text-xs text-gray-600 mt-1 flex gap-4">
                              {importProgress.stats.products.imagesDownloaded !== undefined && (
                                <span>📸 Images: {importProgress.stats.products.imagesDownloaded} downloaded</span>
                              )}
                              {importProgress.stats.products.imagesFailed !== undefined && importProgress.stats.products.imagesFailed > 0 && (
                                <span className="text-red-600">⚠️ {importProgress.stats.products.imagesFailed} failed</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {importProgress.progress?.orders && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Orders</span>
                            <span>{importProgress.progress.orders.processed} / {importProgress.progress.orders.total}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${(importProgress.progress.orders.processed / importProgress.progress.orders.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {importProgress.stats && (
                        <div className="mt-3 text-sm space-y-1">
                          <p><strong>Created:</strong> {importProgress.stats.customers?.created || 0} customers,{' '}
                          {importProgress.stats.products?.created || 0} products,{' '}
                          {importProgress.stats.orders?.created || 0} orders</p>
                          <p><strong>Failed:</strong> {importProgress.stats.customers?.failed || 0} customers,{' '}
                          {importProgress.stats.products?.failed || 0} products,{' '}
                          {importProgress.stats.orders?.failed || 0} orders</p>
                          {importProgress.stats.products && (
                            (importProgress.stats.products.imagesDownloaded !== undefined || importProgress.stats.products.imagesFailed !== undefined) && (
                              <p><strong>Images:</strong> {importProgress.stats.products.imagesDownloaded || 0} downloaded
                              {importProgress.stats.products.imagesFailed !== undefined && importProgress.stats.products.imagesFailed > 0 && (
                                <span className="text-red-600">, {importProgress.stats.products.imagesFailed} failed</span>
                              )}
                              </p>
                            )
                          )}
                        </div>
                      )}
                      {importProgress.status === 'COMPLETED' && (
                        <div className="mt-3 p-2 bg-green-100 rounded text-green-800 text-sm">
                          ✅ Import completed successfully!
                        </div>
                      )}
                      {importProgress.status === 'FAILED' && (
                        <div className="mt-3 p-2 bg-red-100 rounded text-red-800 text-sm">
                          ❌ Import failed. Check errors below.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sync Data Tab */}
        {activeTab === 'sync' && (
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
        )}
      </PageContent>
    </PageWrapper>
  );
}

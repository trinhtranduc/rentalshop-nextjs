/**
 * Old Server Sync Service
 * Tách biệt hoàn toàn với hệ thống hiện tại
 * Chỉ dùng để fetch data từ old server và log mọi thứ
 */

export interface SyncLog {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  data?: any;
}

export class OldServerSyncService {
  private logs: SyncLog[] = [];
  private endpoint: string;
  private token: string;
  private additionalHeaders: {
    lat?: string;
    long?: string;
    device?: string;
    version?: string;
    cookie?: string;
  };

  constructor(endpoint: string, token: string, additionalHeaders?: {
    lat?: string;
    long?: string;
    device?: string;
    version?: string;
    cookie?: string;
  }) {
    this.endpoint = endpoint;
    this.token = token;
    this.additionalHeaders = additionalHeaders || {
      lat: '15.985848',
      long: '108.2644128',
      device: 'Iphone 6s',
      version: '234'
    };
  }

  /**
   * Add log entry
   */
  private log(level: SyncLog['level'], message: string, data?: any) {
    const logEntry: SyncLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    this.logs.push(logEntry);
    console.log(`[${level.toUpperCase()}] ${message}`, data || '');
  }

  /**
   * Get all logs
   */
  getLogs(): SyncLog[] {
    return this.logs;
  }

  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Fetch data from old server API
   * Hoàn toàn tách biệt với hệ thống hiện tại
   * Supports pagination via 'page' parameter
   * Logs detailed request and response information
   */
  private async fetchFromOldServer(
    path: string,
    params: Record<string, any> = {}
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    fullResponse?: any; // Include full response for pagination info
  }> {
    try {
      const url = `${this.endpoint}${path}`;
      const requestBody = {
        jsonrpc: '2.0',
        id: null,
        params: params
      };

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'TOKEN': this.token
      };

      // Add additional headers if provided
      if (this.additionalHeaders.lat) {
        headers['lat'] = this.additionalHeaders.lat;
      }
      if (this.additionalHeaders.long) {
        headers['long'] = this.additionalHeaders.long;
      }
      if (this.additionalHeaders.device) {
        headers['device'] = this.additionalHeaders.device;
      }
      if (this.additionalHeaders.version) {
        headers['version'] = this.additionalHeaders.version;
      }
      if (this.additionalHeaders.cookie) {
        headers['Cookie'] = this.additionalHeaders.cookie;
      }

      // Log request details
      this.log('info', `🔗 [REQUEST] ${path}`);
      this.log('info', `📍 URL: ${url}`);
      this.log('info', `📋 Headers:`, headers);
      this.log('info', `📦 Request Body:`, requestBody);

      const requestStartTime = Date.now();
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      const requestDuration = Date.now() - requestStartTime;

      // Log response details
      this.log('info', `📡 [RESPONSE] ${path}`);
      this.log('info', `⏱️ Duration: ${requestDuration}ms`);
      this.log('info', `📊 Status: ${response.status} ${response.statusText}`);
      this.log('info', `📋 Response Headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        this.log('error', `❌ HTTP Error: ${response.status}`, errorText);
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }

      const result = await response.json();
      
      // Log response data (truncated for large responses)
      const responseDataToLog = result.result?.data 
        ? {
            ...result.result,
            data: {
              ...result.result.data,
              customers: Array.isArray(result.result.data.customers) 
                ? `[${result.result.data.customers.length} customers]` 
                : result.result.data.customers,
              products: Array.isArray(result.result.data.products) 
                ? `[${result.result.data.products.length} products]` 
                : result.result.data.products,
              orders: Array.isArray(result.result.data.orders) 
                ? `[${result.result.data.orders.length} orders]` 
                : result.result.data.orders
            }
          }
        : result;
      
      this.log('info', `📦 Response Data:`, responseDataToLog);

      // Parse JSON-RPC 2.0 response format
      let data: any;
      if (result.result) {
        if (result.result.data) {
          // Check nested structure (products, customers, orders)
          if (result.result.data.products && Array.isArray(result.result.data.products)) {
            data = result.result.data.products;
            this.log('success', `✅ Extracted products array: ${data.length} items`);
          } else if (result.result.data.customers && Array.isArray(result.result.data.customers)) {
            data = result.result.data.customers;
            this.log('success', `✅ Extracted customers array: ${data.length} items`);
          } else if (result.result.data.orders && Array.isArray(result.result.data.orders)) {
            data = result.result.data.orders;
            this.log('success', `✅ Extracted orders array: ${data.length} items`);
          } else if (Array.isArray(result.result.data)) {
            data = result.result.data;
            this.log('success', `✅ Extracted data array: ${data.length} items`);
          } else {
            data = result.result.data;
            this.log('success', `✅ Extracted data object`);
          }
        } else {
          data = result.result;
          this.log('success', `✅ Using direct result`);
        }
      } else if (result.data) {
        data = result.data;
        this.log('success', `✅ Using result.data`);
      } else {
        data = result;
        this.log('success', `✅ Using full result`);
      }

      return {
        success: true,
        data,
        fullResponse: result // Include full response for pagination extraction
      };
    } catch (error: any) {
      this.log('error', `❌ Fetch error:`, error.message);
      return {
        success: false,
        error: error.message || 'Unknown fetch error'
      };
    }
  }

  /**
   * Fetch customers from old server - fetch all pages
   */
  async fetchCustomers(keywordSearch: string = ''): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
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
  }> {
    this.log('info', '👥 Starting customers fetch (all pages)...');
    
    const allCustomers: any[] = [];
    let totalPages = 1;
    let currentPage = 1;
    let pageSize = 20;
    let totalCount = 0;
    let meta: any = null;

    // Fetch first page to get pagination info
    const firstPageResult = await this.fetchFromOldServer('/rental/get_customers', {
      keyword_search: keywordSearch
    });

    if (!firstPageResult.success || !firstPageResult.data) {
      this.log('error', `❌ Failed to fetch customers: ${firstPageResult.error}`);
      return firstPageResult;
    }

    // Extract pagination info from firstPageResult.fullResponse (already logged by fetchFromOldServer)
    // Response format: { jsonrpc: "2.0", result: { meta: {...}, data: { customers: [...], total_of_page: 14, ... } } }
    let responseData: any = null;
    try {
      // Use fullResponse from firstPageResult to get pagination info (already fetched and logged)
      if (firstPageResult.fullResponse?.result?.data) {
        responseData = firstPageResult.fullResponse.result.data;
        totalPages = responseData.total_of_page || 1;
        currentPage = responseData.current_page || 1;
        pageSize = responseData.page_size || 20;
        totalCount = responseData.count || 0;
        meta = firstPageResult.fullResponse.result.meta || null;
        
        // Add first page customers
        if (Array.isArray(responseData.customers)) {
          allCustomers.push(...responseData.customers);
          this.log('info', `📄 First page: ${responseData.customers.length} customers, Total pages: ${totalPages}, Total count: ${totalCount}`);
        } else if (Array.isArray(firstPageResult.data)) {
          // Fallback: use extracted data from firstPageResult
          allCustomers.push(...firstPageResult.data);
          this.log('info', `📄 First page (fallback): ${firstPageResult.data.length} customers`);
        }
      } else {
        // Fallback: use first page data directly
        if (Array.isArray(firstPageResult.data)) {
          allCustomers.push(...firstPageResult.data);
          this.log('info', `📄 First page (direct): ${firstPageResult.data.length} customers`);
        }
      }
    } catch (error: any) {
      this.log('warning', `Could not extract pagination info, using first page only: ${error.message}`);
      // Fallback: use first page data
      if (Array.isArray(firstPageResult.data)) {
        allCustomers.push(...firstPageResult.data);
      }
    }

    // Fetch remaining pages
    if (totalPages > 1) {
      this.log('info', `📄 Fetching ${totalPages} pages total...`);
      
      for (let page = 2; page <= totalPages; page++) {
        this.log('info', `📄 Fetching page ${page}/${totalPages}...`);
        
        const pageResult = await this.fetchFromOldServer('/rental/get_customers', {
          keyword_search: keywordSearch,
          page: page
        });

        if (pageResult.success && pageResult.data && Array.isArray(pageResult.data)) {
          allCustomers.push(...pageResult.data);
          this.log('success', `✅ Page ${page} fetched: ${pageResult.data.length} customers`);
    } else {
          this.log('warning', `⚠️ Page ${page} failed: ${pageResult.error || 'Unknown error'}`);
        }
      }
    }

    this.log('success', `✅ All customers fetched: ${allCustomers.length} total customers from ${totalPages} pages`);

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
  }

  /**
   * Fetch products from old server - fetch all pages
   */
  async fetchProducts(keywordSearch: string = ''): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
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
  }> {
    this.log('info', '📦 Starting products fetch (all pages)...');
    
    const allProducts: any[] = [];
    let totalPages = 1;
    let currentPage = 1;
    let pageSize = 20;
    let totalCount = 0;
    let meta: any = null;

    // Fetch first page to get pagination info
    const firstPageResult = await this.fetchFromOldServer('/rental/get_products', {
      keyword_search: keywordSearch
    });

    if (!firstPageResult.success || !firstPageResult.data) {
      this.log('error', `❌ Failed to fetch products: ${firstPageResult.error}`);
      return firstPageResult;
    }

    // Extract pagination info from firstPageResult.fullResponse (already logged by fetchFromOldServer)
    try {
      // Use fullResponse from firstPageResult to get pagination info (already fetched and logged)
      if (firstPageResult.fullResponse?.result?.data) {
        const responseData = firstPageResult.fullResponse.result.data;
        totalPages = responseData.total_of_page || 1;
        currentPage = responseData.current_page || 1;
        pageSize = responseData.page_size || 20;
        totalCount = responseData.count || 0;
        meta = firstPageResult.fullResponse.result.meta || null;
        
        // Add first page products
        if (Array.isArray(responseData.products)) {
          allProducts.push(...responseData.products);
          this.log('info', `📄 First page: ${responseData.products.length} products, Total pages: ${totalPages}, Total count: ${totalCount}`);
        } else if (Array.isArray(firstPageResult.data)) {
          // Fallback: use extracted data from firstPageResult
          allProducts.push(...firstPageResult.data);
          this.log('info', `📄 First page (fallback): ${firstPageResult.data.length} products`);
        }
      } else {
        // Fallback: use first page data directly
        if (Array.isArray(firstPageResult.data)) {
          allProducts.push(...firstPageResult.data);
          this.log('info', `📄 First page (direct): ${firstPageResult.data.length} products`);
        }
      }
    } catch (error: any) {
      this.log('warning', `Could not extract pagination info, using first page only: ${error.message}`);
      if (Array.isArray(firstPageResult.data)) {
        allProducts.push(...firstPageResult.data);
      }
    }

    // Fetch remaining pages
    if (totalPages > 1) {
      this.log('info', `📄 Fetching ${totalPages} pages total...`);
      
      for (let page = 2; page <= totalPages; page++) {
        this.log('info', `📄 Fetching page ${page}/${totalPages}...`);
        
        const pageResult = await this.fetchFromOldServer('/rental/get_products', {
          keyword_search: keywordSearch,
          page: page
        });

        if (pageResult.success && pageResult.data && Array.isArray(pageResult.data)) {
          allProducts.push(...pageResult.data);
          this.log('success', `✅ Page ${page} fetched: ${pageResult.data.length} products`);
    } else {
          this.log('warning', `⚠️ Page ${page} failed: ${pageResult.error || 'Unknown error'}`);
    }
      }
    }

    this.log('success', `✅ All products fetched: ${allProducts.length} total products from ${totalPages} pages`);

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
  }

  /**
   * Fetch orders from old server
   */
  async fetchOrders(options?: {
    startDate?: string;
    endDate?: string;
    productIds?: number[];
    keywordSearch?: string;
    afterTime?: string;
  }): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    this.log('info', '🛒 Starting orders fetch...');
    
    const params: Record<string, any> = {
      keyword_search: options?.keywordSearch || '',
      product_ids: options?.productIds || [],
      after_time: options?.afterTime || options?.startDate || '2020-01-01'
    };

    if (options?.startDate) {
      params.start_date = options.startDate;
    }

    if (options?.endDate) {
      params.end_date = options.endDate;
    }

    const result = await this.fetchFromOldServer('/rental/get_orders', params);

    if (result.success && result.data) {
      this.log('success', `✅ Orders fetched: ${result.data.length} orders`);
    } else {
      this.log('error', `❌ Failed to fetch orders: ${result.error}`);
    }

    return result;
  }

  /**
   * Test connection to old server
   */
  async testConnection(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    this.log('info', '🔍 Testing connection to old server...');
    this.log('info', `📍 Endpoint: ${this.endpoint}`);
    this.log('info', `🔑 Token: ${this.token ? '***' + this.token.slice(-10) : 'NOT SET'}`);

    try {
      // Try to fetch a small amount of data to test connection
      const result = await this.fetchCustomers();
      
      if (result.success) {
        this.log('success', '✅ Connection test successful!');
        return {
          success: true,
          message: 'Connection successful'
        };
      } else {
        this.log('error', `❌ Connection test failed: ${result.error}`);
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error: any) {
      this.log('error', `❌ Connection test error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}


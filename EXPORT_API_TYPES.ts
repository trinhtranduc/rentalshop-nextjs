/**
 * Export API Types for Mobile Implementation
 * 
 * This file contains TypeScript types and interfaces for the 3 export APIs:
 * - Customers Export
 * - Products Export
 * - Orders Export
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

/**
 * Date range period options
 */
export type DateRangePeriod = '1month' | '3months' | '6months' | '1year' | 'custom';

/**
 * Export format options
 */
export type ExportFormat = 'excel' | 'csv';

/**
 * Order status filter
 */
export type OrderStatus = 'RESERVED' | 'PICKUPED' | 'RETURNED' | 'COMPLETED' | 'CANCELLED';

/**
 * Order type filter
 */
export type OrderType = 'RENT' | 'SALE';

/**
 * Date field for orders export
 */
export type OrderDateField = 'createdAt' | 'pickupPlanAt' | 'returnPlanAt';

// ============================================================================
// REQUEST TYPES
// ============================================================================

/**
 * Base export request parameters
 */
export interface BaseExportRequest {
  format?: ExportFormat;
  period: DateRangePeriod;
  startDate?: string; // ISO 8601 format
  endDate?: string; // ISO 8601 format
}

/**
 * Customers export request
 */
export interface CustomersExportRequest extends BaseExportRequest {
  // No additional parameters
}

/**
 * Products export request
 */
export interface ProductsExportRequest extends BaseExportRequest {
  // No additional parameters
}

/**
 * Orders export request
 */
export interface OrdersExportRequest extends BaseExportRequest {
  status?: OrderStatus;
  orderType?: OrderType;
  dateField?: OrderDateField;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Export response (file download)
 */
export interface ExportResponse {
  success: boolean;
  data: Blob | ArrayBuffer; // File content
  filename: string;
  contentType: string;
}

/**
 * Error response
 */
export interface ExportErrorResponse {
  success: false;
  code: string;
  message: string;
}

// ============================================================================
// EXPORT DATA TYPES
// ============================================================================

/**
 * Customer export data row
 */
export interface CustomerExportData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  idType: string;
  idNumber: string;
  isActive: 'Yes' | 'No';
  createdAt: string; // dd/MM/yyyy
  updatedAt: string; // dd/MM/yyyy
}

/**
 * Product export data row
 */
export interface ProductExportData {
  id: number;
  name: string;
  barcode: string;
  description: string;
  stock: number;
  renting: number;
  available: number;
  rentPrice: string; // Formatted number (2 decimals)
  deposit: string; // Formatted number (2 decimals)
  outletId: number;
  createdAt: string; // dd/MM/yyyy
  updatedAt: string; // dd/MM/yyyy
}

/**
 * Order export data row
 */
export interface OrderExportData {
  id: number;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  outletId: number;
  outletName: string;
  outletAddress: string;
  createdById: number;
  createdByName: string;
  createdByEmail: string;
  discountType: string;
  discountValue: string; // Formatted number
  discountAmount: string; // Formatted number (2 decimals)
  totalAmount: string; // Formatted number (2 decimals)
  depositAmount: string; // Formatted number (2 decimals)
  pickupPlanDate: string; // dd/MM/yyyy
  returnPlanDate: string; // dd/MM/yyyy
  pickedUpDate: string; // dd/MM/yyyy
  returnedDate: string; // dd/MM/yyyy
  createdAt: string; // dd/MM/yyyy HH:mm
  updatedAt: string; // dd/MM/yyyy HH:mm
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get date range from period
 */
export function getDateRangeFromPeriod(period: DateRangePeriod): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  
  const startDate = new Date(endDate);
  
  switch (period) {
    case '1month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case '3months':
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case '6months':
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case '1year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case 'custom':
      throw new Error('Custom period requires explicit startDate and endDate');
  }
  
  startDate.setHours(0, 0, 0, 0);
  
  return { startDate, endDate };
}

/**
 * Build query string from export request
 */
export function buildExportQueryString(request: BaseExportRequest | OrdersExportRequest): string {
  const params = new URLSearchParams();
  
  if (request.format) {
    params.append('format', request.format);
  }
  
  params.append('period', request.period);
  
  if (request.period === 'custom') {
    if (request.startDate) {
      params.append('startDate', request.startDate);
    }
    if (request.endDate) {
      params.append('endDate', request.endDate);
    }
  }
  
  // Orders-specific parameters
  if ('status' in request && request.status) {
    params.append('status', request.status);
  }
  if ('orderType' in request && request.orderType) {
    params.append('orderType', request.orderType);
  }
  if ('dateField' in request && request.dateField) {
    params.append('dateField', request.dateField);
  }
  
  return params.toString();
}

/**
 * Parse filename from Content-Disposition header
 */
export function parseFilenameFromHeader(contentDisposition: string | null): string {
  if (!contentDisposition) {
    return 'export.xlsx';
  }
  
  const match = contentDisposition.match(/filename="(.+)"/);
  return match ? match[1] : 'export.xlsx';
}

// ============================================================================
// API CLIENT INTERFACE
// ============================================================================

/**
 * Export API client interface
 */
export interface ExportApiClient {
  /**
   * Export customers
   */
  exportCustomers(
    request: CustomersExportRequest,
    accessToken: string
  ): Promise<ExportResponse>;
  
  /**
   * Export products
   */
  exportProducts(
    request: ProductsExportRequest,
    accessToken: string
  ): Promise<ExportResponse>;
  
  /**
   * Export orders
   */
  exportOrders(
    request: OrdersExportRequest,
    accessToken: string
  ): Promise<ExportResponse>;
}

// ============================================================================
// EXAMPLE IMPLEMENTATION
// ============================================================================

/**
 * Example implementation for React Native / Flutter
 */
export class ExportApiClientImpl implements ExportApiClient {
  constructor(private baseUrl: string) {}
  
  private async downloadFile(
    url: string,
    accessToken: string
  ): Promise<ExportResponse> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      const error: ExportErrorResponse = await response.json();
      throw new Error(error.message || 'Export failed');
    }
    
    const contentType = response.headers.get('Content-Type') || '';
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = parseFilenameFromHeader(contentDisposition);
    
    // Get file content
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    
    return {
      success: true,
      data: arrayBuffer,
      filename,
      contentType,
    };
  }
  
  async exportCustomers(
    request: CustomersExportRequest,
    accessToken: string
  ): Promise<ExportResponse> {
    const queryString = buildExportQueryString(request);
    const url = `${this.baseUrl}/api/customers/export?${queryString}`;
    return this.downloadFile(url, accessToken);
  }
  
  async exportProducts(
    request: ProductsExportRequest,
    accessToken: string
  ): Promise<ExportResponse> {
    const queryString = buildExportQueryString(request);
    const url = `${this.baseUrl}/api/products/export?${queryString}`;
    return this.downloadFile(url, accessToken);
  }
  
  async exportOrders(
    request: OrdersExportRequest,
    accessToken: string
  ): Promise<ExportResponse> {
    const queryString = buildExportQueryString(request);
    const url = `${this.baseUrl}/api/orders/export?${queryString}`;
    return this.downloadFile(url, accessToken);
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/**
 * Example usage:
 * 
 * ```typescript
 * const client = new ExportApiClientImpl('https://api.rentalshop.com');
 * 
 * // Export customers (last 3 months, Excel format)
 * const customersExport = await client.exportCustomers(
 *   {
 *     format: 'excel',
 *     period: '3months'
 *   },
 *   accessToken
 * );
 * 
 * // Export orders (custom range, CSV format, filtered by status)
 * const ordersExport = await client.exportOrders(
 *   {
 *     format: 'csv',
 *     period: 'custom',
 *     startDate: '2024-01-01T00:00:00.000Z',
 *     endDate: '2024-03-31T23:59:59.999Z',
 *     status: 'COMPLETED',
 *     orderType: 'RENT',
 *     dateField: 'pickupPlanAt'
 *   },
 *   accessToken
 * );
 * 
 * // Save file (React Native example)
 * import RNFS from 'react-native-fs';
 * const filePath = `${RNFS.DocumentDirectoryPath}/${customersExport.filename}`;
 * await RNFS.writeFile(filePath, customersExport.data, 'base64');
 * ```
 */


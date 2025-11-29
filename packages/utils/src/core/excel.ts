// ============================================================================
// EXCEL EXPORT UTILITIES
// ============================================================================

import * as XLSX from 'xlsx';

/**
 * Excel cell style options
 */
export interface ExcelCellStyle {
  font?: {
    bold?: boolean;
    color?: string;
    size?: number;
  };
  fill?: {
    fgColor?: { rgb: string };
  };
  alignment?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'middle' | 'bottom';
  };
}

/**
 * Excel column definition
 */
export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  style?: ExcelCellStyle;
}

/**
 * Create Excel workbook from data
 * 
 * @param data - Array of objects to export
 * @param columns - Column definitions
 * @param sheetName - Name of the sheet (default: 'Sheet1')
 * @returns Excel workbook buffer
 */
export function createExcelWorkbook(
  data: any[],
  columns: ExcelColumn[],
  sheetName: string = 'Sheet1'
): Buffer {
  // Prepare worksheet data
  const worksheetData: any[] = [];
  
  // Add header row
  const headerRow: any = {};
  columns.forEach((col) => {
    headerRow[col.key] = col.header;
  });
  worksheetData.push(headerRow);
  
  // Add data rows
  data.forEach((row) => {
    const dataRow: any = {};
    columns.forEach((col) => {
      dataRow[col.key] = row[col.key] ?? '';
    });
    worksheetData.push(dataRow);
  });
  
  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(worksheetData, { skipHeader: true });
  
  // Set column widths
  const colWidths: any[] = [];
  columns.forEach((col, index) => {
    colWidths.push({ wch: col.width || 15 });
  });
  worksheet['!cols'] = colWidths;
  
  // Style header row (first row)
  if (worksheet['!ref']) {
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    // Note: xlsx library has limited styling support
    // For advanced styling, consider using exceljs instead
  }
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Convert to buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  return buffer;
}

/**
 * Format date for Excel (ISO string to readable format)
 * 
 * @param date - Date string or Date object
 * @param format - Format string: 'date' (default) or 'datetime'
 * @returns Formatted date string
 */
export function formatDateForExcel(
  date: Date | string | null | undefined,
  format: 'date' | 'datetime' = 'date'
): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    // Format: dd/MM/yyyy HH:mm
    if (format === 'datetime') {
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
    
    // Format: dd/MM/yyyy (default)
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

/**
 * Format number for Excel
 * 
 * @param value - Number value
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export function formatNumberForExcel(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '';
  return Number(value).toFixed(decimals);
}

/**
 * Generate Excel filename with date range
 * 
 * @param resource - Resource name (customers, products, orders)
 * @param startDate - Start date (optional)
 * @param endDate - End date (optional)
 * @returns Filename string
 */
export function generateExcelFilename(
  resource: string,
  startDate?: string | Date,
  endDate?: string | Date
): string {
  const today = new Date().toISOString().split('T')[0];
  
  if (startDate && endDate) {
    const start = typeof startDate === 'string' ? startDate.split('T')[0] : startDate.toISOString().split('T')[0];
    const end = typeof endDate === 'string' ? endDate.split('T')[0] : endDate.toISOString().split('T')[0];
    return `${resource}-export-${start}-${end}.xlsx`;
  }
  
  return `${resource}-export-${today}.xlsx`;
}


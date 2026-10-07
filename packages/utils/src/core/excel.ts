// ============================================================================
// EXCEL EXPORT UTILITIES
// ============================================================================

import * as XLSX from 'xlsx';
import { formatDateKeyInTimeZone, normalizeStartDate } from './date-range';

/** Exports print and name days in the shop zone (#594). Same value as `SHOP_TIMEZONE`. */
const EXPORT_TIME_ZONE = 'Asia/Ho_Chi_Minh';

/** Zero-padded wall-clock fields of an instant in `timeZone`. */
function wallClockParts(instant: Date, timeZone: string) {
  const values: Record<string, string> = {};
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

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
  format: 'date' | 'datetime' | 'datetime-short' = 'date',
  timeZone: string = EXPORT_TIME_ZONE
): string {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';

    // Wall-clock time of the shop zone, not of the server (Railway runs in UTC) (#594)
    const parts = wallClockParts(dateObj, timeZone);
    const day = parts.day;
    const month = parts.month;
    const year = parts.year;
    const shortYear = String(year).slice(-2);
    const hours = parts.hour;
    const minutes = parts.minute;
    const seconds = parts.second;

    // Format: dd/MM/yy HH:mm:ss (order export spreadsheet parity)
    if (format === 'datetime-short') {
      return `${day}/${month}/${shortYear} ${hours}:${minutes}:${seconds}`;
    }
    
    // Format: dd/MM/yyyy HH:mm
    if (format === 'datetime') {
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
  // Vietnam days (#594): range bounds are Vietnam day instants (start = 17:00Z the day before)
  const today = formatDateKeyInTimeZone(new Date(), EXPORT_TIME_ZONE);
  const dayKey = (value: string | Date): string => {
    const start = normalizeStartDate(value);
    return start ? formatDateKeyInTimeZone(start, EXPORT_TIME_ZONE) : String(value).slice(0, 10);
  };

  if (startDate && endDate) {
    return `${resource}-export-${dayKey(startDate)}-${dayKey(endDate)}.xlsx`;
  }
  
  return `${resource}-export-${today}.xlsx`;
}


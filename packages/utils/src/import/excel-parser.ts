// ============================================================================
// EXCEL PARSER - Parse Excel files for import
// ============================================================================

import * as XLSX from 'xlsx';

export interface ExcelParseResult {
  success: boolean;
  data: any[];
  errors: Array<{
    row: number;
    message: string;
  }>;
}

/**
 * Parse Excel file to JSON array
 * 
 * @param file - Excel file (File object or Buffer)
 * @param options - Parse options
 * @returns Parsed data with errors
 */
export async function parseExcelFile(
  file: File | Buffer,
  options: {
    sheetIndex?: number; // Default: 0 (first sheet)
    headerRowIndex?: number; // Default: 0 (first row is header)
    skipEmptyRows?: boolean; // Default: true
  } = {}
): Promise<ExcelParseResult> {
  const errors: Array<{ row: number; message: string }> = [];
  const data: any[] = [];

  try {
    // Convert file to buffer if needed
    let buffer: Buffer;
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      buffer = file;
    }

    // Parse workbook
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    
    if (workbook.SheetNames.length === 0) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, message: 'Excel file has no sheets' }]
      };
    }

    const sheetIndex = options.sheetIndex ?? 0;
    const sheetName = workbook.SheetNames[sheetIndex];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, message: `Sheet at index ${sheetIndex} not found` }]
      };
    }

    // Convert sheet to JSON (header row is first row by default)
    const headerRowIndex = options.headerRowIndex ?? 0;
    
    // Parse with raw: true first to get raw cell values (preserves leading zeros for text-formatted cells)
    const jsonDataRaw = XLSX.utils.sheet_to_json(worksheet, {
      header: 1, // Use array of arrays format
      defval: '', // Default value for empty cells
      raw: true // Get raw values (preserves string format)
    }) as any[][];
    
    // Also parse with raw: false for non-phone fields (numbers, dates, etc.)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1, // Use array of arrays format
      defval: '', // Default value for empty cells
      raw: false // Parse values (dates, numbers, etc.)
    }) as any[][];

    if (jsonData.length === 0) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, message: 'Excel sheet is empty' }]
      };
    }

    // Get header row
    const headerRow = jsonData[headerRowIndex];
    if (!headerRow || headerRow.length === 0) {
      return {
        success: false,
        data: [],
        errors: [{ row: 0, message: 'Header row is empty' }]
      };
    }

    // Normalize header row (trim, lowercase, remove special chars)
    const headers = headerRow.map((h: any) => 
      String(h || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
    );

    // Identify phone fields (preserve string format, don't convert to number)
    const phoneFieldPatterns = ['phone', 'sdt', 'dien_thoai', 'dien_thoai', 'mobile', 'tel'];
    const isPhoneField = (header: string): boolean => {
      return phoneFieldPatterns.some(pattern => header.includes(pattern));
    };

    // Get phone column indices for raw cell reading
    const phoneColumnIndices: number[] = [];
    headers.forEach((header, colIndex) => {
      if (isPhoneField(header)) {
        phoneColumnIndices.push(colIndex);
      }
    });

    // Helper to get raw cell text (preserves leading zeros)
    const getRawCellText = (rowIndex: number, colIndex: number): string | null => {
      // Use XLSX utility to encode cell address properly (handles columns > 26)
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      
      const cell = worksheet[cellAddress];
      if (!cell) return null;
      
      // Check cell type: 's' = string, 'n' = number, 'b' = boolean, etc.
      // If cell is string type, cell.v will be the string value (may have leading zeros)
      // If cell is number type, cell.v is number and leading zeros are lost
      // cell.w is the formatted display text (preserves format if cell is formatted as text)
      
      // Priority: use cell.w if available (formatted text, preserves leading zeros for text-formatted cells)
      if (cell.w) {
        return cell.w;
      }
      
      // If cell type is string, cell.v is the string value (may have leading zeros)
      if (cell.t === 's' && typeof cell.v === 'string') {
        return cell.v;
      }
      
      // If cell type is number, leading zeros are already lost, but convert to string anyway
      if (cell.v !== undefined && cell.v !== null) {
        return String(cell.v);
      }
      
      return null;
    };

    // Get data rows (skip header row)
    const dataRows = jsonData.slice(headerRowIndex + 1);

    // Parse data rows
    dataRows.forEach((row, index) => {
      const actualRowIndex = headerRowIndex + 1 + index + 1; // +1 for Excel row number (1-based)
      const excelRowIndex = headerRowIndex + 1 + index; // Excel row index (0-based for cell access)

      // Skip empty rows if option is enabled
      if (options.skipEmptyRows !== false) {
        const isEmpty = row.every(cell => !cell || String(cell).trim() === '');
        if (isEmpty) {
          return;
        }
      }

      // Convert row to object
      const rowData: any = {};
      const rawRow = jsonDataRaw[excelRowIndex] || []; // Get raw row for phone fields
      
      headers.forEach((header, colIndex) => {
        const cellValue = row[colIndex]; // Parsed value (from raw: false)
        const rawCellValue = rawRow[colIndex]; // Raw value (from raw: true)
        
        // Convert empty strings to undefined
        if (cellValue === '' || cellValue === null || cellValue === undefined) {
          rowData[header] = undefined;
        } else {
          // For phone fields, use raw value to preserve leading zeros
          if (isPhoneField(header)) {
            // Use raw value if available (preserves string format and leading zeros)
            if (rawCellValue !== undefined && rawCellValue !== null && rawCellValue !== '') {
              rowData[header] = String(rawCellValue).trim();
            } else {
              // Fallback: try to get from cell directly
              const rawText = getRawCellText(excelRowIndex, colIndex);
              rowData[header] = rawText ? rawText.trim() : String(cellValue).trim();
            }
          } else {
            const stringValue = String(cellValue).trim();
            // Try to parse as number if it looks like a number (for non-phone fields)
            if (stringValue && !isNaN(Number(stringValue)) && stringValue !== '') {
              // Check if it's a decimal number
              if (stringValue.includes('.')) {
                rowData[header] = parseFloat(stringValue);
              } else {
                rowData[header] = parseInt(stringValue, 10);
              }
            } else {
              rowData[header] = stringValue;
            }
          }
        }
      });

      data.push(rowData);
    });

    return {
      success: true,
      data,
      errors
    };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, message: error.message || 'Failed to parse Excel file' }]
    };
  }
}

/**
 * Map Excel columns to expected field names
 * Supports multiple column name variations
 */
export function mapExcelColumnsToFields(
  excelData: any[],
  fieldMapping: Record<string, string[]> // fieldName -> [possible excel column names]
): any[] {
  if (excelData.length === 0) return [];

  // Get all column names from first row
  const excelColumns = Object.keys(excelData[0]);
  
  // Create reverse mapping: excelColumn -> fieldName
  const columnToFieldMap: Record<string, string> = {};
  
  excelColumns.forEach(excelCol => {
    const normalizedExcelCol = excelCol.toLowerCase().trim();
    
    // Find matching field
    for (const [fieldName, possibleColumns] of Object.entries(fieldMapping)) {
      if (possibleColumns.some(col => col.toLowerCase().trim() === normalizedExcelCol)) {
        columnToFieldMap[excelCol] = fieldName;
        break;
      }
    }
  });

  // Map data
  return excelData.map(row => {
    const mappedRow: any = {};
    
    Object.entries(columnToFieldMap).forEach(([excelCol, fieldName]) => {
      mappedRow[fieldName] = row[excelCol];
    });

    return mappedRow;
  });
}


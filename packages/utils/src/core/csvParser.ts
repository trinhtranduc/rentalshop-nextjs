/**
 * CSV Parser Utility
 * Parses CSV files and converts them to structured data
 */

export interface CSVParseOptions {
  header?: boolean; // First row is header
  skipEmptyLines?: boolean;
  delimiter?: string;
}

export interface CSVParseResult<T = any> {
  data: T[];
  errors: Array<{ row: number; error: string }>;
  headers?: string[];
}

/**
 * Parse CSV file content
 * @param csvContent - CSV file content as string
 * @param options - Parse options
 * @returns Parsed data with errors
 */
export function parseCSV<T = Record<string, string>>(
  csvContent: string,
  options: CSVParseOptions = {}
): CSVParseResult<T> {
  const {
    header = true,
    skipEmptyLines = true,
    delimiter = ','
  } = options;

  const lines = csvContent.split(/\r?\n/);
  const result: CSVParseResult<T> = {
    data: [],
    errors: []
  };

  if (lines.length === 0) {
    result.errors.push({ row: 0, error: 'CSV file is empty' });
    return result;
  }

  // Parse headers if header option is true
  let headers: string[] = [];
  let startRow = 0;

  if (header) {
    const headerLine = lines[0].trim();
    if (!headerLine) {
      result.errors.push({ row: 1, error: 'Header row is empty' });
      return result;
    }
    headers = parseCSVLine(headerLine, delimiter);
    startRow = 1;
    result.headers = headers;
  }

  // Parse data rows
  for (let i = startRow; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines if option is enabled
    if (skipEmptyLines && !line) {
      continue;
    }

    const rowNumber = i + 1; // 1-based row number for error reporting

    try {
      const values = parseCSVLine(line, delimiter);
      
      // If no headers, use index-based keys
      if (!header || headers.length === 0) {
        const row: any = {};
        values.forEach((value, index) => {
          row[`column${index + 1}`] = value;
        });
        result.data.push(row as T);
      } else {
        // Map values to headers
        const row: any = {};
        headers.forEach((header, index) => {
          const cleanHeader = header.trim().toLowerCase();
          row[cleanHeader] = values[index]?.trim() || '';
        });
        result.data.push(row as T);
      }
    } catch (error: any) {
      result.errors.push({
        row: rowNumber,
        error: error.message || 'Failed to parse row'
      });
    }
  }

  return result;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let currentValue = '';
  let insideQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentValue += '"';
        i += 2;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
        i++;
      }
    } else if (char === delimiter && !insideQuotes) {
      // End of value
      values.push(currentValue);
      currentValue = '';
      i++;
    } else {
      currentValue += char;
      i++;
    }
  }

  // Add last value
  values.push(currentValue);

  return values;
}

/**
 * Parse CSV file from File object
 * @param file - CSV file
 * @param options - Parse options
 * @returns Parsed data with errors
 */
export async function parseCSVFile<T = Record<string, string>>(
  file: File,
  options: CSVParseOptions = {}
): Promise<CSVParseResult<T>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const result = parseCSV<T>(content, options);
        resolve(result);
      } catch (error: any) {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read CSV file'));
    };

    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Normalize CSV headers to match expected field names
 * Supports common variations and case-insensitive matching
 */
export function normalizeCSVHeaders(
  headers: string[],
  fieldMapping: Record<string, string[]>
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const headerLower = headers.map(h => h.trim().toLowerCase());

  Object.entries(fieldMapping).forEach(([targetField, variations]) => {
    const variationsLower = variations.map(v => v.toLowerCase());
    const index = headerLower.findIndex(h => 
      variationsLower.includes(h) || h === targetField.toLowerCase()
    );
    if (index !== -1) {
      mapping[headers[index]] = targetField;
    }
  });

  return mapping;
}

/**
 * Map CSV row to target format using field mapping
 */
export function mapCSVRow<T = any>(
  row: Record<string, string>,
  fieldMapping: Record<string, string>
): Partial<T> {
  const mapped: any = {};

  Object.entries(fieldMapping).forEach(([csvHeader, targetField]) => {
    const value = row[csvHeader.toLowerCase()];
    if (value !== undefined && value !== null && value !== '') {
      mapped[targetField] = value.trim();
    }
  });

  return mapped;
}


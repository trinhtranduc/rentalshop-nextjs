'use client';

import React, { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  Button,
  useToast,
  LoadingIndicator,
  CSVPreviewTable
} from '@rentalshop/ui';
import { Upload, CheckCircle2, AlertCircle, Download, FileText, X, XCircle } from 'lucide-react';
import { 
  parseCSVFile, 
  normalizeCSVHeaders, 
  mapCSVRow,
  parseExcelFile,
  mapExcelColumnsToFields,
  PRODUCT_COLUMN_MAPPING
} from '@rentalshop/utils';
import { productsApi } from '@rentalshop/utils';

const MAX_ROWS = 1000;

interface ImportProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess?: () => void;
}

/**
 * Import Product Dialog
 * Allows users to import products from CSV file with preview
 */
export function ImportProductDialog({
  open,
  onOpenChange,
  onImportSuccess
}: ImportProductDialogProps) {
  const t = useTranslations('products.import');
  const { toastSuccess, toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Array<Record<string, any>>>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [errors, setErrors] = useState<Array<{ row: number; error: string }>>([]);
  const [duplicates, setDuplicates] = useState<Array<{ row: number; reason: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    failed: number;
    total: number;
  } | null>(null);

  // Field mapping for CSV headers to product fields
  const productFieldMapping: Record<string, string[]> = {
    name: ['name', 'ten', 'product name', 'product_name', 'ten san pham'],
    description: ['description', 'mo ta', 'mo_ta', 'desc'],
    barcode: ['barcode', 'ma vach', 'ma_vach', 'sku', 'code'],
    categoryName: ['categoryname', 'category name', 'category_name', 'danh muc', 'danh_muc', 'category'],
    rentPrice: ['rentprice', 'rent price', 'rent_price', 'gia thue', 'gia_thue', 'price'],
    salePrice: ['saleprice', 'sale price', 'sale_price', 'gia ban', 'gia_ban'],
    costPrice: ['costprice', 'cost price', 'cost_price', 'gia von', 'gia_von', 'cost'],
    deposit: ['deposit', 'tien coc', 'tien_coc', 'coc'],
    stock: ['stock', 'ton kho', 'ton_kho', 'quantity', 'qty', 'so luong', 'so_luong']
    // pricingType and durationConfig are hidden - using default values
  };

  const handleFileSelect = async (selectedFile: File) => {
    const fileName = selectedFile.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    
    if (!isCSV && !isExcel) {
      toastError(t('onlyCsv') || 'Only CSV and Excel files (.csv, .xlsx, .xls) are supported');
      return;
    }
    
    setFile(selectedFile);
    setPreviewData([]);
    setHeaders([]);
    setErrors([]);
    setDuplicates([]);
    setImportResult(null);
    setLoading(true);

    try {
      let mappedData: Array<Record<string, any>> = [];
      let headers: string[] = [];
      let parseErrors: Array<{ row: number; error: string }> = [];

      if (isExcel) {
        // Parse Excel file
        const result = await parseExcelFile(selectedFile, {
          sheetIndex: 0,
          headerRowIndex: 0,
          skipEmptyRows: true
        });

        if (!result.success) {
          toastError(result.errors[0]?.message || 'Failed to parse Excel file');
          setLoading(false);
          return;
        }

        // Check max rows limit
        if (result.data.length > MAX_ROWS) {
          toastError(
            t('maxRowsExceeded', { maxRows: MAX_ROWS }) || 
            `File contains ${result.data.length} rows. Maximum allowed is ${MAX_ROWS} rows.`
          );
          setLoading(false);
          return;
        }

        // Map Excel columns to product fields
        const mapped = mapExcelColumnsToFields(result.data, PRODUCT_COLUMN_MAPPING);
        
        // Get headers from first row of mapped data
        if (mapped.length > 0) {
          headers = Object.keys(mapped[0]);
        }

        // Add row numbers
        mappedData = mapped.map((row, index) => ({
          ...row,
          _originalRow: index + 1
        }));

        // Convert parse errors
        parseErrors = result.errors.map(e => ({
          row: e.row,
          error: e.message
        }));
      } else {
      // Parse CSV file
      const result = await parseCSVFile(selectedFile, {
        header: true,
        skipEmptyLines: true
      });

      // Check max rows limit
      if (result.data.length > MAX_ROWS) {
          toastError(
            t('maxRowsExceeded', { maxRows: MAX_ROWS }) || 
            `File contains ${result.data.length} rows. Maximum allowed is ${MAX_ROWS} rows.`
          );
        setLoading(false);
        return;
      }

      if (result.errors.length > 0) {
          parseErrors = result.errors;
      }

      if (result.headers && result.data.length > 0) {
        // Normalize headers
        const headerMapping = normalizeCSVHeaders(result.headers, productFieldMapping);
        
        // Map data to product format
          mappedData = result.data.map((row, index) => {
          const mapped = mapCSVRow(row, headerMapping);
          return {
            ...mapped,
            _originalRow: index + 1 // Store display row number (start from 1)
          };
        });

          headers = result.headers;
        }
      }

      if (parseErrors.length > 0) {
        setErrors(parseErrors);
      }

      if (mappedData.length > 0) {
        // Check for duplicate names
        const nameMap = new Map<string, number[]>();
        const duplicateList: Array<{ row: number; reason: string }> = [];

        mappedData.forEach((row) => {
          const rowNumber = row._originalRow || 1;
          const name = (row.name || '').trim();
          
          if (name) {
            if (nameMap.has(name)) {
              const existingRows = nameMap.get(name)!;
              if (existingRows.length === 1) {
                // Mark first occurrence as duplicate too
                duplicateList.push({
                  row: existingRows[0],
                  reason: 'Duplicate product name'
                });
              }
              duplicateList.push({
                row: rowNumber,
                reason: 'Duplicate product name'
              });
            } else {
              nameMap.set(name, [rowNumber]);
            }
          }
        });

        setDuplicates(duplicateList);
        setHeaders(headers);
        setPreviewData(mappedData);
      } else {
        toastError(t('noData'));
      }
    } catch (error: any) {
      console.error('Error parsing file:', error);
      toastError(error.message || t('parseError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewData([]);
    setHeaders([]);
    setErrors([]);
    setDuplicates([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!file || previewData.length === 0) {
      toastError(t('fileError'));
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      // Filter out rows with errors and duplicates
      const validData = previewData.filter((row, index) => {
        const rowNumber = index + 1; // Display row number (start from 1)
        const hasError = errors.some(e => e.row === rowNumber);
        const isDuplicate = duplicates.some(d => d.row === rowNumber);
        return !hasError && !isDuplicate;
      });

      if (validData.length === 0) {
        toastError(t('noData'));
        setImporting(false);
        return;
      }

      // Convert to product input format
      const products: any[] = validData.map((row) => {
        const product: any = {
          name: row.name || '',
          description: row.description,
          barcode: row.barcode,
          categoryName: row.categoryname || row.categoryName,
          rentPrice: row.rentprice || row.rentPrice ? parseFloat(String(row.rentprice || row.rentPrice)) : 0,
          salePrice: row.saleprice || row.salePrice ? parseFloat(String(row.saleprice || row.salePrice)) : undefined,
          costPrice: row.costprice || row.costPrice ? parseFloat(String(row.costprice || row.costPrice)) : undefined,
          deposit: row.deposit ? parseFloat(String(row.deposit)) : 0,
          stock: row.stock ? parseInt(String(row.stock)) : 0,
          // pricingType and durationConfig use default values (not included in import)
        };

        // Remove empty fields
        Object.keys(product).forEach(key => {
          if (product[key] === '' || product[key] === null || product[key] === undefined) {
            delete product[key];
          }
        });

        return product;
      });

      // Call bulk import API
      const response = await productsApi.importProducts(products);

      if (response.success && response.data) {
        setImportResult({
          imported: response.data.imported || 0,
          failed: response.data.failed || 0,
          total: response.data.total || products.length
        });

        if (response.data.imported > 0) {
          toastSuccess(t('success'));
          // Close dialog and reload page on successful import
          if (onImportSuccess) {
            onImportSuccess();
          }
          // Close dialog after a short delay to show success message
          setTimeout(() => {
            setFile(null);
            setPreviewData([]);
            setHeaders([]);
            setErrors([]);
            setDuplicates([]);
            setImportResult(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            onOpenChange(false);
          }, 1000);
        }

        if (response.data.failed > 0) {
          toastError(t('failed'));
        }
      } else {
        throw new Error(response.message || 'Import failed');
      }
    } catch (error: any) {
      console.error('Error importing products:', error);
      toastError(error.message || t('failed'));
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await productsApi.downloadSampleFile();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
      a.download = `products-import-sample-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toastError('Failed to download sample file', error.message);
    }
  };

  const handleClose = () => {
    if (!importing) {
      setFile(null);
      setPreviewData([]);
      setHeaders([]);
      setErrors([]);
      setDuplicates([]);
      setImportResult(null);
      onOpenChange(false);
    }
  };

  // Calculate valid count
  const validCount = previewData.length - errors.length - duplicates.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl h-[90vh] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description', { maxRows: MAX_ROWS })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* File Upload Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t('selectFile')}</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                disabled={importing}
                className="text-xs"
              >
                <FileText className="mr-2 h-4 w-4" />
                {t('template')}
              </Button>
            </div>
            
            {!file ? (
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) {
                      handleFileSelect(selectedFile);
                    }
                  }}
                  className="hidden"
                  id="file-upload"
                  disabled={importing}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <Upload className="h-8 w-8 text-text-secondary" />
                  <span className="text-sm text-text-primary">
                    {t('clickOrDrag')}
                  </span>
                  <span className="text-xs text-text-secondary">{t('onlyCsv')}</span>
                </label>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-bg-secondary">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-text-secondary" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-text-secondary">
                    ({(file.size / 1024).toFixed(2)} KB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  disabled={importing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <LoadingIndicator />
              <span className="ml-3 text-sm text-text-secondary">{t('parsing')}</span>
            </div>
          )}

          {/* Preview */}
          {previewData.length > 0 && !loading && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <CSVPreviewTable
                data={previewData}
                headers={headers}
                errors={errors}
                duplicates={duplicates}
                maxRows={50}
              />
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-800/50">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  {t('completed', { 
                    imported: importResult.imported, 
                    failed: importResult.failed, 
                    skipped: duplicates.length 
                  })}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={importing}
          >
            {importResult ? t('close') : t('cancel')}
          </Button>
          {!importResult && (
            <Button
              type="button"
              onClick={handleImport}
              disabled={!file || importing || (previewData.length > 0 && (errors.length > 0 || validCount === 0))}
            >
              {importing ? (
                <>
                  <LoadingIndicator className="w-4 h-4 mr-2" />
                  {t('importing')}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {previewData.length > 0 
                    ? (validCount === 1 ? t('import', { count: validCount }) : t('importPlural', { count: validCount }))
                    : 'Import'
                  }
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


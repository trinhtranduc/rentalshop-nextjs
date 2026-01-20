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
  FileUploadZone,
  CSVPreviewTable
} from '@rentalshop/ui';
import { Upload, CheckCircle2, AlertCircle, Download, FileText, X, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  parseCSVFile, 
  normalizeCSVHeaders, 
  mapCSVRow,
  parseExcelFile,
  mapExcelColumnsToFields,
  CUSTOMER_COLUMN_MAPPING
} from '@rentalshop/utils';
import { customersApi } from '@rentalshop/utils';
import type { CustomerCreateInput } from '@rentalshop/types';

const MAX_ROWS = 1000;

interface ImportCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess?: () => void;
}

/**
 * Import Customer Dialog
 * Allows users to import customers from CSV file with preview
 */
export function ImportCustomerDialog({
  open,
  onOpenChange,
  onImportSuccess
}: ImportCustomerDialogProps) {
  const t = useTranslations('customers.import');
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
    errors?: Array<{ row: number; error: string }>;
  } | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  // Field mapping for CSV headers to customer fields
  const customerFieldMapping: Record<string, string[]> = {
    firstName: ['firstname', 'first name', 'first_name', 'ten', 'ho'],
    lastName: ['lastname', 'last name', 'last_name', 'ho ten', 'ho_ten'],
    email: ['email', 'e-mail', 'mail'],
    phone: ['phone', 'phone number', 'phone_number', 'sdt', 'dien thoai', 'dien_thoai', 'mobile'],
    address: ['address', 'dia chi', 'dia_chi', 'address line', 'address_line'],
    city: ['city', 'thanh pho', 'thanh_pho', 'tp'],
    state: ['state', 'tinh', 'province'],
    zipCode: ['zipcode', 'zip code', 'zip_code', 'postal code', 'postal_code', 'ma buu dien'],
    country: ['country', 'quoc gia', 'quoc_gia'],
    dateOfBirth: ['dateofbirth', 'date of birth', 'date_of_birth', 'dob', 'ngay sinh', 'ngay_sinh'],
    idNumber: ['idnumber', 'id number', 'id_number', 'cmnd', 'cccd', 'so cmnd', 'so_cmnd'],
    idType: ['idtype', 'id type', 'id_type', 'loai giay to', 'loai_giay_to'],
    notes: ['notes', 'note', 'ghi chu', 'ghi_chu', 'memo']
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

        // Map Excel columns to customer fields
        const mapped = mapExcelColumnsToFields(result.data, CUSTOMER_COLUMN_MAPPING);
        
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
        const headerMapping = normalizeCSVHeaders(result.headers, customerFieldMapping);
        
        // Map data to customer format
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
        // Validate required fields and check for duplicates
        const validationErrors: Array<{ row: number; error: string }> = [];
        const phoneMap = new Map<string, number[]>();
        const duplicateList: Array<{ row: number; reason: string }> = [];

        mappedData.forEach((row) => {
          const rowNumber = row._originalRow || 1;
          
          // Validate firstName (required)
          const firstName = (row.firstname || row.firstName || '').trim();
          if (!firstName || firstName === '') {
            validationErrors.push({
              row: rowNumber,
              error: 'First name is required'
            });
          }
          
          // Check for duplicate phones
          const phone = (row.phone || '').trim();
          if (phone) {
            if (phoneMap.has(phone)) {
              const existingRows = phoneMap.get(phone)!;
              if (existingRows.length === 1) {
                // Mark first occurrence as duplicate too
                duplicateList.push({
                  row: existingRows[0],
                  reason: 'Duplicate phone number'
                });
              }
              duplicateList.push({
                row: rowNumber,
                reason: 'Duplicate phone number'
              });
            } else {
              phoneMap.set(phone, [rowNumber]);
            }
          }
        });

        // Add validation errors to existing errors
        if (validationErrors.length > 0) {
          setErrors(prev => [...prev, ...validationErrors]);
        }

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

      // Convert to customer input format
      const customers: any[] = validData.map((row) => {
        const firstName = (row.firstname || row.firstName || '').trim();
        
        // Ensure firstName is not empty (should be filtered by validation, but double check)
        if (!firstName) {
          return null; // Will be filtered out
        }

        const customer: any = {
          firstName: firstName,
          lastName: row.lastname || row.lastName,
          email: row.email,
          phone: row.phone,
          address: row.address,
          city: row.city,
          state: row.state,
          zipCode: row.zipcode || row.zipCode,
          country: row.country,
          dateOfBirth: row.dateofbirth || row.dateOfBirth,
          idNumber: row.idnumber || row.idNumber,
          idType: row.idtype || row.idType,
          notes: row.notes
        };

        // Remove empty fields (but keep firstName)
        Object.keys(customer).forEach(key => {
          if (key !== 'firstName' && (customer[key] === '' || customer[key] === null || customer[key] === undefined)) {
            delete customer[key];
          }
        });

        return customer;
      }).filter(c => c !== null); // Filter out null entries

      // Call bulk import API
      const response = await customersApi.importCustomers(customers);

      if (response.success && response.data) {
        setImportResult({
          imported: response.data.imported || 0,
          failed: response.data.failed || 0,
          total: response.data.total || customers.length,
          errors: response.data.errors || []
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
      console.error('Error importing customers:', error);
      toastError(error.message || t('failed'));
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await customersApi.downloadSampleFile();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
      a.download = `customers-import-sample-${new Date().toISOString().split('T')[0]}.xlsx`;
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
            Tải lên file CSV hoặc Excel (tối đa {MAX_ROWS} dòng). Các bản ghi trùng lặp sẽ được bỏ qua.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
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
                  accept=".csv,.xlsx,.xls"
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
                  <span className="text-xs text-text-secondary">CSV hoặc Excel (.csv, .xlsx, .xls)</span>
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
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900 dark:text-green-100">Thành công</span>
                  </div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">{importResult.imported}</div>
                </div>
                <div 
                  className={`p-3 rounded-lg border transition-colors ${
                    importResult.failed > 0 
                      ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20' 
                      : 'bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-800'
                  }`}
                  onClick={() => importResult.failed > 0 && setShowErrors(!showErrors)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="text-sm font-medium text-red-900 dark:text-red-100">Thất bại</span>
                    </div>
                    {importResult.failed > 0 && (
                      showErrors ? (
                        <ChevronUp className="h-4 w-4 text-red-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-red-600" />
                      )
                    )}
                  </div>
                  <div className="text-2xl font-bold text-red-700 dark:text-red-400">{importResult.failed}</div>
                  {importResult.failed > 0 && !showErrors && (
                    <div className="text-xs text-red-600 mt-1">Click để xem chi tiết</div>
                  )}
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Tổng cộng</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {importResult.imported + importResult.failed}
                  </div>
                </div>
              </div>

              {/* Error Details */}
              {showErrors && importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800 max-h-60 overflow-y-auto">
                  <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">Chi tiết lỗi:</h4>
                  <div className="space-y-2">
                    {importResult.errors.map((err, index) => (
                      <div key={index} className="text-sm text-red-800 dark:text-red-200">
                        <span className="font-medium">Dòng {err.row}:</span> {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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


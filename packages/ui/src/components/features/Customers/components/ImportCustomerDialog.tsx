'use client';

import React, { useState, useRef, useEffect } from 'react';
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
import { Upload, CheckCircle2, AlertCircle, Download, FileText, X, XCircle, ChevronDown, ChevronUp, Copy } from 'lucide-react';
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
import { importInChunks, type ChunkedImportProgress, type ChunkedImportItem } from '../../Import/chunked-import';

const MAX_ROWS = 20000;
const IMPORT_CHUNK_SIZE = 1000; // Increased to 1000 rows per chunk for better performance
const PREVIEW_MAX_ROWS = 200;

function normalizeImportPhone(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  // Convert to string and remove spaces, hyphens, parentheses
  let normalizedPhone = String(value).trim().replace(/[\s\-()]/g, '');
  
  if (!normalizedPhone) {
    return undefined;
  }

  // Restore leading zero for Vietnamese phone numbers
  // Vietnamese phone numbers: 0[3|5|7|8|9][0-9]{8} (10 digits total)
  // If Excel parsed as number, leading zero is lost → 9 digits starting with 3,5,7,8,9
  if (normalizedPhone.length === 9) {
    const firstDigit = normalizedPhone[0];
    // If starts with Vietnamese mobile prefixes (3, 5, 7, 8, 9), add leading zero
    if (['3', '5', '7', '8', '9'].includes(firstDigit)) {
      normalizedPhone = '0' + normalizedPhone;
    }
  }

  return normalizedPhone;
}

interface ImportCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess?: () => void;
  merchantId?: number; // Optional merchantId for admin context
}

/**
 * Import Customer Dialog
 * Allows users to import customers from CSV file with preview
 */
export function ImportCustomerDialog({
  open,
  onOpenChange,
  onImportSuccess,
  merchantId
}: ImportCustomerDialogProps) {
  const t = useTranslations('customers.import');
  const { toastSuccess, toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chunkLogsEndRef = useRef<HTMLDivElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Array<Record<string, any>>>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [errors, setErrors] = useState<Array<{ row: number; error: string }>>([]);
  const [duplicates, setDuplicates] = useState<Array<{ row: number; reason: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    failed: number;
    total: number;
    errors?: Array<{ row: number; error: string }>;
  } | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [importProgress, setImportProgress] = useState<ChunkedImportProgress | null>(null);
  const [chunkLogs, setChunkLogs] = useState<Array<{
    chunk: number;
    status: 'processing' | 'success' | 'failed' | 'partial';
    imported: number;
    skipped: number;
    failed: number;
    errors?: Array<{ row: number; error: string }>;
    message?: string;
  }>>([]);

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

        // Add row numbers and preserve phone as string (don't normalize in preview)
        mappedData = mapped.map((row, index) => {
          const processedRow: Record<string, any> = {
            ...row,
            _originalRow: index + 1
          };
          // Convert phone to string for preview (preserve original format, don't normalize)
          if (processedRow.phone !== undefined && processedRow.phone !== null && processedRow.phone !== '') {
            processedRow.phone = String(processedRow.phone);
          }
          return processedRow;
        });

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
          const processedRow: Record<string, any> = {
            ...mapped,
            _originalRow: index + 1 // Store display row number (start from 1)
          };
          // Convert phone to string for preview (preserve original format, don't normalize)
          if (processedRow.phone !== undefined && processedRow.phone !== null && processedRow.phone !== '') {
            processedRow.phone = String(processedRow.phone);
          }
          return processedRow;
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
          // Convert to string first (Excel parser may return number)
          const firstName = String(row.firstname || row.firstName || '').trim();
          if (!firstName || firstName === '') {
            validationErrors.push({
              row: rowNumber,
              error: 'First name is required'
            });
          }
          
          // Check for duplicate phones
          // Convert to string first (Excel parser may return number for phone)
          const phone = normalizeImportPhone(row.phone);
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
    setImportProgress(null);
      setChunkLogs([]);
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
    setImportProgress(null);
    setChunkLogs([]);

    try {
      // Filter out rows with errors and duplicates
      const validData = previewData.filter((row, index) => {
        const rowNumber = row._originalRow || index + 1;
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
      const customers: ChunkedImportItem<any>[] = validData.map((row) => {
        const firstName = (row.firstname || row.firstName || '').trim();
        
        // Ensure firstName is not empty (should be filtered by validation, but double check)
        if (!firstName) {
          return null; // Will be filtered out
        }

        const customer: any = {
          firstName: firstName,
          lastName: row.lastname || row.lastName,
          email: row.email,
          phone: normalizeImportPhone(row.phone),
          address: row.address,
          city: row.city,
          state: row.state,
          zipCode: row.zipcode || row.zipCode,
          country: row.country,
          dateOfBirth: row.dateofbirth || row.dateOfBirth,
          idNumber: row.idnumber || row.idNumber,
          idType: row.idtype || row.idType,
          notes: row.notes,
          // Add merchantId if provided (for admin context when importing from merchant page)
          ...(merchantId && { merchantId })
        };

        // Remove empty fields (but keep firstName)
        Object.keys(customer).forEach(key => {
          if (key !== 'firstName' && (customer[key] === '' || customer[key] === null || customer[key] === undefined)) {
            delete customer[key];
          }
        });

        return {
          originalRow: row._originalRow || 1,
          payload: customer
        };
      }).filter(c => c !== null); // Filter out null entries

      const chunkedResult = await importInChunks(
        customers,
        IMPORT_CHUNK_SIZE,
        async (chunk, chunkIndex) => {
          const currentChunk = chunkIndex + 1;
          // Log chunk start
          setChunkLogs(prev => [...prev, {
            chunk: currentChunk,
            status: 'processing',
            imported: 0,
            skipped: 0,
            failed: 0,
            message: `Đang xử lý đợt ${currentChunk}...`
          }]);

          try {
            const response = await customersApi.importCustomers(chunk);
            
            if (response.success && response.data) {
              const status = response.data.failed === 0 && (response.data.errors?.length || 0) === 0
                ? 'success'
                : (response.data.imported === 0 ? 'failed' : 'partial');
              
              const chunkResult = {
                chunk: currentChunk,
                status,
                imported: response.data.imported || 0,
                skipped: response.data.skipped || 0,
                failed: response.data.failed || 0,
                errors: response.data.errors || [],
                message: status === 'success' 
                  ? `Đợt ${currentChunk} thành công: ${response.data.imported} dòng`
                  : status === 'failed'
                  ? `Đợt ${currentChunk} thất bại: ${response.data.failed} dòng`
                  : `Đợt ${currentChunk} một phần: ${response.data.imported} thành công, ${response.data.failed} thất bại`
              };

              setChunkLogs(prev => {
                const newLogs = [...prev];
                newLogs[newLogs.length - 1] = chunkResult;
                return newLogs;
              });

              return response;
            } else {
              const chunkResult = {
                chunk: currentChunk,
                status: 'failed' as const,
                imported: 0,
                skipped: 0,
                failed: chunk.length,
                message: `Đợt ${currentChunk} thất bại: ${response.message || 'Lỗi không xác định'}`
              };

              setChunkLogs(prev => {
                const newLogs = [...prev];
                newLogs[newLogs.length - 1] = chunkResult;
                return newLogs;
              });

              return response;
            }
          } catch (error: any) {
            const chunkResult = {
              chunk: currentChunk,
              status: 'failed' as const,
              imported: 0,
              skipped: 0,
              failed: chunk.length,
              message: `Đợt ${currentChunk} thất bại: ${error.message || 'Lỗi không xác định'}`
            };

            setChunkLogs(prev => {
              const newLogs = [...prev];
              newLogs[newLogs.length - 1] = chunkResult;
              return newLogs;
            });

            throw error;
          }
        },
        setImportProgress
      );

      setImportResult(chunkedResult);

      if (chunkedResult.imported > 0 && chunkedResult.failed === 0) {
        toastSuccess(t('success'));
        if (onImportSuccess) {
          onImportSuccess();
        }
        setTimeout(() => {
          setFile(null);
          setPreviewData([]);
          setHeaders([]);
          setErrors([]);
          setDuplicates([]);
          setImportResult(null);
          setImportProgress(null);
          setChunkLogs([]);
          onOpenChange(false);
        }, 1000);
      } else if (chunkedResult.imported > 0 && chunkedResult.failed > 0) {
        toastError(`Import stopped at chunk ${importProgress?.currentChunk || '?'}. Some rows were already imported.`);
      } else if (chunkedResult.failed > 0) {
        toastError(t('failed'));
      }
    } catch (error: any) {
      console.error('Error importing customers:', error);
      toastError(error.message || t('failed'));
    } finally {
      setImporting(false);
    }
  };

  const handleCopyAllErrors = async () => {
    if (!importResult?.errors || importResult.errors.length === 0) return;
    
    const errorText = importResult.errors
      .map(err => `Dòng ${err.row}: ${err.error}`)
      .join('\n');
    
    try {
      await navigator.clipboard.writeText(errorText);
      toastSuccess('Đã copy tất cả lỗi vào clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
      toastError('Không thể copy lỗi');
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
      setImportProgress(null);
      setChunkLogs([]);
      onOpenChange(false);
    }
  };

  // Auto-scroll to latest chunk log
  useEffect(() => {
    if (chunkLogsEndRef.current && importing) {
      chunkLogsEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [chunkLogs, importing]);

  // Calculate valid count
  const validCount = previewData.length - errors.length - duplicates.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl h-[90vh] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            Tải lên file CSV hoặc Excel (tối đa {MAX_ROWS} dòng). Hệ thống sẽ tự động chia thành từng đợt {IMPORT_CHUNK_SIZE} dòng và import tuần tự để tránh timeout.
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
                maxRows={PREVIEW_MAX_ROWS}
              />
            </div>
          )}

          {/* Progress Section */}
          {importing && importProgress && (
            <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/10 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Đang import đợt {importProgress.currentChunk}/{importProgress.totalChunks}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  {importProgress.processedRows}/{importProgress.totalRows} dòng ({Math.round((importProgress.processedRows / importProgress.totalRows) * 100)}%)
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 dark:bg-blue-400 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${(importProgress.processedRows / importProgress.totalRows) * 100}%` }}
                />
              </div>

              {/* Chunk Status List */}
              {chunkLogs.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Trạng thái từng đợt ({chunkLogs.length}/{importProgress.totalChunks}):
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {chunkLogs.map((log, index) => (
                      <div 
                        key={`${log.chunk}-${index}`}
                        ref={index === chunkLogs.length - 1 ? chunkLogsEndRef : null}
                        className={`p-3 rounded-lg border transition-all ${
                          log.status === 'success' 
                            ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                            : log.status === 'failed'
                            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                            : log.status === 'partial'
                            ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
                            : 'bg-blue-100 dark:bg-blue-800/20 border-blue-300 dark:border-blue-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              Đợt {log.chunk}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              log.status === 'success' 
                                ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200'
                                : log.status === 'failed'
                                ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
                                : log.status === 'partial'
                                ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200'
                                : 'bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200'
                            }`}>
                              {log.status === 'success' ? '✓ Thành công' : 
                               log.status === 'failed' ? '✗ Thất bại' : 
                               log.status === 'partial' ? '⚠ Một phần' : '⏳ Đang xử lý'}
                            </span>
                          </div>
                          <span className={`text-xs ${
                            log.status === 'success' 
                              ? 'text-green-700 dark:text-green-300'
                              : log.status === 'failed'
                              ? 'text-red-700 dark:text-red-300'
                              : log.status === 'partial'
                              ? 'text-yellow-700 dark:text-yellow-300'
                              : 'text-blue-700 dark:text-blue-300'
                          }`}>
                            {log.message}
                          </span>
                        </div>
                        
                        {/* Result Details */}
                        {(log.imported > 0 || log.skipped > 0 || log.failed > 0) && (
                          <div className="mt-2 pt-2 border-t border-current/20">
                            <div className="flex items-center gap-4 text-xs">
                              {log.imported > 0 && (
                                <div className="flex items-center gap-1 text-green-700 dark:text-green-300">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span className="font-medium">{log.imported}</span>
                                  <span>thành công</span>
                                </div>
                              )}
                              {log.skipped > 0 && (
                                <div className="flex items-center gap-1 text-yellow-700 dark:text-yellow-300">
                                  <AlertCircle className="h-3 w-3" />
                                  <span className="font-medium">{log.skipped}</span>
                                  <span>bỏ qua</span>
                                </div>
                              )}
                              {log.failed > 0 && (
                                <div className="flex items-center gap-1 text-red-700 dark:text-red-300">
                                  <XCircle className="h-3 w-3" />
                                  <span className="font-medium">{log.failed}</span>
                                  <span>thất bại</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900 dark:text-green-100">Thành công</span>
                  </div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">{importResult.imported}</div>
                </div>
                {importResult.skipped > 0 && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">Bỏ qua</span>
                    </div>
                    <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{importResult.skipped}</div>
                    <div className="text-xs text-yellow-600 mt-1">Trùng lặp</div>
                  </div>
                )}
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
                    {importResult.imported + importResult.skipped + importResult.failed}
                  </div>
                </div>
              </div>

              {/* Error Details */}
              {showErrors && importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-red-900 dark:text-red-100">
                        Chi tiết lỗi ({importResult.errors.length} lỗi):
                      </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyAllErrors}
                      className="h-7 px-2 text-xs text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/20"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy All
                    </Button>
                  </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                    {importResult.errors.map((err, index) => (
                        <div 
                          key={index} 
                          className="text-sm p-2 bg-white dark:bg-gray-800 rounded border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
                        >
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-red-900 dark:text-red-100 min-w-[60px]">
                              Dòng {err.row}:
                            </span>
                            <span className="flex-1">{err.error}</span>
                          </div>
                      </div>
                    ))}
                    </div>
                  </div>

                  {/* Chunk Summary */}
                  {chunkLogs.length > 0 && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/10 rounded-lg border border-gray-200 dark:border-gray-800">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Chi tiết từng đợt ({chunkLogs.length} đợt):
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {chunkLogs.map((log, index) => (
                          <div 
                            key={index}
                            className={`p-3 rounded-lg border ${
                              log.status === 'success' 
                                ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                                : log.status === 'failed'
                                ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                                : log.status === 'partial'
                                ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
                                : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">
                                  Đợt {log.chunk}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  log.status === 'success' 
                                    ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200'
                                    : log.status === 'failed'
                                    ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
                                    : log.status === 'partial'
                                    ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                }`}>
                                  {log.status === 'success' ? '✓ Thành công' : 
                                   log.status === 'failed' ? '✗ Thất bại' : 
                                   log.status === 'partial' ? '⚠ Một phần' : '⏳ Đang xử lý'}
                                </span>
                              </div>
                              <span className={`text-xs ${
                                log.status === 'success' 
                                  ? 'text-green-700 dark:text-green-300'
                                  : log.status === 'failed'
                                  ? 'text-red-700 dark:text-red-300'
                                  : log.status === 'partial'
                                  ? 'text-yellow-700 dark:text-yellow-300'
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {log.message}
                              </span>
                            </div>
                            
                            {/* Result Details */}
                            <div className="mt-2 pt-2 border-t border-current/20">
                              <div className="flex items-center gap-4 text-xs">
                                {log.imported > 0 && (
                                  <div className="flex items-center gap-1 text-green-700 dark:text-green-300">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span className="font-medium">{log.imported}</span>
                                    <span>thành công</span>
                                  </div>
                                )}
                                {log.skipped > 0 && (
                                  <div className="flex items-center gap-1 text-yellow-700 dark:text-yellow-300">
                                    <AlertCircle className="h-3 w-3" />
                                    <span className="font-medium">{log.skipped}</span>
                                    <span>bỏ qua</span>
                                  </div>
                                )}
                                {log.failed > 0 && (
                                  <div className="flex items-center gap-1 text-red-700 dark:text-red-300">
                                    <XCircle className="h-3 w-3" />
                                    <span className="font-medium">{log.failed}</span>
                                    <span>thất bại</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Errors in this chunk */}
                            {(log.errors && log.errors.length > 0) && (
                              <div className="mt-2 pt-2 border-t border-current/20">
                                <div className="text-xs font-medium mb-1 text-red-700 dark:text-red-300">
                                  Lỗi trong đợt này ({log.errors.length}):
                                </div>
                                {log.errors.slice(0, 3).map((error, errIndex) => (
                                  <div key={errIndex} className="text-xs text-red-600 dark:text-red-400">
                                    • Dòng {error.row}: {error.error}
                                  </div>
                                ))}
                                {log.errors.length > 3 && (
                                  <div className="text-xs italic text-red-600 dark:text-red-400">
                                    ... và {log.errors.length - 3} lỗi khác
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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


'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Button,
  useToast,
  LoadingIndicator,
  FileUploadZone,
  ImportInstructions,
  ImportPreviewTable
} from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { 
  parseExcelFile, 
  mapExcelColumnsToFields, 
  CUSTOMER_COLUMN_MAPPING,
  validateCustomers,
  type ImportValidationError
} from '@rentalshop/utils';
import { customersApi } from '@rentalshop/utils';
import type { CustomerCreateInput, CustomerInput } from '@rentalshop/types';
import { ArrowLeft } from 'lucide-react';

export default function CustomerImportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [validatedData, setValidatedData] = useState<CustomerCreateInput[]>([]);
  const [errors, setErrors] = useState<ImportValidationError[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<'instructions' | 'preview'>('instructions');

  const merchantId = user?.merchant?.id || user?.merchantId;
  if (!merchantId) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Import Customers</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="text-center py-12">
            <p className="text-text-secondary">You must be associated with a merchant to import customers.</p>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);
    setErrors([]);

    try {
      // Parse Excel file
      const result = await parseExcelFile(selectedFile);
      if (!result.success) {
        setErrors(result.errors.map(e => ({
          row: e.row,
          field: 'file',
          message: e.message,
          value: null
        })));
        setIsParsing(false);
        return;
      }

      // Map columns to fields
      const mappedData = mapExcelColumnsToFields(result.data, CUSTOMER_COLUMN_MAPPING);
      setParsedData(mappedData);

      // Validate data
      const validationResult = validateCustomers(mappedData, Number(merchantId));
      setValidatedData(validationResult.data);
      setErrors(validationResult.errors);
      
      // Select all rows by default
      setSelectedRows(new Set(mappedData.map((_, index) => index)));

      setStep('preview');
    } catch (error: any) {
      toastError('Failed to parse file', error.message);
      setErrors([{
        row: 0,
        field: 'file',
        message: error.message || 'Failed to parse file',
        value: null
      }]);
    } finally {
      setIsParsing(false);
    }
  }, [merchantId, toastError]);

  const handleDownloadSample = useCallback(async () => {
    setIsDownloading(true);
    try {
      const blob = await customersApi.downloadSampleFile();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-import-sample.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      toastError('Failed to download sample file', error.message);
    } finally {
      setIsDownloading(false);
    }
  }, [toastError]);

  const handleDataChange = useCallback((index: number, field: string, value: any) => {
    setValidatedData(prev => {
      const newData = [...prev];
      newData[index] = { ...newData[index], [field]: value };
      return newData;
    });
  }, []);

  const handleRemoveRow = useCallback((index: number) => {
    setValidatedData(prev => prev.filter((_, i) => i !== index));
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  }, []);

  const handleRowSelectionChange = useCallback((index: number, selected: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(index);
      } else {
        newSet.delete(index);
      }
      return newSet;
    });
  }, []);

  const handleImport = useCallback(async () => {
    if (selectedRows.size === 0) {
      toastError('Please select at least one row to import');
      return;
    }

    if (errors.length > 0) {
      toastError('Please fix validation errors before importing');
      return;
    }

    setIsImporting(true);
    try {
      // Convert CustomerCreateInput to CustomerInput for API
      const customersToImport: CustomerInput[] = Array.from(selectedRows)
        .map(index => validatedData[index])
        .filter(Boolean)
        .map(customer => ({
          ...customer,
          lastName: customer.lastName || '', // Convert optional to required empty string
          phone: customer.phone || '', // Convert optional to required empty string
        }));

      const response = await customersApi.bulkImport(customersToImport);
      if (response.success) {
        toastSuccess(
          `Successfully imported ${response.data.imported} customers`,
          response.data.failed > 0 
            ? `${response.data.failed} customers failed to import`
            : undefined
        );
        router.push('/customers');
      } else {
        toastError('Import failed', response.message);
      }
    } catch (error: any) {
      toastError('Import failed', error.message);
    } finally {
      setIsImporting(false);
    }
  }, [selectedRows, validatedData, errors, toastSuccess, toastError, router]);

  const customerColumns = [
    { key: 'firstName', label: 'First Name', editable: true },
    { key: 'lastName', label: 'Last Name', editable: true },
    { key: 'email', label: 'Email', editable: true },
    { key: 'phone', label: 'Phone', editable: true },
    { key: 'address', label: 'Address', editable: true },
    { key: 'city', label: 'City', editable: true },
    { key: 'state', label: 'State', editable: true },
    { key: 'zipCode', label: 'Zip Code', editable: true },
    { key: 'country', label: 'Country', editable: true }
  ];

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/customers')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <PageTitle>Import Customers</PageTitle>
          </div>
        </div>
      </PageHeader>
      <PageContent>
        {step === 'instructions' ? (
          <div className="space-y-6">
            <ImportInstructions
              resourceType="customers"
              onDownloadSample={handleDownloadSample}
              isDownloading={isDownloading}
            />
            <FileUploadZone
              onFileSelect={handleFileSelect}
              acceptedFileTypes={['.xlsx']}
              maxFileSize={10 * 1024 * 1024}
            />
            {isParsing && (
              <div className="text-center py-8">
                <LoadingIndicator />
                <p className="mt-4 text-text-secondary">Parsing file...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <ImportPreviewTable
              data={validatedData}
              errors={errors}
              columns={customerColumns}
              onDataChange={handleDataChange}
              onRemoveRow={handleRemoveRow}
              selectedRows={selectedRows}
              onRowSelectionChange={handleRowSelectionChange}
            />
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setStep('instructions')}
              >
                Back
              </Button>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => router.push('/customers')}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isImporting || selectedRows.size === 0 || errors.length > 0}
                >
                  {isImporting ? 'Importing...' : `Import ${selectedRows.size} Customers`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </PageContent>
    </PageWrapper>
  );
}


'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../ui/card';
import { Button } from '../../ui/button';
import { Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export interface ImportInstructionsProps {
  resourceType: 'customers' | 'products';
  onDownloadSample: () => void;
  isDownloading?: boolean;
  className?: string;
}

export function ImportInstructions({
  resourceType,
  onDownloadSample,
  isDownloading = false,
  className
}: ImportInstructionsProps) {
  const instructions = resourceType === 'customers' ? [
    'Download the sample file to see the required format',
    'Fill in customer information (First Name is required, all other fields are optional)',
    'Save the file as Excel (.xlsx) format',
    'Upload the file using the upload zone below',
    'Review and edit data if needed before confirming import'
  ] : [
    'Download the sample file to see the required format',
    'Fill in product information (Name, Category Name, Rent Price, Deposit, and Stock are required)',
    'Save the file as Excel (.xlsx) format',
    'Upload the file using the upload zone below',
    'Review and edit data if needed before confirming import'
  ];

  const requiredFields = resourceType === 'customers' ? [
    'First Name'
  ] : [
    'Name',
    'Category Name',
    'Rent Price',
    'Deposit',
    'Stock'
  ];

  const optionalFields = resourceType === 'customers' ? [
    'Last Name',
    'Email',
    'Phone',
    'Address',
    'City',
    'State',
    'Zip Code',
    'Country',
    'Date of Birth',
    'ID Number',
    'ID Type',
    'Notes'
  ] : [
    'Description',
    'Barcode',
    'Sale Price',
    'Cost Price',
    'Pricing Type',
    'Duration Config'
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Import Instructions
        </CardTitle>
        <CardDescription>
          Follow these steps to import {resourceType} into the system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Download Sample File */}
        <div className="flex items-start justify-between p-4 bg-bg-secondary rounded-lg">
          <div className="flex-1">
            <h3 className="font-medium text-text-primary mb-1">
              Download Sample File
            </h3>
            <p className="text-sm text-text-secondary">
              Get a template file with the correct format and example data
            </p>
          </div>
          <Button
            onClick={onDownloadSample}
            disabled={isDownloading}
            variant="outline"
            className="ml-4"
          >
            <Download className="w-4 h-4 mr-2" />
            {isDownloading ? 'Downloading...' : 'Download Sample'}
          </Button>
        </div>

        {/* Instructions List */}
        <div>
          <h3 className="font-medium text-text-primary mb-3">Steps:</h3>
          <ol className="space-y-2 list-decimal list-inside">
            {instructions.map((instruction, index) => (
              <li key={index} className="text-sm text-text-secondary">
                {instruction}
              </li>
            ))}
          </ol>
        </div>

        {/* Required Fields */}
        <div>
          <h3 className="font-medium text-text-primary mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Required Fields:
          </h3>
          <div className="flex flex-wrap gap-2">
            {requiredFields.map((field) => (
              <span
                key={field}
                className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded"
              >
                {field}
              </span>
            ))}
          </div>
        </div>

        {/* Optional Fields */}
        <div>
          <h3 className="font-medium text-text-primary mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            Optional Fields:
          </h3>
          <div className="flex flex-wrap gap-2">
            {optionalFields.map((field) => (
              <span
                key={field}
                className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
              >
                {field}
              </span>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Make sure your Excel file follows the exact column format from the sample file.
            Data validation will be performed before import.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}


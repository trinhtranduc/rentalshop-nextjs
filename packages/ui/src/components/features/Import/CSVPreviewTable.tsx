'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../../../lib/cn';

export interface CSVPreviewTableProps {
  data: Array<Record<string, any>>;
  headers: string[];
  errors?: Array<{ row: number; error: string }>;
  duplicates?: Array<{ row: number; reason: string }>;
  maxRows?: number;
  className?: string;
}

/**
 * CSV Preview Table Component
 * Displays CSV data in a beautiful table format with error and duplicate highlighting
 */
export function CSVPreviewTable({
  data,
  headers,
  errors = [],
  duplicates = [],
  maxRows = 50,
  className
}: CSVPreviewTableProps) {
  const errorRows = new Set(errors.map(e => e.row));
  const duplicateRows = new Set(duplicates.map(d => d.row));
  const displayData = data.slice(0, maxRows);
  const hasMore = data.length > maxRows;
  const validCount = data.length - errors.length - duplicates.length;
  const skippedCount = duplicates.length;

  const t = useTranslations('common.import.preview');
  const invalidCount = errors.length + duplicates.length;

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Summary Text */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6 text-sm">
          <span className="text-text-secondary">
            {t('total')}: <span className="font-semibold text-text-primary ml-1">{data.length}</span>
          </span>
          <span className="text-text-secondary">
            {t('valid')}: <span className="font-semibold text-green-600 dark:text-green-500 ml-1">{validCount}</span>
          </span>
          {invalidCount > 0 && (
            <span className="text-text-secondary">
              {t('invalid')}: <span className="font-semibold text-red-600 dark:text-red-500 ml-1">{invalidCount}</span>
            </span>
          )}
        </div>
        {(errors.length > 0 || duplicates.length > 0) && (
          <div className="flex gap-2">
            {errors.length > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1.5 text-xs">
                <XCircle className="w-3.5 h-3.5" />
                {errors.length} {errors.length === 1 ? t('errors') : t('errorsPlural')}
              </Badge>
            )}
            {duplicates.length > 0 && (
              <Badge variant="outline" className="flex items-center gap-1.5 text-xs border-yellow-500/50 text-yellow-700 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                <AlertCircle className="w-3.5 h-3.5" />
                {duplicates.length} {duplicates.length === 1 ? t('duplicates') : t('duplicatesPlural')}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Preview Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-bg-card">
        <div className="overflow-x-auto h-full overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-bg-secondary/50 backdrop-blur-sm z-10 border-b border-border">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16 font-semibold text-text-primary text-xs uppercase tracking-wider">#</TableHead>
                {headers.map((header, index) => (
                  <TableHead key={index} className="min-w-[150px] font-semibold text-text-primary text-xs uppercase tracking-wider">
                    {header}
                  </TableHead>
                ))}
                <TableHead className="w-40 font-semibold text-text-primary text-xs uppercase tracking-wider">{t('status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayData.map((row, index) => {
                const rowNumber = index + 1; // Start from 1
                const hasError = errorRows.has(rowNumber);
                const isDuplicate = duplicateRows.has(rowNumber);
                const rowError = errors.find(e => e.row === rowNumber);
                const rowDuplicate = duplicates.find(d => d.row === rowNumber);

                  return (
                    <TableRow
                      key={index}
                      className={cn(
                        'transition-colors',
                        hasError && 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20',
                        isDuplicate && !hasError && 'bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20',
                        !hasError && !isDuplicate && 'hover:bg-bg-secondary'
                      )}
                    >
                      <TableCell className="font-medium text-text-secondary text-sm">
                        {rowNumber}
                      </TableCell>
                      {headers.map((header, colIndex) => {
                        const value = row[header.toLowerCase()] || row[header] || '';
                        return (
                          <TableCell key={colIndex} className="text-sm text-text-primary">
                            <div className="max-w-[200px] truncate" title={String(value)}>
                              {String(value) || (
                                <span className="text-text-tertiary italic">—</span>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="whitespace-nowrap">
                        {hasError ? (
                          <div className="flex items-center gap-1.5 text-red-600 dark:text-red-500">
                            <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="text-xs truncate font-medium max-w-[150px]" title={rowError?.error}>
                              {rowError?.error}
                            </span>
                          </div>
                        ) : isDuplicate ? (
                          <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-500">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="text-xs truncate font-medium max-w-[150px]" title={rowDuplicate?.reason}>
                              {rowDuplicate?.reason}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-green-600 dark:text-green-500">
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="text-xs font-medium whitespace-nowrap">{t('validStatus')}</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

      {hasMore && (
        <div className="text-xs text-text-tertiary text-center py-2">
          {t('showing', { maxRows, total: data.length })}
        </div>
      )}
    </div>
  );
}

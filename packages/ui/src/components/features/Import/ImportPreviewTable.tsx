'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../ui/table';
import { CheckCircle, XCircle, AlertCircle, Edit2, X } from 'lucide-react';
import { cn } from '@rentalshop/ui';
import type { ImportValidationError } from '@rentalshop/utils';

export interface ImportPreviewTableProps<T> {
  data: T[];
  errors: ImportValidationError[];
  columns: Array<{
    key: keyof T | string;
    label: string;
    editable?: boolean;
    type?: 'text' | 'number' | 'date';
    render?: (value: any, row: T, index: number) => React.ReactNode;
  }>;
  onDataChange?: (index: number, field: keyof T | string, value: any) => void;
  onRemoveRow?: (index: number) => void;
  selectedRows?: Set<number>;
  onRowSelectionChange?: (index: number, selected: boolean) => void;
  className?: string;
}

export function ImportPreviewTable<T extends Record<string, any>>({
  data,
  errors,
  columns,
  onDataChange,
  onRemoveRow,
  selectedRows = new Set(),
  onRowSelectionChange,
  className
}: ImportPreviewTableProps<T>) {
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editedData, setEditedData] = useState<T[]>(data);

  // Sync editedData when data changes
  useEffect(() => {
    setEditedData(data);
  }, [data]);

  const getRowErrors = (rowIndex: number): ImportValidationError[] => {
    return errors.filter(error => error.row === rowIndex + 2); // +2 because Excel row 1 is header, data starts at row 2
  };

  const getFieldError = (rowIndex: number, field: string): ImportValidationError | undefined => {
    return errors.find(error => error.row === rowIndex + 2 && error.field === field);
  };

  const handleCellEdit = (rowIndex: number, field: string, value: any) => {
    const newData = [...editedData];
    newData[rowIndex] = { ...newData[rowIndex], [field]: value };
    setEditedData(newData);
    
    if (onDataChange) {
      onDataChange(rowIndex, field, value);
    }
  };

  const handleCellClick = (rowIndex: number, col: string) => {
    const column = columns.find(c => c.key === col);
    if (column?.editable) {
      setEditingCell({ row: rowIndex, col });
    }
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const handleSelectAll = (checked: boolean) => {
    if (onRowSelectionChange) {
      data.forEach((_, index) => {
        onRowSelectionChange(index, checked);
      });
    }
  };

  const allSelected = data.length > 0 && data.every((_, index) => selectedRows.has(index));
  const someSelected = Array.from(selectedRows).some(index => index >= 0 && index < data.length);

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-text-secondary">
          No data to preview
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Preview Data ({data.length} rows)</CardTitle>
          {onRowSelectionChange && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-text-secondary flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4"
                />
                Select All
              </label>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {onRowSelectionChange && (
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4"
                    />
                  </TableHead>
                )}
                {onRemoveRow && <TableHead className="w-12"></TableHead>}
                {columns.map((column) => (
                  <TableHead key={String(column.key)}>{column.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {editedData.map((row, rowIndex) => {
                const rowErrors = getRowErrors(rowIndex);
                const hasErrors = rowErrors.length > 0;
                const isSelected = selectedRows.has(rowIndex);
                const isEditing = editingCell?.row === rowIndex;

                return (
                  <TableRow
                    key={rowIndex}
                    className={cn(
                      hasErrors && 'bg-red-50',
                      isSelected && !hasErrors && 'bg-blue-50'
                    )}
                  >
                    {onRowSelectionChange && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => onRowSelectionChange(rowIndex, e.target.checked)}
                          className="w-4 h-4"
                        />
                      </TableCell>
                    )}
                    {onRemoveRow && (
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveRow(rowIndex)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    )}
                    {columns.map((column) => {
                      const fieldKey = String(column.key);
                      const fieldError = getFieldError(rowIndex, fieldKey);
                      const value = row[fieldKey];
                      const isEditingThisCell = editingCell?.row === rowIndex && editingCell?.col === fieldKey;
                      const isEditable = column.editable !== false;

                      return (
                        <TableCell
                          key={fieldKey}
                          className={cn(
                            fieldError && 'bg-red-100',
                            isEditable && 'cursor-pointer hover:bg-bg-secondary'
                          )}
                          onClick={() => isEditable && handleCellClick(rowIndex, fieldKey)}
                        >
                          {isEditingThisCell && isEditable ? (
                            <Input
                              type={column.type || 'text'}
                              value={value ?? ''}
                              onChange={(e) => {
                                const newValue = column.type === 'number' 
                                  ? parseFloat(e.target.value) || 0
                                  : e.target.value;
                                handleCellEdit(rowIndex, fieldKey, newValue);
                              }}
                              onBlur={handleCellBlur}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCellBlur();
                                }
                              }}
                              autoFocus
                              className={cn(fieldError && 'border-red-500')}
                            />
                          ) : column.render ? (
                            column.render(value, row, rowIndex)
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>{value ?? ''}</span>
                              {isEditable && (
                                <Edit2 className="w-3 h-3 text-text-secondary opacity-0 group-hover:opacity-100" />
                              )}
                            </div>
                          )}
                          {fieldError && (
                            <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {(fieldError as any).message || (fieldError as any).error}
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Error Summary */}
        {errors.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
              <XCircle className="w-4 h-4" />
              Validation Errors ({errors.length})
            </div>
            <div className="text-sm text-red-700 space-y-1">
              {errors.slice(0, 10).map((error, index) => (
                <div key={index}>
                  Row {error.row}: {error.field} - {(error as any).message || (error as any).error}
                </div>
              ))}
              {errors.length > 10 && (
                <div className="text-red-600 italic">
                  ...and {errors.length - 10} more errors
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success Summary */}
        {errors.length === 0 && data.length > 0 && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 font-medium">
              <CheckCircle className="w-4 h-4" />
              All data is valid and ready to import ({data.length} rows)
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

